import type { Timestamp } from "firebase/firestore";

export const toDate = (t?: Timestamp | null) => (t ? t.toDate() : null);

export const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });

export const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "long" });

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const mmss = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
