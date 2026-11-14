import { useState } from "react";
import api, { getErrorMessage } from "../services/api";
import { getSessionUser } from "../lib/session";
import type { IssueDetail, IssueStatus } from "../types/issue";

// Accept, Start and Resume are one click. These three ask for details first.
type Panel = "NEW" | "ON_HOLD" | "RESOLVED";

const TECHNICIAN_MOVES: IssueStatus[] = ["ACCEPTED", "NEW", "IN_PROGRESS", "ON_HOLD", "RESOLVED"];

const REASON_PROMPTS = {
    NEW: { label: "Why can't you take this?", placeholder: "e.g. Not my skill, or already on another job", button: "Decline Issue" },
    ON_HOLD: { label: "What are you waiting for?", placeholder: "e.g. Waiting for a replacement valve", button: "Put On Hold" },
};

interface TechnicianActionsProps {
    issue: IssueDetail;
    onDone: () => void;
}

/**
 * The work steps on an issue: for the assigned technician, or for an admin updating it on their behalf
 * (e.g. after a phone call). Renders nothing for anyone else.
 */
const TechnicianActions = ({ issue, onDone }: TechnicianActionsProps) => {
    const actingForTechnician = getSessionUser()?.id !== issue.assigneeId;
    const [panel, setPanel] = useState<Panel | null>(null);
    const [note, setNote] = useState("");
    const [photo, setPhoto] = useState<File | null>(null);
    // Stops a retry from uploading the photo twice if the status change fails.
    const [photoUploaded, setPhotoUploaded] = useState(false);
    const [cost, setCost] = useState("");
    const [minutes, setMinutes] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const allowed = issue.allowedTransitions.filter((to) => TECHNICIAN_MOVES.includes(to));
    if (allowed.length === 0) {
        return null;
    }

    const move = async (to: IssueStatus, extra: object = {}) => {
        await api.post(`/issues/${issue.id}/transitions`, { to, ...extra });
        setPanel(null);
        setNote("");
        onDone();
    };

    const run = async (action: () => Promise<void>) => {
        try {
            setBusy(true);
            setError("");
            await action();
        } catch (err) {
            setError(getErrorMessage(err, "Failed to update issue"));
        } finally {
            setBusy(false);
        }
    };

    const openPanel = (next: Panel) => {
        setPanel(next);
        setNote("");
        setError("");
    };

    const handleResolve = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        run(async () => {
            if (photo && !photoUploaded) {
                const form = new FormData();
                form.append("kind", "AFTER");
                form.append("image", photo);
                await api.post(`/issues/${issue.id}/attachments`, form);
                setPhotoUploaded(true);
            }

            await move("RESOLVED", {
                note: note.trim(),
                ...(cost ? { repairCost: Number(cost) } : {}),
                ...(minutes ? { repairMinutes: Number(minutes) } : {}),
            });
        });
    };

    return (
        <section className="fx-details-card fx-action-card">
            <div className="fx-card-heading">
                <h2>{actingForTechnician ? `Update for ${issue.assignee?.name ?? "the technician"}` : "Your next step"}</h2>
            </div>

            {actingForTechnician && panel === null && (
                <p className="fx-no-attachments">Use this when the technician tells you about progress outside the app.</p>
            )}

            {error && <p className="fx-upload-error" role="alert">{error}</p>}

            {panel === null && (
                <div className="fx-modal-actions">
                    {allowed.includes("ACCEPTED") && (
                        <button type="button" className="fx-btn" disabled={busy} onClick={() => run(() => move("ACCEPTED"))}>
                            Accept
                        </button>
                    )}
                    {allowed.includes("IN_PROGRESS") && (
                        <button type="button" className="fx-btn" disabled={busy} onClick={() => run(() => move("IN_PROGRESS"))}>
                            {issue.status === "ON_HOLD" ? "Resume Work" : "Start Work"}
                        </button>
                    )}
                    {allowed.includes("RESOLVED") && (
                        <button type="button" className="fx-btn" disabled={busy} onClick={() => openPanel("RESOLVED")}>
                            Mark Resolved
                        </button>
                    )}
                    {allowed.includes("ON_HOLD") && (
                        <button type="button" className="fx-btn fx-btn-cancel" disabled={busy} onClick={() => openPanel("ON_HOLD")}>
                            Put On Hold
                        </button>
                    )}
                    {allowed.includes("NEW") && (
                        <button type="button" className="fx-btn fx-btn-cancel" disabled={busy} onClick={() => openPanel("NEW")}>
                            Decline
                        </button>
                    )}
                </div>
            )}

            {(panel === "NEW" || panel === "ON_HOLD") && (
                <form
                    className="fx-action-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        run(() => move(panel, { note: note.trim() }));
                    }}
                >
                    <div className="fx-form-group">
                        <label htmlFor="action-reason">{REASON_PROMPTS[panel].label}</label>
                        <textarea
                            id="action-reason"
                            rows={2}
                            maxLength={500}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={REASON_PROMPTS[panel].placeholder}
                            required
                        />
                    </div>

                    <div className="fx-modal-actions">
                        <button type="submit" className="fx-btn" disabled={busy || !note.trim()}>
                            {busy ? "Saving..." : REASON_PROMPTS[panel].button}
                        </button>
                        <button type="button" className="fx-btn fx-btn-cancel" disabled={busy} onClick={() => setPanel(null)}>
                            Back
                        </button>
                    </div>
                </form>
            )}

            {panel === "RESOLVED" && (
                <form className="fx-action-form" onSubmit={handleResolve}>
                    <div className="fx-form-group">
                        <label htmlFor="resolve-note">What did you fix?</label>
                        <textarea
                            id="resolve-note"
                            rows={3}
                            maxLength={500}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Replaced the worn washer and tested the tap"
                            required
                        />
                    </div>

                    <div className="fx-form-group">
                        <label htmlFor="resolve-photo">After photo</label>
                        <input
                            id="resolve-photo"
                            className="fx-file-input"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                                setPhoto(e.target.files?.[0] ?? null);
                                setPhotoUploaded(false);
                            }}
                            required
                        />
                    </div>

                    <div className="fx-form-row">
                        <div className="fx-form-group">
                            <label htmlFor="resolve-cost">Cost in rupees (optional)</label>
                            <input
                                id="resolve-cost"
                                type="number"
                                min={0}
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                            />
                        </div>
                        <div className="fx-form-group">
                            <label htmlFor="resolve-minutes">Minutes spent (optional)</label>
                            <input
                                id="resolve-minutes"
                                type="number"
                                min={1}
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="fx-modal-actions">
                        <button type="submit" className="fx-btn" disabled={busy || !note.trim() || !photo}>
                            {busy ? "Saving..." : "Submit Fix"}
                        </button>
                        <button type="button" className="fx-btn fx-btn-cancel" disabled={busy} onClick={() => setPanel(null)}>
                            Back
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
};

export default TechnicianActions;
