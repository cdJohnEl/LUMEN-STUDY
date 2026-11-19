import { adminDb, HttpError } from "./admin";

export const CHUNK_PAGES = 10; // must match the uploader in the browser

export const courseRef = (uid: string, courseId: string) =>
  adminDb().doc(`users/${uid}/courses/${courseId}`);

export async function loadTopic(uid: string, courseId: string, topicId: string) {
  const snap = await courseRef(uid, courseId).collection("topics").doc(topicId).get();
  if (!snap.exists) throw new HttpError(404, "Topic not found.");
  return { ref: snap.ref, ...(snap.data() as any) } as any;
}

// Returns the text of pages start..end (1-based), capped to keep AI calls small.
export async function loadPages(uid: string, courseId: string, start: number, end: number, maxChars = 7000) {
  const first = Math.floor((Math.max(start, 1) - 1) / CHUNK_PAGES);
  const last = Math.floor((Math.max(end, start) - 1) / CHUNK_PAGES);
  const col = courseRef(uid, courseId).collection("chunks");
  const out: string[] = [];
  for (let i = first; i <= last; i++) {
    const snap = await col.doc(String(i)).get();
    if (!snap.exists) continue;
    const d = snap.data() as { start: number; pages: string[] };
    d.pages.forEach((text, idx) => {
      const n = d.start + idx;
      if (n >= start && n <= end && text.trim()) out.push(`[Page ${n}]\n${text}`);
    });
  }
  const joined = out.join("\n\n");
  return joined.length > maxChars ? joined.slice(0, maxChars) + "\n[...truncated]" : joined;
}

export async function allTopics(uid: string, courseId: string) {
  const snap = await courseRef(uid, courseId).collection("topics").orderBy("order").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
}
