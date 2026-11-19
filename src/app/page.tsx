"use client";
import Link from "next/link";
import { useMemo } from "react";
import { limit, orderBy, Timestamp, where } from "firebase/firestore";
import { ArrowRight, CalendarDays, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCol } from "@/lib/useData";
import type { Attempt, Course, Session, Topic } from "@/lib/types";
import { fmtDay, fmtTime, sameDay, toDate } from "@/lib/format";
import StudyArt from "@/components/Art";

const essentials = [
  { href: "/library", label: "Library", tone: "bg-ink text-white" },
  { href: "/plan", label: "Study plan", tone: "g-lilac text-ink ring-art" },
  { href: "/progress", label: "Progress", tone: "g-mint text-ink ring-art" },
  { href: "/focus", label: "Focus mode", tone: "g-peach text-ink ring-art" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const uid = user!.uid;
  const first = (user?.displayName || "there").split(" ")[0];

  const startOfToday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const sessions = useCol<Session>(`users/${uid}/sessions`, where("startAt", ">=", Timestamp.fromDate(startOfToday)), orderBy("startAt"));
  const courses = useCol<Course>(`users/${uid}/courses`, orderBy("createdAt", "desc"));
  const attempts = useCol<Attempt>(`users/${uid}/attempts`, orderBy("at", "desc"), limit(30));
  const ready = courses.data.find((c) => c.status === "ready");
  const topics = useCol<Topic>(ready ? `users/${uid}/courses/${ready.id}/topics` : null, orderBy("order"));

  const now = new Date();
  const upcoming = sessions.data.find((s) => !s.done && toDate(s.startAt)! >= new Date(now.getTime() - 30 * 60000));
  const todays = sessions.data.filter((s) => sameDay(toDate(s.startAt)!, now));
  const nextTopic = topics.data.find((t) => (t.bestScore ?? 0) < 70);

  const weak = useMemo(() => {
    const seen = new Set<string>();
    const out: Attempt[] = [];
    for (const a of attempts.data) {
      const k = `${a.courseId}:${a.topicTitle}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (a.pct < 60) out.push(a);
    }
    return out.slice(0, 4);
  }, [attempts.data]);

  // What the big card should show
  let card = { label: "Nothing planned yet", title: "Upload your first course", sub: "Your PDF becomes lessons and quizzes.", href: "/library" };
  if (upcoming) {
    const d = toDate(upcoming.startAt)!;
    card = {
      label: "Next study session",
      title: upcoming.title,
      sub: `${fmtDay(d)}, ${fmtTime(d)} for ${upcoming.durationMin} min`,
      href: upcoming.courseId && upcoming.topicId ? `/courses/${upcoming.courseId}/topics/${upcoming.topicId}` : "/plan",
    };
  } else if (ready && nextTopic) {
    card = { label: "Up next", title: nextTopic.title, sub: ready.title, href: `/courses/${ready.id}/topics/${nextTopic.id}` };
  } else if (ready) {
    card = { label: "Course complete", title: "Take the mock exam", sub: ready.title, href: `/courses/${ready.id}/mock` };
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between rounded-4xl bg-white p-4 shadow-soft lg:hidden">
        <div className="flex items-center gap-3">
          <Link href="/settings" aria-label="Settings" className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink">
            <Menu className="h-5 w-5" />
          </Link>
          <div>
            <p className="font-bold">Hello {first}</p>
            <p className="text-xs text-muted">Student</p>
          </div>
        </div>
        <Link href="/plan" aria-label="Study plan" className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink">
          <CalendarDays className="h-5 w-5" />
        </Link>
      </header>
      <h1 className="mb-6 hidden text-3xl font-extrabold tracking-tight lg:block">Hello {first}</h1>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-4xl bg-white p-6 shadow-soft">
            <div className="max-w-[60%]">
              <p className="text-sm text-muted">{card.label}</p>
              <h2 className="mt-1 text-2xl font-extrabold leading-snug lg:text-3xl">{card.title}</h2>
              <p className="mt-2 text-sm text-muted">{card.sub}</p>
              <Link href={card.href} aria-label="Open" className="mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-amber-brand text-white shadow-glow">
                <ArrowRight className="h-6 w-6" />
              </Link>
            </div>
            <StudyArt className="absolute -right-2 bottom-0 w-44 sm:w-56 lg:w-64" />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold">Essentials</h2>
            <div className="grid grid-cols-2 gap-4">
              {essentials.map((e) => (
                <Link key={e.href} href={e.href} className={`flex min-h-[7.5rem] flex-col justify-between rounded-3xl p-4 shadow-soft transition hover:-translate-y-0.5 ${e.tone}`}>
                  <span className="self-end rounded-lg border border-current/40 p-1.5"><ArrowRight className="h-4 w-4" /></span>
                  <span className="text-lg font-bold">{e.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-extrabold">Today</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <p className="border-b border-line pb-2 text-sm font-bold text-rose-500">Sessions</p>
                {todays.length ? (
                  <ul className="mt-3 space-y-3 text-sm">
                    {todays.slice(0, 4).map((s) => (
                      <li key={s.id}>
                        <p className="font-bold">{fmtTime(toDate(s.startAt)!)}</p>
                        <p className="text-muted">{s.title}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted">Nothing booked. <Link href="/plan" className="font-semibold text-violet-600">Plan one</Link></p>
                )}
              </div>
              <div className="card p-4">
                <p className="border-b border-line pb-2 text-sm font-bold text-indigo-600">Needs revision</p>
                {weak.length ? (
                  <ul className="mt-3 space-y-3 text-sm">
                    {weak.map((a) => (
                      <li key={a.id}>
                        <p className="font-bold">{a.pct}%</p>
                        <p className="text-muted">{a.topicTitle}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted">Topics you score under 60% appear here.</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold">All activities</h2>
            <div className="space-y-3">
              {[
                { href: "/library", t: `My courses${courses.data.length ? ` (${courses.data.length})` : ""}` },
                { href: "/plan", t: "Study plan and reminders" },
                { href: "/progress", t: "Quiz history" },
                { href: "/settings", t: "Notifications and calendar" },
              ].map((r) => (
                <Link key={r.href + r.t} href={r.href} className="card flex items-center justify-between px-5 py-4 font-semibold">
                  {r.t} <ArrowRight className="h-4 w-4 text-muted" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
