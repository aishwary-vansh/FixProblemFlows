import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorise, ADMIN_ROLES } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";
import {
    acceptInviteController,
    createInviteController,
    getInvitePreviewController,
    getJoinPreviewController,
    joinOrganizationController,
    listInvitesController,
    listMembersController,
    revokeInviteController,
    updateMemberController,
} from "../controllers/member.controllers.js";
import {
    acceptInviteSchema,
    createInviteSchema,
    idParamSchema,
    joinCodeParamSchema,
    listMembersQuerySchema,
    tokenParamSchema,
    updateMemberSchema,
} from "../validators/member.validator.js";

export const memberRoutes = Router();

memberRoutes.use(authenticate, authorise(...ADMIN_ROLES));
memberRoutes.get("/", validate({ query: listMembersQuerySchema }), listMembersController);
memberRoutes.patch("/:id", validate({ params: idParamSchema, body: updateMemberSchema }), updateMemberController);

export const inviteRoutes = Router();

// Public: the invite link is opened before the person has an account or a token.
inviteRoutes.get("/:token", validate({ params: tokenParamSchema }), getInvitePreviewController);
inviteRoutes.post(
    "/:token/accept",
    authLimiter,
    validate({ params: tokenParamSchema, body: acceptInviteSchema }),
    acceptInviteController
);

// Admin-only invite management.
inviteRoutes.get("/", authenticate, authorise(...ADMIN_ROLES), listInvitesController);
inviteRoutes.post(
    "/",
    authenticate,
    authorise(...ADMIN_ROLES),
    validate({ body: createInviteSchema }),
    createInviteController
);
inviteRoutes.delete(
    "/:id",
    authenticate,
    authorise(...ADMIN_ROLES),
    validate({ params: idParamSchema }),
    revokeInviteController
);

export const joinRoutes = Router();

// Public: the org's reusable join link, shared on a poster or in a group chat.
joinRoutes.get("/:token", validate({ params: joinCodeParamSchema }), getJoinPreviewController);
joinRoutes.post(
    "/:token/accept",
    authLimiter,
    validate({ params: joinCodeParamSchema, body: acceptInviteSchema }),
    joinOrganizationController
);
