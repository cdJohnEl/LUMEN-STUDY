import { fail, requireUser } from "@/lib/server/admin";
import { groqText } from "@/lib/server/groq";
import { REVISION_SYSTEM } from "@/lib/server/prompts";
import { allTopics, courseRef } from "@/lib/server/source";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { uid } = await requireUser(req);
    const { courseId } = await req.json();
    const course = (await courseRef(uid, courseId).get()).data() as any;
    const topics = await allTopics(uid, courseId);
    const digest = topics
      .map((t) => `## ${t.title} (${t.module})\n${(t.keyPoints || []).slice(0, 6).map((k: string) => `- ${k}`).join("\n")}`)
      .join("\n\n")
      .slice(0, 9500);
    const gaps = JSON.stringify(course?.gaps || []);
    const guide = await groqText({
      system: REVISION_SYSTEM,
      user: `Course: ${course?.title}\nGaps found in the material: ${gaps}\n\nDigest:\n${digest}`,
      maxTokens: 3000,
      temperature: 0.3,
    });
    await courseRef(uid, courseId).update({ revisionGuide: guide });
    return Response.json({ guide });
  } catch (e) {
    return fail(e);
  }
}
