"use client";
import { useMemo } from "react";
import { limit, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { useCol } from "@/lib/useData";
import type { Attempt, FocusLog } from "@/lib/types";
import { fmtDay, toDate } from "@/lib/format";
import { Bar, Empty, PageTitle, Spinner } from "@/components/ui";

export default function Progress() {
  const { user } = useAuth();
  const uid = user!.uid;
  const attempts = useCol<Attempt>(`users/${uid}/attempts`, orderBy("at", "desc"), limit(60));
  const logs = useCol<FocusLog>(`users/${uid}/focusLogs`, orderBy("at", "desc"), limit(60));

  const stats = useMemo(() => {
    const a = attempts.data;
    const avg = a.length ? Math.round(a.reduce((s, x) => s + x.pct, 0) / a.length) : 0;
    const latest = new Map<string, Attempt>();
    a.forEach((x) => { const k = `${x.courseId}:${x.topicTitle}`; if (!latest.has(k)) latest.set(k, x); });
    const weak = [...latest.values()].filter((x) => x.pct < 60);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
      return { d, min: 0 };
    });
    logs.data.forEach((l) => {
      const t = toDate(l.at); if (!t) return;
      const slot = days.find((x) => x.d.toDateString() === t.toDateString());
      if (slot) slot.min += Math.round(l.actualSec / 60);
    });
    return { avg, weak, days, total: days.reduce((s, x) => s + x.min, 0) };
  }, [attempts.data, logs.data]);

  if (attempts.loading) return <Spinner />;
  const maxMin = Math.max(30, ...stats.days.map((x) => x.min));

  return (
    <div>
      <PageTitle title="Progress" sub="Quiz scores and focused study time." />
      <div className="mb-6 grid grid-cols-3 gap-3 lg:gap-5">
        {[
          { l: "Quizzes taken", v: attempts.data.length, t: "g-lilac" },
          { l: "Average score", v: `${stats.avg}%`, t: "g-mint" },
          { l: "Focus this week", v: `${stats.total} min`, t: "g-peach" },
        ].map((x) => (
          <div key={x.l} className={`${x.t} rounded-3xl p-4 shadow-soft`}>
            <p className="text-2xl font-extrabold lg:text-3xl">{x.v}</p>
            <p className="text-xs font-semibold lg:text-sm">{x.l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <p className="mb-4 font-extrabold">Focus minutes, last 7 days</p>
          <div className="flex h-36 items-end gap-2">
            {stats.days.map((x) => (
              <div key={x.d.toISOString()} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-xl bg-violet-400" style={{ height: `${(x.min / maxMin) * 100}%`, minHeight: x.min ? 6 : 2, opacity: x.min ? 1 : 0.25 }} title={`${x.min} min`} />
                <span className="text-[11px] text-muted">{x.d.toLocaleDateString("en", { weekday: "short" })}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <p className="mb-3 font-extrabold">Revisit these topics</p>
          {stats.weak.length ? (
            <ul className="space-y-3">
              {stats.weak.map((w) => (
                <li key={w.id}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{w.topicTitle}</span><span className="text-muted">{w.pct}%</span></div>
                  <Bar pct={w.pct} tone="bg-rose-400" />
                  {w.gaps[0] && <p className="mt-1 text-xs text-muted">{w.gaps[0]}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No weak topics right now.</p>}
        </section>
      </div>

      <h2 className="mb-3 mt-8 font-extrabold">Quiz history</h2>
      {attempts.data.length === 0 ? (
        <Empty title="No quizzes yet" body="Finish a lesson, then test yourself. Your scores appear here." />
      ) : (
        <div className="space-y-3">
          {attempts.data.slice(0, 15).map((a) => (
            <div key={a.id} className="card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-bold">{a.kind === "mock" ? `Mock: ${a.courseTitle}` : a.topicTitle}</p>
                <p className="text-xs text-muted">{a.at ? fmtDay(toDate(a.at)!) : ""}</p>
              </div>
              <p className={`text-lg font-extrabold ${a.pct >= 70 ? "text-emerald-600" : a.pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{a.score}/{a.total}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
