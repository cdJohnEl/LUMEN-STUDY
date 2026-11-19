"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { useCol } from "@/lib/useData";
import { apiPost } from "@/lib/api";
import type { Topic } from "@/lib/types";
import { Back, Markdown, PageTitle, Spinner } from "@/components/ui";
import Quiz from "@/components/Quiz";

export default function TopicPage() {
  const { id, topicId } = useParams<{ id: string; topicId: string }>();
  const { user } = useAuth();
  const topics = useCol<Topic>(`users/${user!.uid}/courses/${id}/topics`, orderBy("order"));
  const [tab, setTab] = useState<"lesson" | "quiz">("lesson");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (topics.loading) return <Spinner />;
  const idx = topics.data.findIndex((t) => t.id === topicId);
  const t = topics.data[idx];
  if (!t) return <p>Topic not found.</p>;
  const next = topics.data[idx + 1];
  const prev = topics.data[idx - 1];

  async function teach() {
    setBusy(true);
    setErr("");
    try {
      await apiPost("/api/lesson", { courseId: id, topicId });
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Back href={`/courses/${id}`} label="Course" />
      <PageTitle title={t.title} sub={`${t.module}, pages ${t.pageStart} to ${t.pageEnd} of your material`} />

      <div className="mb-5 flex gap-2">
        {(["lesson", "quiz"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "bg-white text-muted"}`}>
            {k === "lesson" ? "Lesson" : "Quiz"}
          </button>
        ))}
        {t.bestScore !== undefined && <span className="ml-auto self-center text-sm font-semibold text-muted">Best score {t.bestScore}%</span>}
      </div>

      {tab === "lesson" ? (
        <div className="card p-6 lg:p-8">
          {t.lesson ? (
            <>
              <Markdown>{t.lesson}</Markdown>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => setTab("quiz")} className="btn-amber">Test myself</button>
                <button onClick={teach} disabled={busy} className="btn-ghost">{busy ? <Spinner /> : "Re-teach it differently"}</button>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-lg font-bold">Ready when you are</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Lumen will teach this topic from your own pages: foundations, examples, exam points and traps.</p>
              <button onClick={teach} disabled={busy} className="btn-amber mt-5">{busy ? <><Spinner /> Preparing your lesson...</> : "Teach me this topic"}</button>
            </div>
          )}
          {err && <p role="alert" className="mt-4 text-sm text-red-600">{err}</p>}
        </div>
      ) : (
        <Quiz courseId={id} topicId={topicId} kind="topic" label={t.title} />
      )}

      <div className="mt-8 flex justify-between text-sm font-semibold">
        {prev ? <Link href={`/courses/${id}/topics/${prev.id}`} className="text-muted hover:text-ink">Previous: {prev.title}</Link> : <span />}
        {next && <Link href={`/courses/${id}/topics/${next.id}`} className="text-violet-600">Next: {next.title}</Link>}
      </div>
    </div>
  );
}
