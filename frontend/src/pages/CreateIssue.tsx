import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import type { Issue, LocationBuilding, SimilarIssue } from "../types/issue";
import { takeReportPoint } from "../lib/reportPoint";
import { X, Paperclip, Image as ImageIcon } from "lucide-react";

const OTHER_BUILDING = "other";

interface CreateIssueProps {
    onClose: () => void;
    onIssueCreated: (issue: Issue) => void;
}

const CreateIssue = ({
    onClose,
    onIssueCreated
}: CreateIssueProps) => {

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        location: "",
        category: "GENERAL",
        priority: "MEDIUM",
    });

    // The org's buildings. Empty means none are set up, so the reporter types the full location.
    const [buildings, setBuildings] = useState<LocationBuilding[]>([]);
    const [buildingId, setBuildingId] = useState("");
    const [floorId, setFloorId] = useState("");
    // Open issues already reported at the chosen place, so people can say "me too" instead.
    const [similar, setSimilar] = useState<SimilarIssue[]>([]);
    const [joining, setJoining] = useState<number | null>(null);
    const navigate = useNavigate();
    // Name of the QR point this report came from, shown so the reporter knows the place is filled in.
    const [pointName, setPointName] = useState("");

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);

    const [previewUrl, setPreviewUrl] =
        useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    // Set when the issue was saved but its image upload failed, so a retry doesn't create a duplicate issue.
    const [createdIssue, setCreatedIssue] = useState<Issue | null>(null);

    useEffect(() => {
        // Reporting still works from the typed location if this fails.
        api.get("/locations")
            .then((response) => setBuildings(response.data.data))
            .catch(() => setBuildings([]));
    }, []);

    useEffect(() => {
        const code = takeReportPoint();
        if (!code) return;
        api.get(`/report-points/code/${code}`)
            .then((response) => {
                const point = response.data.data;
                setPointName(point.name);
                if (point.location) {
                    setBuildingId(String(point.location.parentId ?? point.location.id));
                    setFloorId(point.location.parentId ? String(point.location.id) : "");
                }
                if (point.spot) {
                    setFormData((current) => ({ ...current, location: point.spot }));
                }
            })
            .catch(() => {
                // A removed QR point just means an empty form.
            });
    }, []);

    const floors = buildings.find((building) => String(building.id) === buildingId)?.floors ?? [];
    const placeId = buildingId === OTHER_BUILDING ? 0 : Number(floorId || buildingId);

    useEffect(() => {
        if (!placeId) return;
        let stale = false;
        api.get("/issues/similar", { params: { locationId: placeId, category: formData.category } })
            .then((response) => !stale && setSimilar(response.data.data))
            .catch(() => !stale && setSimilar([]));
        return () => {
            stale = true;
        };
    }, [placeId, formData.category]);

    const visibleSimilar = placeId ? similar : [];

    const joinIssue = async (issueId: number) => {
        setJoining(issueId);
        setError("");
        try {
            await api.post(`/issues/${issueId}/follow`);
            onClose();
            navigate(`/issues/${issueId}`);
        } catch (err) {
            setError(getErrorMessage(err, "Could not add you to this issue"));
            setJoining(null);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement |
            HTMLTextAreaElement |
            HTMLSelectElement
        >
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {

        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        // Allowed image types
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            setError(
                "Only JPG, PNG and WEBP images are allowed"
            );
            return;
        }

        // 5 MB limit
        if (file.size > 5 * 1024 * 1024) {
            setError(
                "Image must be smaller than 5 MB"
            );
            return;
        }

        setError("");
        setSelectedFile(file);

        // Preview
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
    };

    const removeFile = () => {

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleSubmit = async (
        e: React.FormEvent
    ) => {

        e.preventDefault();

        if (createdIssue) {
            onIssueCreated(createdIssue);
            return;
        }

        setLoading(true);
        setError("");

        const locationId = placeId;

        let newIssue: Issue;
        try {
            const response = await api.post(
                "/issues",
                { ...formData, ...(locationId ? { locationId } : {}) }
            );
            newIssue = response.data.data;
        } catch (err) {
            setError(getErrorMessage(err, "Failed to create issue"));
            setLoading(false);
            return;
        }

        if (selectedFile) {
            try {
                const attachmentData = new FormData();
                attachmentData.append("image", selectedFile);

                const attachmentResponse = await api.post(
                    `/issues/${newIssue.id}/attachments`,
                    attachmentData
                );

                newIssue.attachments = [attachmentResponse.data.data];
            } catch (err) {
                setCreatedIssue(newIssue);
                setError(
                    `Issue #${newIssue.id} was created, but the image could not be uploaded: ${getErrorMessage(err, "upload failed")}. You can add it from the issue page.`
                );
                setLoading(false);
                return;
            }
        }

        setLoading(false);
        onIssueCreated(newIssue);
    };

    return (
        <div className="fx-modal-overlay">

            <div className="fx-modal">

                {/* Header */}

                <div className="fx-modal-header">

                    <button
                        type="button"
                        className="fx-modal-close"
                        onClick={createdIssue ? () => onIssueCreated(createdIssue) : onClose}
                        disabled={loading}
                    >
                        <X
                            size={20}
                            strokeWidth={2}
                        />
                    </button>

                    <div
                        style={{
                            margin: "5px 30px"
                        }}
                    >
                        <h2>
                            Report an Issue
                        </h2>

                        <p>
                            Tell us about the maintenance problem
                        </p>
                    </div>

                </div>


                {/* Error */}

                {error && (
                    <div className="fx-empty" role="alert">
                        {error}
                    </div>
                )}


                {pointName && (
                    <div className="fx-point-banner" role="status">
                        Reporting at <strong>{pointName}</strong>. The place is filled in; change it if needed.
                    </div>
                )}

                {/* Form */}

                <form onSubmit={handleSubmit}>

                    {/* Title */}

                    <div className="fx-form-group">

                        <label htmlFor="title">
                            Issue Title
                        </label>

                        <input
                            id="title"
                            name="title"
                            type="text"
                            placeholder="e.g. AC not working"
                            minLength={5}
                            maxLength={100}
                            value={formData.title}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />

                    </div>


                    {/* Description */}

                    <div className="fx-form-group">

                        <label htmlFor="description">
                            Description
                        </label>

                        <textarea
                            id="description"
                            name="description"
                            placeholder="Describe the issue (at least 10 characters)..."
                            minLength={10}
                            maxLength={1000}
                            value={formData.description}
                            onChange={handleChange}
                            rows={5}
                            disabled={loading}
                            required
                        />

                    </div>


                    {/* Location */}

                    {buildings.length > 0 && (
                        <div className="fx-form-row">

                            <div className="fx-form-group">
                                <label htmlFor="building">
                                    Building
                                </label>

                                <select
                                    id="building"
                                    value={buildingId}
                                    onChange={(e) => {
                                        setBuildingId(e.target.value);
                                        setFloorId("");
                                    }}
                                    disabled={loading}
                                    required
                                >
                                    <option value="" disabled>Select a building</option>
                                    {buildings.map((building) => (
                                        <option key={building.id} value={building.id}>{building.name}</option>
                                    ))}
                                    <option value={OTHER_BUILDING}>Other</option>
                                </select>
                            </div>

                            {floors.length > 0 && (
                                <div className="fx-form-group">
                                    <label htmlFor="floor">
                                        Floor
                                    </label>

                                    <select
                                        id="floor"
                                        value={floorId}
                                        onChange={(e) => setFloorId(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="">Not sure</option>
                                        {floors.map((floor) => (
                                            <option key={floor.id} value={floor.id}>{floor.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                        </div>
                    )}

                    {visibleSimilar.length > 0 && (
                        <div className="fx-similar" role="region" aria-label="Already reported here">
                            <strong>Already reported here?</strong>
                            <p>If one of these is your problem, join it instead of reporting again. You'll get its updates.</p>
                            <ul>
                                {visibleSimilar.map((other) => (
                                    <li key={other.id}>
                                        <div>
                                            <span>#{other.id} {other.title}</span>
                                            <small>
                                                {other.location} · {other.status.replace("_", " ").toLowerCase()} ·{" "}
                                                {other.affectedCount} affected
                                            </small>
                                        </div>
                                        {other.isMine ? (
                                            <small>Already yours</small>
                                        ) : (
                                            <button
                                                type="button"
                                                className="fx-btn fx-btn-sm"
                                                onClick={() => joinIssue(other.id)}
                                                disabled={loading || joining !== null}
                                            >
                                                {joining === other.id ? "Joining..." : "Me too"}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="fx-form-group">

                        <label htmlFor="location">
                            {buildings.length > 0 ? "Room or exact spot" : "Location"}
                        </label>

                        <input
                            id="location"
                            name="location"
                            type="text"
                            placeholder={buildings.length > 0 ? "e.g. Room 204, or washroom near the stairs" : "e.g. Block A, Room 204"}
                            value={formData.location}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />

                    </div>
                    <div className="fx-form-group">
                        <label htmlFor="category">
                            Category
                        </label>

                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            disabled={loading}
                        >
                            <option value="GENERAL">General</option>
                            <option value="ELECTRICAL">Electrical</option>
                            <option value="PLUMBING">Plumbing</option>
                            <option value="CARPENTRY">Carpentry</option>
                            <option value="CIVIL">Civil</option>
                            <option value="HVAC">HVAC</option>
                            <option value="IT">IT</option>
                        </select>
                    </div>

                    {/* Priority */}

                    <div className="fx-form-group">

                        <label htmlFor="priority">
                            Priority
                        </label>

                        <select
                            id="priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            disabled={loading}
                        >

                            <option value="LOW">
                                Low
                            </option>

                            <option value="MEDIUM">
                                Medium
                            </option>

                            <option value="HIGH">
                                High
                            </option>

                            <option value="CRITICAL">
                                Critical
                            </option>

                        </select>

                    </div>


                    {/* Attachment */}

                    <div className="fx-form-group">

                        <label>
                            Attachment
                        </label>

                        {!selectedFile ? (

                            <label
                                htmlFor="issue-image"
                                className="fx-file-upload"
                            >

                                <Paperclip size={18} />

                                <span>
                                    Attach an image
                                </span>

                                <small>
                                    JPG, PNG or WEBP · Max 5 MB
                                </small>

                                <input
                                    id="issue-image"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileChange}
                                    disabled={loading}
                                    hidden
                                />

                            </label>

                        ) : (

                            <div className="fx-selected-file">

                                {previewUrl && (
                                    <img
                                        src={previewUrl}
                                        alt="Selected attachment"
                                        className="fx-file-preview"
                                    />
                                )}

                                <div className="fx-selected-file-info">

                                    <div>
                                        <ImageIcon size={18} />

                                        <span>
                                            {selectedFile.name}
                                        </span>
                                    </div>

                                    <small>
                                        {(
                                            selectedFile.size /
                                            1024 /
                                            1024
                                        ).toFixed(2)}{" "}
                                        MB
                                    </small>

                                </div>

                                <button
                                    type="button"
                                    className="fx-remove-file"
                                    onClick={removeFile}
                                    disabled={loading}
                                >
                                    Remove
                                </button>

                            </div>
                        )}

                    </div>


                    {/* Actions */}

                    <div className="fx-modal-actions fx-space">

                        <button
                            type="button"
                            className="fx-btn fx-btn-cancel"
                            onClick={createdIssue ? () => onIssueCreated(createdIssue) : onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="fx-btn"
                            disabled={loading}
                        >
                            {loading
                                ? "Creating..."
                                : createdIssue
                                    ? "Done"
                                    : "Create Issue"}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
};

export default CreateIssue;