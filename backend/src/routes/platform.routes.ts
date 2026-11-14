import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma.js";
import { env } from "../config/env.js";
import { authenticate, getAuth } from "../middleware/auth.middleware.js";
import { AppError } from "../utils/AppError.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The people who run this FixFlow installation (PLATFORM_ADMIN_USER_IDS), not the admins of one organization. */
export const isPlatformAdmin = (userId: number) => env.platformAdminUserIds.includes(userId);

const requirePlatformAdmin = (req: Request, _res: Response, next: NextFunction) => {
    if (!isPlatformAdmin(getAuth(req).userId)) {
        // 404, so the console's existence isn't advertised.
        throw AppError.notFound();
    }
    next();
};

const router = Router();

router.use(authenticate, requirePlatformAdmin);

/** Every organization with the numbers that show whether it is actually using FixFlow. Read-only. */
router.get("/organizations", async (_req: Request, res: Response) => {
    const since = new Date(Date.now() - 30 * DAY_MS);

    const [organizations, recent, lastIssue, owners] = await Promise.all([
        prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                createdAt: true,
                _count: { select: { memberships: { where: { isActive: true } }, issues: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.issue.groupBy({ by: ["orgId"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
        prisma.issue.groupBy({ by: ["orgId"], _max: { createdAt: true } }),
        prisma.membership.findMany({
            where: { role: "OWNER", isActive: true },
            select: { orgId: true, user: { select: { email: true } } },
            orderBy: { createdAt: "asc" },
        }),
    ]);

    const recentByOrg = new Map(recent.map((row) => [row.orgId, row._count._all]));
    const lastByOrg = new Map(lastIssue.map((row) => [row.orgId, row._max.createdAt]));
    const ownerByOrg = new Map<number, string>();
    for (const owner of owners) {
        if (!ownerByOrg.has(owner.orgId)) ownerByOrg.set(owner.orgId, owner.user.email);
    }

    const rows = organizations.map((org) => ({
        id: org.id,
        name: org.name,
        createdAt: org.createdAt,
        ownerEmail: ownerByOrg.get(org.id) ?? null,
        members: org._count.memberships,
        issues: org._count.issues,
        issuesLast30Days: recentByOrg.get(org.id) ?? 0,
        lastIssueAt: lastByOrg.get(org.id) ?? null,
    }));

    res.status(200).json({
        success: true,
        data: {
            totals: {
                organizations: rows.length,
                activeLast30Days: rows.filter((row) => row.issuesLast30Days > 0).length,
                members: rows.reduce((sum, row) => sum + row.members, 0),
                issues: rows.reduce((sum, row) => sum + row.issues, 0),
            },
            organizations: rows,
        },
    });
});

export default router;
