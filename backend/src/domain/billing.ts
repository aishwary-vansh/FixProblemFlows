/**
 * Prepaid Pro: an organization pays for one month or one year, and Pro is extended by that much.
 * Pure rules; the billing service talks to Razorpay and the database.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { effectivePlan, PRO_PRICE_INR } from "./plans.js";
import type { OrgPlanState } from "./planActions.js";

export type Period = "MONTHLY" | "YEARLY";

const DAY_MS = 24 * 60 * 60 * 1000;
export const PERIOD_DAYS: Record<Period, number> = { MONTHLY: 30, YEARLY: 365 };

/** What this organization pays, in rupees: its custom monthly price if FixFlow set one, and a year is ten months. */
export const priceFor = (period: Period, customPriceInr: number | null) => {
    const monthly = customPriceInr ?? PRO_PRICE_INR.monthly;
    return period === "MONTHLY" ? monthly : monthly * 10;
};

/**
 * The plan after a payment. Paying adds the period to the time Pro has left (or starts today), so paying early
 * never loses days. Pro with no end date, given by FixFlow, is left alone: there is nothing to extend.
 */
export const paidPlanChanges = (state: OrgPlanState, period: Period, now = new Date()) => {
    const current = effectivePlan(state, now);
    if (current === "PRO" && state.planEndsAt === null) {
        return null;
    }
    const from = current === "PRO" && state.planEndsAt ? state.planEndsAt : now;
    return {
        plan: "PRO" as const,
        planEndsAt: new Date(from.getTime() + PERIOD_DAYS[period] * DAY_MS),
        planSource: "PAID" as const,
    };
};

const sameHmac = (expectedHex: string, given: string) => {
    const expected = Buffer.from(expectedHex, "utf8");
    const actual = Buffer.from(given, "utf8");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
};

/** Razorpay Checkout's proof of payment: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export const isValidPaymentSignature = (orderId: string, paymentId: string, signature: string, keySecret: string) =>
    sameHmac(createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex"), signature);

/** Razorpay webhooks: HMAC-SHA256 of the raw request body with the webhook secret. */
export const isValidWebhookSignature = (rawBody: Buffer | string, signature: string, webhookSecret: string) =>
    sameHmac(createHmac("sha256", webhookSecret).update(rawBody).digest("hex"), signature);
