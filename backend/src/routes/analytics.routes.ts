import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { authenticate, getAuth } from "../middleware/auth.middleware.js";
import { authorise, ADMIN_ROLES } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { exportIssuesCsv, getReport } from "../services/analytics.service.js";
import { audit } from "../services/audit.service.js";
import { assertFeature } from "../services/plan.service.js";

const periodSchema = z.object({
    days: z.coerce.number().int().min(1).max(366).default(30),
});

const days = (req: Request) => (req.query as unknown as z.infer<typeof periodSchema>).days;

const router = Router();

router.use(authenticate, authorise(...ADMIN_ROLES));

router.get("/", validate({ query: periodSchema }), async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await getReport(getAuth(req), days(req)) });
});

router.get("/export.csv", validate({ query: periodSchema }), async (req: Request, res: Response) => {
    await assertFeature(getAuth(req).orgId, "csvExport");
    const csv = await exportIssuesCsv(getAuth(req), days(req));
    await audit(getAuth(req), "issues.exported", `Last ${days(req)} days`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="fixflow-issues-last-${days(req)}-days.csv"`);
    // The byte order mark makes Excel read the file as UTF-8 (₹, names with accents).
    res.status(200).send("﻿" + csv);
});

export default router;
