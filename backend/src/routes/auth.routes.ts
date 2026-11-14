import { Router } from "express";
import type { Request, Response } from "express";
import { register, login, getMe, switchOrg } from "../controllers/auth.controllers.js";
import { authenticate, getAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";
import { requestPasswordReset, resetPassword } from "../services/passwordReset.service.js";
import { changePassword, updateProfile } from "../services/profile.service.js";
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    switchOrgSchema,
    updateProfileSchema,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), register);
router.post("/login", authLimiter, validate({ body: loginSchema }), login);
router.get("/me", authenticate, getMe);
router.post("/switch-org", authenticate, validate({ body: switchOrgSchema }), switchOrg);

router.patch("/me", authenticate, validate({ body: updateProfileSchema }), async (req: Request, res: Response) => {
    const session = await updateProfile(getAuth(req), req.body);
    res.status(200).json({ success: true, message: "Profile updated", data: session });
});

router.post("/change-password", authLimiter, authenticate, validate({ body: changePasswordSchema }), async (req: Request, res: Response) => {
    const session = await changePassword(getAuth(req), req.body);
    res.status(200).json({ success: true, message: "Password changed. You've been logged out on other devices.", data: session });
});

router.post("/forgot-password", authLimiter, validate({ body: forgotPasswordSchema }), async (req: Request, res: Response) => {
    await requestPasswordReset(req.body.email);
    // Same answer whether or not the account exists.
    res.status(200).json({ success: true, message: "If an account exists for this email, we've sent a reset link." });
});

router.post("/reset-password", authLimiter, validate({ body: resetPasswordSchema }), async (req: Request, res: Response) => {
    await resetPassword(req.body.token, req.body.password);
    res.status(200).json({ success: true, message: "Password changed. Log in with your new password." });
});

export default router;
