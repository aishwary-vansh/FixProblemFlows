import NotificationBell from '../components/NotificationBell';
import { Sun, Moon } from 'lucide-react';
interface TopbarProps {
    title: string,
    theme: "dark" | "light";
    onThemeToggle: () => void
}

const Topbar = ({ title, theme, onThemeToggle }: TopbarProps) => {
    return (
        <header className='fx-topbar'>
            <h1 className='fx-title'>{title}</h1>
            <div className='fx-top-right'>
                <button
                    type="button"
                    onClick={onThemeToggle}
                    className="fx-icon-btn"
                    title={theme === "dark" ? "Light mode" : "Dark mode"}
                    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                {/* Last item in the bar, so its dropdown opens at the right edge. */}
                <NotificationBell />
            </div>
        </header>
    );
};

export default Topbar;
