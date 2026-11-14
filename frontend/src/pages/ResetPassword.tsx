import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import AuthLayout, { Field } from "../layouts/AuthLayout";
import { clearSession } from "../lib/session";
import { PASSWORD_HINT } from "../lib/constants";

/** Landing page for the emailed reset link. A new password logs the account out on every device. */
const ResetPassword = () => {
    const { token = "" } = useParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError("");
        try {
            await api.post("/auth/reset-password", { token, password, confirmPassword });
            // Any session saved in this browser is no longer valid.
            clearSession();
            setDone(true);
        } catch (err) {
            setError(getErrorMessage(err, "Could not change the password"));
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <AuthLayout title="Password changed" footer={null}>
                <div className="fa-card">
                    <div className="fa-msg fa-ok" role="status">
                        Your password has been changed. You've been logged out on other devices.
                    </div>
                    <Link to="/login" className="fa-btn" style={{ display: "grid", placeItems: "center" }}>
                        Log in
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Choose a new password" footer={<Link to="/forgot-password">Need a new link?</Link>}>
            <form onSubmit={handleSubmit} className="fa-card">
                <Field
                    label="New password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    hint={PASSWORD_HINT}
                />
                <Field
                    label="Confirm new password"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                />
                {error && <div className="fa-msg fa-err" role="alert">{error}</div>}
                <button type="submit" disabled={loading} className="fa-btn">
                    {loading ? "Saving..." : "Change password"}
                </button>
            </form>
        </AuthLayout>
    );
};

export default ResetPassword;
