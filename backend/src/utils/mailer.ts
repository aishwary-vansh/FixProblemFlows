import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

interface Email {
    to: string;
    subject: string;
    text: string;
}

/**
 * Sends a plain-text email through Resend's HTTP API. Without an API key, development prints the
 * email to the log so links can still be tested; production never logs it, because it may hold a secret link.
 */
export const sendEmail = async ({ to, subject, text }: Email) => {
    if (!env.RESEND_API_KEY) {
        if (env.NODE_ENV === "production") {
            logger.error({ to, subject }, "Email not sent: RESEND_API_KEY is not set");
        } else {
            logger.info({ to, subject, text }, "Email (not sent: RESEND_API_KEY is not set)");
        }
        return;
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
    });

    if (!response.ok) {
        throw new Error(`Email provider responded ${response.status}: ${await response.text()}`);
    }
};
