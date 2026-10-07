import {z} from "zod";
export const createIssueSchema=z.object({
    title:z
    .string()
    .trim()
    .min(5,"Title must be atleast 5 characters")
    .max(100,"Title must not exceed 100 characters"),

    description:z
    .string()
    .trim()
    .min(5,"Description must be at least 10 characters")
    .max(1000,"Description must not exceed 1000 chars"),

    location: z
    .string()
    .trim()
    .min(2, "Location is required")
    .max(200, "Location cannot exceed 200 characters"),

    priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .default("MEDIUM")
})


export const assignIssueSchema=z.object({
    technicianId:z
    .number()
    .int()
    .positive("Invalid technician ID")
});