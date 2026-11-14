import { randomUUID } from "node:crypto";
import { tenantPrisma } from "../config/prisma.js";
import type { AttachmentKind, IssueStatus, NotificationType, Priority, Prisma } from "../generated/prisma/client.js";
import { getStorage } from "../storage/index.js";
import { AppError } from "../utils/AppError.js";
import { detectImageType } from "../utils/fileType.js";
import { isAdminRole } from "../middleware/role.middleware.js";
import { ASSIGNABLE_STATUSES, allowedTransitions, canTransition, getActors } from "../domain/issueStateMachine.js";
import { pickAutoAssignee, scoreTechnician } from "../domain/dispatch.js";
import { formatIssueLocation } from "../domain/locations.js";
import { canSeeRepairDetails, hasFullAccess, limitIssueDetail, limitIssueRow } from "../domain/issueAccess.js";
import { PRIORITY_EDITABLE_STATUSES, SLA_OPEN_STATUSES, getDueAt, resumeDeadline } from "../domain/sla.js";
import { getCandidates } from "./dispatch.service.js";
import { getAdminUserIds, notify } from "./notification.service.js";
import type { Tx } from "./notification.service.js";
import type { AuthContext } from "../types/auth.js";
import type {
    CreateIssueInput,
    IssueStatsQuery,
    ListIssuesQuery,
    SimilarIssuesQuery,
    TransitionInput,
} from "../validators/issue.validator.js";

const userSummary = { select: { id: true, name: true, email: true } } as const;

const issueInclude = {
    reporter: userSummary,
    assignee: userSummary,
    // How many other people said "me too".
    _count: { select: { followers: true } },
} as const;

const followedBy = (userId: number): Prisma.IssueWhereInput => ({ followers: { some: { userId } } });

/**
 * Issues the caller works on, with full access: admins see all, technicians what they reported or were
 * assigned, requesters what they reported. The org itself is enforced by the tenant client.
 */
const workingOn = (ctx: AuthContext): Prisma.IssueWhereInput => {
    if (isAdminRole(ctx.role)) return {};
    if (ctx.role === "TECHNICIAN") {
        return { OR: [{ assigneeId: ctx.userId }, { reporterId: ctx.userId }] };
    }
    return { reporterId: ctx.userId };
};

/** Rows the caller may see: what they work on, plus issues they said "me too" to (shown limited, see domain/issueAccess). */
const visibleTo = (ctx: AuthContext): Prisma.IssueWhereInput => {
    if (isAdminRole(ctx.role)) return {};
    return { OR: [workingOn(ctx), followedBy(ctx.userId)] };
};

const mineFilter = (ctx: AuthContext, mine: "reported" | "assigned" | undefined): Prisma.IssueWhereInput => {
    if (mine === "reported") return { OR: [{ reporterId: ctx.userId }, followedBy(ctx.userId)] };
    if (mine === "assigned") return { assigneeId: ctx.userId };
    return {};
};

/**
 * Shapes an issue for the caller: people who only said "me too" get the limited view (domain/issueAccess),
 * and reporters don't get repair cost and time.
 */
const forViewer = <T extends Parameters<typeof limitIssueRow>[0] & { assigneeId: number | null }>(ctx: AuthContext, issue: T): T => {
    if (!hasFullAccess(ctx, issue)) return limitIssueRow(issue);
    if (!canSeeRepairDetails(ctx, issue)) return { ...issue, repairCost: null, repairMinutes: null };
    return issue;
};

/**
 * Loads an issue the caller works on, for comments, photos and status changes, or 404 (not 403, so ids of
 * other people's issues can't be probed). People who only said "me too" can watch but not act.
 */
export const findVisibleIssue = async (ctx: AuthContext, issueId: number) => {
    const issue = await tenantPrisma(ctx.orgId).issue.findFirst({ where: { id: issueId, ...workingOn(ctx) } });
    if (!issue) {
        throw AppError.notFound("Issue");
    }
    return issue;
};

type AttachmentRow = {
    id: number;
    issueId: number;
    fileName: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
    kind: AttachmentKind;
    createdAt: Date;
};

