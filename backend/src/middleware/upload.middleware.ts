import multer from "multer";
import { AppError } from "../utils/AppError.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

/**
 * Keeps the upload in memory: the service checks permissions and the real file
 * type (magic bytes) before anything is written to storage.
 */
export const uploadIssueImage = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(AppError.unsupportedMediaType("Only JPEG, PNG and WEBP images are allowed"));
        }
    },
});
