import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import prisma from "./config/prisma.js";
import app from "./app.js";
import { startOverdueJob } from "./jobs/overdue.job.js";
import { startAutoCloseJob } from "./jobs/autoClose.job.js";
import { startPushJob } from "./jobs/push.job.js";
import { pushEnabled } from "./services/push.service.js";

const server = app.listen(env.PORT, () => {
    logger.info(`FixFlow API running on port ${env.PORT}`);
});

// Say plainly when the database is down, instead of only failing request by request.
prisma.$queryRaw`SELECT 1`.catch((err) => {
    logger.error(
        { err },
        env.NODE_ENV === "production"
            ? "Database unreachable. Check DATABASE_URL and that the database is running."
            : "Database unreachable. Start the local one with: npm run db:start"
    );
});

const jobs = [startOverdueJob(), startAutoCloseJob(), ...(pushEnabled ? [startPushJob()] : [])];

if (!pushEnabled) {
    logger.info("Push alerts are off: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are not set");
}

const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    jobs.forEach(clearInterval);
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
