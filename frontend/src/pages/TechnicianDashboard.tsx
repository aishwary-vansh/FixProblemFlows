import { useNavigate } from "react-router-dom";
import IssueCard from "../components/IssueCard";
import { getSessionUser } from "../lib/session";
import { useDashboardData } from "../lib/useDashboardData";

const TechnicianDashboard = () => {
    const navigate = useNavigate();
    const user = getSessionUser();
    const { stats, recent, loading, error } = useDashboardData("assigned");

    if (loading) {
        return (
            <main className="fx-dashboard">
                <h2>Technician Dashboard</h2>
                <p>Loading dashboard...</p>
            </main>
        );
    }

    if (error || !stats) {
        return (
            <main className="fx-dashboard">
                <h2>Technician Dashboard</h2>
                <p role="alert">{error}</p>
            </main>
        );
    }

    const cards = [
        { label: "Overdue", count: stats.overdue },
        { label: "Assigned", count: stats.byStatus.ASSIGNED },
        { label: "Accepted", count: stats.byStatus.ACCEPTED },
        { label: "In Progress", count: stats.byStatus.IN_PROGRESS },
        { label: "On Hold", count: stats.byStatus.ON_HOLD },
        { label: "Resolved", count: stats.byStatus.RESOLVED + stats.byStatus.CLOSED },
    ];

    return (
        <main className="fx-dashboard">
            <h2>Technician Dashboard</h2>

            <p>
                Welcome back, {user?.name}. Manage and resolve your
                assigned maintenance tasks.
            </p>

            <section>
                <h2>Task Overview</h2>

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
                <h2>Quick Actions</h2>

                <div className="fx-actions">
                    <button
                        className="fx-btn"
                        onClick={() =>
                            navigate("/technician/tasks")
                        }
                    >
                        View My Tasks
                    </button>
                </div>
            </section>

            <section>
                <h2>Recent Assigned Tasks</h2>

                {recent.length === 0 ? (
                    <p>No assigned tasks yet.</p>
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

export default TechnicianDashboard;
