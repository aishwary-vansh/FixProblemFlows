import type { Request, Response } from "express";
import {
    addIssueAttachment,
    assignIssue,
    createIssue,
    findSimilarIssues,
    followIssue,
    getIssueById,
    getIssueStats,
    listIssues,
    markDuplicate,
    transitionIssue,
    unfollowIssue,
    updateIssuePriority,
} from "../services/issue.services.js";
import { getSuggestions } from "../services/dispatch.service.js";
import { addComment, listComments } from "../services/comment.service.js";
import { getAuth } from "../middleware/auth.middleware.js";
import { AppError } from "../utils/AppError.js";
import type { ListIssuesQuery, IssueStatsQuery, SimilarIssuesQuery } from "../validators/issue.validator.js";

// Express 5 forwards rejected promises to the error handler, so controllers only parse, call and respond.

const issueId = (req: Request) => Number(req.params.id);

export const createIssueController = async (req: Request, res: Response) => {
    const issue = await createIssue(getAuth(req), req.body);
    res.status(201).json({ success: true, message: "Issue created successfully", data: issue });
};

export const getIssuesController = async (req: Request, res: Response) => {
    const { items, nextCursor } = await listIssues(getAuth(req), req.query as unknown as ListIssuesQuery);
    res.status(200).json({ success: true, data: items, meta: { nextCursor } });
};

export const getIssueStatsController = async (req: Request, res: Response) => {
    const stats = await getIssueStats(getAuth(req), req.query as unknown as IssueStatsQuery);
    res.status(200).json({ success: true, data: stats });
};

export const getIssueByIdController = async (req: Request, res: Response) => {
    const issue = await getIssueById(getAuth(req), issueId(req));
    res.status(200).json({ success: true, data: issue });
};

export const assignIssueController = async (req: Request, res: Response) => {
    const issue = await assignIssue(getAuth(req), issueId(req), req.body.technicianId);
    res.status(200).json({ success: true, message: "Issue assigned", data: issue });
};

export const updateIssuePriorityController = async (req: Request, res: Response) => {
    const issue = await updateIssuePriority(getAuth(req), issueId(req), req.body.priority);
    res.status(200).json({ success: true, message: "Priority updated", data: issue });
};

export const getSuggestionsController = async (req: Request, res: Response) => {
    const suggestions = await getSuggestions(getAuth(req), issueId(req));
    res.status(200).json({ success: true, data: suggestions });
};

export const transitionIssueController = async (req: Request, res: Response) => {
    const issue = await transitionIssue(getAuth(req), issueId(req), req.body);
    res.status(200).json({ success: true, message: `Issue moved to ${issue.status}`, data: issue });
};

export const listCommentsController = async (req: Request, res: Response) => {
    const comments = await listComments(getAuth(req), issueId(req));
    res.status(200).json({ success: true, data: comments });
};

export const addCommentController = async (req: Request, res: Response) => {
    const comment = await addComment(getAuth(req), issueId(req), req.body.body);
    res.status(201).json({ success: true, message: "Comment added", data: comment });
};

export const addIssueAttachmentController = async (req: Request, res: Response) => {
    if (!req.file) {
        throw AppError.badRequest("Image is required");
    }

    const kind = req.body?.kind === "AFTER" ? "AFTER" : "BEFORE";
    const attachment = await addIssueAttachment(getAuth(req), issueId(req), req.file, kind);
    res.status(201).json({ success: true, message: "Attachment uploaded", data: attachment });
};

export const getSimilarIssuesController = async (req: Request, res: Response) => {
    const issues = await findSimilarIssues(getAuth(req), req.query as unknown as SimilarIssuesQuery);
    res.status(200).json({ success: true, data: issues });
};

export const followIssueController = async (req: Request, res: Response) => {
    const issue = await followIssue(getAuth(req), issueId(req));
    res.status(200).json({ success: true, message: "You'll get updates on this issue", data: issue });
};

export const unfollowIssueController = async (req: Request, res: Response) => {
    await unfollowIssue(getAuth(req), issueId(req));
    res.status(200).json({ success: true, message: "You'll no longer get updates on this issue" });
};

export const markDuplicateController = async (req: Request, res: Response) => {
    const issue = await markDuplicate(getAuth(req), issueId(req), req.body.duplicateOfId);
    res.status(200).json({ success: true, message: `Closed as a duplicate of #${req.body.duplicateOfId}`, data: issue });
};
