/**
 * What each FixFlow Console action does to an organization's plan. Pure: the service loads the
 * organization, calls planActionChanges, and saves the result with a PlanEvent.
 */
import { effectivePlan, PRO_PRICE_INR, type PlanName } from "./plans.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PlanAction =
    | { action: "grant"; endsAt: Date | null }
    | { action: "extend"; days: number }
    | { action: "revoke" }
    | { action: "price"; priceInr: number | null }
    | { action: "notice"; level: "INFO" | "WARNING" }
    | { action: "clear_notice" };

export interface OrgPlanState {
    plan: PlanName;
    planEndsAt: Date | null;
    planSource: "TRIAL" | "MANUAL" | "PAID" | null;
    customPriceInr: number | null;
}

export type PlanChanges = Partial<OrgPlanState>;

export type PlanActionResult =
    | { ok: true; changes: PlanChanges; event: string; summary: string }
    | { ok: false; message: string };

const day = (date: Date) => date.toISOString().slice(0, 10);

export const proSummary = (endsAt: Date | null) => (endsAt ? `Pro until ${day(endsAt)}` : "Pro, no end date");

export const priceSummary = (priceInr: number | null) => {
    if (priceInr === null) return `Standard price ₹${PRO_PRICE_INR.monthly} a month`;
    const off = Math.round((1 - priceInr / PRO_PRICE_INR.monthly) * 100);
    return off > 0 ? `Price ₹${priceInr} a month (${off}% off)` : `Price ₹${priceInr} a month`;
};

export const planActionChanges = (state: OrgPlanState, input: PlanAction, now = new Date()): PlanActionResult => {
    const current = effectivePlan(state, now);

    switch (input.action) {
        case "grant":
            if (input.endsAt && input.endsAt <= now) {
                return { ok: false, message: "The end date must be in the future" };
            }
            return {
                ok: true,
                changes: { plan: "PRO", planEndsAt: input.endsAt, planSource: "MANUAL" },
                event: "granted",
                summary: proSummary(input.endsAt),
            };

        case "extend": {
            if (current === "PRO" && state.planEndsAt === null) {
                return { ok: false, message: "This organization already has Pro with no end date" };
            }
            // Extending adds to what is left; an ended or Free plan starts from today.
            const from = current === "PRO" && state.planEndsAt ? state.planEndsAt : now;
            const endsAt = new Date(from.getTime() + input.days * DAY_MS);
            // A trial that is extended stays a trial; anything else becomes Pro given by FixFlow.
            const planSource = current === "PRO" && state.planSource === "TRIAL" ? "TRIAL" : "MANUAL";
            return {
                ok: true,
                changes: { plan: "PRO", planEndsAt: endsAt, planSource },
                event: "extended",
                summary: `Extended ${input.days} days: ${planSource === "TRIAL" ? "trial" : "Pro"} until ${day(endsAt)}`,
            };
        }

        case "revoke":
            if (current === "FREE") {
                return { ok: false, message: "This organization is already on Free" };
            }
            return {
                ok: true,
                changes: { plan: "FREE", planEndsAt: null, planSource: null },
                event: "revoked",
                summary: "Pro revoked, now Free",
            };

        case "price":
            return {
                ok: true,
                changes: { customPriceInr: input.priceInr },
                event: "price_set",
                summary: priceSummary(input.priceInr),
            };

        case "notice":
            return {
                ok: true,
                changes: {},
                event: "notice_sent",
                summary: input.level === "WARNING" ? "Warning sent to the owner" : "Notice sent to the owner",
            };

        case "clear_notice":
            return { ok: true, changes: {}, event: "notice_cleared", summary: "Notice removed" };
    }
};
