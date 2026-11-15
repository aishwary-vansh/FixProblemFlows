import { createHash, randomBytes } from "node:crypto";
import prisma, { tenantPrisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";
import { buildSession, verifyCredentials } from "./auth.services.js";
import { audit } from "./audit.service.js";
import { assertCanAddMember } from "./plan.service.js";
import type { AuthContext } from "../types/auth.js";
import type { AcceptInviteInput, CreateInviteInput } from "../validators/member.validator.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Only the hash is stored, so a database leak does not expose usable invite links.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const inviteSelect = {
    id: true,
    email: true,
    role: true,
    specialization: true,
    expiresAt: true,
    createdAt: true,
    createdBy: { select: { id: true, name: true } },
} as const;

export const createInvite = async (ctx: AuthContext, input: CreateInviteInput) => {
    if (input.role === "ADMIN" && ctx.role !== "OWNER") {
        throw AppError.forbidden("Only the owner can invite admins");
    }
    await assertCanAddMember(ctx.orgId);

    const db = tenantPrisma(ctx.orgId);

    if (input.email) {
        const existingMember = await db.membership.findFirst({
            where: { user: { email: input.email } },
        });
        if (existingMember) {
            throw AppError.conflict("This person is already a member of your organization");
        }
    }

    const token = randomBytes(32).toString("base64url");

    const invite = await db.$transaction(async (tx) => {
        const created = await tx.invite.create({
            data: {
                orgId: ctx.orgId, // overwritten by the tenant extension; kept for the type checker
                email: input.email ?? null,
                role: input.role,
                specialization: input.role === "TECHNICIAN" ? input.specialization ?? null : null,
                tokenHash: hashToken(token),
                expiresAt: new Date(Date.now() + INVITE_TTL_MS),
                createdById: ctx.userId,
            },
            select: inviteSelect,
        });
        await audit(ctx, "invite.created", input.email ?? "Anyone with the link", { role: input.role }, tx);
        return created;
    });

    return {
        invite,
        // The raw token is shown once, here; it cannot be recovered later.
        inviteUrl: `${env.APP_URL.replace(/\/$/, "")}/invite/${token}`,
    };
};

export const listPendingInvites = async (ctx: AuthContext) => {
    return tenantPrisma(ctx.orgId).invite.findMany({
        where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        select: inviteSelect,
        orderBy: { createdAt: "desc" },
        take: 100,
    });
};

export const revokeInvite = async (ctx: AuthContext, inviteId: number) => {
    await tenantPrisma(ctx.orgId).$transaction(async (tx) => {
        const { count } = await tx.invite.updateMany({
            where: { id: inviteId, acceptedAt: null, revokedAt: null },
            data: { revokedAt: new Date() },
        });

        if (count === 0) {
            throw AppError.notFound("Pending invite");
        }

        await audit(ctx, "invite.revoked", null, { inviteId }, tx);
    });
};

/** Looks up an invite by its raw token (unauthenticated, before the tenant is known). */
const findUsableInvite = async (token: string) => {
    const invite = await prisma.invite.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { organization: { select: { id: true, name: true } } },
    });

    if (!invite || invite.revokedAt) {
        throw AppError.notFound("Invite");
    }
    if (invite.acceptedAt) {
        throw AppError.gone("This invite has already been used");
    }
    if (invite.expiresAt <= new Date()) {
        throw AppError.gone("This invite has expired. Ask your admin for a new one.");
    }

    return invite;
};

export const getInvitePreview = async (token: string) => {
    const invite = await findUsableInvite(token);
    return {
        organization: invite.organization,
        role: invite.role,
        email: invite.email,
        expiresAt: invite.expiresAt,
    };
};

/** Checks the login or new-account details. Runs outside the transaction because bcrypt is slow. */
const resolveAccount = async (input: AcceptInviteInput) => {
    if (input.mode === "login") {
        return { userId: (await verifyCredentials(input.email, input.password)).id };
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
        throw AppError.conflict("An account with this email already exists. Log in instead.");
    }
    return { passwordHash: await hashPassword(input.password) };
};

