"use client";
import { useState } from "react";
import { Bell, CalendarCheck, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import { enablePush } from "@/lib/push";
import { connectCalendar, getCalToken } from "@/lib/calendar";
import { PageTitle, Spinner } from "@/components/ui";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setMsg("");
    try { setMsg(await fn()); } catch (e: any) { setMsg(e?.message || "Something went wrong."); }
    setBusy("");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Settings" sub={user?.email || ""} />
      {msg && <p role="status" className="mb-4 rounded-2xl bg-white p-4 text-sm shadow-soft">{msg}</p>}

      <div className="space-y-4">
        <section className="card p-5">
          <p className="flex items-center gap-2 font-extrabold"><Bell className="h-5 w-5" /> Notifications</p>
          <p className="mt-1 text-sm text-muted">Get a push reminder before each study session, even when the app is closed. On Android, install Lumen to your home screen first for the most reliable delivery.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-ink" disabled={!!busy} onClick={() => run("push", async () => { await enablePush(user!.uid); return "Notifications are on for this device."; })}>
              {busy === "push" ? <Spinner /> : "Turn on notifications"}
            </button>
            <button className="btn-ghost" disabled={!!busy} onClick={() => run("test", async () => { const r = await apiPost<{ sent: number }>("/api/push/test", {}); return `Test sent to ${r.sent} device(s).`; })}>
              {busy === "test" ? <Spinner /> : "Send a test"}
            </button>
          </div>
        </section>

        <section className="card p-5">
          <p className="flex items-center gap-2 font-extrabold"><CalendarCheck className="h-5 w-5" /> Google Calendar</p>
          <p className="mt-1 text-sm text-muted">Lumen adds your study sessions as calendar events with a reminder. Google asks for access again about once an hour, so connect right before you sync.</p>
          <button className="btn-ink mt-4" disabled={!!busy} onClick={() => run("cal", async () => { await connectCalendar(); return "Calendar connected. Go to Study plan and tap Sync."; })}>
            {busy === "cal" ? <Spinner /> : getCalToken() ? "Reconnect Google Calendar" : "Connect Google Calendar"}
          </button>
        </section>

        <section className="card p-5">
          <p className="font-extrabold">Install the app</p>
          <p className="mt-1 text-sm text-muted">In Chrome on Android, open the menu and choose "Install app" or "Add to Home screen".</p>
        </section>

        <button onClick={logout} className="btn-ghost w-full"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>
    </div>
  );
}
