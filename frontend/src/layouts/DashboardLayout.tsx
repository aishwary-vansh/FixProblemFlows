import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MainContent from "./MainContent";
import "./layout.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect,useState } from "react";

const pageTitles: Record<string,string>={
    "/dashboard":"Dashboard",
    "/issues":"Issues",
    "/my-issues":"My Issues",
    "/profile":"Profile",
    "/settings":"Settings",
}


const DashboardLayout=()=>{
    const { pathname }=useLocation();
    const navigate=useNavigate();
    const [theme,setTheme]=useState<"dark"|"light">(()=>{
    const savedTheme=localStorage.getItem("fixflow-theme");

    if(savedTheme==="light"||savedTheme==="dark"){
        return savedTheme;
    }
    return "dark";
    });

    useEffect(()=>{
        localStorage.setItem("fixflow-theme",theme);
    },[theme]);
    return(
        <div className="fx-app" data-theme={theme}>
            <Sidebar
            onLogout={()=>{console.log("Logout clicked");
                navigate("/login");
            }}
            />
            <div className="fx-shell">
                <Topbar
                title={pageTitles[pathname]??"Fixflow"}
                user={{
                    name:"User name",
                    role:"USER",
                }}
                theme={theme}
                onThemeToggle={()=>
                    setTheme(theme==="dark"?"light":"dark")
                }
                />
                <MainContent/>
            </div>
        </div>
    );
};

export default DashboardLayout;