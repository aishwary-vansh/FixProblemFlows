import { useEffect, useState } from "react";
import api from "../services/api";
import type { IssuePriority, IssueStatus, LocationBuilding } from "../types/issue";
import type { IssueFilters as Filters } from "../lib/useIssueList";

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
    { value: "NEW", label: "New" },
    { value: "ASSIGNED", label: "Assigned" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "ON_HOLD", label: "On Hold" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
    { value: "REOPENED", label: "Reopened" },
];

interface IssueFiltersProps {
    filters: Filters;
    onChange: (filters: Filters) => void;
    statuses?: IssueStatus[];
    searchPlaceholder?: string;
}

const IssueFilters = ({ filters, onChange, statuses, searchPlaceholder = "Search issues..." }: IssueFiltersProps) => {
    const [buildings, setBuildings] = useState<LocationBuilding[]>([]);

    useEffect(() => {
        // The location filter is a nice-to-have; without it the other filters still work.
        api.get("/locations")
            .then((response) => setBuildings(response.data.data))
            .catch(() => setBuildings([]));
    }, []);

    return (
        <div className="fx-oneline">
            <div>
                <input
                    type="search"
                    className="fx-select-1"
                    placeholder={searchPlaceholder}
                    aria-label="Search"
                    value={filters.q}
                    onChange={(e) => onChange({ ...filters, q: e.target.value })}
                />
            </div>

            <div className="fx-space">
                {buildings.length > 0 && (
                    <select
                        className="fx-select-2"
                        aria-label="Filter by location"
                        value={filters.locationId ?? ""}
                        onChange={(e) => onChange({ ...filters, locationId: e.target.value ? Number(e.target.value) : undefined })}
                    >
                        <option value="">All locations</option>
                        {buildings.map((building) => (
                            <optgroup key={building.id} label={building.name}>
                                <option value={building.id}>All of {building.name}</option>
                                {building.floors.map((floor) => (
                                    <option key={floor.id} value={floor.id}>{building.name} · {floor.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                )}

                <select
                    className="fx-select-2"
                    aria-label="Filter by status"
                    value={filters.status}
                    onChange={(e) => onChange({ ...filters, status: e.target.value as Filters["status"] })}
                >
                    <option value="ALL">All statuses</option>
                    {STATUS_OPTIONS.filter((option) => !statuses || statuses.includes(option.value)).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>

                <select
                    className="fx-select-2"
                    aria-label="Filter by priority"
                    value={filters.priority}
                    onChange={(e) => onChange({ ...filters, priority: e.target.value as "ALL" | IssuePriority })}
                >
                    <option value="ALL">All priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                </select>

                <label className="fx-filter-check">
                    <input
                        type="checkbox"
                        checked={Boolean(filters.overdue)}
                        onChange={(e) => onChange({ ...filters, overdue: e.target.checked })}
                    />
                    Overdue only
                </label>
            </div>
        </div>
    );
};

export default IssueFilters;
