/** Where attachment bytes live. Swap drivers with STORAGE_DRIVER without touching services. */
export interface StorageProvider {
    put(key: string, body: Buffer, contentType: string): Promise<void>;
    /** A short-lived URL the browser can load directly. */
    getUrl(key: string): Promise<string>;
    delete(key: string): Promise<void>;
    /** Deletes every file whose key starts with `prefix` (e.g. an organization's whole photo folder). */
    deletePrefix(prefix: string): Promise<void>;
}
