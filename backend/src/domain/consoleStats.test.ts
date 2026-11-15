import { describe, expect, it } from "vitest";
import { dailySeries, monthlySeries } from "./consoleStats.js";

const now = new Date("2026-11-15T10:00:00Z");

describe("dailySeries", () => {
    it("returns every day up to today, filling gaps with zero", () => {
        const series = dailySeries([{ day: new Date("2026-11-14T00:00:00Z"), count: 3 }], 3, now);
        expect(series).toEqual([
            { date: "2026-11-13", count: 0 },
            { date: "2026-11-14", count: 3 },
            { date: "2026-11-15", count: 0 },
        ]);
    });
});

describe("monthlySeries", () => {
    it("counts dates per month, oldest first, including empty months", () => {
        const dates = [new Date("2026-09-02T00:00:00Z"), new Date("2026-11-01T00:00:00Z"), new Date("2026-11-14T00:00:00Z")];
        expect(monthlySeries(dates, 3, now)).toEqual([
            { month: "2026-09", count: 1 },
            { month: "2026-10", count: 0 },
            { month: "2026-11", count: 2 },
        ]);
    });

    it("crosses the year boundary", () => {
        expect(monthlySeries([], 3, new Date("2027-01-10T00:00:00Z")).map((row) => row.month)).toEqual([
            "2026-11",
            "2026-12",
            "2027-01",
        ]);
    });
});
