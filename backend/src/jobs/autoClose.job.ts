import prisma, { tenantPrisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { captureError } from "../config/sentry.js";
import { notify } from "../services/notification.service.js";

export const AUTO_CLOSE_DAYS = 7;
const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * Closes resolved issues the reporter never confirmed, so they don't stay open forever.
 * Like the overdue check, it finds issues across every org and writes through each org's tenant client.
 */
export const closeUnconfirmedIssues = async (now = new Date()) => {
    const cutoff = new Date(now.getTime() - AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000);

    const stale = await prisma.issue.findMany({
        where: { status: "RESOLVED", resolvedAt: { lt: cutoff } },
        select: { id: true, orgId: true, title: true, reporterId: true, assigneeId: true },
        orderBy: { resolvedAt: "asc" },
        take: 200,
    });

    for (const issue of stale) {
        await tenantPrisma(issue.orgId).$transaction(async (tx) => {
            // Conditional, so a reporter acting at the same moment wins.
            const { count } = await tx.issue.updateMany({
                where: { id: issue.id, status: "RESOLVED", resolvedAt: { lt: cutoff } },
                data: { status: "CLOSED" },
            });
            if (count === 0) return;

            await tx.issueEvent.create({
                data: {
                    orgId: issue.orgId,
                    issueId: issue.id,
                    actorId: null,
                    type: "STATUS_CHANGED",
                    fromStatus: "RESOLVED",
                    toStatus: "CLOSED",
                    note: `Closed automatically: no reply ${AUTO_CLOSE_DAYS} days after it was resolved`,
                },
            });

            await notify(tx, {
                orgId: issue.orgId,
                issueId: issue.id,
                actorId: null,
                type: "STATUS_CHANGED",
                message: `#${issue.id} "${issue.title}" was closed automatically after ${AUTO_CLOSE_DAYS} days with no reply`,
                userIds: [issue.reporterId, issue.assigneeId],
            });
        });
    }

    return stale.length;
};

export const startAutoCloseJob = () => {
    const run = () =>
        closeUnconfirmedIssues().catch((err) => {
            logger.error({ err }, "Auto-close check failed");
            captureError(err, { path: "job:auto-close" });
        });

    void run();
    return setInterval(run, CHECK_EVERY_MS);
};
