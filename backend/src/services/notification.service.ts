import { tenantPrisma, type TenantPrisma } from "../config/prisma.js";
import type { NotificationType } from "../generated/prisma/enums.js";
import { AppError } from "../utils/AppError.js";
import type { AuthContext } from "../types/auth.js";

/** The client handed to `db.$transaction(async (tx) => ...)`. */
export type Tx = Parameters<Parameters<TenantPrisma["$transaction"]>[0]>[0];

interface NotifyInput {
    orgId: number;
    issueId: number;
    // Null when the system caused the event (auto-assign, overdue check).
    actorId: number | null;
    type: NotificationType;
    message: string;
    userIds: (number | null)[];
}

/** Inbox rows for each recipient. The person who caused the event is never notified about it. */
export const notify = async (tx: Tx, { orgId, issueId, actorId, type, message, userIds }: NotifyInput) => {
    const recipients = [...new Set(userIds)].filter((id): id is number => id !== null && id !== actorId);
    if (recipients.length === 0) return;

    await tx.notification.createMany({
        data: recipients.map((userId) => ({ orgId, userId, issueId, type, message })),
    });
};

export const getAdminUserIds = async (tx: Tx) => {
    const admins = await tx.membership.findMany({
        where: { role: { in: ["OWNER", "ADMIN"] }, isActive: true },
        select: { userId: true },
    });
    return admins.map((admin) => admin.userId);
};

export const listNotifications = async (ctx: AuthContext) => {
    const db = tenantPrisma(ctx.orgId);
    const [items, unreadCount] = await Promise.all([
        db.notification.findMany({
            where: { userId: ctx.userId },
            orderBy: { id: "desc" },
            take: 30,
        }),
        db.notification.count({ where: { userId: ctx.userId, readAt: null } }),
    ]);
    return { items, unreadCount };
};

export const markNotificationRead = async (ctx: AuthContext, notificationId: number) => {
    const { count } = await tenantPrisma(ctx.orgId).notification.updateMany({
        where: { id: notificationId, userId: ctx.userId, readAt: null },
        data: { readAt: new Date() },
    });
    if (count === 0) {
        // Either it doesn't exist, isn't yours, or was already read; only the first two are errors.
        const exists = await tenantPrisma(ctx.orgId).notification.count({
            where: { id: notificationId, userId: ctx.userId },
        });
        if (!exists) throw AppError.notFound("Notification");
    }
};

export const markAllNotificationsRead = async (ctx: AuthContext) => {
    await tenantPrisma(ctx.orgId).notification.updateMany({
        where: { userId: ctx.userId, readAt: null },
        data: { readAt: new Date() },
    });
};
