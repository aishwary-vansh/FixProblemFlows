import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api, { getErrorMessage } from "../services/api";
import type { LocationBuilding } from "../types/issue";

interface ReportPoint {
    id: number;
    name: string;
    code: string;
    spot: string | null;
    place: string;
    url: string;
}

/** Saves a printable card: the QR with the point's name under it. */
const downloadCard = (canvas: HTMLCanvasElement, point: ReportPoint) => {
    const card = document.createElement("canvas");
    const padding = 24;
    card.width = canvas.width + padding * 2;
    card.height = canvas.height + padding * 2 + 70;
    const ctx = card.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, card.width, card.height);
    ctx.drawImage(canvas, padding, padding);
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText(point.name, card.width / 2, canvas.height + padding + 34, card.width - padding * 2);
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText("Scan to report a problem here", card.width / 2, canvas.height + padding + 60, card.width - padding * 2);

    const link = document.createElement("a");
    link.href = card.toDataURL("image/png");
    link.download = `fixflow-qr-${point.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    link.click();
};

const PointCard = ({ point, onRemove }: { point: ReportPoint; onRemove: (point: ReportPoint) => void }) => {
    const qrRef = useRef<HTMLCanvasElement>(null);
    return (
        <li className="fx-panel fx-point-card">
            <QRCodeCanvas ref={qrRef} value={point.url} size={240} marginSize={2} title={`QR code for ${point.name}`} />
            <div>
                <strong>{point.name}</strong>
                <span>{point.place || "No place set; the reporter types it"}</span>
            </div>
            <div className="fx-form-row">
                <button type="button" className="fx-btn fx-btn-sm" onClick={() => qrRef.current && downloadCard(qrRef.current, point)}>
                    Download
                </button>
                <button type="button" className="fx-btn fx-btn-sm fx-btn-cancel" onClick={() => onRemove(point)}>
                    Remove
                </button>
            </div>
        </li>
    );
};

/**
 * QR codes for whichever places the admin chooses: the mess, the gym, one washroom, a whole building.
 * Nothing is generated per floor automatically, so a big campus doesn't end up with hundreds of codes.
 */
const ReportPoints = ({ buildings }: { buildings: LocationBuilding[] }) => {
    const [points, setPoints] = useState<ReportPoint[]>([]);
    const [name, setName] = useState("");
    const [locationId, setLocationId] = useState("");
    const [spot, setSpot] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/report-points")
            .then((response) => setPoints(response.data.data))
            .catch((err) => setError(getErrorMessage(err, "Failed to load QR points")));
    }, []);

    const create = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const response = await api.post("/report-points", {
                name,
                ...(locationId ? { locationId: Number(locationId) } : {}),
                ...(spot.trim() ? { spot: spot.trim() } : {}),
            });
            setPoints((current) => [...current, response.data.data].sort((a, b) => a.name.localeCompare(b.name)));
            setName("");
            setLocationId("");
            setSpot("");
        } catch (err) {
            setError(getErrorMessage(err, "Could not create the QR point"));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (point: ReportPoint) => {
        if (!window.confirm(`Remove "${point.name}"? Printed copies of its QR code will stop working.`)) return;
        setError("");
        try {
            await api.delete(`/report-points/${point.id}`);
            setPoints((current) => current.filter((p) => p.id !== point.id));
        } catch (err) {
            setError(getErrorMessage(err, "Could not remove the QR point"));
        }
    };

    return (
        <>
            <section className="fx-section fx-panel fx-members-invite">
                <h2>QR codes for places</h2>
                <p>
                    Make a QR code for any place people report from, such as the mess kitchen, the gym or one busy washroom.
                    Scanning it opens the report form with the place filled in. Make only the ones you need.
                </p>

                <form onSubmit={create} className="fx-form-row">
                    <input
                        className="fx-select-1"
                        aria-label="QR point name"
                        placeholder="Name, e.g. Mess kitchen"
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <select
                        className="fx-select-2"
                        aria-label="Building or floor (optional)"
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                    >
                        <option value="">No building (optional)</option>
                        {buildings.map((building) => (
                            <optgroup key={building.id} label={building.name}>
                                <option value={building.id}>{building.name}</option>
                                {building.floors.map((floor) => (
                                    <option key={floor.id} value={floor.id}>{building.name} · {floor.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <input
                        className="fx-select-1"
                        aria-label="Exact spot (optional)"
                        placeholder="Exact spot (optional), e.g. Near the sink"
                        maxLength={200}
                        value={spot}
                        onChange={(e) => setSpot(e.target.value)}
                    />
                    <button type="submit" className="fx-btn" disabled={saving || name.trim().length < 2}>
                        {saving ? "Creating..." : "Create QR"}
                    </button>
                </form>

                {error && <p className="fx-upload-error" role="alert">{error}</p>}
            </section>

            {points.length > 0 && (
                <section className="fx-section">
                    <h2>Your QR codes</h2>
                    <ul className="fx-point-grid">
                        {points.map((point) => (
                            <PointCard key={point.id} point={point} onRemove={remove} />
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
};

export default ReportPoints;
