import type { UserRole } from "../types/issue";
import type { TechnicianSpecialization } from "../types/user";

export interface SessionOrganization {
    id: number;
    name: string;
    slug: string;
}

export interface SessionUser {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    specialization: TechnicianSpecialization | null;
    organization: SessionOrganization;
}

/** What login, signup, invite acceptance and org switch return. */
export interface Session {
    token: string;
    user: SessionUser;
    organizations: (SessionOrganization & { role: UserRole })[];
}

const TOKEN_KEY = "token";
const USER_KEY = "user";

export const SESSION_EVENT = "fixflow-session";

export const saveSession = (session: Session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    // Lets the open layout show a changed name or organization without a reload.
    window.dispatchEvent(new Event(SESSION_EVENT));
};

export const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getSessionUser = (): SessionUser | null => {
    try {
        const stored = localStorage.getItem(USER_KEY);
        const user = stored ? (JSON.parse(stored) as SessionUser) : null;
        // Sessions saved before multi-tenancy have no organization; treat them as logged out.
        return user?.organization ? user : null;
    } catch {
        return null;
    }
};

export const isAdminRole = (role: UserRole | undefined) => role === "OWNER" || role === "ADMIN";

export const roleLabel: Record<UserRole, string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    TECHNICIAN: "Technician",
    REQUESTER: "Requester",
};
