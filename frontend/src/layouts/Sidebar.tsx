import { NavLink } from "react-router-dom";
import { Check, LayoutDashboard, CircleAlert, ClipboardList, User, Settings, LogOut } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/issues", label: "Issues", icon: CircleAlert },
  { to: "/my-issues", label: "My Issues", icon: ClipboardList },
];

const bottomItems = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  onLogout: () => void;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  "fx-nav-item" + (isActive ? " active" : "");

const Sidebar = ({ onLogout }: SidebarProps) => {
  return (
    <aside className="fx-sidebar">
      <div className="fx-brand">
        <span className="fx-brand-mark">
          <Check size={16} strokeWidth={3} />
        </span>
        <span>FixFlow</span>
      </div>

      <nav className="fx-nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} title={label} className={linkClass}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="fx-sidebar-foot fx-nav">
        {bottomItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} title={label} className={linkClass}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button type="button" className="fx-nav-item" onClick={onLogout} title="Logout">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;