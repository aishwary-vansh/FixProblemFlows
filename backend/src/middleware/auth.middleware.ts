import type { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma.js";
import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import type { AuthContext } from "../types/auth.js";

/**
 * Verifies the bearer token, then loads the caller's membership in the token's org.
 * Role and active flags come from the database, so role changes and deactivation
 * take effect immediately instead of when the token expires.
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : undefined;

    if (!token) {
        throw AppError.unauthorized();
    }

    const payload = verifyToken(token);
    if (!payload) {
        throw AppError.unauthorized("Invalid or expired token");
    }

    const membership = await prisma.membership.findUnique({
        where: { orgId_userId: { orgId: payload.orgId, userId: payload.userId } },
        select: { id: true, role: true, isActive: true, user: { select: { isActive: true, passwordChangedAt: true } } },
    });

    if (!membership || !membership.isActive || !membership.user.isActive) {
        throw AppError.unauthorized("Your access to this organization has been removed");
    }

    // A password change logs out every token issued before it.
    const changedAt = membership.user.passwordChangedAt;
    if (changedAt && payload.issuedAtMs < changedAt.getTime()) {
        throw AppError.unauthorized("Your password was changed. Please log in again.");
    }

    req.auth = {
        userId: payload.userId,
        orgId: payload.orgId,
        membershipId: membership.id,
        role: membership.role,
    };

    next();
};

/** Narrows `req.auth` for handlers mounted after `authenticate`. */
export const getAuth = (req: Request): AuthContext => {
    if (!req.auth) {
        throw AppError.unauthorized();
    }
    return req.auth;
};
