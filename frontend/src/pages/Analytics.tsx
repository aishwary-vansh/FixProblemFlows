import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import { blobErrorMessage, saveBlob } from "../lib/download";

interface Summary {
    reported: number;
    resolved: number;
    avgFixHours: number | null;
    overduePercent: number | null;
    reopenPercent: number | null;
    avgRating: number | null;
    ratingCount: number;
}

interface Report {
    days: number;
    totals: Summary & { repairCost: number };
    byBuilding: { name: string; count: number }[];
    byCategory: { name: string; count: number }[];
    technicians: (Summary & { userId: number; name: string })[];
}

const PERIODS = [7, 30, 90, 365];

const formatHours = (hours: number | null) => {
    if (hours === null) return "—";
    return hours < 48 ? `${hours} h` : `${Math.round((hours / 24) * 10) / 10} days`;
};

const formatPercent = (value: number | null) => (value === null ? "—" : `${value}%`);

const formatRating = (value: number | null, count: number) => (value === null ? "—" : `${value} / 5 (${count})`);

// Acronyms stay upper case; the rest read as words ("PLUMBING" -> "Plumbing").
const categoryLabel = (value: string) =>
    value === "IT" || value === "HVAC" ? value : value.charAt(0) + value.slice(1).toLowerCase();

/** One horizontal bar per row, longest first. The count is printed, so the bar length is never the only cue. */
const BarList = ({ title, rows, labelFor = (name: string) => name }: {
    title: string;
    rows: { name: string; count: number }[];
    labelFor?: (name: string) => string;
}) => {
    const max = Math.max(1, ...rows.map((row) => row.count));
    return (
        <section className="fx-panel fx-bar-card">
            <h3>{title}</h3>
            {rows.length === 0 && <p className="fx-no-attachments">No issues in this period.</p>}
            <ul className="fx-bars">
                {rows.map((row) => (
                    <li key={row.name} title={`${labelFor(row.name)}: ${row.count} issue${row.count === 1 ? "" : "s"}`}>
                        <span className="fx-bar-label">{labelFor(row.name)}</span>
                        <span className="fx-bar-track">
                            <span className="fx-bar-fill" style={{ width: `${(row.count / max) * 100}%` }} />
                        </span>
                        <span className="fx-bar-value">{row.count}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
};

/** Admin reports: how fast things get fixed, where problems come from, and how each technician is doing. */
const Analytics = () => {
    const [days, setDays] = useState(30);
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        let stale = false;
        api.get("/analytics", { params: { days } })
            .then((response) => {
                if (stale) return;
                setReport(response.data.data);
                setError("");
            })
            .catch((err) => !stale && setError(getErrorMessage(err, "Failed to load reports")))
            .finally(() => !stale && setLoading(false));
        return () => {
            stale = true;
        };
    }, [days]);

    const exportCsv = async () => {
        setExporting(true);
        try {
            // Fetched through the API client so the login token is sent; a plain link would not carry it.
            const response = await api.get("/analytics/export.csv", { params: { days }, responseType: "blob" });
            saveBlob(response.data, `fixflow-issues-last-${days}-days.csv`);
        } catch (err) {
            setError(await blobErrorMessage(err, "Export failed"));
        } finally {
            setExporting(false);
        }
    };

    const totals = report?.totals;
    const tiles = totals
        ? [
            { label: "Reported", value: String(totals.reported) },
            { label: "Resolved", value: String(totals.resolved) },
            { label: "Average time to fix", value: formatHours(totals.avgFixHours) },
            { label: "Went overdue", value: formatPercent(totals.overduePercent) },
            { label: "Reopened", value: formatPercent(totals.reopenPercent) },
            { label: "Average rating", value: formatRating(totals.avgRating, totals.ratingCount) },
            { label: "Repair cost", value: `₹${totals.repairCost.toLocaleString("en-IN")}` },
        ]
        : [];

    return (
        <main>
            <div className="fx-page-head">
                <h2>Reports</h2>
                <p>Issues reported in the last {days} days: how fast they were fixed and where they came from.</p>
            </div>

            <div className="fx-form-row">
                <select
                    className="fx-select-2"
                    aria-label="Period"
                    value={days}
                    onChange={(e) => {
                        setLoading(true);
                        setDays(Number(e.target.value));
                    }}
                >
                    {PERIODS.map((period) => (
                        <option key={period} value={period}>Last {period} days</option>
                    ))}
                </select>
                <button type="button" className="fx-btn fx-btn-sm" onClick={exportCsv} disabled={exporting}>
                    <Download size={16} /> {exporting ? "Exporting..." : "Export CSV"}
                </button>
            </div>

            {error && <div className="fx-empty" role="alert">{error}</div>}
            {loading && !report && <div className="fx-empty">Loading reports...</div>}

            {report && (
                <>
                    <section className="fx-section">
                        <div className={"fx-stats" + (loading ? " fx-loading" : "")}>
                            {tiles.map((tile) => (
                                <div className="fx-panel fx-stat" key={tile.label}>
                                    <h3>{tile.label}</h3>
                                    <p>{tile.value}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="fx-section fx-bar-grid">
                        <BarList title="Issues by building" rows={report.byBuilding} />
                        <BarList title="Issues by category" rows={report.byCategory} labelFor={categoryLabel} />
                    </div>

                    <section className="fx-section">
                        <h2>Technicians</h2>
                        {report.technicians.length === 0 ? (
                            <div className="fx-empty">No issues were assigned in this period.</div>
                        ) : (
                            <div className="fx-table-wrapper">
                                <table className="fx-table">
                                    <thead>
                                        <tr>
                                            <th>Technician</th>
                                            <th>Assigned</th>
                                            <th>Resolved</th>
                                            <th>Average time to fix</th>
                                            <th>Went overdue</th>
                                            <th>Reopened</th>
                                            <th>Average rating</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.technicians.map((technician) => (
                                            <tr key={technician.userId}>
                                                <td><strong>{technician.name}</strong></td>
                                                <td>{technician.reported}</td>
                                                <td>{technician.resolved}</td>
                                                <td>{formatHours(technician.avgFixHours)}</td>
                                                <td>{formatPercent(technician.overduePercent)}</td>
                                                <td>{formatPercent(technician.reopenPercent)}</td>
                                                <td>{formatRating(technician.avgRating, technician.ratingCount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <p className="fx-no-attachments">
                            Counts issues by who is assigned now. Time to fix runs from when the issue was reported to when it was last resolved.
                        </p>
                    </section>
                </>
            )}
        </main>
    );
};

export default Analytics;
