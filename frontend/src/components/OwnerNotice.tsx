import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Info } from "lucide-react";
import api from "../services/api";

interface Notice {
    message: string;
    level: "INFO" | "WARNING";
    at: string | null;
}

/**
 * A message from FixFlow to the owner, such as a payment problem or a plan change. It stays until
 * FixFlow removes it from the console; the owner can hide it for this visit.
 */
const OwnerNotice = () => {
    const [notice, setNotice] = useState<Notice | null>(null);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        api.get("/organization/notice")
            .then((response) => setNotice(response.data.data))
            // A missing notice is not worth an error on every page.
            .catch(() => setNotice(null));
    }, []);

    if (!notice || hidden) return null;

    const warning = notice.level === "WARNING";

    return (
        <div className={"fx-notice fx-owner-notice " + (warning ? "warning" : "info")} role={warning ? "alert" : "status"}>
            {warning ? <AlertTriangle size={18} aria-hidden="true" /> : <Info size={18} aria-hidden="true" />}
            <div>
                <strong>{warning ? "Warning from FixFlow" : "Message from FixFlow"}</strong>
                <p>{notice.message}</p>
            </div>
            <div className="fx-owner-notice-actions">
                <Link to="/admin/plan">Plans</Link>
                <button type="button" className="fx-link-btn" onClick={() => setHidden(true)}>
                    Hide
                </button>
            </div>
        </div>
    );
};

export default OwnerNotice;
