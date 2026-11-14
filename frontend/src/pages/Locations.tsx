import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import type { LocationBuilding } from "../types/issue";
import ReportPoints from "../components/ReportPoints";

const EXAMPLE = "Block A: Ground Floor, 1st Floor, 2nd Floor\nBlock B: Ground Floor, 1st Floor\nMess";

/** Admin page: the buildings and floors people pick from when reporting an issue. */
const Locations = () => {
    const [buildings, setBuildings] = useState<LocationBuilding[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        api.get("/locations")
            .then((response) => setBuildings(response.data.data))
            .catch((err) => setError(getErrorMessage(err, "Failed to load locations")))
            .finally(() => setLoading(false));
    }, []);

    const saveList = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaveError("");
        setSaving(true);
        try {
            const response = await api.post("/locations", { text });
            setBuildings(response.data.data);
            setText("");
        } catch (err) {
            setSaveError(getErrorMessage(err, "Could not save locations"));
        } finally {
            setSaving(false);
        }
    };

    const removeBuilding = async (building: LocationBuilding) => {
        setSaveError("");
        try {
            await api.delete(`/locations/${building.id}`);
            setBuildings((current) => current.filter((b) => b.id !== building.id));
        } catch (err) {
            setSaveError(getErrorMessage(err, "Could not remove the building"));
        }
    };

    const removeFloor = async (building: LocationBuilding, floorId: number) => {
        setSaveError("");
        try {
            await api.delete(`/locations/${floorId}`);
            setBuildings((current) =>
                current.map((b) =>
                    b.id === building.id ? { ...b, floors: b.floors.filter((floor) => floor.id !== floorId) } : b
                )
            );
        } catch (err) {
            setSaveError(getErrorMessage(err, "Could not remove the floor"));
        }
    };

    return (
        <main>
            <div className="fx-page-head">
                <h2>Locations</h2>
                <p>Buildings and floors people choose from when they report an issue. They type the exact spot themselves.</p>
            </div>

            <section className="fx-section fx-panel fx-members-invite">
                <h2>Add buildings and floors</h2>
                <p>One building per line, with its floors after a colon. To add a floor later, write the building again with the new floor.</p>

                <form onSubmit={saveList} className="fx-action-form">
                    <div className="fx-form-group">
                        <textarea
                            aria-label="Buildings and floors"
                            rows={5}
                            maxLength={5000}
                            placeholder={EXAMPLE}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    <div className="fx-modal-actions">
                        <button type="submit" className="fx-btn" disabled={saving || !text.trim()}>
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>

                {saveError && <p className="fx-upload-error" role="alert">{saveError}</p>}
            </section>

            {!loading && <ReportPoints buildings={buildings} />}

            <section className="fx-section">
                <h2>Your buildings</h2>

                {loading && <div className="fx-empty">Loading locations...</div>}
                {error && <div className="fx-empty" role="alert">{error}</div>}
                {!loading && !error && buildings.length === 0 && (
                    <div className="fx-empty">No buildings yet. Until you add some, people type the location themselves.</div>
                )}

                {buildings.length > 0 && (
                    <div className="fx-table-wrapper">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Building</th>
                                    <th>Floors</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {buildings.map((building) => (
                                    <tr key={building.id}>
                                        <td><strong>{building.name}</strong></td>
                                        <td>
                                            {building.floors.length === 0 && "—"}
                                            <div className="fx-floor-list">
                                                {building.floors.map((floor) => (
                                                    <span key={floor.id} className="fx-floor-chip">
                                                        {floor.name}
                                                        <button
                                                            type="button"
                                                            aria-label={`Remove ${floor.name} from ${building.name}`}
                                                            onClick={() => removeFloor(building, floor.id)}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="fx-btn fx-btn-sm fx-btn-cancel"
                                                onClick={() => removeBuilding(building)}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
};

export default Locations;
