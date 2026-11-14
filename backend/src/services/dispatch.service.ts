import { tenantPrisma } from "../config/prisma.js";
import { rankTechnicians } from "../domain/dispatch.js";
import type { Candidate } from "../domain/dispatch.js";
import type { IssueStatus } from "../generated/prisma/enums.js";
import { AppError } from "../utils/AppError.js";
import type { AuthContext } from "../types/auth.js";
import type { Tx } from "./notification.service.js";

// Work a technician still has in hand. REOPENED waits for an admin, so it doesn't count.
const ACTIVE_STATUSES: IssueStatus[] = ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"];

/** Active technicians in the org with their current workload. */
export const getCandidates = async (db: Tx): Promise<Candidate[]> => {
    const [technicians, workloads] = await Promise.all([
        db.membership.findMany({
            where: { role: "TECHNICIAN", isActive: true, user: { isActive: true } },
            select: { userId: true, specialization: true, user: { select: { name: true } } },
        }),
        db.issue.groupBy({
            by: ["assigneeId"],
            where: { status: { in: ACTIVE_STATUSES }, assigneeId: { not: null } },
            _count: { _all: true },
        }),
    ]);

    const openTasks = new Map(workloads.map((row) => [row.assigneeId, row._count._all]));

    return technicians.map((technician) => ({
        userId: technician.userId,
        name: technician.user.name,
        specialization: technician.specialization,
        openTasks: openTasks.get(technician.userId) ?? 0,
    }));
};

/** Top three technicians for an issue. A technician who reported it can't be picked to fix it. */
export const getSuggestions = async (ctx: AuthContext, issueId: number) => {
    const db = tenantPrisma(ctx.orgId);

    const issue = await db.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
        throw AppError.notFound("Issue");
    }

    const candidates = (await getCandidates(db)).filter((candidate) => candidate.userId !== issue.reporterId);
    return rankTechnicians(candidates, issue.category).slice(0, 3);
};
