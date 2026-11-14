import type { OrgRole } from "../generated/prisma/client.js";

/** Who is calling and in which organization. Set by the `authenticate` middleware. */
export interface AuthContext {
    userId: number;
    orgId: number;
    membershipId: number;
    role: OrgRole;
}
