import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://lumen-study-eta.vercel.app"),
  title: "Lumen: your study companion",
  description: "Turn your course PDFs into lessons, quizzes and a study plan.",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "Lumen", statusBarStyle: "default" },
  openGraph: {
    title: "Lumen: your study companion",
    description: "Turn your course PDFs into lessons, quizzes and a study plan.",
    url: "https://lumen-study-eta.vercel.app",
    siteName: "Lumen",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Lumen",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Lumen: your study companion",
    description: "Turn your course PDFs into lessons, quizzes and a study plan.",
    images: ["/icons/icon-512.png"],
  },
};
export const viewport: Viewport = { themeColor: "#14142B", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
