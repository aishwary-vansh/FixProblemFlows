import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { buildSession } from "./auth.services.js";
import type { AuthContext } from "../types/auth.js";
import type { ChangePasswordInput, UpdateProfileInput } from "../validators/auth.validator.js";

export const updateProfile = async (ctx: AuthContext, input: UpdateProfileInput) => {
    await prisma.user.update({ where: { id: ctx.userId }, data: { name: input.name, phone: input.phone } });
    return buildSession(ctx.userId, ctx.orgId);
};

/**
 * Changes the password after checking the current one. Other devices are logged out and stop getting
 * push alerts (a lost phone shouldn't keep receiving them); this one gets a fresh token and stays logged in.
 */
export const changePassword = async (ctx: AuthContext, input: ChangePasswordInput) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { passwordHash: true } });

    if (!(await comparePassword(input.currentPassword, user.passwordHash))) {
        throw AppError.badRequest("Your current password is not correct");
    }
    if (input.currentPassword === input.password) {
        throw AppError.badRequest("Choose a password different from your current one");
    }

    const passwordHash = await hashPassword(input.password);
    await prisma.$transaction([
        prisma.user.update({ where: { id: ctx.userId }, data: { passwordHash, passwordChangedAt: new Date() } }),
        prisma.pushSubscription.deleteMany({ where: { userId: ctx.userId } }),
    ]);

    return buildSession(ctx.userId, ctx.orgId);
};
