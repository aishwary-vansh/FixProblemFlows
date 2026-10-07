import { useState } from "react";
import api from "../services/api";
import type { Issue } from "../types/issue";
import { X } from "lucide-react";

interface CreateIssueProps {
    onClose: () => void;
    onIssueCreated:(issue:Issue)=>void;
}

const CreateIssue = ({ onClose ,onIssueCreated}: CreateIssueProps) => {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        location: "",
        priority: "MEDIUM",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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

    const handleSubmit = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError("");

            const response = await api.post(
                "/issues",
                formData
            );

            console.log(response.data);
            onIssueCreated(response.data.data);
            // Close modal after successful creation

        } catch (err) {
            console.error("Failed to create issue", err);
            setError("Failed to create issue");

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fx-modal-overlay">

            <div className="fx-modal">

                {/* Header */}
                <div className="fx-modal-header">
                    <button
                        type="button"
                        className="fx-modal-close"
                        onClick={onClose}
                    >
                        <X size={20} strokeWidth={2} />
                    </button>
                    <div style={{margin:"5px 30px"}}>
                        <h2>Report an Issue</h2>
                        <p>
                            Tell us about the maintenance problem
                        </p>
                    </div>

                </div>


                {/* Error */}
                {error && (
                    <div className="fx-empty">
                        {error}
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
                            value={formData.title}
                            onChange={handleChange}
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
                            placeholder="Describe the issue..."
                            value={formData.description}
                            onChange={handleChange}
                            rows={5}
                        />

                    </div>


                    {/* Location */}
                    <div className="fx-form-group">

                        <label htmlFor="location">
                            Location
                        </label>

                        <input
                            id="location"
                            name="location"
                            type="text"
                            placeholder="e.g. Block A, Room 204"
                            value={formData.location}
                            onChange={handleChange}
                        />

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


                    {/* Actions */}
                    <div className="fx-modal-actions fx-space">

                        <button
                            type="button"
                            className="fx-btn fx-btn-cancel"
                            onClick={onClose}
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
                                : "Create Issue"}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
};

export default CreateIssue;