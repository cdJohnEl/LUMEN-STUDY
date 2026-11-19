import { fbAuth } from "./firebase";

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const user = fbAuth().currentUser;
  if (!user) throw new Error("Please sign in again.");
  const token = await user.getIdToken();
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}
