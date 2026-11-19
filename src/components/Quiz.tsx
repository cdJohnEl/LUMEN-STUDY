"use client";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiPost } from "@/lib/api";
import type { GradeResult, PublicQuestion } from "@/lib/types";
import { Markdown, Spinner } from "./ui";

type Props = { courseId: string; topicId?: string; kind: "topic" | "mock"; label: string };
const LETTERS = ["A", "B", "C", "D"];

export default function Quiz({ courseId, topicId, kind, label }: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "answering" | "grading" | "done">("idle");
  const [quizId, setQuizId] = useState("");
  const [qs, setQs] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [err, setErr] = useState("");

  async function start() {
    setPhase("loading");
    setErr("");
    try {
      const r = await apiPost<{ quizId: string; questions: PublicQuestion[] }>("/api/quiz/generate", { courseId, topicId, kind });
      setQuizId(r.quizId);
      setQs(r.questions);
      setAnswers(Array(r.questions.length).fill(-1));
      setResult(null);
      setPhase("answering");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setErr(e.message);
      setPhase("idle");
    }
  }

  async function submit() {
    setPhase("grading");
    try {
      setResult(await apiPost<GradeResult>("/api/quiz/grade", { quizId, answers }));
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setErr(e.message);
      setPhase("answering");
    }
  }

  if (phase === "idle" || phase === "loading")
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-bold">{kind === "mock" ? "Mock examination" : `Quiz: ${label}`}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          {kind === "mock" ? "20 questions across the whole course." : "10 questions mixing recall, application and challenge."} Answers stay hidden until you submit.
        </p>
        <button onClick={start} disabled={phase === "loading"} className="btn-amber mt-5">
          {phase === "loading" ? <><Spinner /> Writing questions...</> : "Start the quiz"}
        </button>
        {err && <p role="alert" className="mt-3 text-sm text-red-600">{err}</p>}
      </div>
    );

  if (phase === "answering" || phase === "grading") {
    const answered = answers.filter((a) => a >= 0).length;
    return (
      <div className="space-y-5">
        <p className="text-sm font-semibold text-muted">{answered} of {qs.length} answered</p>
        {qs.map((q, i) => (
          <fieldset key={i} className="card p-5">
            <legend className="sr-only">Question {i + 1}</legend>
            <p className="font-bold"><span className="text-muted">{i + 1}.</span> {q.q}</p>
            <p className="mb-3 mt-1 text-xs text-muted">{q.level}</p>
            <div className="space-y-2">
              {q.options.map((o, j) => (
                <label key={j} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${answers[i] === j ? "border-violet-500 bg-violet-50" : "border-line hover:bg-canvas"}`}>
                  <input type="radio" name={`q${i}`} className="sr-only" checked={answers[i] === j} onChange={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))} />
                  <span className="font-bold">{LETTERS[j]}</span>
                  <span>{o}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <button onClick={submit} disabled={answered < qs.length || phase === "grading"} className="btn-ink w-full lg:w-auto">
          {phase === "grading" ? <><Spinner /> Marking...</> : answered < qs.length ? `Answer all ${qs.length} to submit` : "Submit answers"}
        </button>
      </div>
    );
  }

  const r = result!;
  const tone = r.pct >= 70 ? "g-mint" : r.pct >= 50 ? "g-peach" : "g-lilac";
  return (
    <div className="space-y-6">
      <div className={`${tone} rounded-4xl p-6 text-center shadow-soft`}>
        <p className="text-5xl font-extrabold">{r.score}/{r.total}</p>
        <p className="mt-1 font-semibold">{r.pct}%. {r.pct >= 70 ? "Solid grasp. Move on." : r.pct >= 50 ? "Getting there. Review the gaps below." : "Re-read the lesson, then retry."}</p>
      </div>

      {r.gaps.length > 0 && (
        <div className="card p-5">
          <p className="font-extrabold">Knowledge gaps</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{r.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </div>
      )}
      {r.reteach && <div className="card p-6"><p className="mb-2 font-extrabold">Let's re-teach it</p><Markdown>{r.reteach}</Markdown></div>}

      <div className="space-y-4">
        <p className="font-extrabold">Every question explained</p>
        {r.items.map((it, i) => {
          const ok = it.chosen === it.correct;
          return (
            <div key={i} className="card p-5">
              <p className="flex items-start gap-2 font-bold">
                {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
                <span>{i + 1}. {it.q}</span>
              </p>
              <p className="mt-2 text-sm">Your answer: <b>{it.chosen >= 0 ? `${LETTERS[it.chosen]}. ${it.options[it.chosen]}` : "none"}</b></p>
              {!ok && <p className="text-sm">Correct answer: <b>{LETTERS[it.correct]}. {it.options[it.correct]}</b></p>}
              <p className="mt-2 text-sm text-muted">{it.explanation}</p>
            </div>
          );
        })}
      </div>
      <button onClick={start} className="btn-amber">Try a fresh set of questions</button>
    </div>
  );
}
