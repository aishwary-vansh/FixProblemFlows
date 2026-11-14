import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import type { IssueStatus } from "../types/issue";
import { useIssueList, type IssueFilters as Filters } from "../lib/useIssueList";
import IssueFilters from "../components/IssueFilters";
import DeadlineChip from "../components/DeadlineChip";
import StatusBadge, { PriorityBadge } from "../components/StatusBadge";

// One-click steps. Resolve, Decline and On Hold need details, so they live on the issue page.
const NEXT_ACTION: Partial<Record<IssueStatus, { to: IssueStatus; label: string }>> = {
    ASSIGNED: { to: "ACCEPTED", label: "Accept" },
    ACCEPTED: { to: "IN_PROGRESS", label: "Start Work" },
    ON_HOLD: { to: "IN_PROGRESS", label: "Resume" },
};

const TechnicianTasks = () => {
    const navigate = useNavigate();

    const [filters, setFilters] = useState<Filters>({
        q: "",
        status: "ALL",
        priority: "ALL",
        mine: "assigned",
    });
    const { issues, loading, loadingMore, error, hasMore, loadMore, replaceIssue } = useIssueList(filters);

    const [pendingId, setPendingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState("");

    const runAction = async (issueId: number, to: IssueStatus) => {
        setPendingId(issueId);
        setActionError("");
        try {
            const response = await api.post(`/issues/${issueId}/transitions`, { to });
            replaceIssue(response.data.data);
        } catch (err) {
            setActionError(`Issue #${issueId}: ${getErrorMessage(err, "Failed to update issue")}`);
        } finally {
            setPendingId(null);
        }
    };

    return (
        <main>

            <div className="fx-page-head">
                <h2>My Tasks</h2>
                <p>View and manage issues assigned to you</p>
            </div>

            <section className="fx-section">
                <h2>Filters</h2>
                <IssueFilters
                    filters={filters}
                    onChange={setFilters}
                    statuses={["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REOPENED"]}
                    searchPlaceholder="Search tasks..."
                />
            </section>

            <section className="fx-section">

                <h2>Assigned Issues</h2>

                {actionError && (
                    <p className="fx-upload-error" role="alert">{actionError}</p>
                )}

                {loading && (
                    <div className="fx-empty">
                        Loading tasks...
                    </div>
                )}

                {!loading && error && (
                    <div className="fx-empty" role="alert">
                        {error}
                    </div>
                )}

                {!loading && !error && issues.length === 0 && (
                    <div className="fx-empty">
                        {filters.q || filters.status !== "ALL" || filters.priority !== "ALL" || filters.overdue
                            ? "No tasks match your filters"
                            : "No tasks assigned"}
                    </div>
                )}

                {!loading && !error && issues.length > 0 && (
                    <div className="fx-table-wrapper">

                        <table className="fx-table">

                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Issue</th>
                                    <th>Location</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Deadline</th>
                                    <th>Reporter</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>

                                {issues.map((issue) => {
                                    const next = NEXT_ACTION[issue.status];
                                    return (
                                        <tr
                                            key={issue.id}
                                            onClick={() =>
                                                navigate(
                                                    `/issues/${issue.id}`
                                                )
                                            }
                                            className="fx-issue-row"
                                        >

                                            <td>
                                                #{issue.id}
                                            </td>

                                            <td>
                                                <strong>
                                                    {issue.title}
                                                </strong>

                                                <span className="fx-table-description">
                                                    {issue.description}
                                                </span>
                                            </td>

                                            <td>
                                                {issue.location}
                                            </td>

                                            <td>
                                                <PriorityBadge priority={issue.priority} />
                                            </td>

                                            <td>
                                                <StatusBadge status={issue.status} />
                                            </td>

                                            <td>
                                                <DeadlineChip issue={issue} />
                                            </td>

                                            <td>
                                                {issue.reporter.name}
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                {next ? (
                                                    <button
                                                        className="fx-btn fx-btn-sm"
                                                        disabled={pendingId === issue.id}
                                                        onClick={() => runAction(issue.id, next.to)}
                                                    >
                                                        {pendingId === issue.id ? "Saving..." : next.label}
                                                    </button>
                                                ) : issue.status === "IN_PROGRESS" ? (
                                                    <button
                                                        className="fx-btn fx-btn-sm"
                                                        onClick={() => navigate(`/issues/${issue.id}`)}
                                                    >
                                                        Resolve
                                                    </button>
                                                ) : issue.status === "RESOLVED" ? (
                                                    <span>Awaiting reporter</span>
                                                ) : issue.status === "REOPENED" ? (
                                                    <span>Waiting for admin</span>
                                                ) : null}
                                            </td>

                                        </tr>
                                    );
                                })}

                            </tbody>

                        </table>

                    </div>
                )}

                {!loading && hasMore && (
                    <div className="fx-actions fx-section">
                        <button type="button" className="fx-btn" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? "Loading..." : "Load more"}
                        </button>
                    </div>
                )}

            </section>

        </main>
    );
};

export default TechnicianTasks;
