import { useState } from "react";
import api, { getErrorMessage } from "../services/api";
import { getSessionUser, roleLabel, saveSession } from "../lib/session";
import { PASSWORD_HINT } from "../lib/constants";
import { disablePush } from "../lib/push";

/** Your own details and password. */
const Profile = () => {
    const user = getSessionUser();

    const [name, setName] = useState(user?.name ?? "");
    const [phone, setPhone] = useState(user?.phone ?? "");
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState("");
    const [profileError, setProfileError] = useState("");

    const [currentPassword, setCurrentPassword] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMessage("");
        setProfileError("");
        try {
            const response = await api.patch("/auth/me", { name, phone });
            saveSession(response.data.data);
            setProfileMessage("Saved.");
        } catch (err) {
            setProfileError(getErrorMessage(err, "Could not save your details"));
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordMessage("");
        setPasswordError("");
        if (password !== confirmPassword) {
            setPasswordError("Passwords do not match");
            return;
        }
        setSavingPassword(true);
        try {
            const response = await api.post("/auth/change-password", { currentPassword, password, confirmPassword });
            // A fresh token: this device stays logged in, every other one is logged out.
            saveSession(response.data.data);
            // The server stopped alerts on every device; clear this browser's subscription so the bell shows it.
            await disablePush().catch(() => undefined);
            setCurrentPassword("");
            setPassword("");
            setConfirmPassword("");
            setPasswordMessage("Password changed. You've been logged out on your other devices, and phone alerts are off everywhere. Turn them on again from the bell.");
        } catch (err) {
            setPasswordError(getErrorMessage(err, "Could not change your password"));
        } finally {
            setSavingPassword(false);
        }
    };

    if (!user) return null;

    return (
        <main>
            <div className="fx-page-head">
                <h2>Your profile</h2>
                <p>
                    {roleLabel[user.role]} at {user.organization.name} · Account ID {user.id}
                </p>
            </div>

            <section className="fx-section fx-panel fx-members-invite">
                <h2>Your details</h2>
                <form onSubmit={saveProfile} className="fx-action-form fx-profile-form">
                    <div className="fx-form-group">
                        <label htmlFor="profile-email">Email</label>
                        <input id="profile-email" value={user.email} readOnly disabled />
                    </div>
                    <div className="fx-form-group">
                        <label htmlFor="profile-name">Name</label>
                        <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
                    </div>
                    <div className="fx-form-group">
                        <label htmlFor="profile-phone">Phone</label>
                        <input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" required />
                    </div>
                    {profileError && <p className="fx-upload-error" role="alert">{profileError}</p>}
                    {profileMessage && <p className="fx-no-attachments" role="status">{profileMessage}</p>}
                    <div className="fx-modal-actions">
                        <button type="submit" className="fx-btn" disabled={savingProfile}>
                            {savingProfile ? "Saving..." : "Save details"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="fx-section fx-panel fx-members-invite">
                <h2>Change password</h2>
                <form onSubmit={savePassword} className="fx-action-form fx-profile-form">
                    <div className="fx-form-group">
                        <label htmlFor="current-password">Current password</label>
                        <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                    </div>
                    <div className="fx-form-group">
                        <label htmlFor="new-password">New password</label>
                        <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <small className="fx-no-attachments">{PASSWORD_HINT}</small>
                    </div>
                    <div className="fx-form-group">
                        <label htmlFor="confirm-password">Confirm new password</label>
                        <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                    {passwordError && <p className="fx-upload-error" role="alert">{passwordError}</p>}
                    {passwordMessage && <p className="fx-no-attachments" role="status">{passwordMessage}</p>}
                    <div className="fx-modal-actions">
                        <button type="submit" className="fx-btn" disabled={savingPassword}>
                            {savingPassword ? "Saving..." : "Change password"}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
};

export default Profile;
