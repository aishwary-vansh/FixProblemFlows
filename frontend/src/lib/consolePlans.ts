/** Shared by the FixFlow Console's organization table and its Manage panel. */

export const STANDARD_PRICE = 999;

export const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

export const planLabel = (org: { plan: "FREE" | "PRO"; planEndsAt: string | null; planSource: "TRIAL" | "MANUAL" | "PAID" | null }) => {
    if (org.plan === "FREE") return "Free";
    const name = org.planSource === "TRIAL" ? "Pro trial" : org.planSource === "PAID" ? "Pro (paid)" : "Pro";
    return org.planEndsAt ? `${name} until ${formatDate(org.planEndsAt)}` : `${name}, no end date`;
};
