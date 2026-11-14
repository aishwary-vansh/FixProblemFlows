import prisma, { tenantPrisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { getStorage } from "../storage/index.js";
import { AppError } from "../utils/AppError.js";
import { audit, listAuditLog } from "./audit.service.js";
import type { AuthContext } from "../types/auth.js";

const person = { select: { name: true, email: true } } as const;

/**
 * Everything the organization has stored, as one JSON document the owner can keep or move elsewhere.
 * Photos are listed by name; the files themselves stay in storage.
 */
export const exportOrganization = async (ctx: AuthContext) => {
    const db = tenantPrisma(ctx.orgId);

    const [organization, members, locations, reportPoints, issues] = await Promise.all([
        prisma.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { name: true, createdAt: true } }),
        db.membership.findMany({
            select: { role: true, specialization: true, isActive: true, createdAt: true, user: { select: { name: true, email: true, phone: true } } },
            orderBy: { createdAt: "asc" },
        }),
        db.location.findMany({ select: { id: true, name: true, parentId: true, archived: true }, orderBy: { id: "asc" } }),
        db.reportPoint.findMany({ select: { name: true, spot: true, locationId: true, archived: true, createdAt: true } }),
        db.issue.findMany({
            include: {
                reporter: person,
                assignee: person,
                events: { select: { type: true, fromStatus: true, toStatus: true, note: true, createdAt: true, actor: { select: { name: true } } }, orderBy: { id: "asc" } },
                comments: { select: { body: true, createdAt: true, author: { select: { name: true } } }, orderBy: { id: "asc" } },
                attachments: { select: { fileName: true, kind: true, mimeType: true, fileSize: true, createdAt: true } },
                followers: { select: { user: person } },
            },
            orderBy: { id: "asc" },
        }),
    ]);

    await audit(ctx, "organization.exported", organization.name);

    return {
        exportedAt: new Date().toISOString(),
        organization,
        members: members.map(({ user, ...membership }) => ({ ...user, ...membership })),
        locations,
        reportPoints,
        issues: issues.map(({ orgId: _orgId, followers, ...issue }) => ({
            ...issue,
            followers: followers.map((follower) => follower.user),
        })),
        auditLog: await listAuditLog(ctx, undefined),
    };
};

/**
 * Permanently deletes the organization and all its data, then its photo files. People's accounts stay,
 * because they may belong to other organizations; anyone left without one can sign up again.
 */
export const deleteOrganization = async (ctx: AuthContext, confirmName: string) => {
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { name: true } });

    // Typing the name guards against deleting the wrong organization by accident.
    if (confirmName.trim() !== organization.name) {
        throw AppError.badRequest("The name you typed doesn't match the organization's name");
    }

    await prisma.organization.delete({ where: { id: ctx.orgId } });

    // Every photo key starts with this folder, so one sweep also catches uploads that finished mid-delete.
    const storage = await getStorage();
    await storage.deletePrefix(`issues/${ctx.orgId}/`).catch((err) => {
        logger.warn({ err, orgId: ctx.orgId }, "Photo files of a deleted organization could not all be removed");
    });
};
