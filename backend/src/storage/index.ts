import { env } from "../config/env.js";
import { LocalStorage } from "./local.js";
import type { StorageProvider } from "./types.js";

let instance: Promise<StorageProvider> | undefined;

/** The configured storage driver. The S3 SDK is only loaded when STORAGE_DRIVER=s3. */
export const getStorage = () =>
    (instance ??=
        env.STORAGE_DRIVER === "s3"
            ? import("./s3.js").then(({ S3Storage }) => new S3Storage())
            : Promise.resolve(new LocalStorage()));

export type { StorageProvider };
