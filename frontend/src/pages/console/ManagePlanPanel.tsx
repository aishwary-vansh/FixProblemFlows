import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getErrorMessage } from "../../services/api";
import consoleApi from "../../lib/consoleApi";
import { STANDARD_PRICE, formatDate, planLabel } from "../../lib/consolePlans";

export interface Notice {
    message: string;
    level: "INFO" | "WARNING";
    at: string | null;
}

export interface ManagedOrg {
    id: number;
    name: string;
    plan: "FREE" | "PRO";
    planEndsAt: string | null;
    planSource: "TRIAL" | "MANUAL" | "PAID" | null;
    customPriceInr: number | null;
    notice: Notice | null;
}

interface HistoryEntry {
    id: number;
    action: string;
    summary: string;
    note: string | null;
    sharedWithOwner: boolean;
    createdAt: string;
    actor: { name: string; email: string } | null;
}

type Action = "grant" | "extend" | "price" | "revoke" | "notice";

const ACTIONS: { id: Action; label: string }[] = [
    { id: "grant", label: "Give Pro" },
    { id: "extend", label: "Extend" },
    { id: "price", label: "Custom price" },
    { id: "revoke", label: "Revoke" },
    { id: "notice", label: "Notice" },
];

const EXTEND_PRESETS = [7, 14, 30, 90, 365];

const discountText = (price: number) => {
    const off = Math.round((1 - price / STANDARD_PRICE) * 100);
    return off > 0 ? `${off}% off the standard ₹${STANDARD_PRICE}` : price > STANDARD_PRICE ? `above the standard ₹${STANDARD_PRICE}` : "same as standard";
};

/**
 * The console's controls for one organization: give Pro, extend it, set a custom price, revoke it, or send the
 * owner a notice. Each change takes a note that stays in the console unless it is shared with the owner.
 */
