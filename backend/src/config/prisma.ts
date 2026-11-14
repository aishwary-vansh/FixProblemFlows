import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";
import { TENANT_MODELS, scopeArgs } from "../lib/tenantScope.js";

const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    // The local `prisma dev` database serves one connection at a time and closes extra ones (P1017),
    // so local development sets DATABASE_POOL_MAX=1. A real Postgres server uses the default of 10.
    max: env.DATABASE_POOL_MAX,
    // Hosted databases and local proxies drop idle connections without telling the client, and the next
    // query on that connection fails with "Connection terminated unexpectedly". Retire idle ones first.
    idleTimeoutMillis: 10_000,
    keepAlive: true,
});

// Reads are safe to run twice; writes are never retried, because a retry could save something twice.
const READ_OPERATIONS = new Set([
    "findUnique",
    "findUniqueOrThrow",
    "findFirst",
    "findFirstOrThrow",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
]);

// P1017 is Prisma's "Server has closed the connection"; the others come from the pg driver directly.
const isDroppedConnection = (err: unknown) =>
    err instanceof Error &&
    ((err as { code?: string }).code === "P1017" ||
        /Connection terminated unexpectedly|Server has closed the connection|ECONNRESET/.test(err.message));

/**
 * Unscoped client. Use only for global tables (User, Organization) and for
 * flows that run before a tenant is known (signup, login, invite lookup).
 *
 * A read that fails because the database dropped its connection (a restart, a failover, a proxy timeout)
 * is tried once more on a fresh connection, so one dropped connection doesn't become an error page.
 */
const prisma = new PrismaClient({ adapter }).$extends({
    name: "retry-dropped-connection",
    query: {
        $allModels: {
            async $allOperations({ operation, args, query }) {
                try {
                    return await query(args);
                } catch (err) {
                    if (!READ_OPERATIONS.has(operation) || !isDroppedConnection(err)) throw err;
                    return query(args);
                }
            },
        },
    },
});

/**
 * Client that pins every query on tenant models (Issue, Attachment, Invite, Membership)
 * to one organization. Services must use this for tenant data, so a missing
 * `where: { orgId }` can never leak another org's rows.
 */
export const tenantPrisma = (orgId: number) =>
    prisma.$extends({
        name: "tenant-scope",
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    if (!TENANT_MODELS.has(model)) {
                        return query(args);
                    }
                    return query(scopeArgs(operation, args as Record<string, unknown>, orgId) as typeof args);
                },
            },
        },
    });

export type TenantPrisma = ReturnType<typeof tenantPrisma>;

export default prisma;
