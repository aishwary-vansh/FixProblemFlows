import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../services/api";
import AuthLayout, { Field } from "../../layouts/AuthLayout";
import consoleApi, { saveConsoleSession } from "../../lib/consoleApi";

/** Login for the people who run FixFlow. Accounts are made with `npm run console-admin`, never signed up here. */
const ConsoleLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await consoleApi.post("/login", { email, password });
            saveConsoleSession(response.data.data.token, response.data.data.admin);
            navigate("/console");
        } catch (err) {
            setError(getErrorMessage(err, "Invalid email or password"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="FixFlow Console"
            footer={
                <>
                    Not running FixFlow? <Link to="/login">Log in to your organization</Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="fa-card">
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="Console admin email" autoComplete="email" />
                <Field
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Password"
                    autoComplete="current-password"
                />
                {error && (
                    <div className="fa-msg fa-err" role="alert">
                        {error}
                    </div>
                )}
                <button type="submit" disabled={loading} className="fa-btn">
                    {loading ? "Logging in..." : "Log in to the console"}
                </button>
            </form>
        </AuthLayout>
    );
};

export default ConsoleLogin;
