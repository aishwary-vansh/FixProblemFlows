import { useCallback, useEffect, useRef, useState } from "react";
import api, { getErrorMessage } from "../services/api";
import type { Issue, IssueListResponse, IssuePriority, IssueStatus } from "../types/issue";

export interface IssueFilters {
    q: string;
    status: "ALL" | IssueStatus;
    priority: "ALL" | IssuePriority;
    mine?: "reported" | "assigned";
    overdue?: boolean;
    /** A building (with its floors) or one floor. */
    locationId?: number;
}

const PAGE_SIZE = 20;

/** Server-side filtered, cursor-paginated issue list. Search is debounced. */
export const useIssueList = (filters: IssueFilters) => {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");
    const requestId = useRef(0);

    const params = useCallback(
        (cursor?: number) => ({
            limit: PAGE_SIZE,
            ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
            ...(filters.status !== "ALL" ? { status: filters.status } : {}),
            ...(filters.priority !== "ALL" ? { priority: filters.priority } : {}),
            ...(filters.mine ? { mine: filters.mine } : {}),
            ...(filters.overdue ? { overdue: true } : {}),
            ...(filters.locationId ? { locationId: filters.locationId } : {}),
            ...(cursor ? { cursor } : {}),
        }),
        [filters.q, filters.status, filters.priority, filters.mine, filters.overdue, filters.locationId]
    );

    useEffect(() => {
        const id = ++requestId.current;
        const timer = setTimeout(() => {
            setLoading(true);
            api.get<IssueListResponse>("/issues", { params: params() })
                .then((response) => {
                    // Ignore responses for filters the user has already changed.
                    if (id !== requestId.current) return;
                    setIssues(response.data.data);
                    setNextCursor(response.data.meta.nextCursor);
                    setError("");
                })
                .catch((err) => {
                    if (id === requestId.current) setError(getErrorMessage(err, "Failed to load issues"));
                })
                .finally(() => {
                    if (id === requestId.current) setLoading(false);
                });
        }, filters.q ? 300 : 0);

        return () => clearTimeout(timer);
    }, [params, filters.q]);

    const loadMore = async () => {
        if (!nextCursor) return;
        setLoadingMore(true);
        try {
            const response = await api.get<IssueListResponse>("/issues", { params: params(nextCursor) });
            setIssues((current) => [...current, ...response.data.data]);
            setNextCursor(response.data.meta.nextCursor);
        } catch (err) {
            setError(getErrorMessage(err, "Failed to load more issues"));
        } finally {
            setLoadingMore(false);
        }
    };

    const replaceIssue = (updated: Issue) =>
        setIssues((current) => current.map((issue) => (issue.id === updated.id ? updated : issue)));

    const prependIssue = (created: Issue) => setIssues((current) => [created, ...current]);

    return { issues, loading, loadingMore, error, hasMore: nextCursor !== null, loadMore, replaceIssue, prependIssue };
};
