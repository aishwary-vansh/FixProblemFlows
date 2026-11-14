import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface TokenPayload {
    userId: number;
    orgId: number;
}

export interface VerifiedToken extends TokenPayload {
    /** When the token was issued, in milliseconds, so a password change in the same second still logs it out. */
    issuedAtMs: number;
}

/** The token names the user and the active org only; the role is loaded fresh on every request. */
export const generateToken = ({ userId, orgId }: TokenPayload) => {
    return jwt.sign({ orgId, iatMs: Date.now() }, env.JWT_SECRET, {
        subject: String(userId),
        expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] & string,
    });
};

export const verifyToken = (token: string): VerifiedToken | null => {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        if (typeof decoded === "string") return null;

        const userId = Number(decoded.sub);
        const orgId = Number(decoded.orgId);
        // Tokens from before `iatMs` existed fall back to the standard whole-second `iat`.
        const issuedAtMs = Number(decoded.iatMs ?? Number(decoded.iat) * 1000);
        if (!Number.isInteger(userId) || !Number.isInteger(orgId) || !Number.isFinite(issuedAtMs)) return null;

        return { userId, orgId, issuedAtMs };
    } catch {
        return null;
    }
};
