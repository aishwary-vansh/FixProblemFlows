import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getSessionUser } from "../lib/session";
import type { UserRole } from "../types/issue";

/** Hides pages a role can't use. The API enforces the same rules; this only avoids dead-end screens. */
export const RequireRole = ({ roles, children }: { roles: UserRole[]; children: ReactNode }) => {
    const user = getSessionUser();
    if (!user || !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
};
