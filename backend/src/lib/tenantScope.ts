/**
 * Pure helper behind the tenant Prisma extension: rewrites query args so every
 * read/write on a tenant-owned model is pinned to one organization.
 * Kept free of Prisma imports so it can be unit-tested in isolation.
 */

export const TENANT_MODELS = new Set([
    "Issue",
    "Attachment",
    "Invite",
    "Location",
    "Membership",
    "IssueEvent",
    "IssueFollower",
    "Comment",
    "Notification",
    "ReportPoint",
    "AuditLog",
]);

const WHERE_OPERATIONS = new Set([
    "findUnique",
    "findUniqueOrThrow",
    "findFirst",
    "findFirstOrThrow",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
    "update",
    "updateMany",
    "updateManyAndReturn",
    "delete",
    "deleteMany",
]);

const UPDATE_OPERATIONS = new Set(["update", "updateMany", "updateManyAndReturn"]);

// Query args are Prisma's per-model shapes, which this generic rewriter can't name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = Record<string, any>;

/** Removes any attempt to move a row to a different org. */
const withoutOrgId = (data: Args | undefined) => {
    if (!data) return data;
    const { orgId: _ignored, organization: _ignoredRelation, ...rest } = data;
    return rest;
};

export const scopeArgs = (operation: string, args: Args | undefined, orgId: number): Args => {
    const scoped: Args = { ...(args ?? {}) };

    if (WHERE_OPERATIONS.has(operation)) {
        scoped.where = { ...(scoped.where ?? {}), orgId };
        if (UPDATE_OPERATIONS.has(operation)) {
            scoped.data = withoutOrgId(scoped.data);
        }
        return scoped;
    }

    switch (operation) {
        case "create":
            scoped.data = { ...withoutOrgId(scoped.data), orgId };
            return scoped;

        case "createMany":
        case "createManyAndReturn":
            scoped.data = Array.isArray(scoped.data)
                ? scoped.data.map((row: Args) => ({ ...withoutOrgId(row), orgId }))
                : { ...withoutOrgId(scoped.data), orgId };
            return scoped;

        case "upsert":
            scoped.where = { ...(scoped.where ?? {}), orgId };
            scoped.create = { ...withoutOrgId(scoped.create), orgId };
            scoped.update = withoutOrgId(scoped.update);
            return scoped;

        default:
            // Fail closed: an operation we don't know how to scope must never run unscoped.
            throw new Error(`Tenant scoping does not support operation "${operation}"`);
    }
};
