import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../services/api";
import { getSessionUser, roleLabel } from "../lib/session";
import JoinLinkCard from "../components/JoinLinkCard";
import OrganizationAdmin from "../components/OrganizationAdmin";
import type { UserRole } from "../types/issue";
import { SPECIALIZATIONS } from "../types/user";
import type { Member, PendingInvite, TechnicianSpecialization } from "../types/user";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

/** Admin page: who is in the organization, what they can do, and invite links for new people. */
const Members = () => {
    const currentUser = getSessionUser();
    const isOwner = currentUser?.role === "OWNER";

    const [members, setMembers] = useState<Member[]>([]);
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [autoAssign, setAutoAssign] = useState(false);
    const [joinUrl, setJoinUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [rowError, setRowError] = useState("");

    const [inviteRole, setInviteRole] = useState<UserRole>("REQUESTER");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteSpecialization, setInviteSpecialization] = useState<TechnicianSpecialization | "">("");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState("");
    const [inviteUrl, setInviteUrl] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        Promise.all([api.get("/members"), api.get("/invites"), api.get("/organization")])
            .then(([membersResponse, invitesResponse, organizationResponse]) => {
                setMembers(membersResponse.data.data);
                setInvites(invitesResponse.data.data);
                setAutoAssign(organizationResponse.data.data.autoAssign);
                setJoinUrl(organizationResponse.data.data.joinUrl);
            })
            .catch((err) => setError(getErrorMessage(err, "Failed to load members")))
            .finally(() => setLoading(false));
    }, []);

    const toggleAutoAssign = async (enabled: boolean) => {
        setRowError("");
        try {
            const response = await api.patch("/organization", { autoAssign: enabled });
            setAutoAssign(response.data.data.autoAssign);
        } catch (err) {
            setRowError(getErrorMessage(err, "Could not update the setting"));
        }
    };

    const updateMember = async (member: Member, changes: Partial<Pick<Member, "role" | "specialization" | "isActive">>) => {
        setRowError("");
        try {
            const response = await api.patch(`/members/${member.id}`, changes);
            setMembers((current) => current.map((m) => (m.id === member.id ? response.data.data : m)));
        } catch (err) {
            setRowError(`${member.name}: ${getErrorMessage(err, "Update failed")}`);
        }
    };

    const createInvite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setInviteError("");
        setInviteUrl("");
        setCopied(false);
        setInviteLoading(true);
        try {
            const response = await api.post("/invites", {
                role: inviteRole,
                ...(inviteEmail.trim() ? { email: inviteEmail.trim() } : {}),
                ...(inviteRole === "TECHNICIAN" && inviteSpecialization ? { specialization: inviteSpecialization } : {}),
            });
            setInviteUrl(response.data.data.inviteUrl);
            setInvites((current) => [response.data.data.invite, ...current]);
            setInviteEmail("");
        } catch (err) {
            setInviteError(getErrorMessage(err, "Could not create invite"));
        } finally {
            setInviteLoading(false);
        }
    };

    const revokeInvite = async (invite: PendingInvite) => {
        try {
            await api.delete(`/invites/${invite.id}`);
            setInvites((current) => current.filter((i) => i.id !== invite.id));
        } catch (err) {
            setInviteError(getErrorMessage(err, "Could not revoke invite"));
        }
    };

    const copyInviteUrl = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    // Admins manage technicians and requesters; only the owner manages admins and owners.
    const canEdit = (member: Member) =>
        member.userId !== currentUser?.id && (isOwner || (member.role !== "OWNER" && member.role !== "ADMIN"));
    const assignableRoles: UserRole[] = isOwner
        ? ["OWNER", "ADMIN", "TECHNICIAN", "REQUESTER"]
        : ["TECHNICIAN", "REQUESTER"];
    const invitableRoles: UserRole[] = isOwner ? ["ADMIN", "TECHNICIAN", "REQUESTER"] : ["TECHNICIAN", "REQUESTER"];

    return (
        <main>
            <div className="fx-page-head">
                <h2>Members</h2>
                <p>People in {currentUser?.organization.name ?? "your organization"} and what they can do.</p>
            </div>

            <section className="fx-section fx-panel fx-members-invite">
                <h2>Auto-assign</h2>
                <p>Send new issues straight to the matching technician with the lightest workload. Issues with no matching technician wait for an admin.</p>
                <label className="fx-filter-check">
                    <input
                        type="checkbox"
                        checked={autoAssign}
                        onChange={(e) => toggleAutoAssign(e.target.checked)}
                        disabled={loading}
                    />
                    Auto-assign new issues
                </label>
            </section>

            {!loading && !error && <JoinLinkCard joinUrl={joinUrl} onChange={setJoinUrl} />}

            <section className="fx-section fx-panel fx-members-invite">
                <h2>Invite someone</h2>
                <p>Create a link and share it with them. Links work once and expire after 7 days.</p>

                <form onSubmit={createInvite} className="fx-form-row">
                    <select
                        className="fx-select-2"
                        aria-label="Role"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    >
                        {invitableRoles.map((role) => (
                            <option key={role} value={role}>{roleLabel[role]}</option>
                        ))}
                    </select>

                    {inviteRole === "TECHNICIAN" && (
                        <select
                            className="fx-select-2"
                            aria-label="Specialization"
                            value={inviteSpecialization}
                            onChange={(e) => setInviteSpecialization(e.target.value as TechnicianSpecialization | "")}
                        >
                            <option value="">Specialization (optional)</option>
                            {SPECIALIZATIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    )}

                    <input
                        type="email"
                        className="fx-select-1"
                        aria-label="Email (optional)"
                        placeholder="Email (optional, locks the link to it)"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                    />

                    <button type="submit" className="fx-btn" disabled={inviteLoading}>
                        {inviteLoading ? "Creating..." : "Create invite link"}
                    </button>
                </form>

                {inviteError && <p className="fx-upload-error" role="alert">{inviteError}</p>}

                {inviteUrl && (
                    <div className="fx-form-row">
                        <input className="fx-select-1" readOnly value={inviteUrl} aria-label="Invite link" onFocus={(e) => e.target.select()} />
                        <button type="button" className="fx-btn" onClick={copyInviteUrl}>
                            {copied ? "Copied" : "Copy link"}
                        </button>
                    </div>
                )}
            </section>

            {invites.length > 0 && (
                <section className="fx-section">
                    <h2>Pending invites</h2>
                    <div className="fx-table-wrapper">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Role</th>
                                    <th>Email</th>
                                    <th>Created by</th>
                                    <th>Expires</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {invites.map((invite) => (
                                    <tr key={invite.id}>
                                        <td>{roleLabel[invite.role]}{invite.specialization ? ` · ${invite.specialization}` : ""}</td>
                                        <td>{invite.email ?? "Anyone with the link"}</td>
                                        <td>{invite.createdBy.name}</td>
                                        <td>{formatDate(invite.expiresAt)}</td>
                                        <td>
                                            <button type="button" className="fx-btn fx-btn-sm fx-btn-cancel" onClick={() => revokeInvite(invite)}>
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <section className="fx-section">
                <h2>Team</h2>

                {loading && <div className="fx-empty">Loading members...</div>}
                {error && <div className="fx-empty" role="alert">{error}</div>}
                {rowError && <p className="fx-upload-error" role="alert">{rowError}</p>}

                {!loading && !error && (
                    <div className="fx-table-wrapper">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Specialization</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => {
                                    const editable = canEdit(member);
                                    return (
                                        <tr key={member.id}>
                                            <td>
                                                <strong>{member.name}</strong>
                                                {member.userId === currentUser?.id && <span className="fx-table-description">You</span>}
                                            </td>
                                            <td>{member.email}</td>
                                            <td>
                                                {editable ? (
                                                    <select
                                                        className="fx-select-2"
                                                        aria-label={`Role for ${member.name}`}
                                                        value={member.role}
                                                        onChange={(e) => updateMember(member, { role: e.target.value as UserRole })}
                                                    >
                                                        {assignableRoles.map((role) => (
                                                            <option key={role} value={role}>{roleLabel[role]}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    roleLabel[member.role]
                                                )}
                                            </td>
                                            <td>
                                                {member.role !== "TECHNICIAN" ? (
                                                    "—"
                                                ) : editable ? (
                                                    <select
                                                        className="fx-select-2"
                                                        aria-label={`Specialization for ${member.name}`}
                                                        value={member.specialization ?? ""}
                                                        onChange={(e) =>
                                                            updateMember(member, {
                                                                specialization: (e.target.value || null) as TechnicianSpecialization | null,
                                                            })
                                                        }
                                                    >
                                                        <option value="">None</option>
                                                        {SPECIALIZATIONS.map((s) => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    member.specialization ?? "—"
                                                )}
                                            </td>
                                            <td>
                                                {editable ? (
                                                    <button
                                                        type="button"
                                                        className={member.isActive ? "fx-btn fx-btn-sm fx-btn-cancel" : "fx-btn fx-btn-sm"}
                                                        onClick={() => updateMember(member, { isActive: !member.isActive })}
                                                    >
                                                        {member.isActive ? "Deactivate" : "Reactivate"}
                                                    </button>
                                                ) : member.isActive ? (
                                                    "Active"
                                                ) : (
                                                    "Inactive"
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <OrganizationAdmin />
        </main>
    );
};

export default Members;
