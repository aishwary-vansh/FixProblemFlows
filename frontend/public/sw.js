// Service worker: shows FixFlow push alerts and opens the issue when one is tapped.

self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : "" };
    }

    event.waitUntil(
        self.registration.showNotification(data.title || "FixFlow", {
            body: data.body || "You have a new update",
            icon: "/logo.svg",
            badge: "/logo.svg",
            data: { url: data.url || "/dashboard" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = new URL(event.notification.data.url, self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
            // Reuse an open FixFlow tab instead of opening another one.
            const open = windows.find((client) => client.url.startsWith(self.location.origin));
            if (open) {
                return open.navigate(url).then((client) => (client || open).focus());
            }
            return self.clients.openWindow(url);
        })
    );
});
