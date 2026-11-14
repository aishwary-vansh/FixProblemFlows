import { randomBytes } from "node:crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import prisma, { tenantPrisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import { env } from "../config/env.js";
import { authenticate, getAuth } from "../middleware/auth.middleware.js";
import { authorise, ADMIN_ROLES } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { deleteOrganizationSchema, updateOrganizationSchema } from "../validators/member.validator.js";
import { audit, listAuditLog } from "../services/audit.service.js";
import { deleteOrganization, exportOrganization } from "../services/organization.service.js";

const settingsSelect = { id: true, name: true, autoAssign: true, joinCode: true } as const;

type Settings = { id: number; name: string; autoAssign: boolean; joinCode: string | null };

const toSettingsDto = ({ joinCode, ...settings }: Settings) => ({
    ...settings,
    joinUrl: joinCode ? `${env.APP_URL.replace(/\/$/, "")}/join/${joinCode}` : null,
});

/** Updates the organization and records why, in one transaction. */
const updateWithAudit = (ctx: AuthContext, data: { autoAssign?: boolean; joinCode?: string | null }, action: string) =>
    tenantPrisma(ctx.orgId).$transaction(async (tx) => {
        const organization = await tx.organization.update({ where: { id: ctx.orgId }, data, select: settingsSelect });
        await audit(ctx, action, null, undefined, tx);
        return organization;
    });

const router = Router();

router.use(authenticate, authorise(...ADMIN_ROLES));

router.get("/", async (req: Request, res: Response) => {
    const organization = await prisma.organization.findUniqueOrThrow({
        where: { id: getAuth(req).orgId },
        select: settingsSelect,
    });
    res.status(200).json({ success: true, data: toSettingsDto(organization) });
});

router.patch("/", validate({ body: updateOrganizationSchema }), async (req: Request, res: Response) => {
    const organization = await updateWithAudit(
        getAuth(req),
        { autoAssign: req.body.autoAssign },
        req.body.autoAssign ? "settings.auto_assign_on" : "settings.auto_assign_off"
    );
    res.status(200).json({ success: true, message: "Settings updated", data: toSettingsDto(organization) });
});

// A new code replaces the old one, so a leaked link or poster stops working.
router.post("/join-link", async (req: Request, res: Response) => {
    const organization = await updateWithAudit(
        getAuth(req),
        { joinCode: randomBytes(24).toString("base64url") },
        "join_link.created"
    );
    res.status(200).json({ success: true, message: "Join link created", data: toSettingsDto(organization) });
});

router.delete("/join-link", async (req: Request, res: Response) => {
    const organization = await updateWithAudit(getAuth(req), { joinCode: null }, "join_link.turned_off");
    res.status(200).json({ success: true, message: "Join link turned off", data: toSettingsDto(organization) });
});

router.get("/audit-log", async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await listAuditLog(getAuth(req)) });
});

// Only the owner can take all the data out, or delete it.
router.get("/export", authorise("OWNER"), async (req: Request, res: Response) => {
    const data = await exportOrganization(getAuth(req));
    res.setHeader("Content-Disposition", `attachment; filename="fixflow-export-${new Date().toISOString().slice(0, 10)}.json"`);
    res.status(200).json(data);
});

router.delete("/", authorise("OWNER"), validate({ body: deleteOrganizationSchema }), async (req: Request, res: Response) => {
    await deleteOrganization(getAuth(req), req.body.confirmName);
    res.status(200).json({ success: true, message: "Organization deleted" });
});

export default router;
