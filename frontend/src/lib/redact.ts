// Paths whose last part is a secret: password reset, invite, join and QR codes, in app and API URLs.
const SECRET_PATH = /\/(reset-password|invites?|join|r|report-points\/(?:public|code))\/[^/?#\s]+/g;

/** Replaces secret codes in a URL or message with "[redacted]", e.g. before sending it to Sentry. */
export const redactSecrets = (text: string) => text.replace(SECRET_PATH, "/$1/[redacted]");
