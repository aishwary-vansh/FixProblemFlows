import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

interface Schemas {
    body?: ZodType;
    query?: ZodType;
    params?: ZodType;
}

/**
 * Parses body/query/params with zod and replaces them with the parsed (coerced, defaulted) values,
 * so controllers can trust the shape of `req.body`, `req.query` and `req.params`.
 */
export const validate = (schemas: Schemas): RequestHandler => (req, _res, next) => {
    const issues: unknown[] = [];

    for (const key of ["params", "query", "body"] as const) {
        const schema = schemas[key];
        if (!schema) continue;

        const result = schema.safeParse(req[key] ?? {});
        if (!result.success) {
            issues.push(...result.error.issues.map((issue) => ({ ...issue, location: key })));
            continue;
        }

        // Express 5 exposes req.query as a getter, so it must be redefined rather than assigned.
        Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true, enumerable: true });
    }

    if (issues.length > 0) {
        return next(AppError.validation(issues));
    }

    next();
};
