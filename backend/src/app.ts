import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import prisma from "./config/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import fileRoutes from "./routes/file.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import locationRoutes from "./routes/location.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import pushRoutes from "./routes/push.routes.js";
import reportPointRoutes from "./routes/reportPoint.routes.js";
import platformRoutes from "./routes/platform.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import { inviteRoutes, joinRoutes, memberRoutes } from "./routes/member.routes.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");

app.use(
    helmet({
        // Attachment images are loaded by the web app from another origin.
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

app.use(
    cors({
        origin: env.corsOrigins,
    })
);

app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));
// Razorpay signs the exact bytes it sends, so its webhook gets the raw body (express.json then skips it).
app.use("/api/billing/webhook", express.raw({ type: "*/*", limit: "1mb" }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
    res.json({ success: true, message: "FixFlow API is working" });
});

/** Liveness + database check for uptime monitors and the hosting platform. */
app.get("/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "ok", db: "ok" });
    } catch {
        res.status(503).json({ status: "degraded", db: "unreachable" });
    }
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/join", joinRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/report-points", reportPointRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/billing", billingRoutes);
if (env.STORAGE_DRIVER === "local") {
    app.use("/api/files", fileRoutes);
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
