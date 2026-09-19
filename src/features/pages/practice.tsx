"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Shuffle, Target } from "lucide-react";
import { PageHeader } from "./catalog";
import { useApp, useIndex } from "@/features/app-provider";
import { Button } from "@/components/ui/button";
import { dailyId, shuffled } from "@/domain/generation/prng";
import { formatNumber } from "@/lib/utils";
import { saveProgress } from "@/persistence/storage";
import curriculum from "@/data/curriculum.json";
import { selectPractice } from "@/domain/generation/selection";
export function PracticePage({ assessment = false }: { assessment?: boolean }) {
  const app = useApp(), { data, error } = useIndex(), router = useRouter();
  const [size, setSize] = useState(5), [domain, setDomain] = useState(""), [topic, setTopic] = useState(""), [difficulty, setDifficulty] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const s = app.session, relevantSession = s?.mode === (assessment ? "assessment" : "practice"), complete = relevantSession && s.index >= s.size;
  const results = app.attempts.filter(a => s?.attemptIds.includes(a.id));
  const eligible = data.filter(q => q.level <= app.progress.unlockedLevel && (!domain || q.domain === domain) && (!topic || q.topic === topic) && (!difficulty || (difficulty === "foundation" ? q.difficulty < 35 : difficulty === "intermediate" ? q.difficulty >= 35 && q.difficulty < 65 : q.difficulty >= 65)));
  const domains = [...new Set(data.map(q => q.domain))].sort();
  const placement = results.filter(a => (a.verifiedScore ?? 0) >= 70).reduce((level, a) => Math.max(level, a.level), 1);
  async function begin() {
    if (!app.ready || !data.length || busy) return; setBusy(true); setMessage("");
    try {
      const id = crypto.randomUUID();
      const queue = assessment ? ["L041-Q01"] : selectPractice(eligible, app.attempts, app.mistakes, id, size);
      if (!queue.length) throw new Error("Belum ada soal terbuka untuk filter ini. Ubah filter atau lakukan asesmen.");
      const session = { schemaVersion: 1 as const, id, mode: assessment ? "assessment" as const : "practice" as const, queue, index: 0, attemptIds: [], size: assessment ? 20 : Math.min(size, queue.length), band: 4, streak: 0 };
      await app.setSession(session); router.push(`/question/?id=${queue[0]}`);
    } catch (e) { setMessage(String(e)); setBusy(false); }
  }
  return <div className="page"><PageHeader eyebrow={assessment ? "20 SOAL · PENEMPATAN LOKAL" : "LATIHAN SESUAI TUJUANMU"} title={assessment ? "Temukan titik awalmu." : "Rancang sesi belajarmu."} description={assessment ? "Dimulai dari band menengah, lalu menyesuaikan setiap dua jawaban kuat atau lemah. Hasil adalah rekomendasi, bukan nilai permanen." : "Pilih fokus dan durasi. Rekomendasi memprioritaskan kesalahan yang perlu ditinjau dan soal yang belum selesai."} />
  {complete && <section className="session-summary mb-6"><h2>Sesi selesai.</h2><p className="my-3">{results.length} soal · Rata-rata otomatis {formatNumber(results.reduce((sum, a) => sum + (a.verifiedScore ?? 0), 0) / Math.max(1, results.length))}% · {results.filter(a => a.correct).length} checkpoint lengkap benar.</p>{assessment && <><p>Rekomendasi titik awal: <strong>level {placement}</strong>. Penempatan mengikuti bukti otomatis; kualitas alasan tetap tercatat melalui rubrik mandiri.</p><Button className="mt-4" onClick={async () => { try { await saveProgress({ ...app.progress, unlockedLevel: Math.max(app.progress.unlockedLevel, placement) }); await app.refresh(); router.push(`/level/?level=${placement}`); } catch (e) { setMessage(String(e)); } }}>Gunakan penempatan <ArrowRight size={16} /></Button></>}<Link className="text-link ml-3" href="/progress/">Lihat profil kompetensi</Link></section>}
  {relevantSession && !complete && <div className="notice mb-6"><p>Sesi tersimpan: {s.index + 1} dari {s.size} soal.</p><Button asChild variant="outline" className="mt-3"><Link href={`/question/?id=${s.queue[s.index]}`}>Lanjutkan sesi</Link></Button></div>}
  <div className="grid-2"><section className="panel stack"><div className="row"><Target size={22} /><h2>{assessment ? "Asesmen adaptif" : "Atur latihan"}</h2></div>{assessment ? <div className="prose"><p>Asesmen mencakup formulasi, perhitungan, dan interpretasi. Anda bisa berhenti dan melanjutkan kapan saja.</p><ul><li>Dua skor otomatis ≥70: naik satu band.</li><li>Dua skor otomatis di bawah 70: turun satu band.</li><li>Progress yang sudah terbuka tetap dipertahankan.</li></ul></div> : <><label className="field"><span>Jumlah soal</span><select value={size} onChange={e => setSize(Number(e.target.value))}><option value={5}>5 soal · sesi singkat</option><option value={10}>10 soal · sesi fokus</option><option value={20}>20 soal · sesi mendalam</option></select></label><label className="field"><span>Domain</span><select value={domain} onChange={e => setDomain(e.target.value)}><option value="">Semua domain</option>{domains.map(d => <option key={d}>{d}</option>)}</select></label><label className="field"><span>Topik</span><select value={topic} onChange={e => setTopic(e.target.value)}><option value="">Semua topik terbuka</option>{curriculum.filter(l => l.level <= app.progress.unlockedLevel).map(l => <option key={l.level}>{l.topic}</option>)}</select></label><label className="field"><span>Kesulitan</span><select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="">Adaptif berdasarkan progress</option><option value="foundation">Fondasi · di bawah 35</option><option value="intermediate">Menengah · 35–64</option><option value="advanced">Lanjut · 65–100</option></select></label><p className="text-xs">{eligible.length} soal memenuhi filter. Sesi memakai soal unik yang tersedia, maksimal {size} soal.</p></>}{(error || message) && <p role="alert" className="error-text">{message || error}</p>}<Button onClick={begin} disabled={busy || !app.ready || !data.length}>{busy ? "Menyiapkan sesi…" : relevantSession && !complete ? "Ganti dengan sesi baru" : assessment ? "Mulai asesmen" : "Mulai latihan"}<ArrowRight size={16} /></Button></section>
  <aside className="stack"><div className="panel prose"><p className="eyebrow">BELAJAR DENGAN SENGAJA</p><h2>Prosesnya ikut dihitung.</h2><p>Mulai dengan mengenali data dan membangun hubungan. Jawaban numerik hanya satu bagian dari pekerjaan.</p><p>Gunakan scratchpad untuk menyimpan asumsi. Saat salah, revisi dulu sebelum membuka pembahasan lengkap.</p></div><Link href="/random/" className="panel row space-between"><span><Shuffle size={18} className="inline mr-2" />Pilihkan satu soal untukku</span><ArrowRight size={16} /></Link><Link href="/mistakes/" className="panel row space-between"><span>Tinjau kesalahan sebelumnya</span><ArrowRight size={16} /></Link></aside></div></div>;
}
export function Challenge({ daily = false }: { daily?: boolean }) {
  const app = useApp(), { data, error } = useIndex(), [selected, setSelected] = useState<string>();
  useEffect(() => { if (!data.length || !app.ready) return; const ids = data.filter(q => daily || q.level <= app.progress.unlockedLevel).map(q => q.id); setSelected(daily ? dailyId(ids) : shuffled(ids, crypto.randomUUID())[0]); }, [data, daily, app.ready, app.progress.unlockedLevel]);
  const q = data.find(q => q.id === selected);
  return <div className="page"><PageHeader eyebrow={daily ? "TANTANGAN HARIAN" : "EKSPLORASI ACAK"} title={daily ? "Satu hari, satu cara pikir baru." : "Siap untuk masalah berikutnya?"} description={daily ? "Soal yang sama untuk setiap pengguna dengan tanggal lokal dan versi kurikulum yang sama. Tantangan dapat melampaui level yang sudah terbuka." : "Dipilih dari level yang sudah terbuka di perangkatmu."} />{error && <p role="alert">{error}</p>}{q ? <section className="panel stack max-w-2xl"><span className="tag w-fit">Level {q.level} · {q.domain}</span><h2>{q.title}</h2><p>{q.topic} · {q.estimatedMinutes} menit</p><Button asChild><Link href={`/question/?id=${q.id}${daily ? "&challenge=daily" : ""}`}>Buka tantangan <ArrowRight size={16} /></Link></Button></section> : <p role="status">Memilih tantangan…</p>}</div>;
}
