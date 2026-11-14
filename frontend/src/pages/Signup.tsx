import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { getErrorMessage } from "../services/api";
import AuthLayout, { Field } from "../layouts/AuthLayout";
import { saveSession } from "../lib/session";

import { PASSWORD_HINT } from "../lib/constants";

/** Signup creates a new organization and makes the user its owner. Team members join by invite. */
const Signup = () => {
    const [organizationName, setOrganizationName] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const response = await api.post("/auth/register", {
                organizationName,
                name,
                email,
                phone,
                password,
                confirmPassword,
                termsAccepted,
            });

            saveSession(response.data.data);
            navigate("/dashboard");
        } catch (err) {
            setError(getErrorMessage(err, "Registration failed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Set up FixFlow for your organization"
            footer={
                <>
                    Already have an account?{" "}
                    <Link to="/login">Login</Link>
                </>
            }
        >
            <form
                onSubmit={handleSubmit}
                className="fa-card"
            >
                <Field
                    label="Organization name"
                    value={organizationName}
                    onChange={setOrganizationName}
                    placeholder="e.g. Sunrise Hostel"
                    autoComplete="organization"
                    hint="You'll be the owner. Invite admins, technicians and residents after signup."
                />

                <Field
                    label="Your name"
                    value={name}
                    onChange={setName}
                    placeholder="Enter your name"
                    autoComplete="name"
                />

                <Field
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="Enter your email"
                    autoComplete="email"
                />

                <Field
                    label="Phone"
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                />

                <Field
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    hint={PASSWORD_HINT}
                />

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
                        onChange={(e) =>
                            setTermsAccepted(e.target.checked)
                        }
                        required
                    />{" "}
                    I accept the{" "}
                    <Link to="/terms" target="_blank">Terms of Service</Link> and{" "}
                    <Link to="/privacy" target="_blank">Privacy Policy</Link>
                </label>

                {error && (
                    <div className="fa-msg fa-err" role="alert">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="fa-btn"
                    disabled={loading}
                >
                    {loading
                        ? "Creating organization..."
                        : "Create organization"}
                </button>
            </form>
        </AuthLayout>
    );
};

export default Signup;
