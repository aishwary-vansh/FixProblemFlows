import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, getAuth } from "../middleware/auth.middleware.js";
import { authorise, ADMIN_ROLES } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
    archiveReportPoint,
    createReportPoint,
    getReportPointForMember,
    getReportPointPreview,
    listReportPoints,
} from "../services/reportPoint.service.js";
import { createReportPointSchema, reportPointCodeSchema } from "../validators/reportPoint.validator.js";
import { idParamSchema } from "../validators/member.validator.js";

const router = Router();

// Public: opened right after scanning, before the person has logged in.
router.get("/public/:code", validate({ params: reportPointCodeSchema }), async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await getReportPointPreview(String(req.params.code)) });
});

router.use(authenticate);

// Any member: what the report form should prefill for a scanned code.
router.get("/code/:code", validate({ params: reportPointCodeSchema }), async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await getReportPointForMember(getAuth(req), String(req.params.code)) });
});

router.get("/", authorise(...ADMIN_ROLES), async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await listReportPoints(getAuth(req)) });
});

router.post(
    "/",
    authorise(...ADMIN_ROLES),
    validate({ body: createReportPointSchema }),
    async (req: Request, res: Response) => {
        const point = await createReportPoint(getAuth(req), req.body);
        res.status(201).json({ success: true, message: "QR point created", data: point });
    }
);

router.delete(
    "/:id",
    authorise(...ADMIN_ROLES),
    validate({ params: idParamSchema }),
    async (req: Request, res: Response) => {
        await archiveReportPoint(getAuth(req), Number(req.params.id));
        res.status(200).json({ success: true, message: "QR point removed" });
    }
);

export default router;
