import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

const message = (text: string) => ({
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: text },
});

/** Brute-force protection for login, signup and invite acceptance. */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    message: message("Too many attempts. Please try again in a few minutes."),
});

/** Coarse limit for the whole API. */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    message: message("Too many requests. Please slow down."),
});
