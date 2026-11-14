import * as Sentry from "@sentry/node";
import { env } from "./env.js";

/** Error tracking is on only when SENTRY_DSN is set, so local development sends nothing. */
export const sentryEnabled = Boolean(env.SENTRY_DSN);

if (env.SENTRY_DSN) {
    Sentry.init({
        dsn: env.SENTRY_DSN,
        environment: env.NODE_ENV,
        // Errors only; no performance tracing, so the free tier lasts.
        tracesSampleRate: 0,
        // Never attach request bodies or headers: they carry passwords and tokens.
        sendDefaultPii: false,
    });
}

/** Reports an unexpected error with the route and user ids that help reproduce it, never personal data. */
export const captureError = (err: unknown, context: { method?: string; path?: string; userId?: number | undefined; orgId?: number | undefined }) => {
    if (!sentryEnabled) return;
    Sentry.withScope((scope) => {
        scope.setContext("request", { method: context.method, path: context.path });
        if (context.userId) scope.setUser({ id: String(context.userId) });
        if (context.orgId) scope.setTag("orgId", String(context.orgId));
        Sentry.captureException(err);
    });
};
