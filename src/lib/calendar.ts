import { GoogleAuthProvider, reauthenticateWithPopup } from "firebase/auth";
import { fbAuth } from "./firebase";

const KEY = "lumen_gcal_token";
export const getCalToken = () => (typeof window === "undefined" ? null : sessionStorage.getItem(KEY));

// Google gives the access token only at sign-in time, so we ask once and keep it for this session (about an hour).
export async function connectCalendar() {
  const user = fbAuth().currentUser;
  if (!user) throw new Error("Please sign in again.");
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/calendar.events");
  const res = await reauthenticateWithPopup(user, provider);
  const token = GoogleAuthProvider.credentialFromResult(res)?.accessToken;
  if (!token) throw new Error("Google did not return calendar access.");
  sessionStorage.setItem(KEY, token);
  return token;
}

const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export async function createEvent(
  token: string,
  e: { title: string; start: Date; durationMin: number; remindMin: number }
): Promise<string> {
  const end = new Date(e.start.getTime() + e.durationMin * 60000);
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: e.title,
      description: "Study session planned in Lumen.",
      start: { dateTime: e.start.toISOString() },
      end: { dateTime: end.toISOString() },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: e.remindMin }] },
    }),
  });
  if (res.status === 401) {
    sessionStorage.removeItem(KEY);
    throw new Error("Calendar access expired. Connect again.");
  }
  if (!res.ok) throw new Error("Google Calendar refused the event. Check that the Calendar API is enabled.");
  return (await res.json()).id as string;
}

export async function deleteEvent(token: string, id: string) {
  await fetch(`${API}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}
