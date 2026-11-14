import type { IssueCategory, IssueStatus } from "../generated/prisma/enums.js";

/** One issue, reduced to what the reports need. */
export interface IssueFacts {
    status: IssueStatus;
    category: IssueCategory;
    createdAt: Date;
    resolvedAt: Date | null;
    breachedAt: Date | null;
    rating: number | null;
    repairCost: number | null;
    reopenCount: number;
    building: string | null;
    assignee: { id: number; name: string } | null;
}

const HOUR_MS = 60 * 60 * 1000;

const average = (values: number[]) =>
    values.length === 0 ? null : Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;

const percent = (part: number, whole: number) => (whole === 0 ? null : Math.round((part / whole) * 100));

const fixHours = (issue: IssueFacts) =>
    issue.resolvedAt ? (issue.resolvedAt.getTime() - issue.createdAt.getTime()) / HOUR_MS : null;

const isDone = (issue: IssueFacts) => issue.resolvedAt !== null;

/** Counts per key, biggest first. */
const countBy = (issues: IssueFacts[], key: (issue: IssueFacts) => string) => {
    const counts = new Map<string, number>();
    for (const issue of issues) {
        counts.set(key(issue), (counts.get(key(issue)) ?? 0) + 1);
    }
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
};

const summarize = (issues: IssueFacts[]) => {
    const done = issues.filter(isDone);
    const ratings = issues.map((i) => i.rating).filter((r): r is number => r !== null);
    return {
        reported: issues.length,
        resolved: done.length,
        avgFixHours: average(done.map((i) => fixHours(i)!)),
        overduePercent: percent(issues.filter((i) => i.breachedAt).length, issues.length),
        reopenPercent: percent(issues.filter((i) => i.reopenCount > 0).length, issues.length),
        avgRating: average(ratings),
        ratingCount: ratings.length,
    };
};

/** The whole report for issues reported in one period. */
export const buildReport = (issues: IssueFacts[]) => {
    const byTechnician = new Map<number, { name: string; issues: IssueFacts[] }>();
    for (const issue of issues) {
        if (!issue.assignee) continue;
        const entry = byTechnician.get(issue.assignee.id) ?? { name: issue.assignee.name, issues: [] };
        entry.issues.push(issue);
        byTechnician.set(issue.assignee.id, entry);
    }

    return {
        totals: {
            ...summarize(issues),
            repairCost: issues.reduce((sum, i) => sum + (i.repairCost ?? 0), 0),
        },
        byBuilding: countBy(issues, (i) => i.building ?? "Other"),
        byCategory: countBy(issues, (i) => i.category),
        technicians: [...byTechnician]
            .map(([userId, { name, issues: assigned }]) => ({ userId, name, ...summarize(assigned) }))
            .sort((a, b) => b.resolved - a.resolved),
    };
};

// Spreadsheet apps run cells that start with these as formulas.
const FORMULA_START = /^[=+\-@\t\r]/;

const csvCell = (value: string | number | null) => {
    if (value === null) return "";
    const text = String(value);
    const safe = typeof value === "string" && FORMULA_START.test(text) ? `'${text}` : text;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = (rows: (string | number | null)[][]) => rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
