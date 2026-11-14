export interface DetectedImage {
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    extension: "jpg" | "png" | "webp";
}

/**
 * Detects the real image type from the file's first bytes. The client-sent
 * Content-Type and file name are not trusted.
 */
export const detectImageType = (buffer: Buffer): DetectedImage | null => {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { mimeType: "image/jpeg", extension: "jpg" };
    }

    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buffer.length >= 8 && pngSignature.every((byte, i) => buffer[i] === byte)) {
        return { mimeType: "image/png", extension: "png" };
    }

    if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return { mimeType: "image/webp", extension: "webp" };
    }

    return null;
};