// The transaction client of the unscoped client (accounts aren't tied to one organization).
type AccountTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const createAccount = async (tx: AccountTx, input: AcceptInviteInput, passwordHash: string) => {
    const user = await tx.user.create({
        data: {
            name: input.mode === "register" ? input.name : "",
            email: input.email,
            phone: input.mode === "register" ? input.phone : "",
            passwordHash,
        },
    });
    return user.id;
};

const inactiveMemberMessage = "Your membership in this organization was deactivated. Ask an admin to reactivate it.";

export const acceptInvite = async (token: string, input: AcceptInviteInput) => {
    const invite = await findUsableInvite(token);

    if (invite.email && invite.email !== input.email) {
        throw AppError.forbidden("This invite was sent to a different email address");
    }

    const { userId, passwordHash } = await resolveAccount(input);
    await assertCanAddMember(invite.orgId);

    const memberUserId = await prisma.$transaction(async (tx) => {
        // Claim the invite atomically so two people can't redeem the same link.
        const claimed = await tx.invite.updateMany({
            where: { id: invite.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
            data: { acceptedAt: new Date() },
        });
        if (claimed.count === 0) {
            throw AppError.gone("This invite is no longer valid");
        }

        const id = userId ?? (await createAccount(tx, input, passwordHash!));

        const existingMembership = await tx.membership.findUnique({
            where: { orgId_userId: { orgId: invite.orgId, userId: id } },
        });
        if (existingMembership) {
            throw AppError.conflict(
                existingMembership.isActive ? "You are already a member of this organization" : inactiveMemberMessage
            );
        }

        await tx.membership.create({
            data: {
                orgId: invite.orgId,
                userId: id,
                role: invite.role,
                specialization: invite.specialization,
            },
        });

        return id;
    });

    return buildSession(memberUserId, invite.orgId);
};

/**
 * The org's join code, or the code of one of its QR report points. A QR point only works while the
 * join link is on, so turning the link off stops every way in; replacing it leaves posted QR codes working.
 */
const findJoinOrganization = async (code: string) => {
    const byJoinCode = await prisma.organization.findUnique({
        where: { joinCode: code },
        select: { id: true, name: true },
    });
    if (byJoinCode) {
        return byJoinCode;
    }

    const point = await prisma.reportPoint.findUnique({
        where: { code },
        select: { archived: true, organization: { select: { id: true, name: true, joinCode: true } } },
    });
    if (!point || point.archived || !point.organization.joinCode) {
        throw AppError.notFound("Join link");
    }
    return { id: point.organization.id, name: point.organization.name };
};

export const getJoinPreview = async (code: string) => {
    return { organization: await findJoinOrganization(code), role: "REQUESTER" as const, email: null };
};

/** The reusable link only ever grants the requester role. A member who scans it again is just logged in. */
export const joinOrganization = async (code: string, input: AcceptInviteInput) => {
    const organization = await findJoinOrganization(code);
    const { userId, passwordHash } = await resolveAccount(input);

    // Someone who is already a member is only logged in, so the member limit applies to newcomers only.
    const alreadyMember =
        userId !== undefined &&
        (await prisma.membership.findUnique({ where: { orgId_userId: { orgId: organization.id, userId } } })) !== null;
    if (!alreadyMember) {
        await assertCanAddMember(organization.id);
    }

    const memberUserId = await prisma.$transaction(async (tx) => {
        const id = userId ?? (await createAccount(tx, input, passwordHash!));

        const existingMembership = await tx.membership.findUnique({
            where: { orgId_userId: { orgId: organization.id, userId: id } },
        });
        if (existingMembership && !existingMembership.isActive) {
            throw AppError.forbidden(inactiveMemberMessage);
        }
        if (!existingMembership) {
            await tx.membership.create({ data: { orgId: organization.id, userId: id, role: "REQUESTER" } });
        }

        return id;
    });

    return buildSession(memberUserId, organization.id);
};
