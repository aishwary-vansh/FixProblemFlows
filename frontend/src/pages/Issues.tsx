import type { Issue, IssueStatus } from "../types/issue";
import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../services/api";
import CreateIssue from "./CreateIssue";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { Member } from "../types/user";
import { getSessionUser, isAdminRole } from "../lib/session";
import { useIssueList, type IssueFilters as Filters } from "../lib/useIssueList";
import IssueFilters from "../components/IssueFilters";
import DeadlineChip from "../components/DeadlineChip";
import StatusBadge, { PriorityBadge } from "../components/StatusBadge";

// Mirrors the API: resolved and closed issues must be reopened before they can be reassigned.
const ASSIGNABLE: IssueStatus[] = ["NEW", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "ON_HOLD", "REOPENED"];

const Issues = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const user = getSessionUser();
    const isAdmin = isAdminRole(user?.role);
    // Admins see everything on /issues; everyone else (and /my-issues) sees what they reported.
    const showAll = isAdmin && pathname === "/issues";

    const [filters, setFilters] = useState<Filters>({
        q: "",
        status: "ALL",
        priority: "ALL",
    });
    const { issues, loading, loadingMore, error, hasMore, loadMore, replaceIssue, prependIssue } = useIssueList(
        showAll ? filters : { ...filters, mine: "reported" }
    );

    const [showCreateIssue, setShowCreateIssue] = useState(searchParams.get("new") === "1");
    const [technicians, setTechnicians] = useState<Member[]>([]);
    const [assignError, setAssignError] = useState("");

    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        api.get("/members", { params: { role: "TECHNICIAN", active: true } })
            .then((response) => setTechnicians(response.data.data))
            .catch((err) => setAssignError(getErrorMessage(err, "Failed to load technicians")));
    }, [isAdmin]);

    const closeCreateIssue = () => {
        setShowCreateIssue(false);
        if (searchParams.has("new")) {
            searchParams.delete("new");
            setSearchParams(searchParams, { replace: true });
        }
    };

    const handleIssueCreated = (newIssue: Issue) => {
        prependIssue(newIssue);
        closeCreateIssue();
    };

    const handleAssignTechnician = async (
        issueId: number,
        technicianId: number
    ) => {
        setAssignError("");
        try {
            const response = await api.patch(
                `/issues/${issueId}/assign`,
                {
                    technicianId
                }
            );
            replaceIssue(response.data.data);
        }
        catch (err) {
            setAssignError(getErrorMessage(err, "Failed to assign technician"));
        }
    };

    return (
        <main>
            <div className="fx-page-head">
                <h2>{showAll ? "All Issues" : "My Issues"}</h2>

                <p>
                    {showAll
                        ? "View and manage all maintenance issues"
                        : "View and track the issues you have reported"}
                </p>
            </div>

            <section className="fx-section">
                <button
                    className="fx-btn"
                    onClick={() => setShowCreateIssue(true)}
                >
                    + Report Issue
                </button>
            </section>

            <section className="fx-section">
                <h2>Filters</h2>
                <IssueFilters filters={filters} onChange={setFilters} />
            </section>

            <section className="fx-section">
                <h2>{showAll ? "Issues" : "Reported by you"}</h2>

                {assignError && (
                    <p className="fx-upload-error" role="alert">{assignError}</p>
                )}

                {loading && (
                    <div className="fx-empty">
                        Loading issues...
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
                            ? "No issues match your filters"
                            : "No issues yet"}
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
                                    <th>Assigned To</th>
                                </tr>
                            </thead>

                            <tbody>
                                {issues.map((issue) => (
                                    <tr
                                        key={issue.id}
                                        onClick={() =>
                                            navigate(`/issues/${issue.id}`)
                                        }
                                        className="fx-issue-row"
                                    >
                                        <td>#{issue.id}</td>

                                        <td>
                                            <strong>{issue.title}</strong>

                                            <span className="fx-table-description">
                                                {issue.description}
                                            </span>
                                        </td>

                                        <td>{issue.location}</td>

                                        <td><PriorityBadge priority={issue.priority} /></td>

                                        <td><StatusBadge status={issue.status} /></td>

                                        <td><DeadlineChip issue={issue} /></td>

                                        <td onClick={(e) => e.stopPropagation()}>
                                            {isAdmin && ASSIGNABLE.includes(issue.status) ? (
                                                <select
                                                    className="fx-select-2"
                                                    aria-label={`Assign technician to issue ${issue.id}`}
                                                    value={issue.assigneeId ?? ""}
                                                    onChange={(e) => {
                                                        const technicianId = Number(e.target.value);

                                                        if (!technicianId) {
                                                            return;
                                                        }

                                                        handleAssignTechnician(
                                                            issue.id,
                                                            technicianId
                                                        );
                                                    }}
                                                >
                                                    <option value="" disabled>
                                                        Assign technician
                                                    </option>

                                                    {/* Keep a deactivated assignee visible instead of showing a blank select. */}
                                                    {issue.assignee && !technicians.some((t) => t.userId === issue.assigneeId) && (
                                                        <option value={issue.assignee.id}>{issue.assignee.name}</option>
                                                    )}

                                                    {technicians.map((technician) => (
                                                        <option
                                                            key={technician.userId}
                                                            value={technician.userId}
                                                        >
                                                            {technician.name}
                                                            {technician.specialization ? ` · ${technician.specialization}` : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                issue.assignee
                                                    ? issue.assignee.name
                                                    : "Unassigned"
                                            )}
                                        </td>
                                    </tr>
                                ))}
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

            {showCreateIssue && (
                <CreateIssue
                    onClose={closeCreateIssue}
                    onIssueCreated={handleIssueCreated}
                />
            )}
        </main>
    );
};

export default Issues;
