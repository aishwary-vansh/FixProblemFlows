import api from "../services/api";

/** Push needs a service worker and the Push API (on iPhone, only once the app is added to the home screen). */
export const isPushSupported = () =>
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const registerServiceWorker = () => {
    if (!isPushSupported()) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
        // Without it the app still works; only phone alerts are unavailable.
    });
};

const getSubscription = async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
};

// The browser wants the server's public key as bytes, not base64url text.
const keyToBytes = (base64url: string) => {
    const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

/** Null when this server has no push keys, so the toggle should stay hidden. */
export const getPushKey = async (): Promise<string | null> => {
    const response = await api.get("/push/key");
    return response.data.data.publicKey;
};

export const isPushOn = async () => isPushSupported() && Notification.permission === "granted" && Boolean(await getSubscription());

export const enablePush = async (publicKey: string) => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        throw new Error("Alerts are blocked. Allow notifications for this site in your browser settings.");
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));

    await api.post("/push/subscriptions", subscription.toJSON());
};

/** Also called on logout, so the next person on a shared phone doesn't get this user's alerts. */
export const disablePush = async () => {
    if (!isPushSupported()) return;
    const subscription = await getSubscription();
    if (!subscription) return;
    await api.delete("/push/subscriptions", { data: { endpoint: subscription.endpoint } }).catch(() => undefined);
    await subscription.unsubscribe();
};
