import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../services/api";
import type { Issue, IssueStats } from "../types/issue";

/**
 * Status counts (computed by the API over all issues) plus the five most recent issues.
 * `mine` narrows both to issues the caller reported or is assigned to.
 */
export const useDashboardData = (mine?: "reported" | "assigned") => {
    const [stats, setStats] = useState<IssueStats | null>(null);
    const [recent, setRecent] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const params = mine ? { mine } : {};
        Promise.all([
            api.get("/issues/stats", { params }),
            api.get("/issues", { params: { ...params, limit: 5 } }),
        ])
            .then(([statsResponse, issuesResponse]) => {
                setStats(statsResponse.data.data);
                setRecent(issuesResponse.data.data);
            })
            .catch((err) => setError(getErrorMessage(err, "Failed to load dashboard data")))
            .finally(() => setLoading(false));
    }, [mine]);

    return { stats, recent, loading, error };
};
