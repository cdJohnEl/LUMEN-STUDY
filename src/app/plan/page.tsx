"use client";
import { useMemo, useState } from "react";
import { collection, deleteDoc, doc, orderBy, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { CalendarCheck, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fbDb } from "@/lib/firebase";
import { useCol } from "@/lib/useData";
import { connectCalendar, createEvent, deleteEvent, getCalToken } from "@/lib/calendar";
import { fmtDay, fmtTime, toDate, toLocalInput } from "@/lib/format";
import type { Course, Session, Topic } from "@/lib/types";
import { Empty, PageTitle, Spinner } from "@/components/ui";

export default function Plan() {
  const { user } = useAuth();
  const uid = user!.uid;
  const sessions = useCol<Session>(`users/${uid}/sessions`, orderBy("startAt"));
  const courses = useCol<Course>(`users/${uid}/courses`, orderBy("createdAt", "desc"));

  const [courseId, setCourseId] = useState("");
  const [topicId, setTopicId] = useState("");
  const topics = useCol<Topic>(courseId ? `users/${uid}/courses/${courseId}/topics` : null, orderBy("order"));
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return toLocalInput(d);
  });
  const [dur, setDur] = useState(45);
  const [remind, setRemind] = useState(15);
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: Session[] = [], pa: Session[] = [];
    sessions.data.forEach((s) => (toDate(s.startAt)!.getTime() >= now - 3600000 && !s.done ? up : pa).push(s));
    return { upcoming: up, past: pa.reverse().slice(0, 8) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.data]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const topic = topics.data.find((t) => t.id === topicId);
    const name = title.trim() || (topic ? `Study: ${topic.title}` : "Study session");
    const start = new Date(when);
    const db = fbDb();
    const ref = doc(collection(db, `users/${uid}/sessions`));
    await setDoc(ref, {
      title: name,
      courseId: courseId || null,
      topicId: topicId || null,
      startAt: Timestamp.fromDate(start),
      durationMin: dur,
      remindMin: remind,
      done: false,
    });
    const remindAt = new Date(start.getTime() - remind * 60000);
    if (remindAt.getTime() > Date.now()) {
      await setDoc(doc(db, `reminders/${ref.id}`), { uid, remindAt: Timestamp.fromDate(remindAt), title: "Study time soon", body: `${name} starts in ${remind} min.` });
    }
    setTitle("");
    setMsg("Session added.");
  }

  async function remove(s: Session) {
    const tok = getCalToken();
    if (tok && s.calendarEventId) deleteEvent(tok, s.calendarEventId);
    await deleteDoc(doc(fbDb(), `users/${uid}/sessions/${s.id}`));
    await deleteDoc(doc(fbDb(), `reminders/${s.id}`)).catch(() => {});
  }

  async function toggleDone(s: Session) {
    await updateDoc(doc(fbDb(), `users/${uid}/sessions/${s.id}`), { done: !s.done });
    if (!s.done) await deleteDoc(doc(fbDb(), `reminders/${s.id}`)).catch(() => {});
  }

  async function sync() {
    setSyncing(true);
    setMsg("");
    try {
      let token = getCalToken();
      if (!token) token = await connectCalendar();
      let n = 0;
      for (const s of upcoming.filter((x) => !x.calendarEventId)) {
        const id = await createEvent(token, { title: s.title, start: toDate(s.startAt)!, durationMin: s.durationMin, remindMin: s.remindMin });
        await updateDoc(doc(fbDb(), `users/${uid}/sessions/${s.id}`), { calendarEventId: id });
        n++;
      }
      setMsg(n ? `${n} session${n > 1 ? "s" : ""} added to Google Calendar.` : "Everything is already in your calendar.");
    } catch (e: any) {
      setMsg(e?.message || "Calendar sync failed.");
    }
    setSyncing(false);
  }

  return (
    <div>
      <PageTitle title="Study plan" sub="Book sessions. You get a reminder before each one." right={
        <button onClick={sync} disabled={syncing} className="btn-ghost">{syncing ? <Spinner /> : <CalendarCheck className="h-4 w-4" />} Sync to Google Calendar</button>
      } />
      {msg && <p role="status" className="mb-4 rounded-2xl bg-white p-4 text-sm shadow-soft">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={add} className="card h-fit space-y-4 p-5">
          <p className="font-extrabold">New session</p>
          <label className="block text-sm font-semibold">Course
            <select className="field mt-1" value={courseId} onChange={(e) => { setCourseId(e.target.value); setTopicId(""); }}>
              <option value="">No course</option>
              {courses.data.filter((c) => c.status === "ready").map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          {courseId && (
            <label className="block text-sm font-semibold">Topic
              <select className="field mt-1" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">Any topic</option>
                {topics.data.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </label>
          )}
          <label className="block text-sm font-semibold">Title (optional)
            <input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Study: nouns" />
          </label>
          <label className="block text-sm font-semibold">Starts
            <input type="datetime-local" required className="field mt-1" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold">Length
              <select className="field mt-1" value={dur} onChange={(e) => setDur(+e.target.value)}>{[25, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
            </label>
            <label className="block text-sm font-semibold">Remind me
              <select className="field mt-1" value={remind} onChange={(e) => setRemind(+e.target.value)}>{[5, 15, 30, 60].map((m) => <option key={m} value={m}>{m} min before</option>)}</select>
            </label>
          </div>
          <button className="btn-ink w-full">Add session</button>
        </form>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-extrabold">Upcoming</h2>
            {sessions.loading ? <Spinner /> : upcoming.length === 0 ? (
              <Empty title="No sessions booked" body="Add one on the left. Consistent short sessions beat last-minute cramming." />
            ) : (
              <div className="space-y-3">{upcoming.map((s) => <Row key={s.id} s={s} onDone={toggleDone} onDelete={remove} />)}</div>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 font-extrabold">Earlier</h2>
              <div className="space-y-3 opacity-80">{past.map((s) => <Row key={s.id} s={s} onDone={toggleDone} onDelete={remove} />)}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ s, onDone, onDelete }: { s: Session; onDone: (s: Session) => void; onDelete: (s: Session) => void }) {
  const d = toDate(s.startAt)!;
  return (
    <div className="card flex items-center gap-3 p-4">
      <button aria-label={s.done ? "Mark as not done" : "Mark as done"} onClick={() => onDone(s)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 ${s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line"}`}>
        {s.done && <Check className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-bold ${s.done ? "line-through" : ""}`}>{s.title}</p>
        <p className="text-sm text-muted">{fmtDay(d)}, {fmtTime(d)} for {s.durationMin} min{s.calendarEventId ? ", in Google Calendar" : ""}</p>
      </div>
      <button aria-label="Delete session" onClick={() => onDelete(s)} className="rounded-xl p-2 text-muted hover:bg-canvas hover:text-red-600"><Trash2 className="h-5 w-5" /></button>
    </div>
  );
}
