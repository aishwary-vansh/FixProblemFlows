import prisma from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { captureError } from "../config/sentry.js";
import { pushToUser } from "../services/push.service.js";

const CHECK_EVERY_MS = 10 * 1000;
// Alerts older than this are stale by the time they'd arrive (e.g. after the server was down).
const MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Sends new inbox notifications to people's phones. Reading committed rows here, instead of
 * pushing from inside each transaction, means a rolled-back change never sends an alert.
 */
export const sendPendingPushes = async (now = new Date()) => {
    const pending = await prisma.notification.findMany({
        where: { pushedAt: null, createdAt: { gte: new Date(now.getTime() - MAX_AGE_MS) } },
        select: { id: true, userId: true, issueId: true, message: true },
        orderBy: { id: "asc" },
        take: 100,
    });

    for (const notification of pending) {
        // Claim it first, so a second server running this job can't send it twice.
        const { count } = await prisma.notification.updateMany({
            where: { id: notification.id, pushedAt: null },
            data: { pushedAt: now },
        });
        if (count === 0) continue;

        await pushToUser(notification.userId, {
            body: notification.message,
            url: `/issues/${notification.issueId}`,
        });
    }

    return pending.length;
};

export const startPushJob = () => {
    let running = false;
    const run = async () => {
        // A slow push service must not let runs pile up on top of each other.
        if (running) return;
        running = true;
        await sendPendingPushes()
            .catch((err) => {
                logger.error({ err }, "Push job failed");
                captureError(err, { path: "job:push" });
            })
            .finally(() => {
                running = false;
            });
    };

    return setInterval(run, CHECK_EVERY_MS);
};
