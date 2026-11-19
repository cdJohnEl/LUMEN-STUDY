/* Lumen service worker: push notifications + installability.
   The Firebase config arrives as URL parameters, so no secrets live in this file. */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const p = new URL(self.location).searchParams;
if (p.get("apiKey")) {
  firebase.initializeApp({
    apiKey: p.get("apiKey"),
    authDomain: p.get("authDomain"),
    projectId: p.get("projectId"),
    storageBucket: p.get("storageBucket"),
    messagingSenderId: p.get("messagingSenderId"),
    appId: p.get("appId"),
  });
  firebase.messaging(); // shows notification payloads and opens the link when tapped
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {}); // required for the install prompt
