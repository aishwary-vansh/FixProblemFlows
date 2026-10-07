import { Outlet } from "react-router-dom";

const MainContent=()=>{
    return(
        <main className="fx-main">
            <div className="fx-content">
                <Outlet/>
            </div>
        </main>
    )
}

export default MainContent;