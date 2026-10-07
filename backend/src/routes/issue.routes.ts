import {Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorise } from "../middleware/role.middleware.js";
import { acceptIssueController, assignIssuesController, closeIssueController, createIssueController,getIssuesController, reopenIssueController, resolveIssueController, startIssueController,getIssuesByIdController,addIssueAttachmentController } from "../controllers/issue.controllers.js";
import { Role } from "../generated/prisma/enums.js";
import { uploadIssueImage } from "../middleware/upload.middleware.js";

const router=Router();
router.post("/",authenticate,authorise(Role.USER),
      createIssueController 
);

router.get("/",authenticate,getIssuesController);
router.patch("/:id/assign",authenticate,authorise(Role.ADMIN),assignIssuesController);
router.patch("/:id/accept",authenticate,authorise(Role.TECHNICIAN),
acceptIssueController
);

router.patch("/:id/start",authenticate,authorise(Role.TECHNICIAN),
startIssueController);

router.patch("/:id/resolve",authenticate,authorise(Role.TECHNICIAN),resolveIssueController);

router.patch("/:id/close",authenticate,authorise(Role.USER),closeIssueController)

router.patch("/:id/reopen",authenticate,authorise(Role.USER),reopenIssueController)
router.get("/:id",authenticate,getIssuesByIdController)
router.post(
    "/:id/attachments",
    authenticate,
    uploadIssueImage.single("image"),
    addIssueAttachmentController
);
export default router;
