import { randomBytes } from "node:crypto";
import prisma from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { trialEndsAt } from "../domain/plans.js";
import type { LoginInput, RegisterInput } from "../validators/auth.validator.js";

// Compared against when the email is unknown, so login takes the same time either way.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

const membershipSelect = {
    id: true,
    role: true,
    specialization: true,
    organization: { select: { id: true, name: true, slug: true } },
} as const;

/**
 * Builds the session payload the frontend stores after login, signup, invite
 * acceptance or org switch: a token for the active org plus every org the user can switch to.
 */
export const buildSession = async (userId: number, orgId?: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            memberships: {
                where: { isActive: true },
                select: membershipSelect,
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!user || !user.isActive) {
        throw AppError.unauthorized("This account is disabled");
    }

    const active = orgId
        ? user.memberships.find((m) => m.organization.id === orgId)
        : user.memberships[0];

    if (!active) {
        throw orgId
            ? AppError.forbidden("You are not a member of this organization")
            : AppError.forbidden("Your account is not part of any active organization");
    }

    return {
        token: generateToken({ userId: user.id, orgId: active.organization.id }),
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: active.role,
            specialization: active.specialization,
            organization: active.organization,
        },
        organizations: user.memberships.map((m) => ({ ...m.organization, role: m.role })),
    };
};

const slugify = (name: string) => {
    const base = name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
    return `${base || "org"}-${randomBytes(3).toString("hex")}`;
};

/** Signup creates the user, a new organization, and makes the user its Owner. */
export const registerUser = async (input: RegisterInput) => {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
        throw AppError.conflict("An account with this email already exists. Log in instead.");
    }

    const passwordHash = await hashPassword(input.password);

    const { userId, orgId } = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name: input.name,
                email: input.email,
                phone: input.phone,
                passwordHash,
            },
        });

        const organization = await tx.organization.create({
            // Every new organization starts with a Pro trial, then drops to Free.
            data: {
                name: input.organizationName,
                slug: slugify(input.organizationName),
                plan: "PRO",
                planSource: "TRIAL",
                planEndsAt: trialEndsAt(),
            },
        });

        await tx.membership.create({
            data: { orgId: organization.id, userId: user.id, role: "OWNER" },
        });

        return { userId: user.id, orgId: organization.id };
    });

    return buildSession(userId, orgId);
};

/** Checks credentials and returns the user id; shared by login and "log in to accept an invite". */
export const verifyCredentials = async (email: string, password: string) => {
    const user = await prisma.user.findUnique({ where: { email } });

    const passwordMatch = await comparePassword(password, user?.passwordHash ?? (await getDummyHash()));

    if (!user || !passwordMatch) {
        throw AppError.unauthorized("Invalid email or password");
    }

    if (!user.isActive) {
        throw AppError.unauthorized("This account is disabled");
    }

    return user;
};

export const loginUser = async ({ email, password, orgId }: LoginInput) => {
    const user = await verifyCredentials(email, password);
    return buildSession(user.id, orgId);
};