/** Never expose storage keys; hand out short-lived URLs instead. */
const toAttachmentDto = async ({ storageKey, ...attachment }: AttachmentRow) => {
    const storage = await getStorage();
    return { ...attachment, url: await storage.getUrl(storageKey) };
};

const label = (issue: { id: number; title: string }) => `#${issue.id} "${issue.title}"`;

const overdueFilter: Prisma.IssueWhereInput = { status: { in: SLA_OPEN_STATUSES }, breachedAt: { not: null } };

interface Assignment {
    orgId: number;
    // Null when the system auto-assigns.
    actorId: number | null;
    issue: {
        id: number;
        title: string;
        location: string;
        status: IssueStatus;
        dueAt: Date | null;
        heldAt: Date | null;
        breachedAt: Date | null;
    };
    technicianId: number;
    note: string;
}

/** Sets the assignee, records why on the timeline, and tells the technician. */
const recordAssignment = async (tx: Tx, { orgId, actorId, issue, technicianId, note }: Assignment) => {
    const { count } = await tx.issue.updateMany({
        where: { id: issue.id, status: issue.status },
        data: {
            assigneeId: technicianId,
            status: "ASSIGNED",
            // Reassigning a held issue restarts its clock.
            ...(issue.heldAt ? { dueAt: resumeDeadline(issue, new Date()), heldAt: null } : {}),
        },
    });
    if (count === 0) {
        throw AppError.conflict("This issue was just updated by someone else. Refresh and try again.");
    }

    await tx.issueEvent.create({
        data: {
            orgId,
            issueId: issue.id,
            actorId,
            type: "ASSIGNED",
            fromStatus: issue.status,
            toStatus: "ASSIGNED",
            note,
        },
    });

    await notify(tx, {
        orgId,
        issueId: issue.id,
        actorId,
        type: "ISSUE_ASSIGNED",
        message: `You were assigned ${label(issue)} at ${issue.location}`,
        userIds: [technicianId],
    });
};

export const createIssue = async (ctx: AuthContext, input: CreateIssueInput) => {
    return tenantPrisma(ctx.orgId).$transaction(async (tx) => {
        const place = input.locationId
            ? await tx.location.findFirst({
                where: { id: input.locationId, archived: false },
                select: { name: true, parent: { select: { name: true } } },
            })
            : null;
        if (input.locationId && !place) {
            throw AppError.notFound("Location");
        }

        const issue = await tx.issue.create({
            data: {
                ...input,
                location: formatIssueLocation(place, input.location),
                locationId: input.locationId ?? null,
                orgId: ctx.orgId,
                reporterId: ctx.userId,
                dueAt: getDueAt(input.priority, new Date()),
            },
            include: issueInclude,
        });

        await tx.issueEvent.create({
            data: { orgId: ctx.orgId, issueId: issue.id, actorId: ctx.userId, type: "CREATED", toStatus: "NEW" },
        });

        await notify(tx, {
            orgId: ctx.orgId,
            issueId: issue.id,
            actorId: ctx.userId,
            type: "ISSUE_CREATED",
            message: `New issue ${label(issue)} at ${issue.location}`,
            userIds: await getAdminUserIds(tx),
        });

        const organization = await tx.organization.findUnique({
            where: { id: ctx.orgId },
            select: { autoAssign: true },
        });
        if (!organization?.autoAssign) {
            return issue;
        }

        const candidates = (await getCandidates(tx)).filter((candidate) => candidate.userId !== ctx.userId);
        const technician = pickAutoAssignee(candidates, issue.category);
        if (!technician) {
            return issue;
        }

        await recordAssignment(tx, {
            orgId: ctx.orgId,
            actorId: null,
            issue,
            technicianId: technician.userId,
            note: `Auto-assigned to ${technician.name}: ${technician.reason}`,
        });

        return tx.issue.findUniqueOrThrow({ where: { id: issue.id }, include: issueInclude });
    });
};

