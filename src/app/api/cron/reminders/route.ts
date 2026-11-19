import { adminDb, adminMessaging, fail, HttpError } from "@/lib/server/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Called every few minutes by an external pinger (cron-job.org / GitHub Actions).
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret") || (req.headers.get("authorization") || "").replace("Bearer ", "");
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) throw new HttpError(401, "Bad secret.");

    const db = adminDb();
    const due = await db.collection("reminders").where("remindAt", "<=", new Date()).limit(50).get();
    let sent = 0;

    for (const d of due.docs) {
      const r = d.data() as { uid: string; title: string; body: string };
      const tokensSnap = await db.collection(`users/${r.uid}/tokens`).get();
      const tokens = tokensSnap.docs.map((t) => t.id);
      if (tokens.length) {
        const res = await adminMessaging().sendEachForMulticast({
          tokens,
          notification: { title: r.title, body: r.body },
          webpush: { fcmOptions: { link: "/plan" } },
        });
        // Remove tokens that no longer work.
        await Promise.all(
          res.responses.map((x, i) =>
            !x.success && /registration-token-not-registered|invalid-argument/.test(x.error?.code || "")
              ? tokensSnap.docs[i].ref.delete()
              : null
          )
        );
        sent += res.successCount;
      }
      await d.ref.delete(); // one reminder, sent once
    }
    return Response.json({ checked: due.size, sent });
  } catch (e) {
    return fail(e);
  }
}
