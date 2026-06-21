// ============================================================
// public/firebase-messaging-sw.js
// ============================================================

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAOC2ynmfE...",
  authDomain: "websitenews-1823f.firebaseapp.com",
  projectId: "websitenews-1823f",
  storageBucket: "websitenews-1823f.firebasestorage.app",
  messagingSenderId: "683339274177",
  appId: "1:683339274177:web:50c910dae702c4ec000140",
  measurementId: "G-EFR2ZBZNPT"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();
console.log("SW RUNNING");
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] payload:", payload);

  const { title, body } = payload.notification ?? {};
  const { image, slug, newsId } = payload.data ?? {};

  const notificationTitle = title || "خبر جديد";
const notificationOptions = {
  body: body || "",
  icon: "https://shopping1-f3eb3.web.app/logo.png",
  badge: "https://shopping1-f3eb3.web.app/logo.png",
  image: image || undefined,

  data: {
    productId,
    slug,

    url: productId
      ? `/product/${productId}`
      : "/products",
  },
};

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url === fullUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));