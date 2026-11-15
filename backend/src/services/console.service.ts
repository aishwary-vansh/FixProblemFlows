import prisma from "../config/prisma.js";
import { effectivePlan } from "../domain/plans.js";
import { dailySeries, monthlySeries } from "../domain/consoleStats.js";
import { planActionChanges, type PlanAction } from "../domain/planActions.js";
import { AppError } from "../utils/AppError.js";
import type { PlanActionInput } from "../validators/console.validator.js";

/*
 * Data for the FixFlow Console: every organization, across tenants. Only the console routes call this.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every organization with the numbers that show whether it is actually using FixFlow. */
export const listOrganizationRows = async () => {
    const since = new Date(Date.now() - 30 * DAY_MS);

    const [organizations, recent, lastIssue, owners] = await Promise.all([
        prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                createdAt: true,
                plan: true,
                planEndsAt: true,
                planSource: true,
                customPriceInr: true,
                noticeMessage: true,
                noticeLevel: true,
                noticeAt: true,
                _count: { select: { memberships: { where: { isActive: true } }, issues: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.issue.groupBy({ by: ["orgId"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
        prisma.issue.groupBy({ by: ["orgId"], _max: { createdAt: true } }),
        prisma.membership.findMany({
            where: { role: "OWNER", isActive: true },
            select: { orgId: true, user: { select: { email: true } } },
            orderBy: { createdAt: "asc" },
        }),
    ]);

    const recentByOrg = new Map(recent.map((row) => [row.orgId, row._count._all]));
    const lastByOrg = new Map(lastIssue.map((row) => [row.orgId, row._max.createdAt]));
    const ownerByOrg = new Map<number, string>();
    for (const owner of owners) {
        if (!ownerByOrg.has(owner.orgId)) ownerByOrg.set(owner.orgId, owner.user.email);
    }

    return organizations.map((org) => {
        const plan = effectivePlan(org);
        return {
            id: org.id,
            name: org.name,
            createdAt: org.createdAt,
            plan,
            // Once Pro has ended, the old end date and source no longer describe the plan.
            planEndsAt: plan === "PRO" ? org.planEndsAt : null,
            planSource: plan === "PRO" ? org.planSource : null,
            customPriceInr: org.customPriceInr,
            notice: org.noticeMessage ? { message: org.noticeMessage, level: org.noticeLevel, at: org.noticeAt } : null,
            ownerEmail: ownerByOrg.get(org.id) ?? null,
            members: org._count.memberships,
            issues: org._count.issues,
            issuesLast30Days: recentByOrg.get(org.id) ?? 0,
            lastIssueAt: lastByOrg.get(org.id) ?? null,
        };
    });
};

export type OrganizationRow = Awaited<ReturnType<typeof listOrganizationRows>>[number];

/** The console's front page: totals, two trends, and the organizations that need a look. */
export const getOverview = async () => {
    const now = new Date();
    const since30 = new Date(now.getTime() - 29 * DAY_MS);
    since30.setUTCHours(0, 0, 0, 0);

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [rows, issueDays, paidThisMonth] = await Promise.all([
        listOrganizationRows(),
        prisma.$queryRaw<{ day: Date; count: number }[]>`
            SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
            FROM "Issue"
            WHERE "createdAt" >= ${since30}
            GROUP BY 1`,
        prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amountPaise: true }, _count: true }),
    ]);

    const isTrial = (row: OrganizationRow) => row.plan === "PRO" && row.planSource === "TRIAL";
    const weekAhead = now.getTime() + 7 * DAY_MS;
    const twoWeeksAgo = now.getTime() - 14 * DAY_MS;

    return {
        totals: {
            organizations: rows.length,
            activeLast30Days: rows.filter((row) => row.issuesLast30Days > 0).length,
            onPro: rows.filter((row) => row.plan === "PRO" && !isTrial(row)).length,
            onTrial: rows.filter(isTrial).length,
            members: rows.reduce((sum, row) => sum + row.members, 0),
            issuesLast30Days: rows.reduce((sum, row) => sum + row.issuesLast30Days, 0),
            // Online payments this calendar month (UTC), in rupees.
            paidThisMonthInr: (paidThisMonth._sum.amountPaise ?? 0) / 100,
            paymentsThisMonth: paidThisMonth._count,
        },
        planMix: {
            free: rows.filter((row) => row.plan === "FREE").length,
            trial: rows.filter(isTrial).length,
            pro: rows.filter((row) => row.plan === "PRO" && !isTrial(row)).length,
        },
        signupsByMonth: monthlySeries(rows.map((row) => row.createdAt), 6, now),
        issuesByDay: dailySeries(issueDays, 30, now),
        // Worth a call before the trial ends.
        trialsEnding: rows
            .filter((row) => isTrial(row) && row.planEndsAt && row.planEndsAt.getTime() <= weekAhead)
            .sort((a, b) => a.planEndsAt!.getTime() - b.planEndsAt!.getTime())
            .slice(0, 5),
        mostActive: [...rows]
            .filter((row) => row.issuesLast30Days > 0)
            .sort((a, b) => b.issuesLast30Days - a.issuesLast30Days)
            .slice(0, 5),
        // Signed up more than two weeks ago but reported nothing in the last 30 days.
        quiet: rows.filter((row) => row.createdAt.getTime() < twoWeeksAgo && row.issuesLast30Days === 0).slice(0, 5),
    };
};

const toDomainAction = (input: PlanActionInput): PlanAction => {
    switch (input.action) {
        case "grant":
            return { action: "grant", endsAt: input.endsAt ? new Date(input.endsAt) : null };
        case "extend":
            return { action: "extend", days: input.days };
        case "revoke":
            return { action: "revoke" };
        case "price":
            return { action: "price", priceInr: input.priceInr };
        case "notice":
            return { action: "notice", level: input.level };
        case "clear_notice":
            return { action: "clear_notice" };
    }
};

/**
 * Applies one console action: the plan change, the owner's notice, the console's history entry, and an entry in
 * the organization's own activity log for plan changes (with the note only when it was shared with the owner).
 */
export const applyPlanAction = async (orgId: number, adminId: number, input: PlanActionInput) => {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { plan: true, planEndsAt: true, planSource: true, customPriceInr: true },
    });
    if (!org) {
        throw AppError.notFound("Organization");
    }

    const result = planActionChanges(org, toDomainAction(input));
    if (!result.ok) {
        throw AppError.conflict(result.message);
    }

    const note = input.note?.trim() || null;
    const shared = input.action === "notice" || (input.action !== "clear_notice" && input.shareWithOwner && note !== null);
    const notice =
        input.action === "clear_notice"
            ? { noticeMessage: null, noticeLevel: null, noticeAt: null }
            : shared
              ? {
                    noticeMessage: note,
                    noticeLevel: input.action === "notice" ? input.level : input.action === "revoke" ? ("WARNING" as const) : ("INFO" as const),
                    noticeAt: new Date(),
                }
              : {};
    const changesPlan = input.action !== "notice" && input.action !== "clear_notice";

    await prisma.$transaction(async (tx) => {
        await tx.organization.update({ where: { id: orgId }, data: { ...result.changes, ...notice } });
        await tx.planEvent.create({
            data: { orgId, actorId: adminId, action: result.event, summary: result.summary, note, sharedWithOwner: shared },
        });
        if (changesPlan) {
            await tx.auditLog.create({
                data: {
                    orgId,
                    actorId: adminId,
                    action: "plan.changed",
                    target: result.summary,
                    ...(shared && note ? { details: { note } } : {}),
                },
            });
        }
    });

    return (await listOrganizationRows()).find((row) => row.id === orgId)!;
};

/** The console's record of what was done to this organization's plan, newest first. */
export const getPlanHistory = (orgId: number) =>
    prisma.planEvent.findMany({
        where: { orgId },
        select: {
            id: true,
            action: true,
            summary: true,
            note: true,
            sharedWithOwner: true,
            createdAt: true,
            actor: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
    });
