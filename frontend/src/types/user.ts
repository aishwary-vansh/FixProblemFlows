import type { UserRole } from "./issue";

export type TechnicianSpecialization =
    | "ELECTRICAL"
    | "PLUMBING"
    | "CARPENTRY"
    | "CIVIL"
    | "HVAC"
    | "IT"
    | "GENERAL";

export const SPECIALIZATIONS: TechnicianSpecialization[] = [
    "ELECTRICAL",
    "PLUMBING",
    "CARPENTRY",
    "CIVIL",
    "HVAC",
    "IT",
    "GENERAL",
];

/** A user's membership in the current organization. `id` is the membership id, `userId` the user's. */
export interface Member {
    id: number;
    userId: number;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    specialization: TechnicianSpecialization | null;
    isActive: boolean;
    createdAt: string;
}

export interface PendingInvite {
    id: number;
    email: string | null;
    role: UserRole;
    specialization: TechnicianSpecialization | null;
    expiresAt: string;
    createdAt: string;
    createdBy: { id: number; name: string };
}
