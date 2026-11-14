import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    MapPin,
    User,
    CircleAlert,
    Clock,
    X
} from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import type { IssueDetail, IssueEvent, IssuePriority, IssueStatus, TechnicianSuggestion } from "../types/issue";
import DeadlineChip from "../components/DeadlineChip";
import TechnicianActions from "../components/TechnicianActions";
import DuplicatePanel from "../components/DuplicatePanel";
import { getSessionUser, isAdminRole } from "../lib/session";

const statusText = (status: IssueStatus | null) => (status ?? "").toLowerCase().replace("_", " ");

const describeEvent = (event: IssueEvent) => {
    switch (event.type) {
        case "CREATED":
            return "reported the issue";
        case "ASSIGNED":
            return event.note ?? "assigned the issue";
        case "ATTACHMENT_ADDED":
            return "added a photo";
        case "PRIORITY_CHANGED":
            return `changed priority: ${event.note}`;
        case "SLA_BREACHED":
            return "flagged it as past its deadline";
        case "DECLINED":
            return "declined the issue";
        case "FOLLOWED":
            return "is affected by this too";
        case "MARKED_DUPLICATE":
            return event.note ?? "marked a duplicate";
        default:
            return `moved it from ${statusText(event.fromStatus)} to ${statusText(event.toStatus)}`;
    }
};

const formatTime = (iso: string) => new Date(iso).toLocaleString();

const IssueDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [issue, setIssue] = useState<IssueDetail | null>(null);
    // Bumped after every change so the page refetches the issue with its new timeline.
    const [reloadKey, setReloadKey] = useState(0);
    const [reopenNote, setReopenNote] = useState("");
    // 0 means the reporter skipped rating.
    const [rating, setRating] = useState(0);
    const [commentBody, setCommentBody] = useState("");
    const [commenting, setCommenting] = useState(false);
    const [commentError, setCommentError] = useState("");
    const [suggestions, setSuggestions] = useState<TechnicianSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState("");

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [selectedImage, setSelectedImage] =
        useState<string | null>(null);

    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const user = getSessionUser();
    const isAdmin = isAdminRole(user?.role);
    const backPath = isAdmin ? "/issues" : user?.role === "TECHNICIAN" ? "/technician/tasks" : "/my-issues";
    useEffect(() => {
        // Set when this request is replaced, so a slow or failed old response can't overwrite a newer one.
        let stale = false;

        api.get(`/issues/${id}`)
            .then((response) => {
                if (stale) return;
                setIssue(response.data.data);
                setError("");
            })
            .catch((e) => {
                if (!stale) setError(getErrorMessage(e, "Failed to load issue"));
            })
            .finally(() => {
                if (!stale) setLoading(false);
            });

        return () => {
            stale = true;
        };
    }, [id, reloadKey]);

    const canAssign = issue?.canAssign ?? false;

    useEffect(() => {
        if (!canAssign) {
            return;
        }

        api.get(`/issues/${id}/suggestions`)
            .then((response) => setSuggestions(response.data.data))
            .catch((e) => setActionError(getErrorMessage(e, "Failed to load suggestions")));
    }, [id, canAssign, reloadKey]);

    const handleTransition = async (to: IssueStatus, extra: { note?: string; rating?: number } = {}) => {
        if (!issue) {
            return;
        }

        try {
            setActionLoading(true);
            setActionError("");

            await api.post(`/issues/${issue.id}/transitions`, { to, ...extra });

            setReopenNote("");
            setRating(0);
            setReloadKey((key) => key + 1);
        } catch (error) {
            setActionError(getErrorMessage(error, "Failed to update issue"));
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssign = async (technicianId: number) => {
        try {
            setActionLoading(true);
            setActionError("");

            await api.patch(`/issues/${id}/assign`, { technicianId });

            setReloadKey((key) => key + 1);
        } catch (error) {
            setActionError(getErrorMessage(error, "Failed to assign technician"));
        } finally {
            setActionLoading(false);
        }
    };

    const handlePriorityChange = async (priority: IssuePriority) => {
        try {
            setActionLoading(true);
            setActionError("");

            await api.patch(`/issues/${id}/priority`, { priority });

            setReloadKey((key) => key + 1);
        } catch (error) {
            setActionError(getErrorMessage(error, "Failed to change priority"));
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!issue || !commentBody.trim()) {
            return;
        }

        try {
            setCommenting(true);
            setCommentError("");

            const response = await api.post(`/issues/${issue.id}/comments`, { body: commentBody });

            setIssue({ ...issue, comments: [...issue.comments, response.data.data] });
            setCommentBody("");
        } catch (error) {
            setCommentError(getErrorMessage(error, "Failed to add comment"));
        } finally {
            setCommenting(false);
        }
    };

    const handleUploadImage = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];

        if (!file || !issue) {
            return;
        }

        try {
            setUploading(true);
            setUploadError("");

            const formData = new FormData();

            formData.append("image", file);

            const response = await api.post(
                `/issues/${issue.id}/attachments`,
                formData
            );

            setIssue({
                ...issue,
                attachments: [
                    response.data.data,
                    ...issue.attachments
                ]
            });
            setReloadKey((key) => key + 1);
        } catch (error) {
            console.error(
                "Failed to upload image",
                error
            );

            setUploadError(getErrorMessage(error, "Failed to upload image"));
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    if (loading) {
        return (
            <main className="fx-details-page">
                <div className="fx-details-loading">
                    Loading issue...
                </div>
            </main>
        );
    }

    if (error || !issue) {
        return (
            <main className="fx-details-page">
                <button
                    className="fx-back-btn"
                    onClick={() =>
                        navigate(backPath)
                    }
                >
                    <ArrowLeft size={18} />
                    Back to Issues
                </button>

                <div className="fx-details-error">
                    {error || "Issue not found"}
                </div>
            </main>
        );
    }

    return (
        <main className="fx-details-page">

            <button
                className="fx-back-btn"
                onClick={() =>
                    navigate(backPath)
                }
            >
                <ArrowLeft size={18} />
                Back to Issues
            </button>

            <section className="fx-details-header">

                <div>

                    <div className="fx-issue-number">
                        Issue #{issue.id}
                    </div>

                    <h1>
                        {issue.title}
                    </h1>

                    <p>
                        Reported maintenance issue
                    </p>

                </div>

                <div className="fx-details-badges">

                    <span
                        className={`fx-priority-badge ${issue.priority.toLowerCase()}`}
                    >
                        {issue.priority}
                    </span>

                    <span
                        className={`fx-status-badge ${issue.status.toLowerCase()}`}
                    >
                        {issue.status.replace(
                            "_",
                            " "
                        )}
                    </span>

                </div>

            </section>

            <div className="fx-details-grid">

                <section className="fx-details-card fx-description-card">

                    <div className="fx-card-heading">

                        <CircleAlert size={20} />

                        <h2>
                            Description
                        </h2>

                    </div>

                    {issue.limitedView ? (
                        <p className="fx-no-attachments">
                            You joined this issue with "Me too". The reporter's description, photos and comments are
                            only visible to them and the maintenance staff. You'll still get every update on progress.
                        </p>
                    ) : (
                        <p className="fx-description-text">
                            {issue.description}
                        </p>
                    )}

                </section>

                <section className="fx-details-card">

                    <div className="fx-card-heading">

                        <h2>
                            Issue Information
                        </h2>

                    </div>

                    <div className="fx-info-list">

                        <div className="fx-info-item">

                            <div className="fx-info-icon">
                                <MapPin size={18} />
                            </div>

                            <div>

                                <span>
                                    Location
                                </span>

                                <strong>
                                    {issue.location}
                                </strong>

                            </div>

                        </div>

                        <div className="fx-info-item">

                            <div className="fx-info-icon">
                                <CircleAlert size={18} />
                            </div>

                            <div>

                                <span>
                                    Priority
                                </span>

                                {issue.canChangePriority ? (
                                    <select
                                        className="fx-select-2"
                                        aria-label="Priority"
                                        value={issue.priority}
                                        onChange={(e) => handlePriorityChange(e.target.value as IssuePriority)}
                                        disabled={actionLoading}
                                    >
                                        <option value="LOW">LOW</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH</option>
                                        <option value="CRITICAL">CRITICAL</option>
                                    </select>
                                ) : (
                                    <strong>
                                        {issue.priority}
                                    </strong>
                                )}

                            </div>

                        </div>

                        <div className="fx-info-item">

                            <div className="fx-info-icon">
                                <Clock size={18} />
                            </div>

                            <div>

                                <span>
                                    Deadline
                                </span>

                                <strong>
                                    {issue.dueAt ? formatTime(issue.dueAt) : "None"}
                                </strong>

                                <DeadlineChip issue={issue} />

                            </div>

                        </div>

                        <div className="fx-info-item">

                            <div className="fx-info-icon">
                                <User size={18} />
                            </div>

                            <div>

                                <span>
                                    Assigned To
                                </span>

                                <strong>
                                    {issue.assignee
                                        ? issue.assignee.name
                                        : "Unassigned"}
                                </strong>

                            </div>

                        </div>

                    </div>

                </section>

            </div>

            <DuplicatePanel issue={issue} onDone={() => setReloadKey((key) => key + 1)} />

            {issue.canAssign && (
                <section className="fx-details-card fx-action-card">
                    <div className="fx-card-heading">
                        <h2>Suggested technicians</h2>
                    </div>

                    {actionError && (
                        <p className="fx-upload-error" role="alert">{actionError}</p>
                    )}

                    {suggestions.length === 0 ? (
                        <p className="fx-no-attachments">No active technicians yet. Invite one from Members.</p>
                    ) : (
                        <div className="fx-suggestions">
                            {suggestions.map((suggestion) => (
                                <div className="fx-suggestion" key={suggestion.userId}>
                                    <div>
                                        <strong>{suggestion.name}</strong>
                                        <span>{suggestion.reason}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="fx-btn fx-btn-sm"
                                        onClick={() => handleAssign(suggestion.userId)}
                                        disabled={actionLoading || suggestion.userId === issue.assigneeId}
                                    >
                                        {suggestion.userId === issue.assigneeId ? "Assigned" : "Assign"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <TechnicianActions issue={issue} onDone={() => setReloadKey((key) => key + 1)} />

            {(issue.status === "RESOLVED" || issue.status === "CLOSED") && issue.resolutionNote && (
                <section className="fx-details-card fx-action-card">
                    <div className="fx-card-heading">
                        <h2>What was fixed</h2>
                    </div>

                    <p className="fx-comment-body">{issue.resolutionNote}</p>

                    {user?.role !== "REQUESTER" && (issue.repairCost !== null || issue.repairMinutes !== null) && (
                        <p className="fx-no-attachments">
                            {issue.repairCost !== null && `Cost: ₹${issue.repairCost}`}
                            {issue.repairCost !== null && issue.repairMinutes !== null && " · "}
                            {issue.repairMinutes !== null && `Time: ${issue.repairMinutes} min`}
                        </p>
                    )}

                    {issue.rating !== null && (
                        <p className="fx-no-attachments">
                            Reporter's rating: {"★".repeat(issue.rating)}{"☆".repeat(5 - issue.rating)} ({issue.rating}/5)
                        </p>
                    )}

                    <div className="fx-evidence">
                        {(["BEFORE", "AFTER"] as const).map((kind) => {
                            const photos = issue.attachments.filter((attachment) => attachment.kind === kind);
                            return (
                                <div key={kind}>
                                    <strong>{kind === "BEFORE" ? "Before" : "After"}</strong>
                                    {photos.length === 0 && <p className="fx-no-attachments">No photo</p>}
                                    {photos.map((photo) => (
                                        <img
                                            key={photo.id}
                                            src={photo.url}
                                            alt={`${kind === "BEFORE" ? "Before" : "After"} repair: ${photo.fileName}`}
                                            onClick={() => setSelectedImage(photo.url)}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {issue.allowedTransitions.includes("CLOSED") && (
                <section className="fx-details-card fx-action-card">
                    <div className="fx-card-heading">
                        <h2>Is it fixed?</h2>
                    </div>

                    <p>
                        The technician has marked this issue as resolved.
                        Please check and confirm whether the problem is actually fixed.
                    </p>

                    {actionError && (
                        <p className="fx-upload-error" role="alert">{actionError}</p>
                    )}

                    {issue.reporterId === user?.id && (
                        <div className="fx-form-group">
                            <span id="rating-label">How was the repair? (optional)</span>
                            <div className="fx-rating" role="group" aria-labelledby="rating-label">
                                {[1, 2, 3, 4, 5].map((stars) => (
                                    <button
                                        key={stars}
                                        type="button"
                                        className={stars <= rating ? "active" : ""}
                                        aria-label={`${stars} star${stars > 1 ? "s" : ""}`}
                                        aria-pressed={stars === rating}
                                        onClick={() => setRating(stars === rating ? 0 : stars)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="fx-form-group">
                        <label htmlFor="reopen-note">If it's not fixed, what's still wrong?</label>
                        <textarea
                            id="reopen-note"
                            rows={2}
                            maxLength={500}
                            value={reopenNote}
                            onChange={(e) => setReopenNote(e.target.value)}
                            placeholder="e.g. Tap still drips at night"
                        />
                    </div>

                    <div className="fx-modal-actions">
                        <button
                            type="button"
                            className="fx-btn"
                            onClick={() => handleTransition("CLOSED", rating ? { rating } : {})}
                            disabled={actionLoading}
                        >
                            {actionLoading ? "Saving..." : "Yes, it's fixed"}
                        </button>

                        <button
                            type="button"
                            className="fx-btn fx-btn-cancel"
                            onClick={() => handleTransition("REOPENED", { note: reopenNote.trim() })}
                            disabled={actionLoading || !reopenNote.trim()}
                        >
                            Not fixed, reopen
                        </button>
                    </div>
                </section>
            )}

            <section className="fx-details-card fx-activity-card">
                <div className="fx-card-heading">
                    <h2>Activity</h2>
                </div>

                {issue.events.map((event) => (
                    <div className="fx-activity-item" key={event.id}>
                        <div className="fx-activity-dot" />
                        <div>
                            <strong>
                                {event.actor?.name ?? "System"} {describeEvent(event)}
                            </strong>
                            {event.note && (event.type === "STATUS_CHANGED" || event.type === "DECLINED") && <p>"{event.note}"</p>}
                            <p>{formatTime(event.createdAt)}</p>
                        </div>
                    </div>
                ))}
            </section>

            {!issue.limitedView && (
            <section className="fx-details-card fx-activity-card">
                <div className="fx-card-heading">
                    <h2>Comments</h2>
                </div>

                {issue.comments.length === 0 && (
                    <p className="fx-no-attachments">No comments yet.</p>
                )}

                {issue.comments.map((comment) => (
                    <div className="fx-activity-item" key={comment.id}>
                        <div className="fx-activity-dot" />
                        <div>
                            <strong>{comment.author.name}</strong>
                            <p className="fx-comment-body">{comment.body}</p>
                            <p>{formatTime(comment.createdAt)}</p>
                        </div>
                    </div>
                ))}

                <form onSubmit={handleAddComment} className="fx-form-group fx-comment-form">
                    <label htmlFor="new-comment">Add a comment</label>
                    <textarea
                        id="new-comment"
                        rows={3}
                        maxLength={1000}
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        placeholder="Ask a question or share an update..."
                        disabled={commenting}
                    />
                    {commentError && (
                        <p className="fx-upload-error" role="alert">{commentError}</p>
                    )}
                    <div className="fx-modal-actions">
                        <button type="submit" className="fx-btn" disabled={commenting || !commentBody.trim()}>
                            {commenting ? "Posting..." : "Post comment"}
                        </button>
                    </div>
                </form>
            </section>
            )}

            <section className="fx-details-card fx-attachments-card">

                <div className="fx-attachments-header">

                    <div className="fx-card-heading">

                        <h2>
                            Attachments
                        </h2>

                    </div>

                    {!issue.limitedView && (
                    <button
                        type="button"
                        className="fx-btn fx-attachment-upload-btn"
                        onClick={() =>
                            fileInputRef.current?.click()
                        }
                        disabled={uploading}
                    >
                        {uploading
                            ? "Uploading..."
                            : "+ Add Image"}
                    </button>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleUploadImage}
                        hidden
                    />

                </div>

                {uploadError && (
                    <p className="fx-upload-error">
                        {uploadError}
                    </p>
                )}

                {issue.attachments.length === 0 ? (

                    <p className="fx-no-attachments">
                        No attachments added yet.
                    </p>

                ) : (

                    <div className="fx-attachments-grid">

                        {issue.attachments.map(
                            (attachment) => {

                                const imageUrl = attachment.url;

                                return (
                                    <div
                                        key={attachment.id}
                                        className="fx-attachment-item"
                                    >

                                        <img
                                            src={imageUrl}
                                            alt={
                                                attachment.fileName
                                            }
                                            onClick={() =>
                                                setSelectedImage(
                                                    imageUrl
                                                )
                                            }
                                            style={{
                                                cursor:
                                                    "pointer"
                                            }}
                                        />

                                        <div className="fx-attachment-info">

                                            <span>
                                                {
                                                    attachment.fileName
                                                }
                                            </span>

                                        </div>

                                    </div>
                                );
                            }
                        )}

                    </div>

                )}

            </section>

            {selectedImage && (
                <div
                    className="fx-image-modal"
                    onClick={() =>
                        setSelectedImage(null)
                    }
                >

                    <button
                        type="button"
                        className="fx-image-modal-close"
                        onClick={() =>
                            setSelectedImage(null)
                        }
                    >
                        <X size={22} />
                    </button>

                    <img
                        src={selectedImage}
                        alt="Attachment preview"
                        className="fx-image-modal-preview"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    />

                </div>
            )}

        </main>
    );
};

export default IssueDetails;