import {Bell,User} from 'lucide-react';
import { Sun,Moon } from 'lucide-react';
interface TopbarProps{
    title:string,
    user:{
        name:string;
        role:string;
    };
    theme:"dark"|"light";
    onThemeToggle:()=>void
}

const Topbar=({title,user,theme,onThemeToggle}:TopbarProps)=>{
    return(
        <header className='fx-topbar'>
            <h1 className='fx-title'>{title}</h1>
            <div className='fx-top-right'>
                <button
                        type="button"
                        onClick={onThemeToggle}
                        className="fx-icon-btn"
                        title={theme === "dark" ? "Light mode" : "Dark mode"}
                >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button type="button" className='fx-icon-btn' aria-label='Notifications'>
                    <Bell size={20}/>
                </button>
                <div className='fx-user'>
                    <strong>{user.name}</strong>
                <strong>{user.role}</strong>
                </div>
                        <span className="fx-avatar" aria-hidden="true">
                        <User size={18} />
                        </span>
                </div>
        </header>
    );
};

export default Topbar;