import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import type { StorageProvider } from "./types.js";

/** Production driver for AWS S3 or any S3-compatible store (Cloudflare R2, MinIO). */
export class S3Storage implements StorageProvider {
    private readonly client: S3Client;
    private readonly bucket: string;

    constructor() {
        if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
            throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY");
        }

        this.bucket = env.S3_BUCKET;
        this.client = new S3Client({
            region: env.S3_REGION,
            ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
            forcePathStyle: env.S3_FORCE_PATH_STYLE,
            credentials: {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            },
        });
    }

    async put(key: string, body: Buffer, contentType: string) {
        await this.client.send(
            new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType })
        );
    }

    async getUrl(key: string) {
        return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
            expiresIn: env.FILE_URL_TTL_SECONDS,
        });
    }

    async delete(key: string) {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }

    async deletePrefix(prefix: string) {
        // Listing returns up to 1000 keys a page, which is also the most one DeleteObjects call takes.
        let token: string | undefined;
        do {
            const page = await this.client.send(
                new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token })
            );
            const keys = (page.Contents ?? []).flatMap((object) => (object.Key ? [{ Key: object.Key }] : []));
            if (keys.length > 0) {
                await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys } }));
            }
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (token);
    }
}
