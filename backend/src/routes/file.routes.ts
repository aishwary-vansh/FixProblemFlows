import { Router } from "express";
import { AppError } from "../utils/AppError.js";
import { uploadRoot, verifySignedUrl } from "../storage/local.js";

/** Serves local-driver uploads. Access is granted by the signed, expiring URL, not by a login. */
const router = Router();

router.get("/*key", (req, res) => {
    const segments = req.params.key as unknown as string[];
    const key = segments.join("/");
    const expires = Number(req.query.expires);
    const signature = typeof req.query.signature === "string" ? req.query.signature : "";

    if (!verifySignedUrl(key, expires, signature)) {
        throw AppError.forbidden("This file link is invalid or has expired");
    }

    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(key, { root: uploadRoot(), dotfiles: "deny" }, (err) => {
        if (err && !res.headersSent) {
            res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File not found" } });
        }
    });
});

export default router;
