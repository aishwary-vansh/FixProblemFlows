import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import api from "../services/api";
import type { AppNotification } from "../types/issue";
import { disablePush, enablePush, getPushKey, isPushOn, isPushSupported } from "../lib/push";

const POLL_MS = 30_000;

/** Bell with unread count. Polls the inbox every 30 seconds while the app is open. */
const NotificationBell = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // Null until we know this server and browser can do push alerts; the toggle stays hidden until then.
    const [pushKey, setPushKey] = useState<string | null>(null);
    const [pushOn, setPushOn] = useState(false);
    const [pushBusy, setPushBusy] = useState(false);
    const [pushError, setPushError] = useState("");

    useEffect(() => {
        if (!isPushSupported()) return;
        getPushKey()
            .then(async (key) => {
                setPushKey(key);
                if (key) setPushOn(await isPushOn());
            })
            .catch(() => setPushKey(null));
    }, []);

    const togglePush = async () => {
        if (!pushKey) return;
        setPushBusy(true);
        setPushError("");
        try {
            if (pushOn) {
                await disablePush();
            } else {
                await enablePush(pushKey);
            }
            setPushOn(!pushOn);
        } catch (err) {
            setPushError(err instanceof Error ? err.message : "Could not change phone alerts");
        } finally {
            setPushBusy(false);
        }
    };

    const load = () =>
        api.get("/notifications")
            .then((response) => {
                setItems(response.data.data);
                setUnreadCount(response.data.meta.unreadCount);
            })
            .catch(() => {
                // A failed poll is not worth interrupting the user; the next one will retry.
            });

    useEffect(() => {
        const timer = setInterval(load, POLL_MS);
        const first = setTimeout(load, 0);
        return () => {
            clearInterval(timer);
            clearTimeout(first);
        };
    }, []);

    // Close the dropdown when clicking anywhere else.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    const openNotification = (notification: AppNotification) => {
        setOpen(false);
        if (!notification.readAt) {
            api.patch(`/notifications/${notification.id}/read`).then(load).catch(() => undefined);
        }
        navigate(`/issues/${notification.issueId}`);
    };

    const markAllRead = () => {
        api.post("/notifications/read-all").then(load).catch(() => undefined);
    };

    return (
        <div className="fx-menu" ref={menuRef}>
            <button
                type="button"
                className="fx-icon-btn fx-bell"
                aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
                aria-expanded={open}
                onClick={() => setOpen(!open)}
            >
                <Bell size={20} />
                {unreadCount > 0 && <span className="fx-bell-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>

            {open && (
                <div className="fx-dropdown fx-notifications" role="menu">
                    <div className="fx-notifications-head">
                        <strong>Notifications</strong>
                        {unreadCount > 0 && (
                            <button type="button" className="fx-link-btn" onClick={markAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    {pushKey && (
                        <div className="fx-push-toggle">
                            <span>{pushOn ? "Alerts are on for this device." : "Get alerts on this device, even when FixFlow is closed."}</span>
                            <button type="button" className="fx-link-btn" onClick={togglePush} disabled={pushBusy}>
                                {pushBusy ? "..." : pushOn ? "Turn off" : "Turn on"}
                            </button>
                        </div>
                    )}
                    {pushError && <p className="fx-upload-error fx-push-error" role="alert">{pushError}</p>}

                    {items.length === 0 && <p className="fx-notifications-empty">You're all caught up.</p>}

                    {items.map((notification) => (
                        <button
                            key={notification.id}
                            type="button"
                            role="menuitem"
                            className={"fx-notification" + (notification.readAt ? "" : " unread")}
                            onClick={() => openNotification(notification)}
                        >
                            <span>{notification.message}</span>
                            <small>{new Date(notification.createdAt).toLocaleString()}</small>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
