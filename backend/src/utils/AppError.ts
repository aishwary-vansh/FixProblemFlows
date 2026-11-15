export type ErrorCode =
    | "BAD_REQUEST"
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "PLAN_LIMIT"
    | "NOT_FOUND"
    | "CONFLICT"
    | "GONE"
    | "PAYLOAD_TOO_LARGE"
    | "UNSUPPORTED_MEDIA_TYPE"
    | "TOO_MANY_REQUESTS"
    | "INTERNAL_ERROR";

/**
 * Expected, client-facing error. Services throw these; the central error
 * handler turns them into `{ success: false, error: { code, message, details } }`.
 */
export class AppError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: ErrorCode,
        message: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = "AppError";
    }

    static badRequest(message: string, details?: unknown) {
        return new AppError(400, "BAD_REQUEST", message, details);
    }

    static validation(details: unknown, message = "Validation failed") {
        return new AppError(400, "VALIDATION_ERROR", message, details);
    }

    static unauthorized(message = "Authentication required") {
        return new AppError(401, "UNAUTHORIZED", message);
    }

    static forbidden(message = "You don't have permission to do this") {
        return new AppError(403, "FORBIDDEN", message);
    }

    /** The organization's plan doesn't include this; the web app offers an upgrade. */
    static planLimit(message: string) {
        return new AppError(403, "PLAN_LIMIT", message);
    }

    static notFound(resource = "Resource") {
        return new AppError(404, "NOT_FOUND", `${resource} not found`);
    }

    static conflict(message: string) {
        return new AppError(409, "CONFLICT", message);
    }

    static gone(message: string) {
        return new AppError(410, "GONE", message);
    }

    static unsupportedMediaType(message: string) {
        return new AppError(415, "UNSUPPORTED_MEDIA_TYPE", message);
    }
}
