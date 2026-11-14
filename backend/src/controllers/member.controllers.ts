import type { Request, Response } from "express";
import { getAuth } from "../middleware/auth.middleware.js";
import { listMembers, updateMember } from "../services/member.service.js";
import {
    acceptInvite,
    createInvite,
    getInvitePreview,
    getJoinPreview,
    joinOrganization,
    listPendingInvites,
    revokeInvite,
} from "../services/invite.service.js";

export const listMembersController = async (req: Request, res: Response) => {
    const members = await listMembers(getAuth(req), req.query);
    res.status(200).json({ success: true, data: members });
};

export const updateMemberController = async (req: Request, res: Response) => {
    const member = await updateMember(getAuth(req), Number(req.params.id), req.body);
    res.status(200).json({ success: true, message: "Member updated", data: member });
};

export const createInviteController = async (req: Request, res: Response) => {
    const result = await createInvite(getAuth(req), req.body);
    res.status(201).json({ success: true, message: "Invite created", data: result });
};

export const listInvitesController = async (req: Request, res: Response) => {
    const invites = await listPendingInvites(getAuth(req));
    res.status(200).json({ success: true, data: invites });
};

export const revokeInviteController = async (req: Request, res: Response) => {
    await revokeInvite(getAuth(req), Number(req.params.id));
    res.status(200).json({ success: true, message: "Invite revoked" });
};

export const getInvitePreviewController = async (req: Request, res: Response) => {
    const preview = await getInvitePreview(String(req.params.token));
    res.status(200).json({ success: true, data: preview });
};

export const acceptInviteController = async (req: Request, res: Response) => {
    const session = await acceptInvite(String(req.params.token), req.body);
    res.status(200).json({ success: true, message: "Welcome aboard", data: session });
};

export const getJoinPreviewController = async (req: Request, res: Response) => {
    const preview = await getJoinPreview(String(req.params.token));
    res.status(200).json({ success: true, data: preview });
};

export const joinOrganizationController = async (req: Request, res: Response) => {
    const session = await joinOrganization(String(req.params.token), req.body);
    res.status(200).json({ success: true, message: "Welcome aboard", data: session });
};
