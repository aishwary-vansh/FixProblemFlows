import { tenantPrisma } from "../config/prisma.js";
import { buildReport, toCsv } from "../domain/analytics.js";
import type { AuthContext } from "../types/auth.js";

// Enough for a busy year at one site; beyond this the report covers the newest issues.
const MAX_ROWS = 10_000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every issue reported in the last `days` days, with what the report and export need. */
const loadIssues = (ctx: AuthContext, days: number) =>
    tenantPrisma(ctx.orgId).issue.findMany({
        // Duplicates are the same problem as another issue, so they'd count it twice.
        where: { createdAt: { gte: new Date(Date.now() - days * DAY_MS) }, duplicateOfId: null },
        select: {
            id: true,
            title: true,
            location: true,
            status: true,
            category: true,
            priority: true,
            createdAt: true,
            resolvedAt: true,
            breachedAt: true,
            rating: true,
            repairCost: true,
            reporter: { select: { name: true } },
            assignee: { select: { id: true, name: true } },
            place: { select: { name: true, parent: { select: { name: true } } } },
            _count: { select: { events: { where: { toStatus: "REOPENED" } } } },
        },
        orderBy: { id: "desc" },
        take: MAX_ROWS,
    });

type IssueRow = Awaited<ReturnType<typeof loadIssues>>[number];

// A floor counts towards its building.
const buildingOf = (issue: IssueRow) => issue.place?.parent?.name ?? issue.place?.name ?? null;

export const getReport = async (ctx: AuthContext, days: number) => {
    const issues = await loadIssues(ctx, days);

    return {
        days,
        ...buildReport(
            issues.map((issue) => ({
                ...issue,
                reopenCount: issue._count.events,
                building: buildingOf(issue),
            }))
        ),
    };
};

const isoDate = (date: Date | null) => (date ? date.toISOString().slice(0, 16).replace("T", " ") : null);

export const exportIssuesCsv = async (ctx: AuthContext, days: number) => {
    const issues = await loadIssues(ctx, days);

    return toCsv([
        ["ID", "Title", "Building", "Location", "Category", "Priority", "Status", "Reported by", "Assigned to", "Reported at (UTC)", "Resolved at (UTC)", "Hours to fix", "Overdue", "Reopened", "Rating", "Repair cost"],
        ...issues.map((issue) => [
            issue.id,
            issue.title,
            buildingOf(issue),
            issue.location,
            issue.category,
            issue.priority,
            issue.status,
            issue.reporter.name,
            issue.assignee?.name ?? null,
            isoDate(issue.createdAt),
            isoDate(issue.resolvedAt),
            issue.resolvedAt ? Math.round(((issue.resolvedAt.getTime() - issue.createdAt.getTime()) / 3_600_000) * 10) / 10 : null,
            issue.breachedAt ? "Yes" : "No",
            issue._count.events > 0 ? "Yes" : "No",
            issue.rating,
            issue.repairCost,
        ]),
    ]);
};
