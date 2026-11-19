import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Lazy getters: nothing touches Firebase until it is called in the browser.
export const fbApp = () => (getApps().length ? getApp() : initializeApp(firebaseConfig));
export const fbAuth = () => getAuth(fbApp());

// Firestore over long polling instead of the default WebChannel stream.
// The "INTERNAL ASSERTION FAILED: Unexpected state" crash comes from the live-update stream,
// which breaks easily behind some networks, antivirus/proxy software and VPNs. Long polling is
// slightly slower but far more stable. No offline cache is used (it triggered the same crash).
const g = globalThis as unknown as { __lumenDb?: Firestore };
export const fbDb = () => {
  if (g.__lumenDb) return g.__lumenDb;
  try {
    g.__lumenDb = initializeFirestore(fbApp(), { experimentalForceLongPolling: true });
  } catch {
    g.__lumenDb = getFirestore(fbApp()); // already initialised (hot reload)
  }
  return g.__lumenDb;
};
