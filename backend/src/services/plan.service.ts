import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { paymentsEnabled } from "./razorpay.js";
import { effectivePlan, hasRoom, limitsFor, PRO_PRICE_INR, type PlanLimits } from "../domain/plans.js";

const planSelect = { plan: true, planEndsAt: true, planSource: true, customPriceInr: true } as const;

/** FixFlow's message to the owner (a payment problem, a plan change), or null. Cleared from the console. */
export const getNotice = async (orgId: number) => {
    const org = await prisma.organization.findUniqueOrThrow({
        where: { id: orgId },
        select: { noticeMessage: true, noticeLevel: true, noticeAt: true },
    });
    return org.noticeMessage ? { message: org.noticeMessage, level: org.noticeLevel ?? "INFO", at: org.noticeAt } : null;
};

export const getPlan = async (orgId: number) => {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: planSelect });
    const plan = effectivePlan(org);
    return { ...org, effective: plan, limits: limitsFor(plan) };
};

const countMembers = (orgId: number) => prisma.membership.count({ where: { orgId, isActive: true } });
const countReportPoints = (orgId: number) => prisma.reportPoint.count({ where: { orgId, archived: false } });

const upgradeHint = "Upgrade to Pro to add more.";

/*
 * The checks below count before the write rather than inside its transaction. Two people joining in the
 * same instant can take a Free organization one over its limit; that is acceptable for a plan limit.
 */

export const assertCanAddMember = async (orgId: number) => {
    const { limits } = await getPlan(orgId);
    if (!hasRoom(limits.members, await countMembers(orgId))) {
        throw AppError.planLimit(`This organization's Free plan allows ${limits.members} members. ${upgradeHint}`);
    }
};

export const assertCanAddReportPoint = async (orgId: number) => {
    const { limits } = await getPlan(orgId);
    if (!hasRoom(limits.reportPoints, await countReportPoints(orgId))) {
        throw AppError.planLimit(`The Free plan allows ${limits.reportPoints} QR codes. ${upgradeHint}`);
    }
};

const featureNames: Record<"autoAssign" | "csvExport", string> = {
    autoAssign: "Auto-assign",
    csvExport: "CSV export",
};

export const assertFeature = async (orgId: number, feature: keyof typeof featureNames & keyof PlanLimits) => {
    const { limits } = await getPlan(orgId);
    if (!limits[feature]) {
        throw AppError.planLimit(`${featureNames[feature]} is part of the Pro plan.`);
    }
};

/** What the owner's plan page shows: the current plan and the Pro price, discounted when FixFlow agreed one. */
export const getBillingSummary = async (orgId: number) => {
    const [plan, notice] = await Promise.all([getPlan(orgId), getNotice(orgId)]);
    const discountPercent =
        plan.customPriceInr !== null && plan.customPriceInr < PRO_PRICE_INR.monthly
            ? Math.round((1 - plan.customPriceInr / PRO_PRICE_INR.monthly) * 100)
            : 0;
    return {
        plan: plan.effective,
        planEndsAt: plan.effective === "PRO" ? plan.planEndsAt : null,
        planSource: plan.effective === "PRO" ? plan.planSource : null,
        price: {
            ...PRO_PRICE_INR,
            // A discount applies to the monthly price; yearly stays ten months of it.
            ...(plan.customPriceInr !== null ? { monthly: plan.customPriceInr, yearly: plan.customPriceInr * 10 } : {}),
        },
        standardPrice: PRO_PRICE_INR,
        discountPercent,
        notice,
        // Pay online when Razorpay is set up; otherwise the page offers an email to FixFlow.
        onlinePayment: paymentsEnabled,
        // Pro with no end date, given by FixFlow, has nothing to buy.
        canBuy: !(plan.effective === "PRO" && plan.planEndsAt === null),
    };
};
