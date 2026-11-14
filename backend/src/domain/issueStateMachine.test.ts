import { describe, expect, it } from "vitest";
import { allowedTransitions, canTransition, getActors } from "./issueStateMachine.js";

describe("canTransition", () => {
    it.each([
        ["ASSIGNED", "ACCEPTED", "assignee"],
        ["ASSIGNED", "NEW", "assignee"],
        ["ACCEPTED", "IN_PROGRESS", "assignee"],
        ["ACCEPTED", "ON_HOLD", "assignee"],
        ["IN_PROGRESS", "ON_HOLD", "assignee"],
        ["ON_HOLD", "IN_PROGRESS", "assignee"],
        ["IN_PROGRESS", "RESOLVED", "assignee"],
        ["ASSIGNED", "ACCEPTED", "admin"], // on behalf of the technician
        ["ACCEPTED", "IN_PROGRESS", "admin"],
        ["IN_PROGRESS", "ON_HOLD", "admin"],
        ["IN_PROGRESS", "RESOLVED", "admin"],
        ["RESOLVED", "CLOSED", "reporter"],
        ["RESOLVED", "CLOSED", "admin"],
        ["RESOLVED", "REOPENED", "reporter"],
        ["RESOLVED", "REOPENED", "admin"],
    ] as const)("allows %s -> %s by %s", (from, to, actor) => {
        expect(canTransition(from, to, [actor])).toBe(true);
    });

    it.each([
        ["NEW", "RESOLVED", "assignee"], // skipping steps
        ["ASSIGNED", "IN_PROGRESS", "assignee"], // skipping accept
        ["ASSIGNED", "NEW", "admin"], // admins reassign instead of declining
        ["NEW", "ACCEPTED", "admin"], // nobody to act for until it's assigned
        ["IN_PROGRESS", "RESOLVED", "reporter"], // reporter can't resolve
        ["RESOLVED", "CLOSED", "assignee"], // technician can't close their own work
        ["CLOSED", "REOPENED", "reporter"], // closed is final
        ["ACCEPTED", "NEW", "assignee"], // can only decline before accepting
        ["ON_HOLD", "RESOLVED", "assignee"], // must resume first
        ["REOPENED", "ACCEPTED", "assignee"], // must be reassigned first
    ] as const)("rejects %s -> %s by %s", (from, to, actor) => {
        expect(canTransition(from, to, [actor])).toBe(false);
    });

    it("rejects everything for someone unrelated to the issue", () => {
        expect(canTransition("RESOLVED", "CLOSED", [])).toBe(false);
    });
});

describe("allowedTransitions", () => {
    it("offers the reporter both verification outcomes", () => {
        expect(allowedTransitions("RESOLVED", ["reporter"])).toEqual(["CLOSED", "REOPENED"]);
    });

    it("offers the assignee the next work step", () => {
        expect(allowedTransitions("ACCEPTED", ["assignee"])).toEqual(["IN_PROGRESS", "ON_HOLD"]);
        expect(allowedTransitions("ASSIGNED", ["assignee"])).toEqual(["ACCEPTED", "NEW"]);
        expect(allowedTransitions("ON_HOLD", ["assignee"])).toEqual(["IN_PROGRESS"]);
    });

    it("offers nothing on a closed issue", () => {
        expect(allowedTransitions("CLOSED", ["admin", "reporter"])).toEqual([]);
    });
});

describe("getActors", () => {
    it("combines roles", () => {
        expect(getActors({ userId: 1, role: "ADMIN" }, { reporterId: 1, assigneeId: 2 })).toEqual(["admin", "reporter"]);
        expect(getActors({ userId: 2, role: "TECHNICIAN" }, { reporterId: 1, assigneeId: 2 })).toEqual(["assignee"]);
        expect(getActors({ userId: 3, role: "REQUESTER" }, { reporterId: 1, assigneeId: 2 })).toEqual([]);
    });
});
