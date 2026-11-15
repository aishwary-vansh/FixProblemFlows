import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Landing from "../pages/Landing";
import Signup from "../pages/Signup";
import AcceptInvite from "../pages/AcceptInvite";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import { Privacy, Terms } from "../pages/Legal";
import ReportPointLanding from "../pages/ReportPointLanding";
import DashboardLayout from "../layouts/DashboardLayout";
import Issues from "../pages/Issues";
import IssueDetails from "../pages/IssueDetails";
import TechnicianTasks from "../pages/TechnicianTasks";
import Members from "../pages/Members";
import Locations from "../pages/Locations";
import Analytics from "../pages/Analytics";
import Profile from "../pages/Profile";
import BillingPage from "../pages/Billing";
import ConsoleLogin from "../pages/console/ConsoleLogin";
import ConsoleLayout from "../layouts/ConsoleLayout";
import ConsoleOverview from "../pages/console/ConsoleOverview";
import ConsoleOrganizations from "../pages/console/ConsoleOrganizations";
import { RequireRole } from "./RequireRole";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/invite/:token" element={<AcceptInvite apiBase="/invites" />} />
            <Route path="/join/:token" element={<AcceptInvite apiBase="/join" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/r/:code" element={<ReportPointLanding />} />
            {/* The FixFlow Console, for the people who run FixFlow. Separate login, not tied to any organization. */}
            <Route path="/console/login" element={<ConsoleLogin />} />
            <Route path="/console" element={<ConsoleLayout />}>
                <Route index element={<ConsoleOverview />} />
                <Route path="organizations" element={<ConsoleOrganizations />} />
            </Route>
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* DashboardLayout redirects to /login when there is no session. */}
            <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/issues" element={<Issues />} />
                <Route path="/my-issues" element={<Issues />} />
                <Route path="/issues/:id" element={<IssueDetails />} />
                <Route
                    path="/technician/tasks"
                    element={<RequireRole roles={["TECHNICIAN"]}><TechnicianTasks /></RequireRole>}
                />
                <Route
                    path="/admin/members"
                    element={<RequireRole roles={["OWNER", "ADMIN"]}><Members /></RequireRole>}
                />
                <Route
                    path="/admin/locations"
                    element={<RequireRole roles={["OWNER", "ADMIN"]}><Locations /></RequireRole>}
                />
                <Route
                    path="/admin/plan"
                    element={<RequireRole roles={["OWNER"]}><BillingPage /></RequireRole>}
                />
                <Route path="/profile" element={<Profile />} />
                <Route
                    path="/admin/reports"
                    element={<RequireRole roles={["OWNER", "ADMIN"]}><Analytics /></RequireRole>}
                />
            </Route>

            <Route
                path="*"
                element={<Navigate to="/login" replace />}
            />
        </Routes>
    );
};

export default AppRoutes;
