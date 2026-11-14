import type { IssueStatus, Priority } from "../generated/prisma/enums.js";

const HOUR_MS = 60 * 60 * 1000;

/** Hours allowed to resolve an issue, in calendar time (nights and weekends count). */
export const SLA_HOURS: Record<Priority, number> = {
    CRITICAL: 4,
    HIGH: 24,
    MEDIUM: 3 * 24,
    LOW: 7 * 24,
};

// The deadline only runs while work is still owed; it stops at RESOLVED and pauses during ON_HOLD.
export const SLA_OPEN_STATUSES: IssueStatus[] = ["NEW", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "REOPENED"];

// Priority can still change while work is paused; the deadline restarts when it resumes.
export const PRIORITY_EDITABLE_STATUSES: IssueStatus[] = [...SLA_OPEN_STATUSES, "ON_HOLD"];

export const getDueAt = (priority: Priority, from: Date) => new Date(from.getTime() + SLA_HOURS[priority] * HOUR_MS);

interface HeldIssue {
    dueAt: Date | null;
    heldAt: Date | null;
    breachedAt: Date | null;
}

/** Deadline after a hold ends: pushed back by the time held. A deadline already missed stays missed. */
export const resumeDeadline = ({ dueAt, heldAt, breachedAt }: HeldIssue, now: Date) => {
    if (!dueAt || !heldAt || breachedAt) return dueAt;
    return new Date(dueAt.getTime() + (now.getTime() - heldAt.getTime()));
};
