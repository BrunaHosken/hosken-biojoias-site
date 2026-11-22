/* Firebase Messaging background worker for GitHub Pages. */
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

const configParams = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: configParams.get("apiKey") || "",
  authDomain: configParams.get("authDomain") || "",
  projectId: configParams.get("projectId") || "",
  storageBucket: configParams.get("storageBucket") || "",
  appId: configParams.get("appId") || "",
};

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || "Hosken Biojoias";
    const iconUrl = new URL("orquidea-favicon.webp", self.registration.scope).href;

    return self.registration.showNotification(title, {
      body: data.body || "Você tem uma atualização na sua conta.",
      icon: iconUrl,
      badge: iconUrl,
      tag: data.tag || "hosken-notification",
      data: { path: data.path || "" },
    });
  });
}

// Keeps this worker useful for the installable app while all store data remains
// online and current. Offline purchases and authenticated pages are not cached.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.path || "./", self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          return client.navigate(targetUrl).then((navigated) => (navigated || client).focus());
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