const ManagePlanPanel = ({ org, onClose, onSaved }: { org: ManagedOrg; onClose: () => void; onSaved: (org: ManagedOrg) => void }) => {
    const [action, setAction] = useState<Action>(org.plan === "PRO" ? "extend" : "grant");
    const [endsOn, setEndsOn] = useState("");
    const [days, setDays] = useState(30);
    const [price, setPrice] = useState(org.customPriceInr === null ? "" : String(org.customPriceInr));
    const [level, setLevel] = useState<"INFO" | "WARNING">("WARNING");
    const [note, setNote] = useState("");
    const [share, setShare] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [history, setHistory] = useState<HistoryEntry[] | null>(null);
    // Bumped after each save, so the history reloads.
    const [historyVersion, setHistoryVersion] = useState(0);

    useEffect(() => {
        consoleApi
            .get(`/organizations/${org.id}/history`)
            .then((response) => setHistory(response.data.data))
            .catch(() => setHistory([]));
    }, [org.id, historyVersion]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const send = async (body: Record<string, unknown>) => {
        setSaving(true);
        setError("");
        try {
            const response = await consoleApi.post(`/organizations/${org.id}/actions`, body);
            onSaved(response.data.data);
            setNote("");
            setShare(false);
            setHistoryVersion((version) => version + 1);
        } catch (err) {
            setError(getErrorMessage(err, "Could not save"));
        } finally {
            setSaving(false);
        }
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const common = { note: note.trim() || undefined, shareWithOwner: share };
        if (action === "grant") {
            // Pro lasts to the end of the chosen day, in the browser's time zone.
            send({ action, endsAt: endsOn ? new Date(`${endsOn}T23:59:59`).toISOString() : null, ...common });
        } else if (action === "extend") {
            send({ action, days, ...common });
        } else if (action === "price") {
            send({ action, priceInr: price.trim() === "" ? null : Number(price), ...common });
        } else if (action === "revoke") {
            send({ action, ...common });
        } else {
            send({ action, level, note: note.trim() });
        }
    };

    const noteRequired = action === "revoke" || action === "notice";
    const priceNumber = price.trim() === "" ? null : Number(price);
    const submitLabel = {
        grant: "Give Pro",
        extend: `Extend by ${days} days`,
        price: priceNumber === null ? "Use the standard price" : `Set ₹${priceNumber} a month`,
        revoke: "Revoke Pro now",
        notice: "Send notice",
    }[action];

    return (
        <div className="fx-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="manage-title" onClick={onClose}>
            <div className="fx-modal fx-manage" onClick={(event) => event.stopPropagation()}>
                <header className="fx-manage-head">
                    <div>
                        <h2 id="manage-title">{org.name}</h2>
                        <p>
                            {planLabel(org)} · {org.customPriceInr === null ? `₹${STANDARD_PRICE}` : `₹${org.customPriceInr}`} a month
                        </p>
                    </div>
                    <button type="button" className="fx-icon-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </header>

                <div className="fx-manage-body">
                    {org.notice && (
                        <div className={"fx-notice " + (org.notice.level === "WARNING" ? "warning" : "info")}>
                            <div>
                                <strong>{org.notice.level === "WARNING" ? "Warning shown to the owner" : "Notice shown to the owner"}</strong>
                                <p>{org.notice.message}</p>
                            </div>
                            <button
                                type="button"
                                className="fx-link-btn"
                                disabled={saving}
                                onClick={() => send({ action: "clear_notice" })}
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    <div className="fx-segmented" role="tablist" aria-label="Action">
                        {ACTIONS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={action === item.id}
                                className={action === item.id ? "active" : ""}
                                onClick={() => {
                                    setAction(item.id);
                                    setError("");
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} className="fx-manage-form">
                        {action === "grant" && (
                            <div className="fx-form-group">
                                <label htmlFor="grant-ends">Pro, free, until (leave empty for no end date)</label>
                                <input id="grant-ends" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
                            </div>
                        )}

                        {action === "extend" && (
                            <div className="fx-form-group">
                                <label htmlFor="extend-days">
                                    Add days to {org.plan === "PRO" && org.planEndsAt ? `the end date (${formatDate(org.planEndsAt)})` : "today"}
                                </label>
                                <div className="fx-chip-row">
                                    {EXTEND_PRESETS.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            className={"fx-chip" + (days === preset ? " active" : "")}
                                            onClick={() => setDays(preset)}
                                        >
                                            {preset === 365 ? "1 year" : `${preset} days`}
                                        </button>
                                    ))}
                                    <input
                                        id="extend-days"
                                        type="number"
                                        min={1}
                                        max={3650}
                                        aria-label="Custom number of days"
                                        value={days}
                                        onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
                                    />
                                </div>
                            </div>
                        )}

                        {action === "price" && (
                            <div className="fx-form-group">
                                <label htmlFor="custom-price">Monthly Pro price in ₹ (empty for the standard ₹{STANDARD_PRICE})</label>
                                <input
                                    id="custom-price"
                                    type="number"
                                    min={0}
                                    step={1}
                                    inputMode="numeric"
                                    placeholder={`₹${STANDARD_PRICE}`}
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                                <span className="fx-manage-hint">
                                    {priceNumber === null
                                        ? "The owner sees the standard price."
                                        : `The owner sees ₹${priceNumber} a month, ${discountText(priceNumber)}.`}
                                </span>
                            </div>
                        )}

                        {action === "revoke" && (
                            <p className="fx-manage-hint">
                                The organization moves to Free now: limits of 10 members and 3 QR codes, no auto-assign or CSV export.
                                Nothing is deleted. Its custom price, if any, stays for when it buys Pro again.
                            </p>
                        )}

                        {action === "notice" && (
                            <div className="fx-form-group">
                                <label htmlFor="notice-level">Type</label>
                                <select id="notice-level" value={level} onChange={(e) => setLevel(e.target.value as "INFO" | "WARNING")}>
                                    <option value="WARNING">Warning (a problem the owner should act on)</option>
                                    <option value="INFO">Information</option>
                                </select>
                            </div>
                        )}

                        <div className="fx-form-group">
                            <label htmlFor="action-note">
                                {action === "notice" ? "Message to the owner" : action === "revoke" ? "Reason (required)" : "Note (optional)"}
                            </label>
                            <textarea
                                id="action-note"
                                rows={3}
                                maxLength={500}
                                required={noteRequired}
                                placeholder={
                                    action === "notice"
                                        ? "e.g. Your payment for November is pending. Pro ends on 30 Nov if it is not received."
                                        : action === "revoke"
                                          ? "e.g. Payment not received after two reminders."
                                          : "e.g. Pilot for the first three months."
                                }
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>

                        {action !== "notice" && (
                            <label className="fx-filter-check">
                                <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} disabled={!note.trim()} />
                                Show this note to the owner (as {action === "revoke" ? "a warning" : "a notice"} in their portal)
                            </label>
                        )}

                        {error && <p className="fx-upload-error" role="alert">{error}</p>}

                        <button
                            type="submit"
                            className={"fx-btn" + (action === "revoke" ? " fx-btn-danger" : " fx-btn-gradient")}
                            disabled={saving || (noteRequired && note.trim().length < 3)}
                        >
                            {saving ? "Saving..." : submitLabel}
                        </button>
                    </form>

                    <section className="fx-manage-history">
                        <h3>History</h3>
                        {history === null ? (
                            <p className="fx-manage-hint">Loading...</p>
                        ) : history.length === 0 ? (
                            <p className="fx-manage-hint">No changes from the console yet.</p>
                        ) : (
                            <ol>
                                {history.map((entry) => (
                                    <li key={entry.id}>
                                        <div>
                                            <strong>{entry.summary}</strong>
                                            <span>
                                                {new Date(entry.createdAt).toLocaleString()} · {entry.actor?.name ?? "Removed admin"}
                                                {entry.sharedWithOwner ? " · shown to owner" : ""}
                                            </span>
                                        </div>
                                        {entry.note && <p>{entry.note}</p>}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ManagePlanPanel;
