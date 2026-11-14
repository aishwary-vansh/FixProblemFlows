import { z } from "zod";
import { OrgRole, TechnicianSpecialization } from "../generated/prisma/enums.js";
import { emailSchema, newAccountSchema } from "./auth.validator.js";

export const idParamSchema = z.object({
    id: z.coerce.number().int().positive("Invalid id"),
});

export const tokenParamSchema = z.object({
    token: z.string().min(20).max(200),
});

// Join links accept the org's join code or a QR point's shorter code.
export const joinCodeParamSchema = z.object({
    token: z.string().min(8).max(200),
});

// Owners are created at signup only; invites can never grant OWNER.
const invitableRole = z.enum([OrgRole.ADMIN, OrgRole.TECHNICIAN, OrgRole.REQUESTER]);

export const createInviteSchema = z.object({
    email: emailSchema.optional(),
    role: invitableRole,
    specialization: z.enum(TechnicianSpecialization).optional(),
});

export const acceptInviteSchema = z.discriminatedUnion("mode", [
    newAccountSchema
        .extend({ mode: z.literal("register") })
        .refine((data) => data.password === data.confirmPassword, {
            message: "Passwords do not match",
            path: ["confirmPassword"],
        }),
    z.object({
        mode: z.literal("login"),
        email: emailSchema,
        password: z.string().min(1, "Password is required"),
    }),
]);

export const listMembersQuerySchema = z.object({
    role: z.enum(OrgRole).optional(),
    active: z.stringbool().optional(),
});

export const updateMemberSchema = z
    .object({
        role: z.enum(OrgRole).optional(),
        specialization: z.enum(TechnicianSpecialization).nullable().optional(),
        isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

export const updateOrganizationSchema = z.object({
    autoAssign: z.boolean(),
});

export const deleteOrganizationSchema = z.object({
    confirmName: z.string().min(1, "Type the organization's name to confirm"),
});

export const addLocationsSchema = z.object({
    text: z.string().trim().min(1, "Add at least one building").max(5000, "This list is too long"),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
