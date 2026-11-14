import type { IssueStatus, OrgRole } from "../generated/prisma/enums.js";

/** How the caller relates to one issue. A person can be several at once (e.g. an admin who reported it). */
export type Actor = "admin" | "assignee" | "reporter";

interface Transition {
    from: IssueStatus[];
    to: IssueStatus;
    by: Actor[];
}

/**
 * Every legal status change and who may make it. Anything not listed is rejected.
 * Assignment (-> ASSIGNED) is separate because it also needs a technician; see ASSIGNABLE_STATUSES.
 */
export const TRANSITIONS: Transition[] = [
    // Admins can also make the work steps, for technicians who report by phone call instead of the app.
    { from: ["ASSIGNED"], to: "ACCEPTED", by: ["assignee", "admin"] },
    // Declining hands the issue back to the admins.
    { from: ["ASSIGNED"], to: "NEW", by: ["assignee"] },
    { from: ["ACCEPTED", "ON_HOLD"], to: "IN_PROGRESS", by: ["assignee", "admin"] },
    { from: ["ACCEPTED", "IN_PROGRESS"], to: "ON_HOLD", by: ["assignee", "admin"] },
    { from: ["IN_PROGRESS"], to: "RESOLVED", by: ["assignee", "admin"] },
    { from: ["RESOLVED"], to: "CLOSED", by: ["reporter", "admin"] },
    { from: ["RESOLVED"], to: "REOPENED", by: ["reporter", "admin"] },
];

// Resolved and closed work can't be silently handed to someone else; it must be reopened first.
export const ASSIGNABLE_STATUSES: IssueStatus[] = ["NEW", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "ON_HOLD", "REOPENED"];

// These changes need a written explanation; the rest are one click.
export const NOTE_REQUIRED_STATUSES: IssueStatus[] = ["NEW", "ON_HOLD", "RESOLVED", "REOPENED"];

export const getActors = (
    user: { userId: number; role: OrgRole },
    issue: { reporterId: number; assigneeId: number | null }
): Actor[] => {
    const actors: Actor[] = [];
    if (user.role === "OWNER" || user.role === "ADMIN") actors.push("admin");
    if (issue.assigneeId === user.userId) actors.push("assignee");
    if (issue.reporterId === user.userId) actors.push("reporter");
    return actors;
};

export const canTransition = (from: IssueStatus, to: IssueStatus, actors: Actor[]) =>
    TRANSITIONS.some((t) => t.to === to && t.from.includes(from) && t.by.some((actor) => actors.includes(actor)));

/** Statuses the caller can move this issue to right now; the UI shows one button per entry. */
export const allowedTransitions = (from: IssueStatus, actors: Actor[]): IssueStatus[] =>
    TRANSITIONS.filter((t) => t.from.includes(from) && t.by.some((actor) => actors.includes(actor))).map((t) => t.to);