export const listIssues = async (ctx: AuthContext, query: ListIssuesQuery) => {
    const where: Prisma.IssueWhereInput = {
        AND: [
            visibleTo(ctx),
            mineFilter(ctx, query.mine),
            query.status ? { status: query.status } : {},
            query.priority ? { priority: query.priority } : {},
            query.category ? { category: query.category } : {},
            query.assigneeId ? { assigneeId: query.assigneeId } : {},
            query.locationId
                ? { OR: [{ locationId: query.locationId }, { place: { parentId: query.locationId } }] }
                : {},
            query.overdue ? overdueFilter : {},
            // Ids grow with time, so "older than the last row" is a stable cursor.
            query.cursor ? { id: { lt: query.cursor } } : {},
            query.q
                ? {
                      OR: [
                          { title: { contains: query.q, mode: "insensitive" } },
                          { description: { contains: query.q, mode: "insensitive" } },
                          { location: { contains: query.q, mode: "insensitive" } },
                      ],
                  }
                : {},
        ],
    };

    const rows = await tenantPrisma(ctx.orgId).issue.findMany({
        where,
        include: issueInclude,
        orderBy: { id: "desc" },
        take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = (hasMore ? rows.slice(0, query.limit) : rows).map((issue) => forViewer(ctx, issue));

    return {
        items,
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
};

/** Counts per status for dashboards, so they don't need to download every issue. */
export const getIssueStats = async (ctx: AuthContext, query: IssueStatsQuery) => {
    const db = tenantPrisma(ctx.orgId);
    const scope: Prisma.IssueWhereInput[] = [visibleTo(ctx), mineFilter(ctx, query.mine)];

    const [groups, overdue] = await Promise.all([
        db.issue.groupBy({
            by: ["status"],
            where: { AND: scope },
            _count: { _all: true },
        }),
        db.issue.count({ where: { AND: [...scope, overdueFilter] } }),
    ]);

    const byStatus: Record<IssueStatus, number> = {
        NEW: 0,
        ASSIGNED: 0,
        ACCEPTED: 0,
        IN_PROGRESS: 0,
        ON_HOLD: 0,
        RESOLVED: 0,
        CLOSED: 0,
        REOPENED: 0,
    };
    for (const group of groups) {
        byStatus[group.status] = group._count._all;
    }

    return {
        total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
        overdue,
        byStatus,
    };
};

/** Full issue page: details, attachments, timeline, comments, and the actions open to the caller. */
export const getIssueById = async (ctx: AuthContext, issueId: number) => {
    const issue = await tenantPrisma(ctx.orgId).issue.findFirst({
        where: { id: issueId, ...visibleTo(ctx) },
        include: {
            ...issueInclude,
            attachments: { orderBy: { createdAt: "desc" } },
            events: {
                orderBy: { id: "asc" },
                include: { actor: { select: { id: true, name: true } } },
            },
            comments: {
                orderBy: { id: "asc" },
                include: { author: { select: { id: true, name: true } } },
            },
            duplicateOf: { select: { id: true, title: true, status: true } },
            followers: { where: { userId: ctx.userId }, select: { id: true } },
        },
    });

    if (!issue) {
        throw AppError.notFound("Issue");
    }

    const { followers, ...rest } = issue;

    const detail = {
        ...rest,
        attachments: await Promise.all(issue.attachments.map(toAttachmentDto)),
        allowedTransitions: allowedTransitions(issue.status, getActors(ctx, issue)),
        canAssign: isAdminRole(ctx.role) && ASSIGNABLE_STATUSES.includes(issue.status),
        canChangePriority: isAdminRole(ctx.role) && PRIORITY_EDITABLE_STATUSES.includes(issue.status),
        canMarkDuplicate: isAdminRole(ctx.role) && OPEN_FOR_DUPLICATES.includes(issue.status),
        isFollowing: followers.length > 0,
        limitedView: false,
    };

    if (!hasFullAccess(ctx, issue)) return limitIssueDetail(detail, ctx.userId);
    return canSeeRepairDetails(ctx, issue) ? detail : { ...detail, repairCost: null, repairMinutes: null };
};

const STATUS_MESSAGES: Partial<Record<IssueStatus, string>> = {
    NEW: "was declined by the technician and needs reassigning",
    ACCEPTED: "was accepted",
    IN_PROGRESS: "is now being worked on",
    ON_HOLD: "was put on hold",
    RESOLVED: "was marked resolved. Please confirm whether it's fixed.",
    CLOSED: "was confirmed fixed and closed",
    REOPENED: "was reopened: the reporter says it's not fixed",
};

const NOTIFICATION_TYPES: Partial<Record<IssueStatus, NotificationType>> = {
    NEW: "ISSUE_DECLINED",
    ON_HOLD: "ISSUE_ON_HOLD",
    RESOLVED: "VERIFICATION_REQUESTED",
    REOPENED: "ISSUE_REOPENED",
};

/** Proof must be new: a photo from an earlier attempt can't close a reopened issue. */
const requireAfterPhoto = async (ctx: AuthContext, issueId: number) => {
    const db = tenantPrisma(ctx.orgId);

    const lastAssigned = await db.issueEvent.findFirst({
        where: { issueId, type: "ASSIGNED" },
        orderBy: { id: "desc" },
        select: { createdAt: true },
    });

    const photo = await db.attachment.findFirst({
        where: {
            issueId,
            kind: "AFTER",
            ...(lastAssigned ? { createdAt: { gte: lastAssigned.createdAt } } : {}),
        },
        select: { id: true },
    });

    if (!photo) {
        throw AppError.badRequest("Add an after photo to show the fix");
    }
};

/** Fields that change alongside the status for each kind of move. */
const transitionFields = (
    issue: { priority: Priority; status: IssueStatus; dueAt: Date | null; heldAt: Date | null; breachedAt: Date | null },
    { to, note, repairCost, repairMinutes, rating }: TransitionInput,
    now: Date
): Prisma.IssueUncheckedUpdateManyInput => {
    switch (to) {
        case "NEW":
            return { assigneeId: null };
        case "ON_HOLD":
            return { heldAt: now };
        case "IN_PROGRESS":
            return issue.status === "ON_HOLD" ? { dueAt: resumeDeadline(issue, now), heldAt: null } : {};
        case "RESOLVED":
            return {
                resolutionNote: note ?? null,
                repairCost: repairCost ?? null,
                repairMinutes: repairMinutes ?? null,
                resolvedAt: now,
            };
        case "CLOSED":
            return { rating: rating ?? null };
        case "REOPENED":
            // Reopened work gets a fresh deadline.
            return { dueAt: getDueAt(issue.priority, now), breachedAt: null, resolvedAt: null };
        default:
            return {};
    }
};

/**
 * Moves an issue to a new status if the state machine allows it for this caller.
 * The status update, the timeline entry and the notifications are written together.
 */
export const transitionIssue = async (ctx: AuthContext, issueId: number, input: TransitionInput) => {
    const { to, note } = input;
    const issue = await findVisibleIssue(ctx, issueId);

    if (!canTransition(issue.status, to, getActors(ctx, issue))) {
        const allowed = allowedTransitions(issue.status, getActors(ctx, issue));
        throw allowed.length > 0
            ? AppError.conflict(`Issue cannot be moved from ${issue.status} to ${to}`)
            : AppError.forbidden(`You can't change this issue while it is ${issue.status}`);
    }

    // The rating is the reporter's opinion of the fix; an admin closing it can't give one for them.
    if (input.rating !== undefined && issue.reporterId !== ctx.userId) {
        throw AppError.forbidden("Only the person who reported the issue can rate the fix");
    }

    if (to === "RESOLVED") {
        await requireAfterPhoto(ctx, issueId);
    }

    return tenantPrisma(ctx.orgId).$transaction(async (tx) => {
        // Conditional on the status we read, so two concurrent actions can't both win.
        const { count } = await tx.issue.updateMany({
            where: { id: issueId, status: issue.status },
            data: { status: to, ...transitionFields(issue, input, new Date()) },
        });
        if (count === 0) {
            throw AppError.conflict("This issue was just updated by someone else. Refresh and try again.");
        }

        await tx.issueEvent.create({
            data: {
                orgId: ctx.orgId,
                issueId,
                actorId: ctx.userId,
                type: to === "NEW" ? "DECLINED" : "STATUS_CHANGED",
                fromStatus: issue.status,
                toStatus: to,
                note: note ?? null,
            },
        });

        const needsAdmins = to === "NEW" || to === "ON_HOLD" || to === "REOPENED";
        // People who said "me too" hear about progress, but not about the technician declining.
        const followerIds = to === "NEW" ? [] : await getFollowerIds(tx, issueId);

        await notify(tx, {
            orgId: ctx.orgId,
            issueId,
            actorId: ctx.userId,
            type: NOTIFICATION_TYPES[to] ?? "STATUS_CHANGED",
            message: `${label(issue)} ${STATUS_MESSAGES[to] ?? `is now ${to}`}${to === "NEW" || to === "ON_HOLD" ? `: ${note}` : ""}`,
            // A decline is between the technician and the admins; the reporter sees it on the timeline.
            userIds: [
                ...(to === "NEW" ? [] : [issue.reporterId, issue.assigneeId]),
                ...followerIds,
                ...(needsAdmins ? await getAdminUserIds(tx) : []),
            ],
        });

        return forViewer(ctx, await tx.issue.findUniqueOrThrow({ where: { id: issueId }, include: issueInclude }));
    });
};

export const assignIssue = async (ctx: AuthContext, issueId: number, technicianId: number) => {
    const db = tenantPrisma(ctx.orgId);

    const technician = (await getCandidates(db)).find((candidate) => candidate.userId === technicianId);
    if (!technician) {
        throw AppError.badRequest("Selected user is not an active technician in this organization");
    }

    const issue = await db.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
        throw AppError.notFound("Issue");
    }

    if (!ASSIGNABLE_STATUSES.includes(issue.status)) {
        throw AppError.conflict(`A ${issue.status} issue cannot be assigned`);
    }

    const { reason } = scoreTechnician(technician, issue.category);

    return db.$transaction(async (tx) => {
        await recordAssignment(tx, {
            orgId: ctx.orgId,
            actorId: ctx.userId,
            issue,
            technicianId,
            note: `Assigned to ${technician.name}: ${reason}`,
        });

        return tx.issue.findUniqueOrThrow({ where: { id: issueId }, include: issueInclude });
    });
};

/**
 * Admins have the final say on priority, because reporters pick their own.
 * The deadline restarts from now at the new priority. On a held issue the hold clock restarts too,
 * so resuming only adds the time held after this change.
 */
export const updateIssuePriority = async (ctx: AuthContext, issueId: number, priority: Priority) => {
    const db = tenantPrisma(ctx.orgId);

    const issue = await db.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
        throw AppError.notFound("Issue");
    }

    if (!PRIORITY_EDITABLE_STATUSES.includes(issue.status)) {
        throw AppError.conflict(`The priority of a ${issue.status} issue cannot be changed`);
    }

    if (issue.priority === priority) {
        return db.issue.findUniqueOrThrow({ where: { id: issueId }, include: issueInclude });
    }

    const dueAt = getDueAt(priority, new Date());

    return db.$transaction(async (tx) => {
        const { count } = await tx.issue.updateMany({
            where: { id: issueId, status: issue.status, priority: issue.priority },
            data: { priority, dueAt, breachedAt: null, ...(issue.status === "ON_HOLD" ? { heldAt: new Date() } : {}) },
        });
        if (count === 0) {
            throw AppError.conflict("This issue was just updated by someone else. Refresh and try again.");
        }

        await tx.issueEvent.create({
            data: {
                orgId: ctx.orgId,
                issueId,
                actorId: ctx.userId,
                type: "PRIORITY_CHANGED",
                note: `${issue.priority} to ${priority}`,
            },
        });

        await notify(tx, {
            orgId: ctx.orgId,
            issueId,
            actorId: ctx.userId,
            type: "STATUS_CHANGED",
            message: `${label(issue)} is now ${priority} priority`,
            userIds: [issue.assigneeId],
        });

        return tx.issue.findUniqueOrThrow({ where: { id: issueId }, include: issueInclude });
    });
};

export const addIssueAttachment = async (
    ctx: AuthContext,
    issueId: number,
    file: Express.Multer.File,
    kind: AttachmentKind
) => {
    // Visible means: the caller reported it, is assigned to it, or is an admin.
    const issue = await findVisibleIssue(ctx, issueId);

    if (kind === "AFTER" && issue.assigneeId !== ctx.userId && !isAdminRole(ctx.role)) {
        throw AppError.forbidden("Only the assigned technician or an admin can add proof of the fix");
    }

    const detected = detectImageType(file.buffer);
    if (!detected) {
        throw AppError.unsupportedMediaType("File content is not a JPEG, PNG or WEBP image");
    }

    const storage = await getStorage();
    const storageKey = `issues/${ctx.orgId}/${randomUUID()}.${detected.extension}`;
    await storage.put(storageKey, file.buffer, detected.mimeType);

    try {
        const attachment = await tenantPrisma(ctx.orgId).$transaction(async (tx) => {
            const created = await tx.attachment.create({
                data: {
                    orgId: ctx.orgId,
                    issueId,
                    uploaderId: ctx.userId,
                    fileName: file.originalname.slice(0, 200),
                    storageKey,
                    mimeType: detected.mimeType,
                    fileSize: file.size,
                    kind,
                },
            });
            await tx.issueEvent.create({
                data: { orgId: ctx.orgId, issueId, actorId: ctx.userId, type: "ATTACHMENT_ADDED", note: created.fileName },
            });
            return created;
        });
        return toAttachmentDto(attachment);
    } catch (error) {
        // Don't leave orphaned files behind if the row couldn't be written.
        await storage.delete(storageKey).catch(() => undefined);
        throw error;
    }
};

// Issues someone could still be affected by: not yet fixed and not closed as a repeat.
const OPEN_FOR_DUPLICATES: IssueStatus[] = ["NEW", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "ON_HOLD", "REOPENED"];

const getFollowerIds = async (tx: Tx, issueId: number) => {
    const followers = await tx.issueFollower.findMany({ where: { issueId }, select: { userId: true } });
    return followers.map((follower) => follower.userId);
};

/**
 * Open issues at the same place, shown on the report form so people can say "me too" instead of reporting again.
 * A floor matches only that floor; a building matches the building and all its floors.
 * General means "not sure", so it matches every category.
 */
export const findSimilarIssues = async (ctx: AuthContext, query: SimilarIssuesQuery) => {
    const issues = await tenantPrisma(ctx.orgId).issue.findMany({
        where: {
            status: { in: OPEN_FOR_DUPLICATES },
            OR: [{ locationId: query.locationId }, { place: { parentId: query.locationId } }],
            ...(query.category && query.category !== "GENERAL" ? { category: query.category } : {}),
        },
        select: {
            id: true,
            title: true,
            location: true,
            status: true,
            createdAt: true,
            reporterId: true,
            _count: { select: { followers: true } },
            followers: { where: { userId: ctx.userId }, select: { id: true } },
        },
        orderBy: { id: "desc" },
        take: 5,
    });

    // Only what's needed to recognise the problem; the description and photos stay private until they join.
    return issues.map(({ reporterId, followers, _count, ...issue }) => ({
        ...issue,
        affectedCount: _count.followers + 1,
        isMine: reporterId === ctx.userId || followers.length > 0,
    }));
};

/** "Me too": join an open issue to see it and get its updates. */
export const followIssue = async (ctx: AuthContext, issueId: number) => {
    const db = tenantPrisma(ctx.orgId);

    // Not limited by visibleTo: following is how a requester gets to see someone else's report.
    const issue = await db.issue.findUnique({ where: { id: issueId } });
    if (!issue || !OPEN_FOR_DUPLICATES.includes(issue.status)) {
        throw AppError.notFound("Open issue");
    }
    if (issue.reporterId === ctx.userId) {
        throw AppError.conflict("You reported this issue, so you already get its updates");
    }

    await db.$transaction(async (tx) => {
        const { count } = await tx.issueFollower.createMany({
            data: [{ orgId: ctx.orgId, issueId, userId: ctx.userId }],
            skipDuplicates: true,
        });
        // Saying "me too" twice is fine, but only shows once on the timeline.
        if (count === 0) return;

        await tx.issueEvent.create({
            data: { orgId: ctx.orgId, issueId, actorId: ctx.userId, type: "FOLLOWED" },
        });
    });

    return getIssueById(ctx, issueId);
};

export const unfollowIssue = async (ctx: AuthContext, issueId: number) => {
    await tenantPrisma(ctx.orgId).issueFollower.deleteMany({ where: { issueId, userId: ctx.userId } });
};

/**
 * Closes an issue as a repeat of another. Its reporter and followers move to the original,
 * so everyone affected still hears when it's fixed.
 */
export const markDuplicate = async (ctx: AuthContext, issueId: number, originalId: number) => {
    if (issueId === originalId) {
        throw AppError.badRequest("An issue can't be a duplicate of itself");
    }

    const db = tenantPrisma(ctx.orgId);
    const [issue, original] = await Promise.all([
        db.issue.findUnique({ where: { id: issueId } }),
        db.issue.findUnique({ where: { id: originalId } }),
    ]);

    if (!issue) {
        throw AppError.notFound("Issue");
    }
    if (!original) {
        throw AppError.notFound(`Issue #${originalId}`);
    }
    if (!OPEN_FOR_DUPLICATES.includes(issue.status)) {
        throw AppError.conflict(`A ${issue.status} issue can't be marked as a duplicate`);
    }
    if (!OPEN_FOR_DUPLICATES.includes(original.status)) {
        throw AppError.conflict(`#${originalId} is ${original.status}. Pick an issue that is still open.`);
    }

    return db.$transaction(async (tx) => {
        const { count } = await tx.issue.updateMany({
            where: { id: issueId, status: issue.status },
            data: { status: "CLOSED", duplicateOfId: originalId, heldAt: null },
        });
        if (count === 0) {
            throw AppError.conflict("This issue was just updated by someone else. Refresh and try again.");
        }

        const movedUserIds = [issue.reporterId, ...(await getFollowerIds(tx, issueId))].filter(
            (userId) => userId !== original.reporterId
        );
        await tx.issueFollower.createMany({
            data: movedUserIds.map((userId) => ({ orgId: ctx.orgId, issueId: originalId, userId })),
            skipDuplicates: true,
        });

        await tx.issueEvent.createMany({
            data: [
                {
                    orgId: ctx.orgId,
                    issueId,
                    actorId: ctx.userId,
                    type: "MARKED_DUPLICATE",
                    fromStatus: issue.status,
                    toStatus: "CLOSED",
                    note: `Duplicate of #${originalId}`,
                },
                {
                    orgId: ctx.orgId,
                    issueId: originalId,
                    actorId: ctx.userId,
                    type: "MARKED_DUPLICATE",
                    note: `#${issueId} was merged into this issue`,
                },
            ],
        });

        await notify(tx, {
            orgId: ctx.orgId,
            issueId: originalId,
            actorId: ctx.userId,
            type: "STATUS_CHANGED",
            message: `${label(issue)} was already reported as ${label(original)}. You'll get updates there.`,
            userIds: movedUserIds,
        });
        if (issue.assigneeId && issue.assigneeId !== original.assigneeId) {
            await notify(tx, {
                orgId: ctx.orgId,
                issueId,
                actorId: ctx.userId,
                type: "STATUS_CHANGED",
                message: `${label(issue)} was closed as a duplicate of #${originalId}. You can stop work on it.`,
                userIds: [issue.assigneeId],
            });
        }

        return tx.issue.findUniqueOrThrow({ where: { id: issueId }, include: issueInclude });
    });
};
