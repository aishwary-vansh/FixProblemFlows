import { describe, expect, it } from "vitest";
import { getDueAt, resumeDeadline } from "./sla.js";

const START = new Date("2026-11-02T10:00:00.000Z");

describe("getDueAt", () => {
    it.each([
        ["CRITICAL", "2026-11-02T14:00:00.000Z"],
        ["HIGH", "2026-11-03T10:00:00.000Z"],
        ["MEDIUM", "2026-11-05T10:00:00.000Z"],
        ["LOW", "2026-11-09T10:00:00.000Z"],
    ] as const)("%s deadline", (priority, expected) => {
        expect(getDueAt(priority, START).toISOString()).toBe(expected);
    });
});

describe("resumeDeadline", () => {
    const dueAt = new Date("2026-11-03T10:00:00.000Z");
    const heldAt = new Date("2026-11-02T12:00:00.000Z");
    const now = new Date("2026-11-02T15:00:00.000Z");

    it("adds the time held", () => {
        expect(resumeDeadline({ dueAt, heldAt, breachedAt: null }, now)?.toISOString()).toBe("2026-11-03T13:00:00.000Z");
    });

    it("keeps a deadline that was already missed", () => {
        expect(resumeDeadline({ dueAt, heldAt, breachedAt: heldAt }, now)).toBe(dueAt);
    });

    it("changes nothing if the issue was not on hold", () => {
        expect(resumeDeadline({ dueAt, heldAt: null, breachedAt: null }, now)).toBe(dueAt);
    });
});
