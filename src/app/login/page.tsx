"use client";
import Image from "next/image";
import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { fbAuth } from "@/lib/firebase";
import StudyArt from "@/components/Art";
import { Spinner } from "@/components/ui";

export default function Login() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true);
    setErr("");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(fbAuth(), provider);
    } catch (e: any) {
      if (e?.code === "auth/popup-blocked") return signInWithRedirect(fbAuth(), provider);
      if (e?.code !== "auth/popup-closed-by-user") setErr("Sign-in failed. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-ink p-8 text-white lg:p-14">
        <div className="flex items-center gap-3">
          <Image
            src="/icons/icon-192.png"
            alt="Lumen"
            width={40}
            height={40}
            className="h-10 w-10 rounded-2xl object-cover"
            priority
          />
          <span className="text-xl font-extrabold">Lumen</span>
        </div>
        <div className="my-10">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            Your course PDFs, taught back to you.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Upload your notes. Lumen builds lessons, quizzes you with hidden answers, plans your sessions and keeps you focused.
          </p>
        </div>
        <StudyArt className="hidden w-64 lg:block" />
      </section>
      <section className="grid place-items-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your Google account to keep your courses in sync across devices.</p>
          <button onClick={go} disabled={busy} className="btn-ink mt-6 w-full">
            {busy ? <Spinner /> : "Continue with Google"}
          </button>
          {err && <p role="alert" className="mt-3 text-sm text-red-600">{err}</p>}
        </div>
      </section>
    </div>
  );
}
