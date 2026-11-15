import { z } from "zod";

const note = z.string().trim().max(500).optional();
const requiredNote = z.string().trim().min(3, "Write a short reason").max(500);
const shareWithOwner = z.boolean().default(false);

/** The FixFlow Console's plan actions. Revoking and sending a notice need a note; the rest take one optionally. */
export const planActionSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("grant"), endsAt: z.iso.datetime().nullable(), note, shareWithOwner }),
    z.object({ action: z.literal("extend"), days: z.number().int().min(1).max(3650), note, shareWithOwner }),
    z.object({ action: z.literal("revoke"), note: requiredNote, shareWithOwner }),
    z.object({ action: z.literal("price"), priceInr: z.number().int().min(0).max(1_000_000).nullable(), note, shareWithOwner }),
    // A notice is always for the owner, so the note is the message.
    z.object({ action: z.literal("notice"), level: z.enum(["INFO", "WARNING"]), note: requiredNote }),
    z.object({ action: z.literal("clear_notice"), note }),
]);

export type PlanActionInput = z.infer<typeof planActionSchema>;
