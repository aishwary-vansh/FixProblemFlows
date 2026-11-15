import { tenantPrisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { audit } from "./audit.service.js";
import { assertCanAddMember } from "./plan.service.js";
import type { AuthContext } from "../types/auth.js";
import type { ListMembersQuery, UpdateMemberInput } from "../validators/member.validator.js";

const memberSelect = {
    id: true,
    userId: true,
    role: true,
    specialization: true,
    isActive: true,
    createdAt: true,
    user: { select: { name: true, email: true, phone: true } },
} as const;

type MemberRow = {
    id: number;
    userId: number;
    role: string;
    specialization: string | null;
    isActive: boolean;
    createdAt: Date;
    user: { name: string; email: string; phone: string };
};

const toMember = ({ user, ...membership }: MemberRow) => ({ ...membership, ...user });

export const listMembers = async (ctx: AuthContext, query: ListMembersQuery) => {
    const rows = await tenantPrisma(ctx.orgId).membership.findMany({
        where: {
            ...(query.role ? { role: query.role } : {}),
            ...(query.active !== undefined ? { isActive: query.active } : {}),
        },
        select: memberSelect,
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    return rows.map(toMember);
};

export const updateMember = async (ctx: AuthContext, membershipId: number, input: UpdateMemberInput) => {
    const db = tenantPrisma(ctx.orgId);

    const target = await db.membership.findUnique({ where: { id: membershipId } });
    if (!target) {
        throw AppError.notFound("Member");
    }

    if (target.userId === ctx.userId) {
        throw AppError.badRequest("You can't change your own role or status");
    }

    // Admins manage technicians and requesters; only the owner can touch admins and owners.
    const touchesPrivilegedRole =
        target.role === "OWNER" ||
        target.role === "ADMIN" ||
        input.role === "OWNER" ||
        input.role === "ADMIN";
    if (touchesPrivilegedRole && ctx.role !== "OWNER") {
        throw AppError.forbidden("Only the owner can change admins and owners");
    }

    const losesOwnership =
        target.role === "OWNER" &&
        target.isActive &&
        ((input.role !== undefined && input.role !== "OWNER") || input.isActive === false);
    if (losesOwnership) {
        const activeOwners = await db.membership.count({ where: { role: "OWNER", isActive: true } });
        if (activeOwners <= 1) {
            throw AppError.conflict("An organization must keep at least one active owner");
        }
    }

    if (input.isActive === true && !target.isActive) {
        await assertCanAddMember(ctx.orgId);
    }

    const nextRole = input.role ?? target.role;

    return db.$transaction(async (tx) => {
        const updated = await tx.membership.update({
            where: { id: membershipId },
            data: {
                ...(input.role !== undefined ? { role: input.role } : {}),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
                // Specialization only means something for technicians.
                ...(nextRole !== "TECHNICIAN"
                    ? { specialization: null }
                    : input.specialization !== undefined
                      ? { specialization: input.specialization }
                      : {}),
            },
            select: memberSelect,
        });

        await audit(
            ctx,
            "member.updated",
            updated.user.name,
            {
                ...(input.role !== undefined && input.role !== target.role ? { role: { from: target.role, to: input.role } } : {}),
                ...(input.isActive !== undefined && input.isActive !== target.isActive ? { active: input.isActive } : {}),
                ...(input.specialization !== undefined ? { specialization: input.specialization } : {}),
            },
            tx
        );

        return toMember(updated);
    });
};
