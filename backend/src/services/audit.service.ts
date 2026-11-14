import { tenantPrisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { AuthContext } from "../types/auth.js";
import type { Tx } from "./notification.service.js";

/**
 * Records an admin action (roles, invites, settings, locations, QR points, exports).
 * Pass the transaction when there is one, so the entry and the change are saved together.
 */
export const audit = async (
    ctx: AuthContext,
    action: string,
    target: string | null,
    details?: Prisma.InputJsonValue,
    tx?: Tx
) => {
    await (tx ?? tenantPrisma(ctx.orgId)).auditLog.create({
        data: {
            orgId: ctx.orgId,
            actorId: ctx.userId,
            action,
            target,
            ...(details !== undefined ? { details } : {}),
        },
    });
};

/** Newest first. The page shows the latest 100; the data export passes no limit. */
export const listAuditLog = async (ctx: AuthContext, take: number | undefined = 100) => {
    return tenantPrisma(ctx.orgId).auditLog.findMany({
        select: {
            id: true,
            action: true,
            target: true,
            details: true,
            createdAt: true,
            actor: { select: { id: true, name: true } },
        },
        orderBy: { id: "desc" },
        ...(take !== undefined ? { take } : {}),
    });
};
