import {Routes,Route,Navigate} from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Landing from "../pages/Landing";
import Signup from "../pages/Signup";
import DashboardLayout from "../layouts/DashboardLayout";
import Issues from "../pages/Issues";
import CreateIssue from "../pages/CreateIssue";
import IssueDetails from "../pages/IssueDetails";

const AppRoutes=()=>{
    return(
        <Routes>
            <Route path="/" element={<Landing/>}/>
            <Route path="/login" element={<Login/>}/>
            
            <Route path="/signup" element={<Signup/>}/>
            <Route element={<DashboardLayout/>}>
                <Route path="/dashboard" element={<Dashboard/>}/>
                <Route path="/issues" element={<Issues/>}/>
                <Route path="/issues/:id" element={<IssueDetails/>}/>

            </Route>
            <Route 
            path="*"
            element={<Navigate to="/login" replace/>}
            />

        </Routes>
    )
}

export default AppRoutes;