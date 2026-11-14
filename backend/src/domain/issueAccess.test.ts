import { describe, expect, it } from "vitest";
import { hasFullAccess, limitIssueDetail, limitIssueRow } from "./issueAccess.js";

const REPORTER = 1;
const TECH = 2;
const FOLLOWER = 3;
const OTHER_FOLLOWER = 4;
const ADMIN = 5;

const issue = {
    id: 10,
    reporterId: REPORTER,
    assigneeId: TECH,
    title: "Washroom flooded",
    location: "Block B · 1st Floor · Washroom",
    status: "RESOLVED",
    description: "My room 112 is next to it, I'm alone at night",
    reporter: { id: REPORTER, name: "Priya", email: "priya@example.com" },
    rating: 4,
    repairCost: 300,
    repairMinutes: 40,
    resolutionNote: "Replaced the valve",
    attachments: [{ kind: "BEFORE" as const, url: "before" }, { kind: "AFTER" as const, url: "after" }],
    comments: [{ body: "Please hurry" }],
    events: [
        { type: "CREATED" as const, actorId: REPORTER, toStatus: "NEW", note: null, actor: { id: REPORTER, name: "Priya" } },
        { type: "ATTACHMENT_ADDED" as const, actorId: REPORTER, toStatus: null, note: "priya-room.jpg", actor: { id: REPORTER, name: "Priya" } },
        { type: "FOLLOWED" as const, actorId: OTHER_FOLLOWER, toStatus: null, note: null, actor: { id: OTHER_FOLLOWER, name: "Sam" } },
        { type: "FOLLOWED" as const, actorId: FOLLOWER, toStatus: null, note: null, actor: { id: FOLLOWER, name: "Me" } },
        { type: "DECLINED" as const, actorId: TECH, toStatus: "NEW", note: "Not my skill", actor: { id: TECH, name: "Meena" } },
        { type: "ASSIGNED" as const, actorId: ADMIN, toStatus: "ASSIGNED", note: "Assigned to Ravi", actor: { id: ADMIN, name: "Arjun" } },
        { type: "STATUS_CHANGED" as const, actorId: REPORTER, toStatus: "REOPENED", note: "Still leaking near my bed", actor: { id: REPORTER, name: "Priya" } },
        { type: "STATUS_CHANGED" as const, actorId: TECH, toStatus: "RESOLVED", note: "Replaced the valve", actor: { id: TECH, name: "Ravi" } },
        { type: "SLA_BREACHED" as const, actorId: null, toStatus: null, note: null, actor: null },
    ],
};

describe("hasFullAccess", () => {
    it("is for admins, the reporter and the assignee only", () => {
        expect(hasFullAccess({ userId: ADMIN, role: "ADMIN" }, issue)).toBe(true);
        expect(hasFullAccess({ userId: 99, role: "OWNER" }, issue)).toBe(true);
        expect(hasFullAccess({ userId: REPORTER, role: "REQUESTER" }, issue)).toBe(true);
        expect(hasFullAccess({ userId: TECH, role: "TECHNICIAN" }, issue)).toBe(true);
        expect(hasFullAccess({ userId: FOLLOWER, role: "REQUESTER" }, issue)).toBe(false);
        expect(hasFullAccess({ userId: FOLLOWER, role: "TECHNICIAN" }, issue)).toBe(false);
    });
});

describe("limitIssueRow", () => {
    it("blanks the private fields and keeps the rest", () => {
        const row = limitIssueRow(issue);
        expect(row).toMatchObject({ title: issue.title, location: issue.location, status: "RESOLVED", resolutionNote: "Replaced the valve" });
        expect(row).toMatchObject({ description: "", reporter: { id: 0, email: "" }, rating: null, repairCost: null, repairMinutes: null });
        expect(JSON.stringify([row.description, row.reporter])).not.toContain("riya");
    });
});

describe("limitIssueDetail", () => {
    const view = limitIssueDetail(issue, FOLLOWER);

    it("keeps only the after photo and no comments", () => {
        expect(view.attachments).toEqual([{ kind: "AFTER", url: "after" }]);
        expect(view.comments).toEqual([]);
        expect(view.limitedView).toBe(true);
    });

    it("drops declines and photo uploads from the timeline", () => {
        expect(view.events.map((e) => e.type)).not.toContain("DECLINED");
        expect(view.events.map((e) => e.type)).not.toContain("ATTACHMENT_ADDED");
    });

    it("hides the reporter and other followers, but not staff or the viewer", () => {
        const names = view.events.map((e) => e.actor?.name ?? null);
        expect(names).toEqual(["A member", "A member", "Me", "Arjun", "A member", "Ravi", null]);
    });

    it("drops the reporter's reopen note but keeps the technician's notes", () => {
        const notes = view.events.map((e) => e.note);
        expect(notes).not.toContain("Still leaking near my bed");
        expect(notes).toContain("Replaced the valve");
    });

    it("leaks nothing from the reporter", () => {
        const text = JSON.stringify(view);
        for (const secret of ["priya", "Priya", "room 112", "priya-room", "Please hurry", "before"]) {
            expect(text).not.toContain(secret);
        }
    });
});
