// A scanned QR code waits here while the person logs in or joins, then the report form uses it once.
// It expires, so a scan that was abandoned doesn't prefill a report made later about something else.
const KEY = "fixflow-report-point";
const MAX_AGE_MS = 15 * 60 * 1000;

export const rememberReportPoint = (code: string) => {
    try {
        sessionStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
    } catch {
        // Private mode can block storage; the form then just isn't prefilled.
    }
};

export const takeReportPoint = (): string | null => {
    try {
        const saved = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        if (!saved) return null;
        const { code, at } = JSON.parse(saved) as { code: string; at: number };
        return Date.now() - at < MAX_AGE_MS ? code : null;
    } catch {
        return null;
    }
};

/** Only same-site paths, so a crafted `?next=` link can't send people to another website after login. */
export const safeNextPath = (next: string | null) =>
    next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
