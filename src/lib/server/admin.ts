import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function app() {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}
export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());
export const adminMessaging = () => getMessaging(app());

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Verifies the Firebase ID token sent by the browser.
export async function requireUser(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Not signed in.");
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    throw new HttpError(401, "Your session expired. Sign in again.");
  }
  const allowed = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length && !allowed.includes((decoded.email || "").toLowerCase())) {
    throw new HttpError(403, "This account is not allowed to use the AI features.");
  }
  return { uid: decoded.uid, email: decoded.email || "" };
}

export function fail(e: unknown) {
  const status = e instanceof HttpError ? e.status : 500;
  const message = e instanceof Error ? e.message : "Something went wrong.";
  return Response.json({ error: message }, { status });
}
