import { useEffect, useState } from "react";
import type { Issue, IssueStatus } from "../types/issue";

const OPEN_STATUSES: IssueStatus[] = ["NEW", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "REOPENED"];
const HOUR_MS = 60 * 60 * 1000;

const formatSpan = (ms: number) => {
    const minutes = Math.max(1, Math.round(ms / 60_000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    return hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`;
};

interface DeadlineChipProps {
    issue: Pick<Issue, "status" | "dueAt">;
}

/** Live countdown to an issue's deadline. Shows nothing once the work is resolved. */
const DeadlineChip = ({ issue }: DeadlineChipProps) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    if (issue.status === "ON_HOLD") {
        return <span className="fx-deadline">On hold</span>;
    }

    if (!issue.dueAt || !OPEN_STATUSES.includes(issue.status)) {
        return null;
    }

    const remaining = new Date(issue.dueAt).getTime() - now;

    if (remaining <= 0) {
        return <span className="fx-deadline overdue">Overdue {formatSpan(-remaining)}</span>;
    }

    return (
        <span className={"fx-deadline" + (remaining < 24 * HOUR_MS ? " soon" : "")}>
            Due in {formatSpan(remaining)}
        </span>
    );
};

export default DeadlineChip;
