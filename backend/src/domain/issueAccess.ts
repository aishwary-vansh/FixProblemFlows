import type { IssueEventType, OrgRole } from "../generated/prisma/enums.js";

/**
 * People who said "me too" can join any open issue at a place, so joining must not reveal anything private.
 * They get what the "Already reported here?" list shows plus progress: status, technician, deadline, the fix
 * and its after photo. The reporter's words, photos, name and the comments stay with the people working on it.
 */

export const hasFullAccess = (
    viewer: { userId: number; role: OrgRole },
    issue: { reporterId: number; assigneeId: number | null }
) =>
    viewer.role === "OWNER" ||
    viewer.role === "ADMIN" ||
    issue.reporterId === viewer.userId ||
    issue.assigneeId === viewer.userId;

/** Repair cost and time are staff information: reporters see what was fixed, not what it cost. */
export const canSeeRepairDetails = (viewer: { userId: number; role: OrgRole }, issue: { assigneeId: number | null }) =>
    viewer.role === "OWNER" || viewer.role === "ADMIN" || issue.assigneeId === viewer.userId;

const HIDDEN_PERSON = { id: 0, name: "A member", email: "" };

export interface IssueRow {
    reporterId: number;
    description: string;
    reporter: { id: number; name: string; email: string };
    rating: number | null;
    repairCost: number | null;
    repairMinutes: number | null;
}

/** For list rows: same fields, private ones blanked. */
export const limitIssueRow = <T extends IssueRow>(issue: T): T => ({
    ...issue,
    description: "",
    reporter: HIDDEN_PERSON,
    rating: null,
    repairCost: null,
    repairMinutes: null,
});

// Timeline entries a follower sees. Declines and photo uploads are between the reporter and the staff.
const FOLLOWER_EVENTS = new Set<IssueEventType>([
    "CREATED",
    "ASSIGNED",
    "STATUS_CHANGED",
    "PRIORITY_CHANGED",
    "SLA_BREACHED",
    "MARKED_DUPLICATE",
    "FOLLOWED",
]);

export interface IssueDetailRow extends IssueRow {
    attachments: { kind: "BEFORE" | "AFTER" }[];
    comments: unknown[];
    events: {
        type: IssueEventType;
        actorId: number | null;
        toStatus: string | null;
        note: string | null;
        actor: { id: number; name: string } | null;
    }[];
}

/** For the issue page. `limitedView` tells the app to explain why details are missing. */
export const limitIssueDetail = <T extends IssueDetailRow>(issue: T, viewerId: number): T & { limitedView: true } => ({
    ...limitIssueRow(issue),
    attachments: issue.attachments.filter((attachment) => attachment.kind === "AFTER"),
    comments: [],
    events: issue.events
        .filter((event) => FOLLOWER_EVENTS.has(event.type))
        .map((event) => {
            // The reporter and other people who said "me too" stay anonymous; staff and the viewer keep their names.
            const hideActor =
                event.actorId !== null &&
                event.actorId !== viewerId &&
                (event.actorId === issue.reporterId || event.type === "FOLLOWED");
            return {
                ...event,
                actor: hideActor ? { id: 0, name: HIDDEN_PERSON.name } : event.actor,
                // A reopen note is the reporter's own words.
                note: event.toStatus === "REOPENED" ? null : event.note,
            };
        }),
    limitedView: true,
});
