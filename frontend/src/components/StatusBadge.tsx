import type { IssuePriority, IssueStatus } from "../types/issue";

interface StatusBadgeProps {
    status: IssueStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
    return (
        <span className={`fx-status-badge ${status.toLowerCase()}`}>
            {status.replace("_", " ")}
        </span>
    );
};

export const PriorityBadge = ({ priority }: { priority: IssuePriority }) => {
    return <span className={`fx-priority-badge ${priority.toLowerCase()}`}>{priority}</span>;
};

export default StatusBadge;
