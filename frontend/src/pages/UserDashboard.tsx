import { useNavigate } from "react-router-dom";
import IssueCard from "../components/IssueCard";
import { getSessionUser } from "../lib/session";
import { useDashboardData } from "../lib/useDashboardData";

const UserDashboard = () => {
    const navigate = useNavigate();
    const user = getSessionUser();
    const { stats, recent, loading, error } = useDashboardData("reported");

    if (loading) {
        return (
            <main className="fx-dashboard">
                <h2>My Dashboard</h2>
                <p>Loading dashboard...</p>
            </main>
        );
    }

    if (error || !stats) {
        return (
            <main className="fx-dashboard">
                <h2>My Dashboard</h2>
                <p role="alert">{error}</p>
            </main>
        );
    }

    const cards = [
        { label: "Open", count: stats.byStatus.NEW + stats.byStatus.REOPENED + stats.byStatus.ASSIGNED + stats.byStatus.ACCEPTED },
        { label: "In Progress", count: stats.byStatus.IN_PROGRESS + stats.byStatus.ON_HOLD },
        { label: "Awaiting your check", count: stats.byStatus.RESOLVED },
        { label: "Closed", count: stats.byStatus.CLOSED },
    ];

    return (
        <main className="fx-dashboard">
            <h2>My Dashboard</h2>

            <p>
                Welcome back, {user?.name}. Track and manage your
                reported maintenance issues.
            </p>

            <section>
                <h2>My Issue Overview</h2>

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
                        onClick={() => navigate("/my-issues?new=1")}
                    >
                        + Report Issue
                    </button>

                    <button
                        className="fx-btn"
                        onClick={() => navigate("/my-issues")}
                    >
                        View My Issues
                    </button>
                </div>
            </section>

            <section>
                <h2>Recent Issues</h2>

                {recent.length === 0 ? (
                    <p>No issues reported yet.</p>
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

export default UserDashboard;
