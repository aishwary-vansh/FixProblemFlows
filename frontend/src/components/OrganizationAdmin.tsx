import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import { blobErrorMessage, saveBlob } from "../lib/download";
import { clearSession, getSessionUser } from "../lib/session";

interface AuditEntry {
    id: number;
    action: string;
    target: string | null;
    details: Record<string, unknown> | null;
    createdAt: string;
    actor: { id: number; name: string } | null;
}

const ACTION_TEXT: Record<string, string> = {
    "member.updated": "changed a member",
    "invite.created": "created an invite",
    "invite.revoked": "revoked an invite",
    "join_link.created": "created a new join link",
    "join_link.turned_off": "turned off the join link",
    "settings.auto_assign_on": "turned on auto-assign",
    "settings.auto_assign_off": "turned off auto-assign",
    "locations.saved": "saved locations",
    "location.removed": "removed a location",
    "report_point.created": "created a QR code",
    "report_point.removed": "removed a QR code",
    "issues.exported": "exported issues to CSV",
    "organization.exported": "exported all organization data",
    "plan.changed": "changed the plan",
    "plan.paid": "paid for Pro",
};

const describeDetails = (details: Record<string, unknown> | null) => {
    if (!details) return "";
    const parts: string[] = [];
    const role = details.role as { from?: string; to?: string } | string | undefined;
    if (typeof role === "object" && role?.to) parts.push(`role ${role.from} to ${role.to}`);
    else if (typeof role === "string") parts.push(`as ${role}`);
    if (typeof details.active === "boolean") parts.push(details.active ? "reactivated" : "deactivated");
    if ("specialization" in details) parts.push(`specialization ${details.specialization ?? "none"}`);
    return parts.join(", ");
};

/** Recent admin activity, plus the owner's data export and organization deletion. */
const OrganizationAdmin = () => {
    const user = getSessionUser();
    const isOwner = user?.role === "OWNER";
    const navigate = useNavigate();

    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [logError, setLogError] = useState("");
    const [exporting, setExporting] = useState(false);
    const [confirmName, setConfirmName] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/organization/audit-log")
            .then((response) => setEntries(response.data.data))
            .catch((err) => setLogError(getErrorMessage(err, "Failed to load activity")));
    }, []);

    const exportData = async () => {
        setExporting(true);
        setError("");
        try {
            const response = await api.get("/organization/export", { responseType: "blob" });
            saveBlob(response.data, `fixflow-export-${new Date().toISOString().slice(0, 10)}.json`);
        } catch (err) {
            setError(await blobErrorMessage(err, "Export failed"));
        } finally {
            setExporting(false);
        }
    };

    const deleteOrganization = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!window.confirm(`Permanently delete ${user?.organization.name} and all its issues, photos and history? This cannot be undone.`)) {
            return;
        }
        setDeleting(true);
        setError("");
        try {
            await api.delete("/organization", { data: { confirmName } });
            clearSession();
            navigate("/", { replace: true });
        } catch (err) {
            setError(getErrorMessage(err, "Could not delete the organization"));
            setDeleting(false);
        }
    };

    return (
        <>
            <section className="fx-section">
                <h2>Admin activity</h2>
                {logError && <div className="fx-empty" role="alert">{logError}</div>}
                {!logError && entries.length === 0 && <div className="fx-empty">No admin changes yet.</div>}
                {entries.length > 0 && (
                    <div className="fx-table-wrapper">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>When</th>
                                    <th>Who</th>
                                    <th>What</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => {
                                    const extra = describeDetails(entry.details);
                                    return (
                                        <tr key={entry.id}>
                                            <td>{new Date(entry.createdAt).toLocaleString()}</td>
                                            <td>{entry.actor?.name ?? "Deleted user"}</td>
                                            <td>
                                                {ACTION_TEXT[entry.action] ?? entry.action}
                                                {entry.target ? `: ${entry.target}` : ""}
                                                {extra ? ` (${extra})` : ""}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {isOwner && (
                <section className="fx-section fx-panel fx-members-invite fx-danger-zone">
                    <h2>Your organization's data</h2>
                    <p>Download everything FixFlow stores for {user?.organization.name}: members, locations, issues, comments and history, as a JSON file.</p>
                    <button type="button" className="fx-btn" onClick={exportData} disabled={exporting}>
                        {exporting ? "Preparing..." : "Export all data"}
                    </button>

                    <h3>Delete organization</h3>
                    <p>
                        Permanently deletes every issue, photo, location, QR code and member list. Accounts stay, because people may
                        belong to other organizations. Export first if you need a copy. To confirm, type{" "}
                        <strong>{user?.organization.name}</strong>.
                    </p>
                    <form className="fx-form-row" onSubmit={deleteOrganization}>
                        <input
                            className="fx-select-1"
                            aria-label="Organization name to confirm deletion"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="fx-btn fx-btn-danger"
                            disabled={deleting || confirmName.trim() !== user?.organization.name}
                        >
                            {deleting ? "Deleting..." : "Delete organization"}
                        </button>
                    </form>
                    {error && <p className="fx-upload-error" role="alert">{error}</p>}
                </section>
            )}
        </>
    );
};

export default OrganizationAdmin;
