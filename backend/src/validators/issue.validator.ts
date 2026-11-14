import { z } from "zod";
import { IssueCategory, IssueStatus, Priority } from "../generated/prisma/enums.js";
import { NOTE_REQUIRED_STATUSES } from "../domain/issueStateMachine.js";

export const issueIdParamSchema = z.object({
    id: z.coerce.number().int().positive("Invalid issue ID"),
});

export const createIssueSchema = z.object({
    title: z
        .string()
        .trim()
        .min(5, "Title must be at least 5 characters")
        .max(100, "Title must not exceed 100 characters"),

    description: z
        .string()
        .trim()
        .min(10, "Description must be at least 10 characters")
        .max(1000, "Description must not exceed 1000 characters"),

    // The exact spot in the reporter's words. With locationId, it's added after the building and floor.
    location: z
        .string()
        .trim()
        .min(2, "Location is required")
        .max(200, "Location cannot exceed 200 characters"),

    locationId: z.number().int().positive("Invalid location").optional(),

    category: z.enum(IssueCategory).default("GENERAL"),

    priority: z.enum(Priority).default("MEDIUM"),
});

export const assignIssueSchema = z.object({
    technicianId: z.number().int().positive("Invalid technician ID"),
});

export const listIssuesQuerySchema = z.object({
    status: z.enum(IssueStatus).optional(),
    priority: z.enum(Priority).optional(),
    category: z.enum(IssueCategory).optional(),
    assigneeId: z.coerce.number().int().positive().optional(),
    // A building matches its floors too.
    locationId: z.coerce.number().int().positive().optional(),
    // Narrow to the caller's own issues: the ones they reported or the ones assigned to them.
    mine: z.enum(["reported", "assigned"]).optional(),
    overdue: z.stringbool().optional(),
    q: z.string().trim().max(100).optional(),
    cursor: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const issueStatsQuerySchema = listIssuesQuerySchema.pick({ mine: true });

export const similarIssuesQuerySchema = z.object({
    locationId: z.coerce.number().int().positive(),
    category: z.enum(IssueCategory).optional(),
});

export const markDuplicateSchema = z.object({
    duplicateOfId: z.number().int().positive("Enter the number of the original issue"),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
export type IssueStatsQuery = z.infer<typeof issueStatsQuerySchema>;
export type SimilarIssuesQuery = z.infer<typeof similarIssuesQuerySchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;

export const updatePrioritySchema = z.object({
    priority: z.enum(Priority),
});

export const transitionSchema = z
    .object({
        // Assignment has its own endpoint because it needs a technician. "NEW" is a decline.
        to: z.enum(["NEW", "ACCEPTED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REOPENED"]),
        note: z.string().trim().max(500).optional(),
        repairCost: z.number().int().min(0).max(10_000_000).optional(),
        repairMinutes: z.number().int().min(1).max(100_000).optional(),
        rating: z.number().int().min(1, "Rating must be 1 to 5").max(5, "Rating must be 1 to 5").optional(),
    })
    .refine((data) => !NOTE_REQUIRED_STATUSES.includes(data.to) || Boolean(data.note), {
        message: "Please add a short note explaining this",
        path: ["note"],
    })
    .refine((data) => data.rating === undefined || data.to === "CLOSED", {
        message: "A rating can only be given when confirming the fix",
        path: ["rating"],
    });

export const commentSchema = z.object({
    body: z.string().trim().min(1, "Comment can't be empty").max(1000, "Comment cannot exceed 1000 characters"),
});
