import { Link, NavLink } from "react-router-dom";
import {
    Check,
    LayoutDashboard,
    CircleAlert,
    LogOut,
    ClipboardList,
    MapPin,
    Globe,
    BarChart3,
    Users,
    User,
} from "lucide-react";
import type { UserRole } from "../types/issue";
import { isAdminRole } from "../lib/session";

interface SidebarProps {
    role: UserRole;
    isPlatformAdmin: boolean;
    profile: {
        name: string;
        role: string;
        organization: string;
    };
    onLogout: () => void;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
    "fx-nav-item" + (isActive ? " active" : "");

const Sidebar = ({ role, isPlatformAdmin, profile, onLogout }: SidebarProps) => {

    const roleItems =
        role === "TECHNICIAN"
            ? [
                {
                    to: "/dashboard",
                    label: "Dashboard",
                    icon: LayoutDashboard,
                },
                {
                    to: "/technician/tasks",
                    label: "My Tasks",
                    icon: ClipboardList,
                },
                {
                    to: "/my-issues",
                    label: "Reported by Me",
                    icon: CircleAlert,
                },
            ]
            : isAdminRole(role)
                ? [
                    {
                        to: "/dashboard",
                        label: "Dashboard",
                        icon: LayoutDashboard,
                    },
                    {
                        to: "/issues",
                        label: "All Issues",
                        icon: CircleAlert,
                    },
                    {
                        to: "/admin/reports",
                        label: "Reports",
                        icon: BarChart3,
                    },
                    {
                        to: "/admin/members",
                        label: "Members",
                        icon: Users,
                    },
                    {
                        to: "/admin/locations",
                        label: "Locations",
                        icon: MapPin,
                    },
                ]
                : [
                    {
                        to: "/dashboard",
                        label: "Dashboard",
                        icon: LayoutDashboard,
                    },
                    {
                        to: "/my-issues",
                        label: "My Issues",
                        icon: CircleAlert,
                    },
                ];

    const navItems = isPlatformAdmin
        ? [...roleItems, { to: "/platform", label: "Platform", icon: Globe }]
        : roleItems;

    return (
        <aside className="fx-sidebar">

            <div className="fx-brand">
                <span className="fx-brand-mark">
                    <Check size={16} strokeWidth={3} />
                </span>

                <span>FixFlow</span>
            </div>

            <nav className="fx-nav">
                {navItems.map(
                    ({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            title={label}
                            className={linkClass}
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                        </NavLink>
                    )
                )}
            </nav>

            <div className="fx-sidebar-foot fx-nav">
                <Link to="/profile" className="fx-sidebar-profile" title={`Your profile: ${profile.name} · ${profile.role} · ${profile.organization}`}>
                    <span className="fx-avatar" aria-hidden="true">
                        <User size={18} />
                    </span>
                    <div className="fx-user">
                        <strong>{profile.name}</strong>
                        <span>{profile.role} · {profile.organization}</span>
                    </div>
                </Link>

                <button
                    type="button"
                    className="fx-nav-item"
                    onClick={onLogout}
                    title="Logout"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>

            </div>
        </aside>
    );
};

export default Sidebar;
