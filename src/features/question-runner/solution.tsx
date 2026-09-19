"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loadQuestion, useApp } from "@/features/app-provider";
import { getDraft } from "@/persistence/storage";
import type { Question } from "@/domain/question/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/utils";
export function SolutionPage() {
  const params = useSearchParams(), app = useApp(), id = params.get("id") ?? "L001-Q01", [q, setQuestion] = useState<Question>(), [allowed, setAllowed] = useState(false), [error, setError] = useState("");
  const attempt = app.attempts.find(a => a.id === params.get("attempt") && a.questionId === id);
  useEffect(() => { let active = true; if (!app.ready) return; Promise.all([loadQuestion(id), getDraft(params.get("draft") ?? id)]).then(([question, draft]) => { if (active) { setQuestion(question); setAllowed(!!attempt || draft?.hints === 5); } }).catch(e => setError(String(e))); return () => { active = false; }; }, [id, app.ready, attempt, params]);
  if (error) return <div className="page" role="alert">{error}</div>;
  if (!q) return <div className="page" role="status">Memuat pembahasan…</div>;
  if (!allowed) return <div className="page stack"><h1>Pembahasan belum dibuka</h1><p>Kerjakan soal terlebih dahulu, atau buka walkthrough melalui petunjuk tahap kelima.</p><Button asChild><Link href={`/question/?id=${id}`}>Kembali ke soal</Link></Button></div>;
  const s = q.solution;
  return <div className="page prose max-w-5xl"><Link href={`/question/?id=${id}`} className="text-link"><ChevronLeft size={15} />Kembali ke ruang kerja</Link><div className="page-intro"><div><p className="eyebrow">PEMBAHASAN · {id}</p><h1>Dari konteks ke keputusan.</h1><p>{q.mathematicalTopics[0]} · {q.domain}</p></div></div>
  <section className="solution-block"><h2>1. Terjemahkan masalah</h2><p>{s.modelingTranslation}</p><div className="formula">{q.recommendedModels[0].equation}</div></section>
  <section className="solution-block"><h2>2. Variabel, data, dan asumsi</h2><ul>{[...s.variableExplanation, ...s.relevantDataRationale, ...s.assumptionsRationale].map((v, i) => <li key={i}>{v}</li>)}</ul>{q.distractors.map(d => <p key={d.label}><strong>{d.label}:</strong> {d.rationale}</p>)}</section>
  <section className="solution-block"><h2>3. Pilih metode</h2><p>{s.methodRationale}</p></section>
  <section className="solution-block"><h2>4. Hitung secara bertahap</h2>{s.calculations.map((c, i) => <div className="calculation-step" key={i}><strong>{i + 1}. {c.label}</strong><code>{c.expression}</code><p>= {typeof c.result === "number" ? formatNumber(c.result, 5) : c.result}</p></div>)}</section>
  <section className="solution-block"><h2>5. Validasi</h2><ul>{s.validation.map((v, i) => <li key={i}>{v}</li>)}</ul></section>
  <section className="solution-block"><h2>6. Interpretasi & keputusan</h2><p>{s.interpretation}</p><p><strong>{s.decision}</strong></p><p>{s.sensitivity}</p></section>
  <div className="solution-summary"><h2>Hasil checkpoint</h2><p>{s.finalAnswer}</p>{attempt && <p>Skor terverifikasi: {formatNumber(attempt.verifiedScore ?? 0)}%. {attempt.selfScore !== null && `Rubrik mandiri: ${formatNumber(attempt.selfScore)}%.`}</p>}</div>
  <section className="solution-block"><h2>Alternatif & kesalahan umum</h2>{s.alternatives.map((v, i) => <p key={i}>{v}</p>)}<ul>{q.commonMistakes.map(m => <li key={m.tag}>{m.description}</li>)}</ul></section><div className="row mt-6"><Button asChild><Link href={`/question/?id=${id}`}>Coba kembali</Link></Button><Button asChild variant="outline"><Link href={`/question/?id=L${String(q.level).padStart(3, "0")}-Q${String(Number(id.slice(-2)) % 50 + 1).padStart(2, "0")}`}>Soal sejenis <ChevronRight size={16} /></Link></Button><Button asChild variant="ghost"><Link href={app.session?.mode === "assessment" ? "/assessment/" : "/practice/"}>Kembali ke sesi</Link></Button></div></div>;
}
