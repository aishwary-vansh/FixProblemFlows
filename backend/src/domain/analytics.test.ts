import { describe, expect, it } from "vitest";
import { buildReport, toCsv, type IssueFacts } from "./analytics.js";

const HOUR = 60 * 60 * 1000;
const start = new Date("2026-11-01T00:00:00Z");
const ravi = { id: 1, name: "Ravi" };
const meena = { id: 2, name: "Meena" };

const issue = (overrides: Partial<IssueFacts>): IssueFacts => ({
    status: "NEW",
    category: "PLUMBING",
    createdAt: start,
    resolvedAt: null,
    breachedAt: null,
    rating: null,
    repairCost: null,
    reopenCount: 0,
    building: "Block A",
    assignee: null,
    ...overrides,
});

describe("buildReport", () => {
    const issues = [
        issue({ status: "CLOSED", resolvedAt: new Date(start.getTime() + 2 * HOUR), rating: 5, repairCost: 300, assignee: ravi }),
        issue({ status: "RESOLVED", resolvedAt: new Date(start.getTime() + 4 * HOUR), rating: null, repairCost: 200, assignee: ravi, reopenCount: 1 }),
        issue({ status: "IN_PROGRESS", category: "ELECTRICAL", breachedAt: start, assignee: meena, building: null }),
        issue({ status: "NEW", category: "ELECTRICAL", building: "Mess" }),
    ];
    const report = buildReport(issues);

    it("totals the period", () => {
        expect(report.totals).toEqual({
            reported: 4,
            resolved: 2,
            avgFixHours: 3,
            overduePercent: 25,
            reopenPercent: 25,
            avgRating: 5,
            ratingCount: 1,
            repairCost: 500,
        });
    });

    it("groups by building, with no building as Other", () => {
        expect(report.byBuilding).toEqual([
            { name: "Block A", count: 2 },
            { name: "Other", count: 1 },
            { name: "Mess", count: 1 },
        ]);
    });

    it("groups by category, biggest first", () => {
        expect(report.byCategory.map((c) => c.count)).toEqual([2, 2]);
    });

    it("scores each technician on their own issues only", () => {
        expect(report.technicians).toEqual([
            { userId: 1, name: "Ravi", reported: 2, resolved: 2, avgFixHours: 3, overduePercent: 0, reopenPercent: 50, avgRating: 5, ratingCount: 1 },
            { userId: 2, name: "Meena", reported: 1, resolved: 0, avgFixHours: null, overduePercent: 100, reopenPercent: 0, avgRating: null, ratingCount: 0 },
        ]);
    });

    it("handles an empty period", () => {
        expect(buildReport([]).totals).toMatchObject({ reported: 0, avgFixHours: null, overduePercent: null });
    });
});

describe("toCsv", () => {
    it("quotes commas, quotes and new lines", () => {
        expect(toCsv([["a,b", 'say "hi"', "two\nlines", 3, null]])).toBe('"a,b","say ""hi""","two\nlines",3,');
    });

    it("stops text from running as a spreadsheet formula", () => {
        expect(toCsv([["=SUM(A1)", "@cmd", "-1", -1]])).toBe("'=SUM(A1),'@cmd,'-1,-1");
    });
});
