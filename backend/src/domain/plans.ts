/**
 * Plans and their limits. Pure rules, no database: the services count usage and call these.
 */

export type PlanName = "FREE" | "PRO";

export const TRIAL_DAYS = 14;

/** Shown on the billing page. Payments are not taken in the app yet; the platform admin turns Pro on. */
export const PRO_PRICE_INR = { monthly: 999, yearly: 9990 } as const;

export interface PlanLimits {
    /** Active members, counting every role. Null means no limit. */
    members: number | null;
    /** QR report points that are not removed. Null means no limit. */
    reportPoints: number | null;
    autoAssign: boolean;
    csvExport: boolean;
}

const LIMITS: Record<PlanName, PlanLimits> = {
    FREE: { members: 10, reportPoints: 3, autoAssign: false, csvExport: false },
    PRO: { members: null, reportPoints: null, autoAssign: true, csvExport: true },
};

export interface StoredPlan {
    plan: PlanName;
    planEndsAt: Date | null;
}

/** Pro counts only until its end date; after that the organization is on Free, with nothing deleted. */
export const effectivePlan = (org: StoredPlan, now = new Date()): PlanName =>
    org.plan === "PRO" && (org.planEndsAt === null || org.planEndsAt > now) ? "PRO" : "FREE";

export const limitsFor = (plan: PlanName): PlanLimits => LIMITS[plan];

/** True when one more item would still fit within the limit. */
export const hasRoom = (limit: number | null, used: number) => limit === null || used < limit;

export const trialEndsAt = (now = new Date()) => new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
