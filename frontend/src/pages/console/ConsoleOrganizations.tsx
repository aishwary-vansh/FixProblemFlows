import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Info } from "lucide-react";
import { getErrorMessage } from "../../services/api";
import consoleApi from "../../lib/consoleApi";
import ManagePlanPanel, { type ManagedOrg } from "./ManagePlanPanel";
import { STANDARD_PRICE, formatDate, planLabel } from "../../lib/consolePlans";

interface OrgRow extends ManagedOrg {
    createdAt: string;
    ownerEmail: string | null;
    members: number;
    issues: number;
    issuesLast30Days: number;
    lastIssueAt: string | null;
}

type PlanFilter = "ALL" | "FREE" | "TRIAL" | "PRO";

const planKind = (org: OrgRow): Exclude<PlanFilter, "ALL"> =>
    org.plan === "FREE" ? "FREE" : org.planSource === "TRIAL" ? "TRIAL" : "PRO";

const priceLabel = (org: OrgRow) => {
    if (org.customPriceInr === null) return `₹${STANDARD_PRICE}`;
    const off = Math.round((1 - org.customPriceInr / STANDARD_PRICE) * 100);
    return off > 0 ? `₹${org.customPriceInr} (${off}% off)` : `₹${org.customPriceInr}`;
};

/** Every organization using FixFlow, with search, a plan filter, and a Manage panel for plans and notices. */
const ConsoleOrganizations = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [organizations, setOrganizations] = useState<OrgRow[] | null>(null);
    const [managingId, setManagingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const query = searchParams.get("q") ?? "";
    const filter = (searchParams.get("plan") as PlanFilter | null) ?? "ALL";

    useEffect(() => {
        consoleApi
            .get("/organizations")
            .then((response) => setOrganizations(response.data.data.organizations))
            .catch((err) => setError(getErrorMessage(err, "Failed to load organizations")));
    }, []);

    // Search and filter live in the URL, so a link from the overview opens the right organization.
    const setParam = (key: string, value: string, empty: string) => {
        const next = new URLSearchParams(searchParams);
        if (value === empty) next.delete(key);
        else next.set(key, value);
        setSearchParams(next, { replace: true });
    };

    const needle = query.trim().toLowerCase();
    const shown = (organizations ?? []).filter(
        (org) =>
            (filter === "ALL" || planKind(org) === filter) &&
            (!needle || org.name.toLowerCase().includes(needle) || (org.ownerEmail ?? "").toLowerCase().includes(needle))
    );
    const managing = organizations?.find((org) => org.id === managingId) ?? null;

    return (
        <>
            <div className="fx-page-head">
                <h2>Organizations</h2>
                <p>
                    Open Manage to give Pro, extend it, set a custom price, revoke it or send the owner a notice. Notes stay
                    here unless you choose to show them to the owner.
                </p>
            </div>

            <div className="fx-console-filters">
                <input
                    type="search"
                    aria-label="Search by organization or owner email"
                    placeholder="Search name or owner email"
                    value={query}
                    onChange={(e) => setParam("q", e.target.value, "")}
                />
                <select aria-label="Filter by plan" value={filter} onChange={(e) => setParam("plan", e.target.value, "ALL")}>
                    <option value="ALL">All plans</option>
                    <option value="FREE">Free</option>
                    <option value="TRIAL">Pro trial</option>
                    <option value="PRO">Pro</option>
                </select>
                {organizations && (
                    <span className="fx-console-count">
                        {shown.length} of {organizations.length}
                    </span>
                )}
            </div>

            {error && <div className="fx-empty" role="alert">{error}</div>}
            {!organizations && !error && <div className="fx-empty">Loading...</div>}
            {organizations && shown.length === 0 && <div className="fx-empty">No organizations match.</div>}

            {organizations && shown.length > 0 && (
                <div className="fx-table-wrapper">
                    <table className="fx-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Plan</th>
                                <th>Price / month</th>
                                <th>Owner</th>
                                <th>Members</th>
                                <th>Issues</th>
                                <th>Last 30 days</th>
                                <th>Last issue</th>
                                <th>Signed up</th>
                                <th aria-label="Actions" />
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((org) => (
                                <tr key={org.id}>
                                    <td>
                                        <strong>{org.name}</strong>
                                        {org.notice && (
                                            <span
                                                className={"fx-notice-tag " + (org.notice.level === "WARNING" ? "warning" : "info")}
                                                title={org.notice.message}
                                            >
                                                {org.notice.level === "WARNING" ? <AlertTriangle size={12} /> : <Info size={12} />}
                                                {org.notice.level === "WARNING" ? "Warning sent" : "Notice sent"}
                                            </span>
                                        )}
                                    </td>
                                    <td>{planLabel(org)}</td>
                                    <td>{priceLabel(org)}</td>
                                    <td>{org.ownerEmail ?? "—"}</td>
                                    <td>{org.members}</td>
                                    <td>{org.issues}</td>
                                    <td>{org.issuesLast30Days}</td>
                                    <td>{formatDate(org.lastIssueAt)}</td>
                                    <td>{formatDate(org.createdAt)}</td>
                                    <td>
                                        <button type="button" className="fx-btn" onClick={() => setManagingId(org.id)}>
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {managing && (
                <ManagePlanPanel
                    key={managing.id}
                    org={managing}
                    onClose={() => setManagingId(null)}
                    onSaved={(saved) =>
                        setOrganizations((current) =>
                            current ? current.map((row) => (row.id === saved.id ? { ...row, ...saved } : row)) : current
                        )
                    }
                />
            )}
        </>
    );
};

export default ConsoleOrganizations;
