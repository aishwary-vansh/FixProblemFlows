import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma.js";
import { z } from "zod";
import { authLimiter } from "../middleware/rateLimit.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";
import { verifyCredentials } from "../services/auth.services.js";
import { generateConsoleToken, verifyConsoleToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { validate } from "../middleware/validate.middleware.js";
import { applyPlanAction, getOverview, getPlanHistory, listOrganizationRows } from "../services/console.service.js";
import { planActionSchema } from "../validators/console.validator.js";


/*
 * The FixFlow Console: for the people who run FixFlow, not for the owner or admins of any one organization.
 * Console admins are accounts with User.isPlatformAdmin, set only from the command line (npm run console-admin).
 */

const adminSelect = { id: true, name: true, email: true } as const;

/** Checks a console token and that the account is still an active console admin. */
const authenticateConsole = async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const payload = header?.startsWith("Bearer ") ? verifyConsoleToken(header.slice("Bearer ".length).trim()) : null;
    if (!payload) {
        throw AppError.unauthorized("Please log in to the console");
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isActive: true, isPlatformAdmin: true, passwordChangedAt: true },
    });
    const loggedOut = user?.passwordChangedAt && payload.issuedAtMs < user.passwordChangedAt.getTime();
    if (!user || !user.isActive || !user.isPlatformAdmin || loggedOut) {
        throw AppError.unauthorized("Please log in to the console");
    }

    res.locals.adminId = payload.userId;
    next();
};

const router = Router();

router.post("/login", authLimiter, validate({ body: loginSchema }), async (req: Request, res: Response) => {
    const user = await verifyCredentials(req.body.email, req.body.password);
    if (!user.isPlatformAdmin) {
        // Same answer as a wrong password, so the console doesn't reveal which accounts exist.
        throw AppError.unauthorized("Invalid email or password");
    }
    res.status(200).json({
        success: true,
        data: { token: generateConsoleToken(user.id), admin: { id: user.id, name: user.name, email: user.email } },
    });
});

router.use(authenticateConsole);

router.get("/me", async (_req: Request, res: Response) => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { id: res.locals.adminId as number }, select: adminSelect });
    res.status(200).json({ success: true, data: admin });
});

router.get("/overview", async (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await getOverview() });
});

router.get("/organizations", async (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { organizations: await listOrganizationRows() } });
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

/**
 * One change to an organization's plan or notice. Every action takes a note; the note stays in the console
 * unless shareWithOwner is set, in which case the owner sees it as a notice in their portal.
 */
router.post(
    "/organizations/:id/actions",
    validate({ params: idParamSchema, body: planActionSchema }),
    async (req: Request, res: Response) => {
        const organization = await applyPlanAction(Number(req.params.id), res.locals.adminId as number, req.body);
        res.status(200).json({ success: true, message: "Saved", data: organization });
    }
);

router.get("/organizations/:id/history", validate({ params: idParamSchema }), async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await getPlanHistory(Number(req.params.id)) });
});

export default router;
