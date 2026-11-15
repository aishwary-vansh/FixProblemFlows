import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { authenticate, getAuth } from "../middleware/auth.middleware.js";
import { authorise } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createCheckout, handleWebhook, listPayments, verifyCheckout } from "../services/billing.service.js";

const checkoutSchema = z.object({ period: z.enum(["MONTHLY", "YEARLY"]) });

const verifySchema = z.object({
    orderId: z.string().min(1).max(100),
    paymentId: z.string().min(1).max(100),
    signature: z.string().min(1).max(200),
});

const router = Router();

// Razorpay calls this with no login. app.ts gives it the raw body, which the signature is computed over.
router.post("/webhook", async (req: Request, res: Response) => {
    const ok = await handleWebhook(req.body as Buffer, req.header("x-razorpay-signature"));
    res.status(ok ? 200 : 400).json({ success: ok });
});

// Buying is the owner's decision.
router.use(authenticate, authorise("OWNER"));

router.post("/checkout", validate({ body: checkoutSchema }), async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await createCheckout(getAuth(req), req.body.period) });
});

router.post("/verify", validate({ body: verifySchema }), async (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: "Payment received", data: await verifyCheckout(getAuth(req), req.body) });
});

router.get("/payments", async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await listPayments(getAuth(req).orgId) });
});

export default router;
