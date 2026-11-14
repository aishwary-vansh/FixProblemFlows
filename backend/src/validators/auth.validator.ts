import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Invalid email address"));

export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot have more than 72 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain a special character");

export const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(80);

export const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Invalid phone number");

/** Fields shared by signup and "create an account to accept an invite". */
export const newAccountSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    phone: phoneSchema,
    termsAccepted: z.literal(true, { error: "You must accept the terms and conditions" }),
});

export const registerSchema = newAccountSchema
    .extend({
        organizationName: z
            .string()
            .trim()
            .min(2, "Organization name must be at least 2 characters")
            .max(100, "Organization name cannot exceed 100 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
    orgId: z.number().int().positive().optional(),
});

export const switchOrgSchema = z.object({
    orgId: z.number().int().positive(),
});

export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z
    .object({
        token: z.string().min(20).max(200),
        password: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export const updateProfileSchema = z.object({
    name: nameSchema,
    phone: phoneSchema,
});

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Enter your current password"),
        password: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
