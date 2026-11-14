import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import { getSessionUser } from "../lib/session";
import type { IssueDetail } from "../types/issue";

interface DuplicatePanelProps {
    issue: IssueDetail;
    onDone: () => void;
}

/** Who else is affected, the "me too" toggle, and the admin's "mark as duplicate". */
const DuplicatePanel = ({ issue, onDone }: DuplicatePanelProps) => {
    const user = getSessionUser();
    const [originalId, setOriginalId] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const others = issue._count.followers;
    const isReporter = issue.reporterId === user?.id;

    const run = async (action: () => Promise<unknown>) => {
        setBusy(true);
        setError("");
        try {
            await action();
            onDone();
        } catch (err) {
            setError(getErrorMessage(err, "Something went wrong"));
        } finally {
            setBusy(false);
        }
    };

    const markDuplicate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const target = Number(originalId.replace("#", ""));
        if (!window.confirm(`Close #${issue.id} as a duplicate of #${target}? Everyone following it moves to #${target}.`)) {
            return;
        }
        run(() => api.post(`/issues/${issue.id}/duplicate`, { duplicateOfId: target }));
    };

    if (issue.duplicateOf) {
        return (
            <section className="fx-details-card fx-action-card">
                <p className="fx-duplicate-note">
                    Closed as a duplicate of{" "}
                    <Link to={`/issues/${issue.duplicateOf.id}`}>
                        #{issue.duplicateOf.id} {issue.duplicateOf.title}
                    </Link>
                    . Updates continue there.
                </p>
            </section>
        );
    }

    if (others === 0 && !issue.isFollowing && !issue.canMarkDuplicate) {
        return null;
    }

    return (
        <section className="fx-details-card fx-action-card">
            <div className="fx-card-heading">
                <h2>Who is affected</h2>
            </div>

            <p className="fx-no-attachments">
                {others === 0
                    ? "Only the reporter so far."
                    : `${isReporter ? "You" : "The reporter"} and ${others} other ${others === 1 ? "person" : "people"} reported this problem.`}
            </p>

            {issue.isFollowing && (
                <div className="fx-form-row">
                    <span>You said this affects you too, so you get its updates.</span>
                    <button
                        type="button"
                        className="fx-btn fx-btn-sm fx-btn-cancel"
                        disabled={busy}
                        onClick={() => run(() => api.delete(`/issues/${issue.id}/follow`))}
                    >
                        Stop updates
                    </button>
                </div>
            )}

            {issue.canMarkDuplicate && (
                <form className="fx-form-row fx-duplicate-form" onSubmit={markDuplicate}>
                    <label htmlFor="duplicate-of">Already reported? Original issue number</label>
                    <input
                        id="duplicate-of"
                        className="fx-select-1"
                        inputMode="numeric"
                        placeholder="e.g. 12"
                        value={originalId}
                        onChange={(e) => setOriginalId(e.target.value)}
                    />
                    <button type="submit" className="fx-btn fx-btn-sm" disabled={busy || !/^#?\d+$/.test(originalId.trim())}>
                        Mark as duplicate
                    </button>
                </form>
            )}

            {error && <p className="fx-upload-error" role="alert">{error}</p>}
        </section>
    );
};

export default DuplicatePanel;
