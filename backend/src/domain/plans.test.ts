import { describe, expect, it } from "vitest";
import { effectivePlan, hasRoom, limitsFor, trialEndsAt, TRIAL_DAYS } from "./plans.js";

const now = new Date("2026-11-15T10:00:00Z");

describe("effectivePlan", () => {
    it("keeps Free as Free", () => {
        expect(effectivePlan({ plan: "FREE", planEndsAt: null }, now)).toBe("FREE");
    });

    it("treats Pro without an end date as Pro", () => {
        expect(effectivePlan({ plan: "PRO", planEndsAt: null }, now)).toBe("PRO");
    });

    it("treats Pro as Pro until its end date", () => {
        expect(effectivePlan({ plan: "PRO", planEndsAt: new Date("2026-11-16T00:00:00Z") }, now)).toBe("PRO");
    });

    it("drops to Free once Pro has ended", () => {
        expect(effectivePlan({ plan: "PRO", planEndsAt: new Date("2026-11-15T09:59:59Z") }, now)).toBe("FREE");
    });
});

describe("limits", () => {
    it("limits Free to 10 members and 3 QR points, without auto-assign or CSV export", () => {
        expect(limitsFor("FREE")).toEqual({ members: 10, reportPoints: 3, autoAssign: false, csvExport: false });
    });

    it("gives Pro no limits", () => {
        expect(limitsFor("PRO")).toEqual({ members: null, reportPoints: null, autoAssign: true, csvExport: true });
    });

    it("has room below the limit only", () => {
        expect(hasRoom(10, 9)).toBe(true);
        expect(hasRoom(10, 10)).toBe(false);
        expect(hasRoom(null, 5000)).toBe(true);
    });
});

it("ends the trial after the trial length", () => {
    expect(trialEndsAt(now).getTime() - now.getTime()).toBe(TRIAL_DAYS * 24 * 60 * 60 * 1000);
});
