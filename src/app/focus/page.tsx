"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { BellOff, Smartphone, WifiOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fbDb } from "@/lib/firebase";
import { mmss } from "@/lib/format";
import { PageTitle, Spinner } from "@/components/ui";

type Summary = { label: string; plannedMin: number; actualSec: number; distractions: number; awaySec: number };

function FocusInner() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [label, setLabel] = useState(params.get("label") || "");
  const [minutes, setMinutes] = useState(Number(params.get("min")) || 45);
  const [phase, setPhase] = useState<"setup" | "running" | "done">("setup");
  const [left, setLeft] = useState(0);
  const [distractions, setDistractions] = useState(0);
  const [banner, setBanner] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  const endAt = useRef(0);
  const startedAt = useRef(0);
  const away = useRef({ since: 0, total: 0 });
  const lock = useRef<any>(null);
  const dist = useRef(0);

  const acquireLock = useCallback(async () => {
    try { lock.current = await (navigator as any).wakeLock?.request("screen"); } catch { /* not supported */ }
  }, []);

  const finish = useCallback(async (planned: number) => {
    const actualSec = Math.round((Date.now() - startedAt.current) / 1000);
    const s: Summary = { label: label || "Focus session", plannedMin: planned, actualSec, distractions: dist.current, awaySec: Math.round(away.current.total / 1000) };
    setSummary(s);
    setPhase("done");
    lock.current?.release?.();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    navigator.vibrate?.([250, 120, 250]);
    if (user) await addDoc(collection(fbDb(), `users/${user.uid}/focusLogs`), { ...s, at: serverTimestamp() }).catch(() => {});
  }, [label, user]);

  async function start() {
    startedAt.current = Date.now();
    endAt.current = Date.now() + minutes * 60000;
    away.current = { since: 0, total: 0 };
    dist.current = 0;
    setDistractions(0);
    setBanner("");
    setLeft(minutes * 60);
    setPhase("running");
    document.documentElement.requestFullscreen?.().catch(() => {});
    acquireLock();
  }

  useEffect(() => {
    if (phase !== "running") return;
    const tick = setInterval(() => {
      const s = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) finish(minutes);
    }, 500);

    const onVis = () => {
      if (document.hidden) {
        away.current.since = Date.now();
      } else {
        const dt = away.current.since ? Date.now() - away.current.since : 0;
        away.current.since = 0;
        if (dt > 2000) {
          away.current.total += dt;
          dist.current += 1;
          setDistractions(dist.current);
          setBanner(`You were away for ${Math.round(dt / 1000)}s. Welcome back.`);
        }
        acquireLock();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [phase, minutes, finish, acquireLock]);

  if (phase === "running") {
    const total = minutes * 60;
    const R = 120, C = 2 * Math.PI * R;
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink px-6 text-white">
        <p className="mb-8 max-w-sm text-center text-lg font-semibold text-white/80">{label || "Focus session"}</p>
        <div className="relative grid place-items-center">
          <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90" aria-hidden>
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="12" />
            <circle cx="140" cy="140" r={R} fill="none" stroke="#F7A93B" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - left / total)} />
          </svg>
          <p className="absolute text-6xl font-extrabold tabular-nums" role="timer" aria-live="off">{mmss(left)}</p>
        </div>
        <p className="mt-8 text-sm text-white/60">Times you left the app: {distractions}</p>
        <p role="status" className="mt-2 h-5 text-sm text-amber-brand">{banner}</p>
        <button onClick={() => confirm("End this session early?") && finish(minutes)} className="mt-10 rounded-2xl border border-white/25 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">
          End session
        </button>
      </div>
    );
  }

  if (phase === "done" && summary) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="g-mint rounded-4xl p-8 text-center shadow-soft">
          <p className="text-5xl font-extrabold">{Math.round(summary.actualSec / 60)} min</p>
          <p className="mt-2 font-semibold">of focused study on {summary.label}</p>
          <p className="mt-4 text-sm">Left the app {summary.distractions} time{summary.distractions === 1 ? "" : "s"}{summary.awaySec ? `, ${summary.awaySec}s away in total` : ""}.</p>
        </div>
        <button onClick={() => setPhase("setup")} className="btn-ink mt-5 w-full">Start another session</button>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="Focus mode" sub="A full-screen timer that keeps your screen on and counts every time you leave." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-5 p-6">
          <label className="block text-sm font-semibold">What are you studying?
            <input className="field mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nouns: countable and uncountable" />
          </label>
          <div>
            <p className="mb-2 text-sm font-semibold">Length</p>
            <div className="flex flex-wrap gap-2">
              {[25, 45, 60, 90].map((m) => (
                <button key={m} onClick={() => setMinutes(m)} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${minutes === m ? "bg-ink text-white" : "bg-canvas"}`}>{m} min</button>
              ))}
              <input type="number" min={5} max={240} aria-label="Custom minutes" className="field !w-24 !py-2" value={minutes} onChange={(e) => setMinutes(Math.min(240, Math.max(5, +e.target.value || 5)))} />
            </div>
          </div>
          <button onClick={start} className="btn-amber w-full">Start focusing</button>
        </div>

        <div className="space-y-4">
          <div className="g-peach rounded-3xl p-5 shadow-soft">
            <p className="mb-2 font-extrabold">Before you start</p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><BellOff className="mt-0.5 h-4 w-4 shrink-0" /> Switch on Do Not Disturb so calls and chats stay quiet.</li>
              <li className="flex gap-2"><WifiOff className="mt-0.5 h-4 w-4 shrink-0" /> Close other apps and silence your group chats.</li>
              <li className="flex gap-2"><Smartphone className="mt-0.5 h-4 w-4 shrink-0" /> Keep the phone on a desk, screen up.</li>
            </ul>
          </div>
          <div className="card p-5 text-sm">
            <p className="font-extrabold">Want a real lock on Android?</p>
            <p className="mt-1 text-muted">
              A web app cannot block other apps, but Android can pin this one. Open Settings, search for "app pinning" (also called screen pinning), switch it on, then open Lumen, open the Recents view and pin it. Nothing else opens until you unpin. Menu names vary by phone brand.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Focus() {
  return (
    <Suspense fallback={<Spinner />}>
      <FocusInner />
    </Suspense>
  );
}
