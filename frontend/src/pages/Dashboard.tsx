import UserDashboard from "./UserDashboard";
import TechnicianDashboard from "./TechnicianDashboard";
import AdminDashboard from "./AdminDashboard";
import { getSessionUser, isAdminRole } from "../lib/session";

const Dashboard = () => {
    const role = getSessionUser()?.role;

    if (isAdminRole(role)) {
        return <AdminDashboard />;
    }

    if (role === "TECHNICIAN") {
        return <TechnicianDashboard />;
    }

    return <UserDashboard />;
};

export default Dashboard;
