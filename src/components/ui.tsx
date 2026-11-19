"use client";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:mt-8 prose-h2:text-xl prose-table:text-sm prose-a:text-violet-600">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />
);

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Back({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" /> {label}
    </Link>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export const Bar = ({ pct, tone = "bg-violet-500" }: { pct: number; tone?: string }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
    <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, pct)}%` }} />
  </div>
);
