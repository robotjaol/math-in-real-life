"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Check, ChevronLeft, ChevronRight, Clock3, Lightbulb, PanelRightClose, Save } from "lucide-react";
import type { Attempt, Draft, Phase, Question, Responses } from "@/domain/question/types";
import { aggregate, grade, hintFactors, phaseLabels, phases } from "@/domain/assessment/engine";
import { loadQuestion, useApp } from "@/features/app-provider";
import { getDraft, saveDraft } from "@/persistence/storage";
import { Interaction } from "@/components/interaction/interaction";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
const ChartBlock = dynamic(() => import("@/components/visualization/chart-block"), { ssr: false, loading: () => <p role="status">Menyiapkan visualisasi…</p> });
const padKeys = ["Tujuan", "Variabel", "Data diketahui", "Unknown", "Satuan", "Constraints", "Asumsi", "Model", "Metode", "Perhitungan", "Validasi", "Interpretasi", "Keputusan"];
export function QuestionPage() {
  const params = useSearchParams(), id = params.get("id") ?? "L001-Q01", [q, setQuestion] = useState<Question>(), [error, setError] = useState("");
  useEffect(() => { let alive = true; setQuestion(undefined); setError(""); loadQuestion(id).then(question => { if (alive) setQuestion(question); }).catch(e => { if (alive) setError(String(e)); }); return () => { alive = false; }; }, [id]);
  if (error) return <div className="page"><div role="alert" className="notice">{error}</div><Button asChild variant="outline"><Link href="/problems/">Kembali ke bank soal</Link></Button></div>;
  if (!q) return <div className="page" role="status">Memuat soal dan data level…</div>;
  return <Runner key={`${q.id}:${params.get("review") ?? ""}`} question={q} />;
}
function Runner({ question: q }: { question: Question }) {
  const app = useApp(), params = useSearchParams(), router = useRouter();
  const reviewOf = params.get("review") ?? undefined, draftId = reviewOf ? `${q.id}:review:${reviewOf}` : q.id;
  const [responses, setResponses] = useState<Responses>({}), [scratchpad, setScratchpad] = useState<Record<string, string>>({}), [hints, setHints] = useState(0), [elapsed, setElapsed] = useState(0), [loaded, setLoaded] = useState(false), [saved, setSaved] = useState("Memuat draft…"), [tab, setTab] = useState("workspace"), [toolsOpen, setToolsOpen] = useState(true);
  const activePhases = phases.filter(p => q.interactions.some(i => i.phase === p));
  const [phase, setPhase] = useState<Phase>(activePhases[0]), [attempt, setAttempt] = useState<Attempt>(), [submitting, setSubmitting] = useState(false), [message, setMessage] = useState("");
  const latest = useRef<Draft | null>(null), busy = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const sessionAllowed = app.session?.queue[app.session.index] === q.id;
  const locked = app.ready && q.level > app.progress.unlockedLevel && !sessionAllowed && params.get("challenge") !== "daily";
  useEffect(() => { let alive = true; getDraft(draftId).then(d => { if (!alive) return; if (d) { setResponses(d.responses); setScratchpad(d.scratchpad); setHints(d.hints); setElapsed(d.elapsedSeconds); } setLoaded(true); setSaved(d ? "Draft dipulihkan" : "Siap disimpan otomatis"); }).catch(e => { setMessage(String(e)); }); return () => { alive = false; }; }, [draftId]);
  useEffect(() => { if (!loaded || locked || attempt) return; const timer = setInterval(() => { if (document.visibilityState === "visible") setElapsed(s => s + 1); }, 1000); return () => clearInterval(timer); }, [loaded, locked, attempt]);
  useEffect(() => {
    if (!loaded || locked) return;
    const draft: Draft = { schemaVersion: 1, id: draftId, responses, scratchpad, hints, elapsedSeconds: elapsed, updatedAt: new Date().toISOString() }; latest.current = draft;
    const timeout = setTimeout(() => { saveDraft(draft).then(() => setSaved("Tersimpan di perangkat")).catch(e => { setSaved("Gagal menyimpan"); setMessage(String(e)); }); }, 500);
    return () => clearTimeout(timeout);
  }, [responses, scratchpad, hints, elapsed, loaded, locked, draftId]);
  useEffect(() => { const flush = () => { if (latest.current) void saveDraft(latest.current).catch(() => {}); }; window.addEventListener("pagehide", flush); return () => { window.removeEventListener("pagehide", flush); flush(); }; }, []);
  function changePhase(p: Phase) { setPhase(p); setMessage(""); heading.current?.focus(); }
  async function submit() {
    if (busy.current || attempt) return;
    const missing = q.interactions.find(i => { const r = responses[i.id]; return i.validator.kind === "numeric" || i.validator.kind === "choice" || i.validator.kind === "rubric" ? !r?.text?.trim() : !r?.selections?.length; });
    if (missing) { setPhase(missing.phase); setMessage("Lengkapi seluruh langkah sebelum mengirim. Langkah yang belum terisi sudah dibuka."); heading.current?.focus(); return; }
    busy.current = true; setSubmitting(true); setMessage("");
    try {
      const diagnostics = grade(q, responses), verifiedScore = aggregate(q, diagnostics, true), selfScore = aggregate(q, diagnostics, false);
      const retry = app.attempts.filter(a => a.questionId === q.id).length;
      const blended = selfScore === null ? verifiedScore ?? 0 : .6 * (verifiedScore ?? 0) + .4 * selfScore;
      const result: Attempt = { schemaVersion: 1, id: crypto.randomUUID(), questionId: q.id, variantId: `${q.id}:v${q.version}`, level: q.level, domain: q.domain, topic: q.mathematicalTopics[0], timestamp: new Date().toISOString(), elapsedSeconds: elapsed, hints, responses: structuredClone(responses), scratchpad: structuredClone(scratchpad), retry, diagnostics, verifiedScore, selfScore, effectiveScore: blended * hintFactors[hints] * (retry ? .85 : 1), correct: diagnostics.filter(d => d.automatic).every(d => d.score === 100), ...(reviewOf ? { reviewOf } : {}) };
      await app.saveAttempt(result); setAttempt(result); setPhase(activePhases[0]); heading.current?.focus();
    } catch (e) { setMessage(String(e)); } finally { busy.current = false; setSubmitting(false); }
  }
  async function openWalkthrough() { const draft: Draft = { schemaVersion: 1, id: draftId, responses, scratchpad, hints: 5, elapsedSeconds: elapsed, updatedAt: new Date().toISOString() }; try { await saveDraft(draft); setHints(5); router.push(`/solution/?id=${q.id}&draft=${encodeURIComponent(draftId)}`); } catch (e) { setMessage(String(e)); } }
  async function nextQuestion() {
    if (app.session && sessionAllowed && attempt) {
      const s = { ...app.session, index: app.session.index + 1, attemptIds: [...app.session.attemptIds, attempt.id] };
      if (s.mode === "assessment") { const strong = (attempt.verifiedScore ?? 0) >= 70; s.streak = strong ? Math.max(0, s.streak) + 1 : Math.min(0, s.streak) - 1; if (s.streak >= 2 || s.streak <= -2) { s.band = Math.max(0, Math.min(9, s.band + (s.streak > 0 ? 1 : -1))); s.streak = 0; } if (s.index < s.size) s.queue[s.index] = `L${String(s.band * 10 + 1).padStart(3, "0")}-Q${String(s.index + 1).padStart(2, "0")}`; }
      await app.setSession(s); router.push(s.index >= s.size ? `/${s.mode === "assessment" ? "assessment" : "practice"}/?summary=1` : `/question/?id=${s.queue[s.index]}`);
    } else router.push(`/level/?level=${q.level}`);
  }
  if (!app.ready || !loaded) return <div className="page" role="status">Memulihkan ruang kerja lokal…{message && <p role="alert">{message}</p>}</div>;
  if (locked) return <div className="page stack"><p className="eyebrow">PREVIEW LEVEL {q.level}</p><h1>{q.mathematicalTopics[0]}</h1><div className="panel prose"><h2>{q.scenario.title}</h2><p>{q.problem}</p></div><div className="notice">Level ini belum terbuka. Selesaikan dua dari tiga attempt terakhir dengan mastery minimal 70, atau gunakan asesmen penempatan.</div><div className="row"><Button asChild><Link href="/learn/">Jalur belajar</Link></Button><Button asChild variant="outline"><Link href="/assessment/">Mulai asesmen</Link></Button></div></div>;
  const oldMistake = app.mistakes.find(m => m.id === reviewOf), oldAttempt = app.attempts.find(a => a.id === oldMistake?.attemptId);
  return <div className="workspace-page"><header className="workspace-header"><div><Link href={`/level/?level=${q.level}`} className="text-link"><ChevronLeft size={14} />Level {q.level} · {q.mathematicalTopics[0]}</Link><h1>{q.scenario.title}</h1></div><div className="row"><span className="badge-muted">{q.id}</span><span className="badge-muted"><Clock3 size={12} className="inline" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span><button className="icon-control" aria-label={app.progress.bookmarks.includes(q.id) ? "Hapus bookmark" : "Bookmark soal"} aria-pressed={app.progress.bookmarks.includes(q.id)} onClick={() => app.bookmark(q.id).catch(e => setMessage(String(e)))}><Bookmark size={18} fill={app.progress.bookmarks.includes(q.id) ? "currentColor" : "none"} /></button><button className="icon-control" aria-label="Tampilkan atau sembunyikan alat" aria-expanded={toolsOpen} onClick={() => setToolsOpen(v => !v)}><PanelRightClose size={18} /></button></div></header>
  {sessionAllowed && <p className="notice">{app.session?.mode === "assessment" ? "Asesmen" : "Latihan"} · Soal {(app.session?.index ?? 0) + 1} dari {app.session?.size}</p>}
  <div className="reasoning-ribbon" aria-label="Alur pemodelan">{q.reasoningSteps.map((step, i) => <span key={step}><b>{String(i + 1).padStart(2, "0")}</b>{step}{i < q.reasoningSteps.length - 1 && <ChevronRight size={11} />}</span>)}</div>
  <div className="mobile-workspace-tabs">{[["context", "Konteks & data"], ["workspace", "Ruang kerja"], ["tools", "Alat bantu"]].map(([key, label]) => <button key={key} className={tab === key ? "selected" : ""} onClick={() => setTab(key)}>{label}</button>)}</div>
  <div className={`workspace ${!toolsOpen ? "tools-closed" : ""}`} data-tab={tab}><section className="scenario-panel"><div className="panel"><p className="eyebrow">KONTEKS DUNIA NYATA</p><h2>{q.domain}</h2><p className="muted">Peran: {q.scenario.role}</p><hr className="my-4 border-[var(--border)]" /><p className="leading-7">{q.problem}</p>{q.dataBlocks.filter(b => b.title !== "Data sumber").map((b, i) => <div className="notice" key={i}><strong>{b.title}</strong><p>{b.text}</p></div>)}{q.visualizations.map((v, i) => <ChartBlock key={i} spec={v} />)}{q.assumptions.length > 1 && <details><summary>Asumsi dan batas data</summary>{q.assumptions.slice(1).map((a, i) => <p className="mb-3" key={i}>{a}</p>)}</details>}</div></section>
  <section className="workspace-main"><div className="panel"><div className="section-heading"><div><p className="eyebrow">RUANG KERJAMU</p><h2 ref={heading} tabIndex={-1}>{phaseLabels[phase]}</h2></div><span className="save-status"><Save size={12} className="inline" /> {saved}</span></div><div className="phase-tabs" aria-label="Tahap pengerjaan">{activePhases.map(p => <button key={p} className={phase === p ? "selected" : ""} aria-pressed={phase === p} onClick={() => changePhase(p)}>{phaseLabels[p]}</button>)}</div>
  {message && <p className="notice mb-5" role="alert">{message}</p>}
  {attempt && <div className="notice mb-5" role="status"><strong>{attempt.correct ? "Checkpoint otomatis benar." : "Ada langkah yang perlu ditinjau."}</strong><p>Terverifikasi: {formatNumber(attempt.verifiedScore ?? 0)}%. {attempt.selfScore !== null && `Rubrik mandiri: ${formatNumber(attempt.selfScore)}%.`} Mastery attempt: {formatNumber(attempt.effectiveScore)}.</p><p className="numeric-help">Mastery memakai skor otomatis dan mandiri, faktor hint, serta retry. Alasan tertulis tidak diverifikasi otomatis.</p></div>}
  {q.interactions.filter(i => i.phase === phase).map(i => <Interaction key={i.id} spec={i} value={responses[i.id]} onChange={value => setResponses(current => ({ ...current, [i.id]: value }))} diagnostic={attempt?.diagnostics.find(d => d.interactionId === i.id)} disabled={!!attempt || submitting} />)}
  <div className="submit-bar">{!attempt ? <><small>{activePhases.indexOf(phase) + 1} / {activePhases.length} tahap</small>{activePhases.indexOf(phase) < activePhases.length - 1 ? <Button onClick={() => changePhase(activePhases[activePhases.indexOf(phase) + 1])}>Lanjutkan <ChevronRight size={16} /></Button> : <Button onClick={submit} disabled={submitting}>{submitting ? "Menyimpan…" : "Periksa jawaban"}<Check size={16} /></Button>}</> : <div className="stack full-width"><div className="row"><Button variant="outline" onClick={() => { setAttempt(undefined); setMessage("Perbaiki langkah yang ditandai, lalu kirim kembali."); }}>Revisi jawaban</Button><Button asChild variant="ghost"><Link href={`/solution/?id=${q.id}&attempt=${attempt.id}`}>Buka pembahasan</Link></Button></div><Button onClick={() => nextQuestion().catch(e => setMessage(String(e)))}>{sessionAllowed ? "Lanjut sesi" : "Kembali ke level"}<ChevronRight size={16} /></Button></div>}</div>
  {oldAttempt && attempt && <details><summary>Bandingkan dengan attempt sebelumnya</summary><p>Skor otomatis sebelumnya: {formatNumber(oldAttempt.verifiedScore ?? 0)}%. Sekarang: {formatNumber(attempt.verifiedScore ?? 0)}%.</p>{Object.entries(oldAttempt.scratchpad).map(([key, value]) => value && <p key={key}><strong>{key}:</strong> {value}</p>)}</details>}</div></section>
  <aside className="aids-panel"><p className="eyebrow">ALAT BERPIKIR</p><details open={q.level <= 15}><summary>Variabel & satuan</summary>{q.unknownVariables.map(v => <p key={v.key} className="mb-2"><strong>{v.label}</strong><br /><span className="muted">{v.unit}</span></p>)}</details><details open={q.level <= 15}><summary>Referensi model</summary>{q.level < 31 || responses.model ? <div className="formula">{q.recommendedModels[0].equation}</div> : <p>Pilih atau susun model terlebih dahulu. Referensi ini membantu mengecek pilihanmu.</p>}</details>
  <details open><summary><Lightbulb size={14} className="inline" /> Petunjuk bertahap</summary>{q.hints.slice(0, Math.min(hints, 4)).map((hint, i) => <div className="hint-item" key={i}><strong>Petunjuk {i + 1}</strong>{hint}</div>)}<div className="hint-actions">{hints < 4 ? <Button variant="outline" onClick={() => setHints(h => h + 1)}>Butuh petunjuk? ({hints}/5)</Button> : <><p className="numeric-help mb-3">Walkthrough mengurangi faktor mastery menjadi 0,50. Jawaban akan dibuka bertahap.</p><Button variant="outline" onClick={openWalkthrough}>Buka walkthrough</Button></>}</div></details>
  <details><summary>Scratchpad · tersimpan otomatis</summary><div className="scratchpad-fields">{padKeys.map(key => <label className="field" key={key}><span>{key}</span><textarea rows={2} value={scratchpad[key] ?? ""} onChange={e => setScratchpad(s => ({ ...s, [key]: e.target.value }))} /></label>)}</div></details><Link href="/guide/" className="text-link">Panduan pemodelan <ChevronRight size={13} /></Link></aside></div></div>;
}
