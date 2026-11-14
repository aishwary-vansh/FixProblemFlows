import { z } from "zod";

export const createReportPointSchema = z.object({
    name: z.string().trim().min(2, "Give the QR point a name").max(80, "Name cannot exceed 80 characters"),
    locationId: z.number().int().positive().optional(),
    spot: z.string().trim().max(200, "Spot cannot exceed 200 characters").optional(),
});

export const reportPointCodeSchema = z.object({
    code: z.string().min(8).max(64),
});

export type CreateReportPointInput = z.infer<typeof createReportPointSchema>;
