import { z } from "zod";

// The shape of the browser's PushSubscription.toJSON().
export const pushSubscriptionSchema = z.object({
    endpoint: z.url().max(1000),
    keys: z.object({
        p256dh: z.string().min(1).max(200),
        auth: z.string().min(1).max(100),
    }),
});

export const pushEndpointSchema = z.object({
    endpoint: z.url().max(1000),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
