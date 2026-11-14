import { describe, expect, it } from "vitest";
import { checkProductionSettings, type ProductionSettings } from "./envChecks.js";

const good: ProductionSettings = {
    NODE_ENV: "production",
    JWT_SECRET: "k3J9vQ2xT7mW4pL8nR1sY6bZ0cF5hD2gA9eU3tV7",
    APP_URL: "https://fixflow.app",
    CORS_ORIGIN: "https://fixflow.app",
    PUBLIC_API_URL: "https://api.fixflow.app",
    STORAGE_DRIVER: "s3",
    VAPID_PUBLIC_KEY: "public",
    VAPID_PRIVATE_KEY: "private",
    RESEND_API_KEY: "re_123",
};

describe("checkProductionSettings", () => {
    it("passes a complete production setup", () => {
        expect(checkProductionSettings(good)).toEqual({ errors: [], warnings: [] });
    });

    it("ignores development", () => {
        expect(checkProductionSettings({ ...good, NODE_ENV: "development", JWT_SECRET: "x", APP_URL: "http://localhost:5173" }).errors).toEqual([]);
    });

    it("refuses a short or placeholder secret", () => {
        expect(checkProductionSettings({ ...good, JWT_SECRET: "short" }).errors).toHaveLength(1);
        expect(checkProductionSettings({ ...good, JWT_SECRET: "change-me-to-a-long-random-string-please" }).errors).toHaveLength(1);
    });

    it("refuses localhost URLs", () => {
        const { errors } = checkProductionSettings({ ...good, APP_URL: "http://localhost:5173", CORS_ORIGIN: "http://127.0.0.1:5173" });
        expect(errors).toHaveLength(2);
    });

    it("warns about what is missing but still works", () => {
        const { errors, warnings } = checkProductionSettings({
            ...good,
            STORAGE_DRIVER: "local",
            VAPID_PUBLIC_KEY: undefined,
            RESEND_API_KEY: undefined,
        });
        expect(errors).toEqual([]);
        expect(warnings).toHaveLength(3);
    });
});
