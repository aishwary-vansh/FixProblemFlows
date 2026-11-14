import { Router } from "express";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { authenticate, getAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { pushEnabled, removeSubscription, saveSubscription } from "../services/push.service.js";
import { pushEndpointSchema, pushSubscriptionSchema } from "../validators/push.validator.js";
import { AppError } from "../utils/AppError.js";

const router = Router();

router.use(authenticate);

// Null tells the app that this server can't send push alerts, so it hides the button.
router.get("/key", (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { publicKey: pushEnabled ? env.VAPID_PUBLIC_KEY : null } });
});

router.post("/subscriptions", validate({ body: pushSubscriptionSchema }), async (req: Request, res: Response) => {
    if (!pushEnabled) {
        throw AppError.badRequest("Push alerts are not set up on this server");
    }
    await saveSubscription(getAuth(req), req.body);
    res.status(201).json({ success: true, message: "Alerts turned on" });
});

router.delete("/subscriptions", validate({ body: pushEndpointSchema }), async (req: Request, res: Response) => {
    await removeSubscription(getAuth(req), req.body.endpoint);
    res.status(200).json({ success: true, message: "Alerts turned off" });
});

export default router;
