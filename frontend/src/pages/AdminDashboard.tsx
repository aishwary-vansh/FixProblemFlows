import { useNavigate } from "react-router-dom";
import IssueCard from "../components/IssueCard";
import { getSessionUser } from "../lib/session";
import { useDashboardData } from "../lib/useDashboardData";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const user = getSessionUser();
    const { stats, recent, loading, error } = useDashboardData();

    if (loading) {
        return (
            <main className="fx-dashboard">
                <h2>Admin Dashboard</h2>
                <p>Loading dashboard...</p>
            </main>
        );
    }

    if (error || !stats) {
        return (
            <main className="fx-dashboard">
                <h2>Admin Dashboard</h2>
                <p role="alert">{error}</p>
            </main>
        );
    }

    const cards = [
        { label: "Total Issues", count: stats.total },
        { label: "Overdue", count: stats.overdue },
        { label: "New", count: stats.byStatus.NEW },
        { label: "Reopened", count: stats.byStatus.REOPENED },
        { label: "Assigned", count: stats.byStatus.ASSIGNED + stats.byStatus.ACCEPTED },
        { label: "In Progress", count: stats.byStatus.IN_PROGRESS },
        { label: "On Hold", count: stats.byStatus.ON_HOLD },
        { label: "Resolved", count: stats.byStatus.RESOLVED },
        { label: "Closed", count: stats.byStatus.CLOSED },
    ];

    return (
        <main className="fx-dashboard">
            <h2>Admin Dashboard</h2>

            <p>
                Welcome back, {user?.name}. Monitor and manage maintenance
                for {user?.organization.name}.
            </p>

            <section>
                <h2>Overview</h2>

                <div className="fx-grid-4">
                    {cards.map((stat) => (
                        <div
                            className="fx-panel fx-stat"
                            key={stat.label}
                        >
                            <h3>{stat.label}</h3>
                            <p>{stat.count}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="fx-section">
                <h2>Management</h2>

                <div className="fx-actions">
                    <button
                        className="fx-btn"
                        onClick={() => navigate("/issues")}
                    >
                        Manage Issues
                    </button>

                    <button
                        className="fx-btn"
                        onClick={() => navigate("/admin/members")}
                    >
                        Members &amp; Invites
                    </button>
                </div>
            </section>

            <section>
                <h2>Recent Issues</h2>

                {recent.length === 0 ? (
                    <p>No issues yet. Invite your team so they can start reporting.</p>
                ) : (
                    <div className="fx-issue-list">
                        {recent.map((issue) => (
                            <IssueCard
                                key={issue.id}
                                issue={issue}
                            />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
};

export default AdminDashboard;
