import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidPaymentSignature, isValidWebhookSignature, paidPlanChanges, priceFor } from "./billing.js";

const now = new Date("2026-11-15T10:00:00Z");

describe("priceFor", () => {
    it("charges the standard price, and ten months for a year", () => {
        expect(priceFor("MONTHLY", null)).toBe(999);
        expect(priceFor("YEARLY", null)).toBe(9990);
    });

    it("charges the organization's custom price", () => {
        expect(priceFor("MONTHLY", 699)).toBe(699);
        expect(priceFor("YEARLY", 699)).toBe(6990);
    });
});

describe("paidPlanChanges", () => {
    it("starts Pro today on Free", () => {
        const changes = paidPlanChanges({ plan: "FREE", planEndsAt: null, planSource: null, customPriceInr: null }, "MONTHLY", now);
        expect(changes?.planEndsAt.toISOString()).toBe("2026-12-15T10:00:00.000Z");
        expect(changes?.planSource).toBe("PAID");
    });

    it("adds to the days a trial has left, so paying early loses nothing", () => {
        const trial = { plan: "PRO" as const, planEndsAt: new Date("2026-11-20T10:00:00Z"), planSource: "TRIAL" as const, customPriceInr: null };
        expect(paidPlanChanges(trial, "YEARLY", now)?.planEndsAt.toISOString()).toBe("2027-11-20T10:00:00.000Z");
    });

    it("starts today when Pro has already ended", () => {
        const ended = { plan: "PRO" as const, planEndsAt: new Date("2026-11-01T00:00:00Z"), planSource: "PAID" as const, customPriceInr: null };
        expect(paidPlanChanges(ended, "MONTHLY", now)?.planEndsAt.toISOString()).toBe("2026-12-15T10:00:00.000Z");
    });

    it("leaves Pro with no end date alone", () => {
        expect(paidPlanChanges({ plan: "PRO", planEndsAt: null, planSource: "MANUAL", customPriceInr: null }, "MONTHLY", now)).toBeNull();
    });
});

describe("signatures", () => {
    it("accepts Razorpay's checkout signature and rejects a changed one", () => {
        const signature = createHmac("sha256", "key_secret").update("order_1|pay_1").digest("hex");
        expect(isValidPaymentSignature("order_1", "pay_1", signature, "key_secret")).toBe(true);
        expect(isValidPaymentSignature("order_1", "pay_2", signature, "key_secret")).toBe(false);
        expect(isValidPaymentSignature("order_1", "pay_1", "short", "key_secret")).toBe(false);
    });

    it("checks webhooks against the raw body", () => {
        const body = Buffer.from('{"event":"payment.captured"}');
        const signature = createHmac("sha256", "hook_secret").update(body).digest("hex");
        expect(isValidWebhookSignature(body, signature, "hook_secret")).toBe(true);
        expect(isValidWebhookSignature(Buffer.from('{"event":"payment.failed"}'), signature, "hook_secret")).toBe(false);
    });
});
