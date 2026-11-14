import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import AuthLayout, { Field } from "../layouts/AuthLayout";
import { saveSession } from "../lib/session";
import { safeNextPath } from "../lib/reportPoint";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await api.post("/auth/login", {
                email,
                password
            });
            saveSession(response.data.data);
            navigate(safeNextPath(searchParams.get("next")) ?? "/dashboard");
        }
        catch (err) {
            setError(getErrorMessage(err, "Invalid email or password"));
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back to FixFlow"
            footer={
                <>
                    New to FixFlow?{" "}
                    <Link to="/signup">Create an organization</Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="fa-card">
                <Field
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="Enter your email"
                    autoComplete="email"
                />

                <Field
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                />
                <Link to="/forgot-password" className="fa-fine" style={{ justifySelf: "end", marginTop: -8 }}>
                    Forgot password?
                </Link>
                {error && (
                    <div className="fa-msg fa-err" role="alert">
                        {error}
                    </div>
                )}
                <button type="submit" disabled={loading} className="fa-btn">
                    {loading ? "Logging in..." : "Login"}
                </button>
                <p className="fa-fine">
                    Joining an existing team? Open the invite link your admin sent you.
                </p>
            </form>
        </AuthLayout>
    );
};

export default Login;
