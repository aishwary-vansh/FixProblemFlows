import webpush from "web-push";
import prisma from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import type { AuthContext } from "../types/auth.js";
import type { PushSubscriptionInput } from "../validators/push.validator.js";

export const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushEnabled) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

/** A device belongs to whoever last turned alerts on with it, so a shared phone never alerts two people. */
export const saveSubscription = async (ctx: AuthContext, { endpoint, keys }: PushSubscriptionInput) => {
    await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: { userId: ctx.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        update: { userId: ctx.userId, p256dh: keys.p256dh, auth: keys.auth },
    });
};

export const removeSubscription = async (ctx: AuthContext, endpoint: string) => {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: ctx.userId } });
};

interface PushMessage {
    body: string;
    url: string;
}

/** Sends to every device the user turned alerts on for. Devices the browser has dropped are forgotten. */
export const pushToUser = async (userId: number, message: PushMessage) => {
    const devices = await prisma.pushSubscription.findMany({ where: { userId } });

    await Promise.all(
        devices.map(async (device) => {
            try {
                await webpush.sendNotification(
                    { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
                    JSON.stringify({ title: "FixFlow", ...message }),
                    { TTL: 24 * 60 * 60 }
                );
            } catch (err) {
                const status = (err as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) {
                    await prisma.pushSubscription.deleteMany({ where: { id: device.id } });
                } else {
                    logger.warn({ err, userId }, "Push alert failed");
                }
            }
        })
    );
};
