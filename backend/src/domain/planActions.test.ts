import { describe, expect, it } from "vitest";
import { planActionChanges, priceSummary, type OrgPlanState } from "./planActions.js";

const now = new Date("2026-11-15T10:00:00Z");
const free: OrgPlanState = { plan: "FREE", planEndsAt: null, planSource: null, customPriceInr: null };
const trial: OrgPlanState = { plan: "PRO", planEndsAt: new Date("2026-11-20T10:00:00Z"), planSource: "TRIAL", customPriceInr: null };
const proForever: OrgPlanState = { plan: "PRO", planEndsAt: null, planSource: "MANUAL", customPriceInr: null };
const endedPro: OrgPlanState = { plan: "PRO", planEndsAt: new Date("2026-11-01T00:00:00Z"), planSource: "MANUAL", customPriceInr: null };

describe("grant", () => {
    it("gives Pro until the date", () => {
        const result = planActionChanges(free, { action: "grant", endsAt: new Date("2027-01-31T00:00:00Z") }, now);
        expect(result).toMatchObject({ ok: true, changes: { plan: "PRO", planSource: "MANUAL" }, summary: "Pro until 2027-01-31" });
    });

    it("refuses an end date in the past", () => {
        expect(planActionChanges(free, { action: "grant", endsAt: new Date("2026-11-01T00:00:00Z") }, now).ok).toBe(false);
    });
});

describe("extend", () => {
    it("adds days to what is left of a trial and keeps it a trial", () => {
        const result = planActionChanges(trial, { action: "extend", days: 7 }, now);
        expect(result).toMatchObject({ ok: true, changes: { planSource: "TRIAL" } });
        if (result.ok) expect(result.changes.planEndsAt?.toISOString()).toBe("2026-11-27T10:00:00.000Z");
    });

    it("starts from today when Pro has already ended", () => {
        const result = planActionChanges(endedPro, { action: "extend", days: 30 }, now);
        if (!result.ok) throw new Error(result.message);
        expect(result.changes.planEndsAt?.toISOString()).toBe("2026-12-15T10:00:00.000Z");
    });

    it("turns Free into Pro from today", () => {
        const result = planActionChanges(free, { action: "extend", days: 30 }, now);
        expect(result).toMatchObject({ ok: true, changes: { plan: "PRO", planSource: "MANUAL" } });
    });

    it("refuses Pro with no end date", () => {
        expect(planActionChanges(proForever, { action: "extend", days: 30 }, now).ok).toBe(false);
    });
});

describe("revoke", () => {
    it("moves Pro to Free", () => {
        expect(planActionChanges(trial, { action: "revoke" }, now)).toMatchObject({
            ok: true,
            changes: { plan: "FREE", planEndsAt: null, planSource: null },
        });
    });

    it("refuses when the plan is already Free, including an ended Pro", () => {
        expect(planActionChanges(free, { action: "revoke" }, now).ok).toBe(false);
        expect(planActionChanges(endedPro, { action: "revoke" }, now).ok).toBe(false);
    });
});

describe("price", () => {
    it("describes a discount against the standard price", () => {
        expect(priceSummary(699)).toBe("Price ₹699 a month (30% off)");
        expect(priceSummary(null)).toBe("Standard price ₹999 a month");
    });
});
