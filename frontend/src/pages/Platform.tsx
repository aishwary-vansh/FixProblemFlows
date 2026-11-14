import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../services/api";

interface OrgRow {
    id: number;
    name: string;
    createdAt: string;
    ownerEmail: string | null;
    members: number;
    issues: number;
    issuesLast30Days: number;
    lastIssueAt: string | null;
}

interface PlatformData {
    totals: { organizations: number; activeLast30Days: number; members: number; issues: number };
    organizations: OrgRow[];
}

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

/** For the people who run FixFlow: every organization and whether it is actually being used. */
const Platform = () => {
    const [data, setData] = useState<PlatformData | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/platform/organizations")
            .then((response) => setData(response.data.data))
            .catch((err) => setError(getErrorMessage(err, "Failed to load organizations")));
    }, []);

    const tiles = data
        ? [
            { label: "Organizations", value: data.totals.organizations },
            { label: "Active in the last 30 days", value: data.totals.activeLast30Days },
            { label: "Active members", value: data.totals.members },
            { label: "Issues reported", value: data.totals.issues },
        ]
        : [];

    return (
        <main>
            <div className="fx-page-head">
                <h2>Platform</h2>
                <p>Every organization using this FixFlow installation. Active means at least one issue reported in the last 30 days.</p>
            </div>

            {error && <div className="fx-empty" role="alert">{error}</div>}
            {!data && !error && <div className="fx-empty">Loading...</div>}

            {data && (
                <>
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

                    <section className="fx-section">
                        <h2>Organizations</h2>
                        <div className="fx-table-wrapper">
                            <table className="fx-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Owner</th>
                                        <th>Members</th>
                                        <th>Issues</th>
                                        <th>Last 30 days</th>
                                        <th>Last issue</th>
                                        <th>Signed up</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.organizations.map((org) => (
                                        <tr key={org.id}>
                                            <td><strong>{org.name}</strong></td>
                                            <td>{org.ownerEmail ?? "—"}</td>
                                            <td>{org.members}</td>
                                            <td>{org.issues}</td>
                                            <td>{org.issuesLast30Days}</td>
                                            <td>{formatDate(org.lastIssueAt)}</td>
                                            <td>{formatDate(org.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </main>
    );
};

export default Platform;
