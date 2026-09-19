import type { Metadata } from "next";
import { AppProvider } from "@/features/app-provider";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";
import "katex/dist/katex.min.css";
export const metadata: Metadata = { title: { default: "ModelMath — Matematika untuk dunia nyata", template: "%s · ModelMath" }, description: "Latih cara berpikir, membangun model, dan mengambil keputusan. 100 level, 5.000 soal, tersimpan di perangkat Anda.", manifest: "/manifest.webmanifest" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="id" suppressHydrationWarning><body><AppProvider><AppShell>{children}</AppShell></AppProvider></body></html>; }
