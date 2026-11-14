import type { Request, Response } from "express";
import { registerUser, loginUser, buildSession } from "../services/auth.services.js";
import { getAuth } from "../middleware/auth.middleware.js";

export const register = async (req: Request, res: Response) => {
    const session = await registerUser(req.body);

    res.status(201).json({
        success: true,
        message: "Account and organization created",
        data: session,
    });
};

export const login = async (req: Request, res: Response) => {
    const session = await loginUser(req.body);

    res.status(200).json({
        success: true,
        message: "Login successful",
        data: session,
    });
};

/** Current user, role and organization, plus a fresh token. */
export const getMe = async (req: Request, res: Response) => {
    const auth = getAuth(req);
    const session = await buildSession(auth.userId, auth.orgId);

    res.status(200).json({
        success: true,
        data: session,
    });
};

export const switchOrg = async (req: Request, res: Response) => {
    const auth = getAuth(req);
    const session = await buildSession(auth.userId, req.body.orgId);

    res.status(200).json({
        success: true,
        data: session,
    });
};
