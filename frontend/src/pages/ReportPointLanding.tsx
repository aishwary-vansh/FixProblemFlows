import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import AuthLayout from "../layouts/AuthLayout";
import { getSessionUser, getToken, saveSession } from "../lib/session";
import { rememberReportPoint } from "../lib/reportPoint";

interface PointPreview {
    name: string;
    organization: { id: number; name: string };
    joinPath: string | null;
}

const REPORT_PAGE = "/my-issues?new=1";

/**
 * Where a QR report point leads. Members go straight to the report form with the place filled in;
 * everyone else logs in or, if the organization allows it, joins first.
 */
const ReportPointLanding = () => {
    const { code = "" } = useParams();
    const navigate = useNavigate();
    const [point, setPoint] = useState<PointPreview | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let stale = false;

        const open = async () => {
            const preview: PointPreview = (await api.get(`/report-points/public/${code}`)).data.data;
            if (stale) return;
            rememberReportPoint(code);

            const user = getSessionUser();
            // Check the saved session is still valid first; a stale one would bounce to login without the QR.
            const sessionValid = Boolean(getToken() && user) && (await api.get("/auth/me").then(() => true, () => false));
            if (stale) return;
            if (sessionValid && user) {
                if (user.organization.id === preview.organization.id) {
                    navigate(REPORT_PAGE, { replace: true });
                    return;
                }
                // Logged in to another organization: switch if they belong to this one too.
                try {
                    const session = (await api.post("/auth/switch-org", { orgId: preview.organization.id })).data.data;
                    if (stale) return;
                    saveSession(session);
                    navigate(REPORT_PAGE, { replace: true });
                    return;
                } catch {
                    // Not a member there; fall through to log in or join.
                }
            }
            if (!stale) setPoint(preview);
        };

        open().catch((err) => !stale && setError(getErrorMessage(err, "This QR code is not valid")));
        return () => {
            stale = true;
        };
    }, [code, navigate]);

    if (error) {
        return (
            <AuthLayout title="QR code not found" footer={<Link to="/login">Go to login</Link>}>
                <div className="fa-card">
                    <div className="fa-msg fa-err" role="alert">{error}</div>
                    <p className="fa-fine">It may have been removed. Ask your admin for a new one.</p>
                </div>
            </AuthLayout>
        );
    }

    if (!point) {
        return (
            <AuthLayout title="Opening..." footer={null}>
                <div className="fa-card"><p className="fa-fine">Loading...</p></div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={`Report a problem at ${point.name}`} footer={null}>
            <div className="fa-card">
                <p className="fa-fine">
                    This QR code belongs to <strong>{point.organization.name}</strong>. Log in to report, and the place
                    will be filled in for you.
                </p>
                <Link to={`/login?next=${encodeURIComponent(`/r/${code}`)}`} className="fa-btn" style={{ display: "grid", placeItems: "center" }}>
                    Log in
                </Link>
                {point.joinPath ? (
                    <p className="fa-fine">
                        New here? <Link to={point.joinPath}>Create an account and join {point.organization.name}</Link>
                    </p>
                ) : (
                    <p className="fa-fine">New here? Ask your admin for an invite link.</p>
                )}
            </div>
        </AuthLayout>
    );
};

export default ReportPointLanding;
