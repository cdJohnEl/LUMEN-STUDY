import { adminDb, fail, HttpError, requireUser } from "@/lib/server/admin";
import { groqJSON } from "@/lib/server/groq";
import { QUIZ_SYSTEM } from "@/lib/server/prompts";
import { allTopics, courseRef, loadPages, loadTopic } from "@/lib/server/source";

export const maxDuration = 60;

type Raw = { q: string; options: string[]; correct: number; explanation: string; concept: string; level: string };

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export async function POST(req: Request) {
  try {
    const { uid } = await requireUser(req);
    const { courseId, topicId, kind } = (await req.json()) as {
      courseId: string;
      topicId?: string;
      kind: "topic" | "mock";
    };
    const course = (await courseRef(uid, courseId).get()).data() as any;
    if (!course) throw new HttpError(404, "Course not found.");

    let material = "";
    let title = course.title as string;
    const count = kind === "mock" ? 20 : 10;

    if (kind === "topic") {
      if (!topicId) throw new HttpError(400, "topicId required.");
      const topic = await loadTopic(uid, courseId, topicId);
      title = topic.title;
      material =
        `Key points: ${JSON.stringify(topic.keyPoints)}\n\n` +
        (await loadPages(uid, courseId, topic.pageStart, topic.pageEnd, 6000));
    } else {
      const topics = await allTopics(uid, courseId);
      material = topics
        .map((t) => `## ${t.title}\n${(t.keyPoints || []).slice(0, 6).join("\n")}`)
        .join("\n\n")
        .slice(0, 9000);
    }

    const user = `Write exactly ${count} questions${kind === "mock" ? " covering the whole course evenly, like a realistic mock examination" : ` on the topic "${title}"`}.\n\nMaterial:\n${material}`;
    const out = await groqJSON<{ questions: Raw[] }>({
      system: QUIZ_SYSTEM,
      user,
      maxTokens: kind === "mock" ? 4200 : 3200,
      temperature: 0.5,
    });

    const valid = (out.questions || []).filter(
      (x) =>
        x?.q &&
        Array.isArray(x.options) &&
        x.options.length === 4 &&
        Number.isInteger(x.correct) &&
        x.correct >= 0 &&
        x.correct < 4
    );
    if (valid.length < 5) throw new HttpError(502, "The AI could not write a good quiz. Try again.");

    // Shuffle the options so the correct answer is not predictable.
    const prepared = valid.map((x) => {
      const order = shuffle([0, 1, 2, 3]);
      return {
        q: x.q,
        options: order.map((i) => x.options[i]),
        correct: order.indexOf(x.correct),
        explanation: x.explanation || "",
        concept: x.concept || "",
        level: ["recall", "application", "analysis", "challenge"].includes(x.level) ? x.level : "recall",
      };
    });

    const db = adminDb();
    const ref = db.collection(`users/${uid}/quizzes`).doc();
    const publicQs = prepared.map((p) => ({ q: p.q, options: p.options, level: p.level }));
    await ref.set({ courseId, topicId: topicId || null, kind, title, courseTitle: course.title, questions: publicQs, createdAt: new Date(), graded: false });
    await db.doc(`users/${uid}/quizPrivate/${ref.id}`).set({
      answers: prepared.map((p) => ({ correct: p.correct, explanation: p.explanation, concept: p.concept })),
    });
    return Response.json({ quizId: ref.id, questions: publicQs, title });
  } catch (e) {
    return fail(e);
  }
}
