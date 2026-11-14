import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import AuthLayout, { Field } from "../layouts/AuthLayout";
import { getSessionUser, getToken, roleLabel, saveSession } from "../lib/session";
import type { UserRole } from "../types/issue";
import { PASSWORD_HINT } from "../lib/constants";

interface InvitePreview {
    organization: { id: number; name: string };
    role: UserRole;
    email: string | null;
    expiresAt: string;
}

// The join link usually comes from a QR on the wall, so it ends on the report form.
const REPORT_PAGE = "/my-issues?new=1";

interface AcceptInviteProps {
    /** "/invites" for a personal invite, "/join" for the org's reusable link. */
    apiBase: "/invites" | "/join";
}

/** Landing page for an invite or join link: create an account (or log in) and join the organization. */
const AcceptInvite = ({ apiBase }: AcceptInviteProps) => {
    const { token = "" } = useParams();
    const navigate = useNavigate();
    const isJoinLink = apiBase === "/join";

    const [invite, setInvite] = useState<InvitePreview | null>(null);
    const [loadError, setLoadError] = useState("");
    const [mode, setMode] = useState<"register" | "login">("register");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get(`${apiBase}/${token}`)
            .then((response) => {
                const preview: InvitePreview = response.data.data;

                // Already logged in to this org: scanning the QR goes straight to reporting.
                if (isJoinLink && getToken() && getSessionUser()?.organization.id === preview.organization.id) {
                    navigate(REPORT_PAGE, { replace: true });
                    return;
                }

                setInvite(preview);
                if (preview.email) setEmail(preview.email);
            })
            .catch((err) => setLoadError(getErrorMessage(err, "This link is not valid")));
    }, [apiBase, isJoinLink, navigate, token]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (mode === "register" && password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setError("");
        setLoading(true);
        try {
            const body =
                mode === "register"
                    ? { mode, name, email, phone, password, confirmPassword, termsAccepted }
                    : { mode, email, password };
            const response = await api.post(`${apiBase}/${token}/accept`, body);
            saveSession(response.data.data);
            navigate(isJoinLink ? REPORT_PAGE : "/dashboard");
        } catch (err) {
            setError(getErrorMessage(err, "Could not join"));
        } finally {
            setLoading(false);
        }
    };

    if (loadError) {
        return (
            <AuthLayout title="Link unavailable" footer={<Link to="/login">Go to login</Link>}>
                <div className="fa-card">
                    <div className="fa-msg fa-err" role="alert">{loadError}</div>
                </div>
            </AuthLayout>
        );
    }

    if (!invite) {
        return (
            <AuthLayout title="Checking your link..." footer={null}>
                <div className="fa-card"><p className="fa-fine">Loading...</p></div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title={`Join ${invite.organization.name}`}
            footer={
                mode === "register" ? (
                    <>
                        Already have a FixFlow account?{" "}
                        <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(""); }}>
                            Log in instead
                        </a>
                    </>
                ) : (
                    <>
                        New to FixFlow?{" "}
                        <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); setError(""); }}>
                            Create an account
                        </a>
                    </>
                )
            }
        >
            <form onSubmit={handleSubmit} className="fa-card">
                <div className="fa-msg fa-ok">
                    {isJoinLink ? "You'll join as" : "You've been invited as"} <strong>{roleLabel[invite.role]}</strong>.
                </div>

                {mode === "register" && (
                    <Field label="Your name" value={name} onChange={setName} placeholder="Enter your name" autoComplete="name" />
                )}

                <Field
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="Enter your email"
                    autoComplete="email"
                    hint={invite.email ? "This invite is for this email address." : undefined}
                />

                {mode === "register" && (
                    <Field label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="10-digit mobile number" autoComplete="tel" />
                )}

                <Field
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder={mode === "register" ? "Create a password" : "Enter your password"}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    hint={mode === "register" ? PASSWORD_HINT : undefined}
                />

                {mode === "register" && (
                    <>
                        <Field
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                        />
                        <label className="fa-fine">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                required
                            />{" "}
                            I accept the{" "}
                            <Link to="/terms" target="_blank">Terms of Service</Link> and{" "}
                            <Link to="/privacy" target="_blank">Privacy Policy</Link>
                        </label>
                    </>
                )}

                {error && <div className="fa-msg fa-err" role="alert">{error}</div>}

                <button type="submit" className="fa-btn" disabled={loading}>
                    {loading ? "Joining..." : `Join ${invite.organization.name}`}
                </button>
            </form>
        </AuthLayout>
    );
};

export default AcceptInvite;
