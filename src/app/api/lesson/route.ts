import { fail, requireUser } from "@/lib/server/admin";
import { groqText } from "@/lib/server/groq";
import { LESSON_SYSTEM } from "@/lib/server/prompts";
import { allTopics, loadPages, loadTopic } from "@/lib/server/source";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { uid } = await requireUser(req);
    const { courseId, topicId } = await req.json();
    const topic = await loadTopic(uid, courseId, topicId);
    const text = await loadPages(uid, courseId, topic.pageStart, topic.pageEnd, 7000);
    const related = (await allTopics(uid, courseId))
      .filter((t) => t.id !== topicId)
      .map((t) => t.title);
    const user = `Topic: ${topic.title}\nSection: ${topic.module}\nKey points already extracted: ${JSON.stringify(topic.keyPoints)}\nRelated topics in this course: ${JSON.stringify(related.slice(0, 25))}\n\nCourse material pages:\n${text || "(no text found for these pages)"}`;
    const lesson = await groqText({ system: LESSON_SYSTEM, user, maxTokens: 2600, temperature: 0.35 });
    await topic.ref.update({ lesson, lessonAt: new Date() });
    return Response.json({ lesson });
  } catch (e) {
    return fail(e);
  }
}
