import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MainContent from "./MainContent";
import "./layout.css";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SESSION_EVENT, clearSession, getSessionUser, getToken, roleLabel } from "../lib/session";
import { disablePush } from "../lib/push";

const pageTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/technician/tasks": "My Tasks",
    "/issues": "Issues",
    "/my-issues": "My Issues",
    "/admin/members": "Members",
    "/admin/locations": "Locations",
    "/admin/reports": "Reports",
    "/profile": "Profile",
    "/platform": "Platform",
};

const DashboardLayout = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const [user, setUser] = useState(getSessionUser);

    useEffect(() => {
        const refresh = () => setUser(getSessionUser());
        window.addEventListener(SESSION_EVENT, refresh);
        return () => window.removeEventListener(SESSION_EVENT, refresh);
    }, []);

    const [theme, setTheme] = useState<"dark" | "light">(() => {
        const savedTheme = localStorage.getItem("fixflow-theme");

        if (savedTheme === "light" || savedTheme === "dark") {
            return savedTheme;
        }

        return "dark";
    });

    useEffect(() => {
        localStorage.setItem("fixflow-theme", theme);
    }, [theme]);

    if (!user || !getToken()) {
        clearSession();
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="fx-app" data-theme={theme}>
            <Sidebar
                role={user.role}
                isPlatformAdmin={Boolean(user.isPlatformAdmin)}
                profile={{
                    name: user.name,
                    role: roleLabel[user.role],
                    organization: user.organization.name,
                }}
                onLogout={async () => {
                    // Needs the token, so it runs before the session is cleared.
                    await disablePush().catch(() => undefined);
                    clearSession();
                    navigate("/login");
                }}
            />

            <div className="fx-shell">
                <Topbar
                    title={pageTitles[pathname] ?? "FixFlow"}
                    theme={theme}
                    onThemeToggle={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                    }
                />

                <MainContent />
            </div>
        </div>
    );
};

export default DashboardLayout;
