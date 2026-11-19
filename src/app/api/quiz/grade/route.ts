import { adminDb, fail, HttpError, requireUser } from "@/lib/server/admin";
import { groqJSON } from "@/lib/server/groq";
import { GRADE_SYSTEM } from "@/lib/server/prompts";
import { courseRef } from "@/lib/server/source";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { uid } = await requireUser(req);
    const { quizId, answers } = (await req.json()) as { quizId: string; answers: number[] };
    const db = adminDb();
    const quizRef = db.doc(`users/${uid}/quizzes/${quizId}`);
    const quiz = (await quizRef.get()).data() as any;
    if (!quiz) throw new HttpError(404, "Quiz not found.");
    if (quiz.result) return Response.json(quiz.result); // already graded: return the same result

    const priv = (await db.doc(`users/${uid}/quizPrivate/${quizId}`).get()).data() as any;
    const key = priv.answers as { correct: number; explanation: string; concept: string }[];

    const items = quiz.questions.map((q: any, i: number) => ({
      q: q.q,
      options: q.options,
      level: q.level,
      chosen: Number.isInteger(answers[i]) ? answers[i] : -1,
      correct: key[i].correct,
      explanation: key[i].explanation,
    }));
    const score = items.filter((x: any) => x.chosen === x.correct).length;
    const total = items.length;
    const pct = Math.round((score / total) * 100);

    const wrong = items
      .map((x: any, i: number) => ({ ...x, concept: key[i].concept }))
      .filter((x: any) => x.chosen !== x.correct);

    let gaps: string[] = [];
    let reteach = "Perfect score. Move on to the next topic, then come back for the mock exam.";
    if (wrong.length) {
      const user = wrong
        .slice(0, 8)
        .map(
          (w: any) =>
            `Question: ${w.q}\nStudent chose: ${w.chosen >= 0 ? w.options[w.chosen] : "(no answer)"}\nCorrect: ${w.options[w.correct]}\nConcept: ${w.concept}\nWhy: ${w.explanation}`
        )
        .join("\n\n");
      const out = await groqJSON<{ gaps: string[]; reteach: string }>({
        system: GRADE_SYSTEM,
        user,
        maxTokens: 1600,
        temperature: 0.3,
      });
      gaps = out.gaps || [];
      reteach = out.reteach || "";
    }

    const course = (await courseRef(uid, quiz.courseId).get()).data() as any;
    const attemptRef = db.collection(`users/${uid}/attempts`).doc();
    await attemptRef.set({
      courseId: quiz.courseId,
      topicId: quiz.topicId || null,
      topicTitle: quiz.title,
      courseTitle: course?.title || "",
      kind: quiz.kind,
      score,
      total,
      pct,
      gaps,
      at: new Date(),
    });

    if (quiz.kind === "topic" && quiz.topicId) {
      const tRef = courseRef(uid, quiz.courseId).collection("topics").doc(quiz.topicId);
      const t = (await tRef.get()).data() as any;
      await tRef.update({ bestScore: Math.max(t?.bestScore ?? 0, pct), attempts: (t?.attempts ?? 0) + 1 });
    }

    const result = { attemptId: attemptRef.id, score, total, pct, items, gaps, reteach };
    await quizRef.update({ graded: true, result });
    return Response.json(result);
  } catch (e) {
    return fail(e);
  }
}
