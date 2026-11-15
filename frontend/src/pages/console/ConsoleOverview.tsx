import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../../services/api";
import consoleApi from "../../lib/consoleApi";
import ColumnChart from "../../components/ColumnChart";

interface OrgSummary {
    id: number;
    name: string;
    ownerEmail: string | null;
    planEndsAt: string | null;
    issuesLast30Days: number;
    createdAt: string;
}

interface Overview {
    totals: { organizations: number; activeLast30Days: number; onPro: number; onTrial: number; members: number; issuesLast30Days: number; paidThisMonthInr: number; paymentsThisMonth: number };
    planMix: { free: number; trial: number; pro: number };
    signupsByMonth: { month: string; count: number }[];
    issuesByDay: { date: string; count: number }[];
    trialsEnding: OrgSummary[];
    mostActive: OrgSummary[];
    quiet: OrgSummary[];
}

// Buckets are UTC days and months, so labels are formatted in UTC too.
const dayLabel = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
const monthLabel = (month: string) =>
    new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });

const daysUntil = (iso: string) => {
    const days = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    return days === 0 ? "today" : days === 1 ? "in 1 day" : `in ${days} days`;
};

const OrgList = ({
    title,
    empty,
    orgs,
    detail,
}: {
    title: string;
    empty: string;
    orgs: OrgSummary[];
    detail: (org: OrgSummary) => string;
}) => (
    <section className="fx-panel fx-console-list">
        <h3>{title}</h3>
        {orgs.length === 0 ? (
            <p className="fx-console-empty">{empty}</p>
        ) : (
            <ul>
                {orgs.map((org) => (
                    <li key={org.id}>
                        <Link to={`/console/organizations?q=${encodeURIComponent(org.name)}`}>
                            <strong>{org.name}</strong>
                            <span>{org.ownerEmail ?? "No owner"}</span>
                        </Link>
                        <span className="fx-console-list-detail">{detail(org)}</span>
                    </li>
                ))}
            </ul>
        )}
    </section>
);

/** The console's front page: how FixFlow is doing overall, and which organizations need a look. */
const ConsoleOverview = () => {
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        consoleApi
            .get("/overview")
            .then((response) => setData(response.data.data))
            .catch((err) => setError(getErrorMessage(err, "Failed to load the overview")));
    }, []);

    if (error) return <div className="fx-empty" role="alert">{error}</div>;
    if (!data) return <div className="fx-empty">Loading...</div>;

    const tiles = [
        { label: "Organizations", value: data.totals.organizations },
        { label: "Active in the last 30 days", value: data.totals.activeLast30Days },
        { label: "On Pro", value: data.totals.onPro },
        { label: "On a Pro trial", value: data.totals.onTrial },
        {
            label: `Paid online this month (${data.totals.paymentsThisMonth} ${data.totals.paymentsThisMonth === 1 ? "payment" : "payments"})`,
            value: `₹${data.totals.paidThisMonthInr.toLocaleString("en-IN")}`,
        },
        { label: "Issues in the last 30 days", value: data.totals.issuesLast30Days },
    ];

    const mix = [
        { label: "Free", value: data.planMix.free },
        { label: "Pro trial", value: data.planMix.trial },
        { label: "Pro", value: data.planMix.pro },
    ];
    const mixMax = Math.max(1, ...mix.map((row) => row.value));

    return (
        <>
            <div className="fx-page-head">
                <h2>Overview</h2>
                <p>How FixFlow is used across every organization. Active means at least one issue reported in the last 30 days.</p>
            </div>

            <section className="fx-section">
                <div className="fx-stats">
                    {tiles.map((tile) => (
                        <div className="fx-panel fx-stat" key={tile.label}>
                            <h3>{tile.label}</h3>
                            <p>{tile.value}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="fx-section fx-console-charts">
                <ColumnChart
                    title="Issues reported per day, last 30 days"
                    unit="issues"
                    points={data.issuesByDay.map((row) => ({ label: dayLabel(row.date), value: row.count }))}
                />
                <ColumnChart
                    title="New organizations per month"
                    unit="sign-ups"
                    points={data.signupsByMonth.map((row) => ({ label: monthLabel(row.month), value: row.count }))}
                />
            </section>

            <section className="fx-section fx-console-lists">
                <section className="fx-panel fx-console-list">
                    <h3>Plans</h3>
                    <ul className="fx-bars">
                        {mix.map((row) => (
                            <li key={row.label} title={`${row.label}: ${row.value} organizations`}>
                                <span className="fx-bar-label">{row.label}</span>
                                <span className="fx-bar-track">
                                    {row.value > 0 && <span className="fx-bar-fill" style={{ width: `${(row.value / mixMax) * 100}%` }} />}
                                </span>
                                <span className="fx-bar-value">{row.value}</span>
                            </li>
                        ))}
                    </ul>
                </section>
                <OrgList
                    title="Trials ending this week"
                    empty="No trials end in the next 7 days."
                    orgs={data.trialsEnding}
                    detail={(org) => (org.planEndsAt ? `Ends ${daysUntil(org.planEndsAt)}` : "")}
                />
                <OrgList
                    title="Most active"
                    empty="No issues reported in the last 30 days."
                    orgs={data.mostActive}
                    detail={(org) => `${org.issuesLast30Days} ${org.issuesLast30Days === 1 ? "issue" : "issues"}`}
                />
                <OrgList
                    title="Gone quiet"
                    empty="Every organization older than two weeks reported something this month."
                    orgs={data.quiet}
                    detail={() => "No issues in 30 days"}
                />
            </section>
        </>
    );
};

export default ConsoleOverview;
