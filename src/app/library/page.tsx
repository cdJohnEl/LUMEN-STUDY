"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { collection, doc, orderBy, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { FileText, Trash2, UploadCloud } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fbDb } from "@/lib/firebase";
import { useCol } from "@/lib/useData";
import { apiPost } from "@/lib/api";
import { batchPages, extractPdf } from "@/lib/pdf";
import { deleteCourse } from "@/lib/courseOps";
import type { Course } from "@/lib/types";
import { Empty, PageTitle, Spinner, Bar } from "@/components/ui";

const CHUNK_PAGES = 10;

type Draft = { title: string; module: string; pageStart: number; pageEnd: number; keyPoints: string[] };

export default function Library() {
  const { user } = useAuth();
  const uid = user!.uid;
  const courses = useCol<Course>(`users/${uid}/courses`, orderBy("createdAt", "desc"));
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState("");
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const busy = !!stage;

  async function handleFile(file: File) {
    setErr("");
    let courseId = "";
    try {
      setStage("Reading your PDF");
      setPct(0);
      const pages = await extractPdf(file, (d, t) => setPct(Math.round((d / t) * 25)));
      if (pages.join("").length < pages.length * 40) {
        throw new Error("This PDF has almost no selectable text. It looks scanned. Use a text-based PDF or run OCR first.");
      }

      const db = fbDb();
      const cRef = doc(collection(db, `users/${uid}/courses`));
      courseId = cRef.id;
      const name = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      await setDoc(cRef, { title: name, sourceName: file.name, pageCount: pages.length, status: "processing", createdAt: serverTimestamp() });

      setStage("Saving the material");
      for (let i = 0; i < pages.length; i += CHUNK_PAGES) {
        await setDoc(doc(db, `users/${uid}/courses/${courseId}/chunks/${i / CHUNK_PAGES}`), {
          start: i + 1,
          pages: pages.slice(i, i + CHUNK_PAGES).map((p) => p.slice(0, 12000)),
        });
      }
      setPct(30);

      setStage("Finding the topics");
      const batches = batchPages(pages, 6000);
      const topics: Draft[] = [];
      const objectives: string[] = [];
      for (let b = 0; b < batches.length; b++) {
        const batch = batches[b];
        const lo = batch[0].n;
        const hi = batch[batch.length - 1].n;
        const r = await apiPost<{ objectives: string[]; topics: any[] }>("/api/outline", { pages: batch, previous: topics.map((t) => t.title) });
        objectives.push(...(r.objectives || []).map(String));
        for (const t of r.topics) {
          const title = String(t.title || "").trim();
          if (!title) continue;
          const last = topics[topics.length - 1];
          const ps = Math.min(Math.max(Number(t.pageStart) || lo, lo), hi);
          const pe = Math.min(Math.max(Number(t.pageEnd) || hi, ps), hi);
          const kp: string[] = Array.isArray(t.keyPoints) ? t.keyPoints.map(String) : [];
          if (last && (t.continues || last.title.toLowerCase() === title.toLowerCase())) {
            last.pageEnd = Math.max(last.pageEnd, pe);
            last.keyPoints = [...last.keyPoints, ...kp].slice(0, 10);
          } else {
            topics.push({ title, module: String(t.module || "General"), pageStart: ps, pageEnd: pe, keyPoints: kp.slice(0, 10) });
          }
        }
        setPct(30 + Math.round(((b + 1) / batches.length) * 60));
      }
      if (!topics.length) throw new Error("No teachable topics were found in this PDF.");

      setStage("Checking for gaps");
      const fin = await apiPost<{ title: string; gaps: { item: string; note: string }[] }>("/api/outline/finalize", {
        topics,
        objectives,
        fileName: name,
      });

      const wb = writeBatch(db);
      topics.forEach((t, i) => wb.set(doc(db, `users/${uid}/courses/${courseId}/topics/${String(i + 1).padStart(3, "0")}`), { ...t, order: i + 1 }));
      await wb.commit();
      await updateDoc(cRef, {
        title: fin.title || name,
        status: "ready",
        objectives: objectives.slice(0, 12),
        gaps: fin.gaps || [],
        topicCount: topics.length,
      });
    } catch (e: any) {
      setErr(e?.message || "Upload failed.");
      if (courseId) await updateDoc(doc(fbDb(), `users/${uid}/courses/${courseId}`), { status: "failed" }).catch(() => {});
    } finally {
      setStage("");
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <PageTitle title="Library" sub="Upload a course PDF. Lumen reads it and builds your lessons." />

      <div className="card mb-8 p-6">
        <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {busy ? (
          <div className="py-4">
            <p className="flex items-center gap-2 font-bold"><Spinner /> {stage}...</p>
            <div className="mt-4"><Bar pct={pct} /></div>
            <p className="mt-3 text-sm text-muted">Keep this screen open. Long PDFs take a few minutes on the free AI tier.</p>
          </div>
        ) : (
          <button onClick={() => input.current?.click()} className="flex w-full flex-col items-center rounded-3xl border-2 border-dashed border-line py-10 text-center transition hover:border-violet-400 hover:bg-canvas/60">
            <span className="g-lilac mb-3 grid h-14 w-14 place-items-center rounded-2xl"><UploadCloud className="h-7 w-7" /></span>
            <span className="text-lg font-bold">Choose a PDF</span>
            <span className="mt-1 text-sm text-muted">Text-based PDFs and slide decks work best</span>
          </button>
        )}
        {err && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{err}</p>}
      </div>

      {courses.loading ? null : courses.data.length === 0 ? (
        <Empty title="No courses yet" body="Upload your first course PDF to get an outline, lessons and quizzes." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.data.map((c) => (
            <div key={c.id} className="card flex items-start justify-between gap-3 p-5">
              <Link href={c.status === "ready" ? `/courses/${c.id}` : "#"} className="flex min-w-0 flex-1 items-start gap-4">
                <span className="g-mint grid h-12 w-12 shrink-0 place-items-center rounded-2xl"><FileText className="h-6 w-6" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-bold">{c.title}</span>
                  <span className="text-sm text-muted">
                    {c.status === "ready" && `${(c as any).topicCount ?? ""} topics, ${c.pageCount} pages`}
                    {c.status === "processing" && "Still processing. If this stays here, delete it and upload again."}
                    {c.status === "failed" && "Processing failed. Delete it and try again."}
                  </span>
                </span>
              </Link>
              <button
                aria-label={`Delete ${c.title}`}
                onClick={() => confirm(`Delete "${c.title}" and its lessons?`) && deleteCourse(uid, c.id)}
                className="rounded-xl p-2 text-muted hover:bg-canvas hover:text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
