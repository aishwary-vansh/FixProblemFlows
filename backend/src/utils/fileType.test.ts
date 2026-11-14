import { describe, expect, it } from "vitest";
import { detectImageType } from "./fileType.js";

describe("detectImageType", () => {
    it("detects JPEG", () => {
        expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.mimeType).toBe("image/jpeg");
    });

    it("detects PNG", () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
        expect(detectImageType(png)?.mimeType).toBe("image/png");
    });

    it("detects WEBP", () => {
        const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")]);
        expect(detectImageType(webp)?.mimeType).toBe("image/webp");
    });

    it("rejects a script renamed to .png", () => {
        expect(detectImageType(Buffer.from("<script>alert(1)</script>"))).toBeNull();
    });

    it("rejects an empty file", () => {
        expect(detectImageType(Buffer.alloc(0))).toBeNull();
    });
});
