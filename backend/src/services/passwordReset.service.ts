import { createHash, randomBytes } from "node:crypto";
import prisma from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";
import { sendEmail } from "../utils/mailer.js";

const RESET_TTL_MS = 60 * 60 * 1000;

// Only the hash is stored, so a database leak does not expose usable reset links.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Emails a one-hour reset link. It answers the same way whether or not the email has an account,
 * and sends in the background, so the response can't be used to find out who has one.
 */
export const requestPasswordReset = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, isActive: true } });
    if (!user || !user.isActive) {
        return;
    }

    const token = randomBytes(32).toString("base64url");

    // A new link replaces any older one.
    await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
        }),
    ]);

    const link = `${env.APP_URL.replace(/\/$/, "")}/reset-password/${token}`;

    void sendEmail({
        to: email,
        subject: "Reset your FixFlow password",
        text: [
            `Hi ${user.name || "there"},`,
            "",
            "Someone asked to reset the password for your FixFlow account. Open this link to choose a new one:",
            link,
            "",
            "The link works once and expires in 1 hour. If you didn't ask for this, ignore this email; your password stays the same.",
        ].join("\n"),
    }).catch((err) => logger.error({ err }, "Password reset email failed"));
};

/** Sets the new password and logs the account out everywhere, by rejecting tokens issued before now. */
export const resetPassword = async (token: string, password: string) => {
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });

    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
        throw AppError.gone("This reset link is invalid or has expired. Ask for a new one.");
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
        // Claim the link first, so it can't be used twice at the same moment.
        const { count } = await tx.passwordResetToken.updateMany({
            where: { id: reset.id, usedAt: null },
            data: { usedAt: new Date() },
        });
        if (count === 0) {
            throw AppError.gone("This reset link has already been used. Ask for a new one.");
        }

        await tx.user.update({
            where: { id: reset.userId },
            data: { passwordHash, passwordChangedAt: new Date() },
        });
        // Logged-out devices must stop getting alerts too.
        await tx.pushSubscription.deleteMany({ where: { userId: reset.userId } });
    });
};
