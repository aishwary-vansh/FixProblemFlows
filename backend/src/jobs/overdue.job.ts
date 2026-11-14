import prisma, { tenantPrisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { captureError } from "../config/sentry.js";
import { SLA_OPEN_STATUSES } from "../domain/sla.js";
import { getAdminUserIds, notify } from "../services/notification.service.js";

const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * Marks open issues past their deadline and alerts the assignee and admins, once per issue.
 * This runs across every org, so it finds issues with the unscoped client and then
 * writes through a tenant client for each issue's own org.
 */
export const checkOverdueIssues = async (now = new Date()) => {
    const overdue = await prisma.issue.findMany({
        where: { status: { in: SLA_OPEN_STATUSES }, breachedAt: null, dueAt: { lt: now } },
        select: { id: true, orgId: true, title: true, assigneeId: true },
        orderBy: { dueAt: "asc" },
        take: 200,
    });

    for (const issue of overdue) {
        await tenantPrisma(issue.orgId).$transaction(async (tx) => {
            // Conditional, so a second server running this job can't alert twice.
            const { count } = await tx.issue.updateMany({
                where: { id: issue.id, breachedAt: null },
                data: { breachedAt: now },
            });
            if (count === 0) return;

            await tx.issueEvent.create({
                data: { orgId: issue.orgId, issueId: issue.id, actorId: null, type: "SLA_BREACHED" },
            });

            await notify(tx, {
                orgId: issue.orgId,
                issueId: issue.id,
                actorId: null,
                type: "ISSUE_OVERDUE",
                message: `#${issue.id} "${issue.title}" is past its deadline`,
                userIds: [issue.assigneeId, ...(await getAdminUserIds(tx))],
            });
        });
    }

    return overdue.length;
};

export const startOverdueJob = () => {
    const run = () =>
        checkOverdueIssues().catch((err) => {
            logger.error({ err }, "Overdue check failed");
            captureError(err, { path: "job:overdue" });
        });

    void run();
    return setInterval(run, CHECK_EVERY_MS);
};
