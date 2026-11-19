"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { orderBy } from "firebase/firestore";
import { AlertTriangle, CheckCircle2, ChevronRight, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCol, useDocData } from "@/lib/useData";
import { apiPost } from "@/lib/api";
import { deleteCourse } from "@/lib/courseOps";
import type { Course, Topic } from "@/lib/types";
import { Back, Bar, Markdown, PageTitle, Spinner } from "@/components/ui";

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const uid = user!.uid;
  const router = useRouter();
  const course = useDocData<Course>(`users/${uid}/courses/${id}`);
  const topics = useCol<Topic>(`users/${uid}/courses/${id}/topics`, orderBy("order"));
  const [tab, setTab] = useState<"topics" | "guide">("topics");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (course.loading) return <Spinner />;
  if (!course.data) return <p>Course not found.</p>;
  const c = course.data;
  const mastered = topics.data.filter((t) => (t.bestScore ?? 0) >= 70).length;
  const pct = topics.data.length ? Math.round((mastered / topics.data.length) * 100) : 0;

  async function makeGuide() {
    setBusy(true);
    setErr("");
    try {
      await apiPost("/api/revision", { courseId: id });
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const modules = topics.data.reduce<Record<string, Topic[]>>((acc, t) => {
    (acc[t.module] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div>
      <Back href="/library" label="Library" />
      <PageTitle
        title={c.title}
        sub={`${topics.data.length} topics, ${mastered} mastered (70% or more on the quiz)`}
        right={
          <button aria-label="Delete course" onClick={async () => { if (confirm("Delete this course?")) { await deleteCourse(uid, id); router.replace("/library"); } }} className="rounded-xl p-2 text-muted hover:bg-white hover:text-red-600">
            <Trash2 className="h-5 w-5" />
          </button>
        }
      />
      <div className="mb-6 max-w-md"><Bar pct={pct} tone="bg-emerald-500" /></div>

      {c.gaps && c.gaps.length > 0 && (
        <div className="mb-6 rounded-3xl bg-amber-50 p-5 text-sm">
          <p className="flex items-center gap-2 font-bold text-amber-800"><AlertTriangle className="h-4 w-4" /> Missing from your material</p>
          <ul className="mt-2 space-y-1 text-amber-900">
            {c.gaps.map((g, i) => (<li key={i}><b>{g.item}.</b> {g.note}</li>))}
          </ul>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {(["topics", "guide"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${tab === t ? "bg-ink text-white" : "bg-white text-muted"}`}>
            {t === "topics" ? "Topics" : "Revision guide"}
          </button>
        ))}
        <Link href={`/courses/${id}/mock`} className="btn-amber ml-auto !py-2">Mock exam</Link>
      </div>

      {tab === "topics" ? (
        <div className="space-y-8">
          {Object.entries(modules).map(([mod, list]) => (
            <section key={mod}>
              <h2 className="mb-3 font-extrabold">{mod}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((t) => (
                  <Link key={t.id} href={`/courses/${id}/topics/${t.id}`} className="card flex items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5">
                    <span className="min-w-0">
                      <span className="block font-bold">{t.title}</span>
                      <span className="text-xs text-muted">
                        {t.lesson ? "Lesson ready" : "Not taught yet"}
                        {t.bestScore !== undefined && `, best ${t.bestScore}%`}
                      </span>
                    </span>
                    {(t.bestScore ?? 0) >= 70 ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <ChevronRight className="h-5 w-5 shrink-0 text-muted" />}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="card p-6">
          {c.revisionGuide ? <Markdown>{c.revisionGuide}</Markdown> : <p className="text-sm text-muted">Finish most topics first, then build your guide. It uses the key points from every topic.</p>}
          <button onClick={makeGuide} disabled={busy} className="btn-ink mt-5">{busy ? <Spinner /> : c.revisionGuide ? "Rebuild the guide" : "Build the revision guide"}</button>
          {err && <p role="alert" className="mt-3 text-sm text-red-600">{err}</p>}
        </div>
      )}
    </div>
  );
}
