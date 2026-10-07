import { useEffect, useState, useRef } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
    ArrowLeft,
    MapPin,
    User,
    CircleAlert
} from "lucide-react";

import api from "../services/api";

import type { Issue } from "../types/issue";

const IssueDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [issue, setIssue] = useState<Issue | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    useEffect(() => {
        const fetchIssue = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get(`/issues/${id}`);

                setIssue(response.data.data);
            } catch (e) {
                console.error("Failed to load issue", e);
                setError("Failed to load issue");
            } finally {
                setLoading(false);
            }
        };

        fetchIssue();
    }, [id]);

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

            const newAttachment = response.data.data;

            setIssue({
                ...issue,
                attachments: [
                    newAttachment,
                    ...issue.attachments
                ]
            });
        } catch (error) {
            console.error(
                "Failed to upload image",
                error
            );

            setUploadError(
                "Failed to upload image"
            );
        } finally {
            setUploading(false);

            // Allows selecting the same file again
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
                    onClick={() => navigate("/issues")}
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

            {/* Back button */}

            <button
                className="fx-back-btn"
                onClick={() => navigate("/issues")}
            >
                <ArrowLeft size={18} />
                Back to Issues
            </button>


            {/* Header */}

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
                        {issue.status.replace("_", " ")}
                    </span>

                </div>

            </section>


            {/* Main content */}

            <div className="fx-details-grid">

                {/* Description */}

                <section className="fx-details-card fx-description-card">

                    <div className="fx-card-heading">

                        <CircleAlert size={20} />

                        <h2>
                            Description
                        </h2>

                    </div>

                    <p className="fx-description-text">
                        {issue.description}
                    </p>

                </section>


                {/* Issue information */}

                <section className="fx-details-card">

                    <div className="fx-card-heading">

                        <h2>
                            Issue Information
                        </h2>

                    </div>

                    <div className="fx-info-list">

                        {/* Location */}

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


                        {/* Priority */}

                        <div className="fx-info-item">

                            <div className="fx-info-icon">
                                <CircleAlert size={18} />
                            </div>

                            <div>

                                <span>
                                    Priority
                                </span>

                                <strong>
                                    {issue.priority}
                                </strong>

                            </div>

                        </div>


                        {/* Assigned technician */}

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


            {/* Activity */}

            <section className="fx-details-card fx-activity-card">

                <div className="fx-card-heading">

                    <h2>
                        Activity
                    </h2>

                </div>

                <div className="fx-activity-item">

                    <div className="fx-activity-dot" />

                    <div>

                        <strong>
                            Issue reported
                        </strong>

                        <p>
                            Issue #{issue.id} was created and is currently{" "}
                            {issue.status
                                .toLowerCase()
                                .replace("_", " ")}.
                        </p>

                    </div>

                </div>

            </section>


            {/* Attachments */}

            <section className="fx-details-card fx-attachments-card">

                <div className="fx-attachments-header">

                    <div className="fx-card-heading">

                        <h2>
                            Attachments
                        </h2>

                    </div>


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


                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleUploadImage}
                        hidden
                    />

                </div>


                {/* Upload error */}

                {uploadError && (
                    <p className="fx-upload-error">
                        {uploadError}
                    </p>
                )}


                {/* No attachments */}

                {issue.attachments.length === 0 ? (

                    <p className="fx-no-attachments">
                        No attachments added yet.
                    </p>

                ) : (

                    /* Attachments grid */

                    <div className="fx-attachments-grid">

                        {issue.attachments.map(
                            (attachment) => (

                                <div
                                    key={attachment.id}
                                    className="fx-attachment-item"
                                >

                                    <img
                                        src={`http://localhost:5000${attachment.fileUrl}`}
                                        alt={attachment.fileName}
                                    />

                                    <div className="fx-attachment-info">

                                        <span>
                                            {attachment.fileName}
                                        </span>

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}

            </section>

        </main>
    );
};

export default IssueDetails;