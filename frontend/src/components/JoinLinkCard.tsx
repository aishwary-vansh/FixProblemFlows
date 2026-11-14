import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api, { getErrorMessage } from "../services/api";

interface JoinLinkCardProps {
    joinUrl: string | null;
    onChange: (joinUrl: string | null) => void;
}

/** The org's reusable link and QR poster. Anyone who opens it can join as a requester. */
const JoinLinkCard = ({ joinUrl, onChange }: JoinLinkCardProps) => {
    const qrRef = useRef<HTMLCanvasElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const change = async (method: "post" | "delete") => {
        setBusy(true);
        setError("");
        setCopied(false);
        try {
            const response = await api[method]("/organization/join-link");
            onChange(response.data.data.joinUrl);
        } catch (err) {
            setError(getErrorMessage(err, "Could not update the join link"));
        } finally {
            setBusy(false);
        }
    };

    const replaceLink = () => {
        if (window.confirm("The current link and its QR poster will stop working. QR codes for places keep working. Replace it?")) {
            change("post");
        }
    };

    const turnOff = () => {
        if (window.confirm("Nobody new will be able to join, through this link or through QR codes for places. Turn it off?")) {
            change("delete");
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(joinUrl ?? "");
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    const downloadQr = () => {
        const link = document.createElement("a");
        link.href = qrRef.current?.toDataURL("image/png") ?? "";
        link.download = "fixflow-join-qr.png";
        link.click();
    };

    return (
        <section className="fx-section fx-panel fx-members-invite">
            <h2>Join link</h2>
            <p>Put this QR on a notice board or share the link in your group. Anyone with it can join as a Requester and report issues.</p>

            {!joinUrl && (
                <button type="button" className="fx-btn" onClick={() => change("post")} disabled={busy}>
                    Create join link
                </button>
            )}

            {joinUrl && (
                <div className="fx-join-link">
                    <QRCodeCanvas ref={qrRef} value={joinUrl} size={220} marginSize={2} title="Join link QR code" />

                    <div className="fx-join-actions">
                        <input className="fx-select-1" readOnly value={joinUrl} aria-label="Join link" onFocus={(e) => e.target.select()} />

                        <div className="fx-form-row">
                            <button type="button" className="fx-btn fx-btn-sm" onClick={copyLink}>
                                {copied ? "Copied" : "Copy link"}
                            </button>
                            <button type="button" className="fx-btn fx-btn-sm" onClick={downloadQr}>
                                Download QR
                            </button>
                            <button type="button" className="fx-btn fx-btn-sm fx-btn-cancel" onClick={replaceLink} disabled={busy}>
                                Replace link
                            </button>
                            <button type="button" className="fx-btn fx-btn-sm fx-btn-cancel" onClick={turnOff} disabled={busy}>
                                Turn off
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && <p className="fx-upload-error" role="alert">{error}</p>}
        </section>
    );
};

export default JoinLinkCard;
