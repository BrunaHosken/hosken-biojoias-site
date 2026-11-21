import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { app, functions, localMode } from "../../firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim() || "";
const optInKey = (uid: string) => `hosken-push-enabled:${uid}`;

export function isPushConfigured() {
  return !localMode && Boolean(VAPID_KEY);
}

export function isPushEnabled(uid: string) {
  try {
    return localStorage.getItem(optInKey(uid)) === "true";
  } catch {
    return false;
  }
}

async function messagingIsSupported() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function isPushSupported() {
  return messagingIsSupported();
}

function serviceWorkerUrl() {
  const url = new URL(
    `${import.meta.env.BASE_URL}firebase-messaging-sw.js`,
    window.location.origin,
  );
  const options = app.options;
  for (const key of [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "appId",
  ] as const) {
    const value = options[key];
    if (typeof value === "string" && value) url.searchParams.set(key, value);
  }
  return url;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) throw new Error("push-not-supported");
  return navigator.serviceWorker.register(serviceWorkerUrl().href, {
    scope: import.meta.env.BASE_URL,
    updateViaCache: "none",
  });
}

async function getCurrentToken() {
  const supported = await messagingIsSupported();
  if (!supported) throw new Error("push-not-supported");
  const registration = await registerServiceWorker();
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error("push-token-unavailable");
  return { token, registration };
}

export async function enablePushForUser(uid: string) {
  if (!isPushConfigured()) throw new Error("push-not-configured");
  if (!(await messagingIsSupported())) throw new Error("push-not-supported");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("push-permission-denied");

  const { token } = await getCurrentToken();
  const registerToken = httpsCallable(functions, "registerPushToken");
  await registerToken({ token });
  localStorage.setItem(optInKey(uid), "true");
}

async function removeCurrentToken(uid: string) {
  try {
    if (!isPushConfigured() || !(await messagingIsSupported())) return;
    const { token } = await getCurrentToken();
    const unregisterToken = httpsCallable(functions, "unregisterPushToken");
    await unregisterToken({ token });
    await deleteToken(getMessaging(app));
  } catch (error) {
    if (import.meta.env.DEV) console.warn("Could not unregister push token", error);
  } finally {
    localStorage.removeItem(optInKey(uid));
  }
}

export async function disablePushForUser(uid: string) {
  await removeCurrentToken(uid);
}

export async function clearPushOnSignOut(uid: string) {
  await removeCurrentToken(uid);
}

export async function syncPushForUser(uid: string) {
  if (
    !isPushEnabled(uid) ||
    !isPushConfigured() ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;
  try {
    const { token } = await getCurrentToken();
    const registerToken = httpsCallable(functions, "registerPushToken");
    await registerToken({ token });
  } catch (error) {
    if (import.meta.env.DEV) console.warn("Could not refresh push subscription", error);
  }
}

export function listenForPushMessages() {
  if (!isPushConfigured()) return () => {};

  let active = true;
  let unsubscribe = () => {};
  void messagingIsSupported().then((supported) => {
    if (!supported || !active) return;
    unsubscribe = onMessage(getMessaging(app), async (payload) => {
      const data = payload.data || {};
      const title = data.title || "Hosken Biojoias";
      if (!("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      if (!registration || Notification.permission !== "granted") return;
      const icon = new URL(
        `${import.meta.env.BASE_URL}orquidea-favicon.webp`,
        window.location.origin,
      ).href;
      await registration.showNotification(title, {
        body: data.body || "Você tem uma atualização na sua conta.",
        icon,
        badge: icon,
        tag: data.tag || "hosken-notification",
        data: { path: data.path || "" },
      });
    });
  });
  return () => {
    active = false;
    unsubscribe();
  };
}

export function pushUnavailableReason() {
  if (localMode) return "As notificações no aparelho ficam disponíveis no site publicado em HTTPS.";
  if (!VAPID_KEY) return "A configuração de notificações deste site ainda está pendente.";
  return "Este navegador não oferece suporte a notificações push.";
}

export function isIosHomeScreenRequired() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}
