import { tenantPrisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import { findVisibleIssue } from "./issue.services.js";
import { notify } from "./notification.service.js";

const authorSummary = { select: { id: true, name: true } } as const;

export const listComments = async (ctx: AuthContext, issueId: number) => {
    await findVisibleIssue(ctx, issueId);

    return tenantPrisma(ctx.orgId).comment.findMany({
        where: { issueId },
        include: { author: authorSummary },
        orderBy: { id: "asc" },
    });
};

/** Anyone who can see the issue can comment; the reporter and assignee are notified. */
export const addComment = async (ctx: AuthContext, issueId: number, body: string) => {
    const issue = await findVisibleIssue(ctx, issueId);

    return tenantPrisma(ctx.orgId).$transaction(async (tx) => {
        const comment = await tx.comment.create({
            data: { orgId: ctx.orgId, issueId, authorId: ctx.userId, body },
            include: { author: authorSummary },
        });

        await notify(tx, {
            orgId: ctx.orgId,
            issueId,
            actorId: ctx.userId,
            type: "COMMENT_ADDED",
            message: `${comment.author.name} commented on #${issue.id} "${issue.title}"`,
            userIds: [issue.reporterId, issue.assigneeId],
        });

        return comment;
    });
};
