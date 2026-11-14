export type IssueStatus =
    | "NEW"
    | "ASSIGNED"
    | "ACCEPTED"
    | "IN_PROGRESS"
    | "ON_HOLD"
    | "RESOLVED"
    | "CLOSED"
    | "REOPENED";

export type IssuePriority =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

export type IssueCategory =
    | "ELECTRICAL"
    | "PLUMBING"
    | "CARPENTRY"
    | "CIVIL"
    | "HVAC"
    | "IT"
    | "GENERAL";

export type UserRole =
    | "OWNER"
    | "ADMIN"
    | "TECHNICIAN"
    | "REQUESTER";

export interface UserSummary {
    id: number;
    name: string;
    email: string;
}

export interface Issue {
    id: number;
    title: string;
    description: string;
    location: string;

    status: IssueStatus;
    priority: IssuePriority;
    category: IssueCategory;

    reporterId: number;
    assigneeId: number | null;

    reporter: UserSummary;
    assignee: UserSummary | null;

    dueAt: string | null;
    breachedAt: string | null;

    resolutionNote: string | null;
    repairCost: number | null;
    repairMinutes: number | null;
    resolvedAt: string | null;
    /** 1 to 5 stars from the reporter when they confirmed the fix. */
    rating: number | null;
    /** Other people who said "me too". */
    _count: { followers: number };

    createdAt: string;
    updatedAt: string;
    /** Only present on the issue detail endpoint. */
    attachments?: IssueAttachment[];
}

export interface IssueAttachment {
    id: number;
    issueId: number;
    fileName: string;
    /** Short-lived signed URL; refetch the issue to get a fresh one. */
    url: string;
    mimeType: string;
    fileSize: number;
    /** BEFORE shows the problem; AFTER is the technician's proof of the fix. */
    kind: "BEFORE" | "AFTER";
    createdAt: string;
}

export interface IssueStats {
    total: number;
    overdue: number;
    byStatus: Record<IssueStatus, number>;
}

export interface IssueListResponse {
    success: boolean;
    data: Issue[];
    meta: { nextCursor: number | null };
}

export interface IssueEvent {
    id: number;
    type:
        | "CREATED"
        | "ASSIGNED"
        | "STATUS_CHANGED"
        | "ATTACHMENT_ADDED"
        | "PRIORITY_CHANGED"
        | "SLA_BREACHED"
        | "DECLINED"
        | "FOLLOWED"
        | "MARKED_DUPLICATE";
    fromStatus: IssueStatus | null;
    toStatus: IssueStatus | null;
    note: string | null;
    createdAt: string;
    actor: { id: number; name: string } | null;
}

export interface IssueComment {
    id: number;
    body: string;
    createdAt: string;
    author: { id: number; name: string };
}

/** Extra fields returned by GET /issues/:id. */
export interface IssueDetail extends Issue {
    attachments: IssueAttachment[];
    events: IssueEvent[];
    comments: IssueComment[];
    /** Statuses the current user can move this issue to. */
    allowedTransitions: IssueStatus[];
    canAssign: boolean;
    canChangePriority: boolean;
    canMarkDuplicate: boolean;
    /** True when the current user said "me too". */
    isFollowing: boolean;
    /**
     * True for someone who only said "me too": the description, the reporter's photos and name,
     * and comments are left out, and they can't comment or add photos.
     */
    limitedView: boolean;
    duplicateOf: { id: number; title: string; status: IssueStatus } | null;
}

/** An open issue at the same place, offered on the report form. */
export interface SimilarIssue {
    id: number;
    title: string;
    location: string;
    status: IssueStatus;
    createdAt: string;
    /** The reporter plus everyone who said "me too". */
    affectedCount: number;
    /** Already reported or followed by the current user. */
    isMine: boolean;
}

/** A technician ranked for an issue, with the reason in words. */
export interface TechnicianSuggestion {
    userId: number;
    name: string;
    score: number;
    reason: string;
}

export interface LocationBuilding {
    id: number;
    name: string;
    floors: { id: number; name: string }[];
}

export interface AppNotification {
    id: number;
    issueId: number;
    type: string;
    message: string;
    readAt: string | null;
    createdAt: string;
}
