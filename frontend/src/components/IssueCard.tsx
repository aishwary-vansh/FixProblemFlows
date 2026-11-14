import { useNavigate } from "react-router-dom";
import type { Issue } from "../types/issue";
import DeadlineChip from "./DeadlineChip";
import StatusBadge, { PriorityBadge } from "./StatusBadge";

interface IssueCardProps {
    issue: Issue;
}

/** One-line summary of an issue; opens the issue page. */
const IssueCard = ({ issue }: IssueCardProps) => {
    const navigate = useNavigate();

    return (
        <button type="button" className="fx-issue-card" onClick={() => navigate(`/issues/${issue.id}`)}>
            <div className="fx-issue-card-main">
                <strong>{issue.title}</strong>
                <span>
                    #{issue.id} · {issue.location} · {issue.assignee ? issue.assignee.name : "Not assigned"}
                </span>
            </div>
            <div className="fx-issue-card-badges">
                <DeadlineChip issue={issue} />
                <PriorityBadge priority={issue.priority} />
                <StatusBadge status={issue.status} />
            </div>
        </button>
    );
};

export default IssueCard;
