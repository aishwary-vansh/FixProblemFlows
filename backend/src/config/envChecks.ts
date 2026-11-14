/** The settings these checks look at. Kept free of other imports so it can be unit-tested. */
export interface ProductionSettings {
    NODE_ENV: string;
    JWT_SECRET: string;
    APP_URL: string;
    CORS_ORIGIN: string;
    PUBLIC_API_URL?: string | undefined;
    STORAGE_DRIVER: string;
    VAPID_PUBLIC_KEY?: string | undefined;
    VAPID_PRIVATE_KEY?: string | undefined;
    RESEND_API_KEY?: string | undefined;
}

const MIN_SECRET_LENGTH = 32;
const isLocal = (url: string) => /localhost|127\.0\.0\.1|\[::1\]/.test(url);

/**
 * Mistakes that would make a production server unsafe (errors: refuse to start)
 * or quietly broken (warnings: start, but say what is missing).
 */
export const checkProductionSettings = (settings: ProductionSettings) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (settings.NODE_ENV !== "production") {
        return { errors, warnings };
    }

    if (settings.JWT_SECRET.length < MIN_SECRET_LENGTH || /change|secret|example/i.test(settings.JWT_SECRET)) {
        errors.push(
            `JWT_SECRET must be a random value of at least ${MIN_SECRET_LENGTH} characters. ` +
                `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
        );
    }
    if (isLocal(settings.APP_URL)) {
        errors.push("APP_URL points to localhost. Set it to the web app's public https URL; invite and reset links use it.");
    }
    if (isLocal(settings.CORS_ORIGIN)) {
        errors.push("CORS_ORIGIN points to localhost. Set it to the web app's public URL.");
    }
    if (!settings.PUBLIC_API_URL && settings.STORAGE_DRIVER === "local") {
        errors.push("PUBLIC_API_URL is not set, so photo links would point to localhost.");
    }

    if (settings.STORAGE_DRIVER === "local") {
        warnings.push("STORAGE_DRIVER is local. Most hosts wipe the disk on every deploy, so photos will be lost. Use s3 (e.g. Cloudflare R2).");
    }
    if (!settings.VAPID_PUBLIC_KEY || !settings.VAPID_PRIVATE_KEY) {
        warnings.push("VAPID keys are not set, so phone alerts are off.");
    }
    if (!settings.RESEND_API_KEY) {
        warnings.push("RESEND_API_KEY is not set, so password reset emails will not be sent.");
    }

    return { errors, warnings };
};
