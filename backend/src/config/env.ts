import "dotenv/config";
import { z } from "zod";
import { checkProductionSettings } from "./envChecks.js";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    // Most database connections the API opens at once. Set 1 for the local `prisma dev` database.
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    JWT_EXPIRES_IN: z.string().default("1d"),

    // Comma-separated list of allowed browser origins.
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    // Public URL of the web app, used to build invite links.
    APP_URL: z.string().url().default("http://localhost:5173"),
    // Public URL of this API, used to build signed file URLs for the local storage driver.
    PUBLIC_API_URL: z.string().url().optional(),
    // Number of reverse proxies in front of the API (Render, Railway, nginx), so rate limits see the real client IP.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    UPLOAD_DIR: z.string().default("uploads"),
    FILE_URL_SECRET: z.string().optional(),
    FILE_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_ENDPOINT: z.string().url().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z.stringbool().default(false),

    // Web push keys (npx web-push generate-vapid-keys). Push alerts are off when these are missing.
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default("mailto:admin@example.com"),

    // Email (password reset links) is sent through Resend. Without a key, development logs the email instead.
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("FixFlow <onboarding@resend.dev>"),

    // Sentry error tracking. Off when empty.
    SENTRY_DSN: z.string().url().optional(),
    // Comma-separated account ids of the people who run this FixFlow installation; they see the platform console.
    // Ids, not emails: emails aren't verified, so anyone could sign up with a listed address.
    PLATFORM_ADMIN_USER_IDS: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment configuration:\n" + z.prettifyError(parsed.error));
    process.exit(1);
}

const { errors, warnings } = checkProductionSettings(parsed.data);
for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
}
if (errors.length > 0) {
    console.error("Unsafe production configuration:\n- " + errors.join("\n- "));
    process.exit(1);
}

export const env = {
    ...parsed.data,
    PUBLIC_API_URL: parsed.data.PUBLIC_API_URL ?? `http://localhost:${parsed.data.PORT}`,
    FILE_URL_SECRET: parsed.data.FILE_URL_SECRET ?? parsed.data.JWT_SECRET,
    corsOrigins: parsed.data.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean),
    platformAdminUserIds: parsed.data.PLATFORM_ADMIN_USER_IDS.split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
};
