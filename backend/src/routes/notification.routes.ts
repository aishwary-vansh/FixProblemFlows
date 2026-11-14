import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, getAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamSchema } from "../validators/member.validator.js";
import {
    listNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "../services/notification.service.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
    const result = await listNotifications(getAuth(req));
    res.status(200).json({ success: true, data: result.items, meta: { unreadCount: result.unreadCount } });
});

router.post("/read-all", async (req: Request, res: Response) => {
    await markAllNotificationsRead(getAuth(req));
    res.status(200).json({ success: true, message: "All notifications marked as read" });
});

router.patch("/:id/read", validate({ params: idParamSchema }), async (req: Request, res: Response) => {
    await markNotificationRead(getAuth(req), Number(req.params.id));
    res.status(200).json({ success: true, message: "Notification marked as read" });
});

export default router;
