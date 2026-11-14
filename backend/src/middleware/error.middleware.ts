import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../config/logger.js";
import { captureError } from "../config/sentry.js";

const toAppError = (err: unknown): AppError => {
    if (err instanceof AppError) {
        return err;
    }

    if (err instanceof ZodError) {
        return AppError.validation(err.issues);
    }

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return new AppError(413, "PAYLOAD_TOO_LARGE", "File is too large");
        }
        return AppError.badRequest(err.message);
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            return AppError.conflict("A record with these details already exists");
        }
        if (err.code === "P2025") {
            return AppError.notFound();
        }
    }

    // body-parser errors (malformed JSON, body too large) carry a status and an `expose` flag.
    if (typeof err === "object" && err !== null && "status" in err && "expose" in err && err.expose) {
        const status = Number(err.status);
        const message = err instanceof Error ? err.message : "Bad request";
        return new AppError(status, status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", message);
    }

    return new AppError(500, "INTERNAL_ERROR", "Something went wrong");
};

export const notFoundHandler: RequestHandler = (req, _res, next) => {
    next(new AppError(404, "NOT_FOUND", `Route ${req.method} ${req.path} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    const appError = toAppError(err);

    if (appError.status >= 500) {
        (req.log ?? logger).error({ err }, "Unhandled error");
        captureError(err, { method: req.method, path: req.route?.path ?? req.path, userId: req.auth?.userId, orgId: req.auth?.orgId });
    }

    res.status(appError.status).json({
        success: false,
        error: {
            code: appError.code,
            message: appError.message,
            ...(appError.details !== undefined ? { details: appError.details } : {}),
        },
    });
};
