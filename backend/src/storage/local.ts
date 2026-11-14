import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import type { StorageProvider } from "./types.js";

/** Keys look like "issues/12/3f2c....png": no "..", no absolute paths. */
const SAFE_KEY = /^(?!.*\.\.)[A-Za-z0-9_-][A-Za-z0-9/_.-]*$/;

export const isSafeKey = (key: string) => SAFE_KEY.test(key);

export const uploadRoot = () => path.resolve(process.cwd(), env.UPLOAD_DIR);

const sign = (key: string, expires: number) =>
    createHmac("sha256", env.FILE_URL_SECRET).update(`${key}:${expires}`).digest("base64url");

/** Checks a signed file URL produced by `LocalStorage.getUrl`. */
export const verifySignedUrl = (key: string, expires: number, signature: string) => {
    if (!isSafeKey(key) || !Number.isFinite(expires) || expires < Date.now() / 1000) {
        return false;
    }
    const expected = Buffer.from(sign(key, expires));
    const given = Buffer.from(signature);
    return expected.length === given.length && timingSafeEqual(expected, given);
};

/**
 * Development driver: files on local disk, served by GET /api/files/* with an
 * HMAC-signed, expiring URL (same access model as S3 presigned URLs).
 */
export class LocalStorage implements StorageProvider {
    private resolve(key: string) {
        if (!isSafeKey(key)) {
            throw new Error(`Unsafe storage key: ${key}`);
        }
        return path.join(uploadRoot(), key);
    }

    async put(key: string, body: Buffer) {
        const filePath = this.resolve(key);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, body);
    }

    async getUrl(key: string) {
        const expires = Math.floor(Date.now() / 1000) + env.FILE_URL_TTL_SECONDS;
        const encodedKey = key.split("/").map(encodeURIComponent).join("/");
        return `${env.PUBLIC_API_URL.replace(/\/$/, "")}/api/files/${encodedKey}?expires=${expires}&signature=${sign(key, expires)}`;
    }

    async delete(key: string) {
        await rm(this.resolve(key), { force: true });
    }

    async deletePrefix(prefix: string) {
        await rm(this.resolve(prefix.replace(/\/$/, "")), { recursive: true, force: true });
    }
}
