import { Suspense } from "react";
import { RoutePage } from "@/features/pages/route-page";
const paths = ["learn", "problems", "practice", "level", "topics", "domains", "daily", "random", "assessment", "question", "solution", "progress", "statistics", "mistakes", "reference", "guide", "settings", "about"];
export function generateStaticParams() { return paths.map(p => ({ slug: [p] })); }
export const dynamicParams = false;
export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) { const { slug } = await params; return <Suspense fallback={<div className="page"><p role="status">Menyiapkan ruang belajar…</p></div>}><RoutePage route={slug.join("/")} /></Suspense>; }
