import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import api from "../services/api";
import AuthLayout, { Field } from "../layouts/AuthLayout";

const Signup = () => {
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

        setError("");
        setLoading(true);

        try {
            const response = await api.post("/auth/register", {
                name,
                email,
                phone,
                password,
                confirmPassword,
                termsAccepted,
            });

            console.log("Signup response:", response.data);

            navigate("/login");
        } catch (e) {
            console.error("Signup error:", e);

            if (axios.isAxiosError(e)) {
                console.log("Status:", e.response?.status);
                console.log("Response data:", e.response?.data);

                setError(
                    e.response?.data?.message ||
                    "Registration failed"
                );
            } else {
                setError("Registration failed");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Create your FixFlow account"
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
                    label="Name"
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
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                />

                <Field
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Create a password"
                    autoComplete="new-password"
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
                    />{" "}
                    I accept the terms and conditions
                </label>

                {error && (
                    <div className="fa-msg fa-err">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="fa-btn"
                    disabled={loading}
                >
                    {loading
                        ? "Creating account..."
                        : "Create Account"}
                </button>
            </form>
        </AuthLayout>
    );
};

export default Signup;