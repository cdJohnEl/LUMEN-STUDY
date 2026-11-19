"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BarChart3, BookOpen, CalendarDays, Home, Settings, Timer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listenForeground, registerSw } from "@/lib/push";
import { Spinner } from "./ui";

const NAV = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/library", label: "Library", Icon: BookOpen },
  { href: "/plan", label: "Plan", Icon: CalendarDays },
  { href: "/focus", label: "Focus", Icon: Timer },
  { href: "/progress", label: "Progress", Icon: BarChart3 },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const onLogin = path === "/login";

  useEffect(() => {
    if (loading) return;
    if (!user && !onLogin) router.replace("/login");
    if (user && onLogin) router.replace("/");
  }, [user, loading, onLogin, router]);

  useEffect(() => {
    registerSw();
    listenForeground();
  }, []);

  if (loading || (!user && !onLogin) || (user && onLogin)) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/icons/icon-192.png"
            alt="Lumen"
            width={48}
            height={48}
            className="h-12 w-12 rounded-2xl object-cover"
            priority
          />
          <Spinner className="h-6 w-6" />
        </div>
      </div>
    );
  }
  if (onLogin) return <>{children}</>;

  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between p-5 lg:flex">
        <div>
          <Link href="/" className="mb-8 flex items-center gap-3">
            <Image
              src="/icons/icon-192.png"
              alt="Lumen"
              width={40}
              height={40}
              className="h-10 w-10 rounded-2xl object-cover"
              priority
            />
            <span className="text-xl font-extrabold tracking-tight">Lumen</span>
          </Link>
          <nav className="space-y-1">
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active(href) ? "bg-ink text-white shadow-soft" : "text-muted hover:bg-white"
                }`}
              >
                <Icon className="h-5 w-5" /> {label}
              </Link>
            ))}
          </nav>
        </div>
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
            active("/settings") ? "bg-ink text-white" : "text-muted hover:bg-white"
          }`}
        >
          <Settings className="h-5 w-5" /> Settings
        </Link>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-3xl bg-white px-2 py-2 shadow-soft lg:hidden"
        style={{ paddingBottom: "calc(0.5rem + var(--safe-b))" }}
      >
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`flex min-w-[3.6rem] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold ${
              active(href) ? "bg-ink text-white" : "text-muted"
            }`}
          >
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
