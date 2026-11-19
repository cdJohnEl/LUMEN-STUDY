import { adminDb, adminMessaging, fail, HttpError, requireUser } from "@/lib/server/admin";

export async function POST(req: Request) {
  try {
    const { uid } = await requireUser(req);
    const snap = await adminDb().collection(`users/${uid}/tokens`).get();
    const tokens = snap.docs.map((d) => d.id);
    if (!tokens.length) throw new HttpError(400, "No device registered yet. Turn on notifications first.");
    const res = await adminMessaging().sendEachForMulticast({
      tokens,
      notification: { title: "Lumen is connected", body: "Study reminders will appear here." },
      webpush: { fcmOptions: { link: "/" } },
    });
    return Response.json({ sent: res.successCount });
  } catch (e) {
    return fail(e);
  }
}
