import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import AuthLayout, { Field } from "../layouts/AuthLayout";

/** Asks for an email and sends a reset link. Says the same thing whether or not the account exists. */
const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await api.post("/auth/forgot-password", { email });
            setSent(true);
        } catch (err) {
            setError(getErrorMessage(err, "Could not send the reset link"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Reset your password" footer={<Link to="/login">Back to login</Link>}>
            {sent ? (
                <div className="fa-card">
                    <div className="fa-msg fa-ok" role="status">
                        If an account exists for <strong>{email}</strong>, we've sent a link to reset the password.
                    </div>
                    <p className="fa-fine">
                        The link expires in 1 hour. Can't find it? Check your spam folder, or ask again in a few minutes.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="fa-card">
                    <p className="fa-fine">Enter the email you log in with. We'll send you a link to choose a new password.</p>
                    <Field
                        label="Email"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        placeholder="Enter your email"
                        autoComplete="email"
                    />
                    {error && <div className="fa-msg fa-err" role="alert">{error}</div>}
                    <button type="submit" disabled={loading} className="fa-btn">
                        {loading ? "Sending..." : "Send reset link"}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
};

export default ForgotPassword;
