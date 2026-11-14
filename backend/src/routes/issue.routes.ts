import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorise, ADMIN_ROLES } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { uploadIssueImage } from "../middleware/upload.middleware.js";
import {
    addCommentController,
    addIssueAttachmentController,
    assignIssueController,
    createIssueController,
    followIssueController,
    getSimilarIssuesController,
    markDuplicateController,
    unfollowIssueController,
    getIssueByIdController,
    getIssueStatsController,
    getIssuesController,
    getSuggestionsController,
    listCommentsController,
    transitionIssueController,
    updateIssuePriorityController,
} from "../controllers/issue.controllers.js";
import {
    assignIssueSchema,
    commentSchema,
    createIssueSchema,
    issueIdParamSchema,
    issueStatsQuerySchema,
    listIssuesQuerySchema,
    markDuplicateSchema,
    similarIssuesQuerySchema,
    transitionSchema,
    updatePrioritySchema,
} from "../validators/issue.validator.js";

const router = Router();
const withId = validate({ params: issueIdParamSchema });

router.use(authenticate);

// Any member can report an issue.
router.post("/", validate({ body: createIssueSchema }), createIssueController);
router.get("/", validate({ query: listIssuesQuerySchema }), getIssuesController);
router.get("/stats", validate({ query: issueStatsQuerySchema }), getIssueStatsController);
// Open issues at a place, for the "already reported?" check on the report form.
router.get("/similar", validate({ query: similarIssuesQuerySchema }), getSimilarIssuesController);
router.get("/:id", withId, getIssueByIdController);

router.patch(
    "/:id/assign",
    authorise(...ADMIN_ROLES),
    validate({ params: issueIdParamSchema, body: assignIssueSchema }),
    assignIssueController
);

router.get("/:id/suggestions", authorise(...ADMIN_ROLES), withId, getSuggestionsController);

router.patch(
    "/:id/priority",
    authorise(...ADMIN_ROLES),
    validate({ params: issueIdParamSchema, body: updatePrioritySchema }),
    updateIssuePriorityController
);

// Who may make which status change is decided by the state machine (domain/issueStateMachine.ts).
router.post(
    "/:id/transitions",
    validate({ params: issueIdParamSchema, body: transitionSchema }),
    transitionIssueController
);

router.post("/:id/follow", withId, followIssueController);
router.delete("/:id/follow", withId, unfollowIssueController);

router.post(
    "/:id/duplicate",
    authorise(...ADMIN_ROLES),
    validate({ params: issueIdParamSchema, body: markDuplicateSchema }),
    markDuplicateController
);

router.get("/:id/comments", withId, listCommentsController);
router.post("/:id/comments", validate({ params: issueIdParamSchema, body: commentSchema }), addCommentController);

router.post("/:id/attachments", withId, uploadIssueImage.single("image"), addIssueAttachmentController);

export default router;
