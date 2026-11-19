import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { fbApp, fbDb, firebaseConfig } from "./firebase";

const swUrl = () => "/firebase-messaging-sw.js?" + new URLSearchParams(firebaseConfig as Record<string, string>).toString();

export async function registerSw() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !firebaseConfig.apiKey) return null;
  try {
    return await navigator.serviceWorker.register(swUrl());
  } catch {
    return null;
  }
}

export async function listenForeground() {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const { getMessaging, isSupported, onMessage } = await import("firebase/messaging");
    if (!(await isSupported())) return;
    onMessage(getMessaging(fbApp()), async (p) => {
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.showNotification(p.notification?.title || "Lumen", { body: p.notification?.body, icon: "/icons/icon-192.png" });
    });
  } catch {
    /* ignore */
  }
}

export async function enablePush(uid: string) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) throw new Error("This browser does not support notifications.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked. Allow them in your browser's site settings.");
  const reg = await registerSw();
  if (!reg) throw new Error("Could not start the notification service.");
  await navigator.serviceWorker.ready;
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) throw new Error("Push messages are not supported on this browser.");
  const token = await getToken(getMessaging(fbApp()), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: reg,
  });
  if (!token) throw new Error("No notification token was issued.");
  await setDoc(doc(fbDb(), `users/${uid}/tokens/${token}`), { createdAt: serverTimestamp(), ua: navigator.userAgent.slice(0, 120) });
  listenForeground();
}
