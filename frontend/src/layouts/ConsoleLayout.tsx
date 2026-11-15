import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, Check, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Topbar from "./Topbar";
import { clearConsoleSession, getConsoleAdmin } from "../lib/consoleApi";
import "./layout.css";

const pageTitles: Record<string, string> = {
    "/console": "Overview",
    "/console/organizations": "Organizations",
};

const navItems = [
    { to: "/console", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/console/organizations", label: "Organizations", icon: Building2, end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) => "fx-nav-item" + (isActive ? " active" : "");

/** The FixFlow Console's frame: the same look as the organization app, with console navigation. */
const ConsoleLayout = () => {
    const admin = getConsoleAdmin();
    const { pathname } = useLocation();
    const navigate = useNavigate();

    // Shares the theme choice with the organization app.
    const [theme, setTheme] = useState<"dark" | "light">(() => {
        try {
            return localStorage.getItem("fixflow-theme") === "light" ? "light" : "dark";
        } catch {
            return "dark";
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("fixflow-theme", theme);
        } catch {
            // Storage blocked: the choice lasts until the tab closes.
        }
    }, [theme]);

    if (!admin) {
        return <Navigate to="/console/login" replace />;
    }

    return (
        <div className="fx-app" data-theme={theme}>
            <aside className="fx-sidebar">
                <div className="fx-brand">
                    <span className="fx-brand-mark">
                        <Check size={16} strokeWidth={3} />
                    </span>
                    <span>FixFlow Console</span>
                </div>

                <nav className="fx-nav">
                    {navItems.map(({ to, label, icon: Icon, end }) => (
                        <NavLink key={to} to={to} end={end} title={label} className={linkClass}>
                            <Icon size={18} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="fx-sidebar-foot fx-nav">
                    <div className="fx-sidebar-profile" title={`Console admin: ${admin.email}`}>
                        <span className="fx-avatar" aria-hidden="true">
                            <ShieldCheck size={18} />
                        </span>
                        <div className="fx-user">
                            <strong>{admin.name}</strong>
                            <span>{admin.email}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="fx-nav-item"
                        title="Log out"
                        onClick={() => {
                            clearConsoleSession();
                            navigate("/console/login");
                        }}
                    >
                        <LogOut size={18} />
                        <span>Log out</span>
                    </button>
                </div>
            </aside>

            <div className="fx-shell">
                <Topbar
                    title={pageTitles[pathname] ?? "Console"}
                    theme={theme}
                    onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
                    showNotifications={false}
                />
                <main className="fx-main">
                    <div className="fx-content">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ConsoleLayout;
