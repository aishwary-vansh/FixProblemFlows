import { getErrorMessage } from "../services/api";

/** Saves a downloaded file. The object URL is freed a moment later, so the browser has started the download. */
export const saveBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/**
 * Error message for a request made with `responseType: "blob"`: the API's JSON error arrives as a Blob,
 * so it is read as text first.
 */
export const blobErrorMessage = async (err: unknown, fallback: string) => {
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    if (data instanceof Blob) {
        try {
            const body = JSON.parse(await data.text());
            if (typeof body?.error?.message === "string") return body.error.message as string;
        } catch {
            // Not JSON; use the fallback.
        }
    }
    return getErrorMessage(err, fallback);
};
