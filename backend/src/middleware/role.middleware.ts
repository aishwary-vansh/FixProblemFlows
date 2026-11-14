import type { Request, Response, NextFunction } from "express";
import type { OrgRole } from "../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";

export const ADMIN_ROLES: readonly OrgRole[] = ["OWNER", "ADMIN"];

export const isAdminRole = (role: OrgRole) => ADMIN_ROLES.includes(role);

export const authorise = (...allowedRoles: OrgRole[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.auth) {
            throw AppError.unauthorized();
        }

        if (!allowedRoles.includes(req.auth.role)) {
            throw AppError.forbidden("You don't have permission to access this resource");
        }

        next();
    };
};
