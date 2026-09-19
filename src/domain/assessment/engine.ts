import type { Attempt, Diagnostic, DifficultyProfile, InteractionSpec, Mastery, Phase, Progress, Question, ResponseValue, Responses } from "../question/types";

export const phases: Phase[] = ["formulation", "model", "calculation", "validation", "interpretation", "decision"];
export const phaseLabels: Record<Phase, string> = { formulation: "Formulasi", model: "Model", calculation: "Perhitungan", validation: "Validasi", interpretation: "Interpretasi", decision: "Keputusan" };
export const hintFactors = [1, .95, .88, .78, .65, .5];
export function difficultyScore(d: DifficultyProfile): number {
  const weights = [.14, .10, .14, .10, .10, .10, .08, .08, .08, .08];
  const keys: (keyof DifficultyProfile)[] = ["conceptComplexity", "variableCount", "reasoningDepth", "dataComplexity", "constraintCount", "operationComplexity", "abstractionLevel", "uncertainty", "interpretationComplexity", "decisionComplexity"];
  return Math.round(keys.reduce((sum, k, i) => sum + (d[k] - 1) * weights[i], 0) * 25);
}
const unitMap: Record<string, { dimension: string; scale: number }> = {
  jam: { dimension: "time", scale: 3600 }, hour: { dimension: "time", scale: 3600 }, menit: { dimension: "time", scale: 60 }, minute: { dimension: "time", scale: 60 }, detik: { dimension: "time", scale: 1 },
  m: { dimension: "length", scale: 1 }, km: { dimension: "length", scale: 1000 }, cm: { dimension: "length", scale: .01 },
  "resource-unit": { dimension: "resource", scale: 1 }, "kilo-resource-unit": { dimension: "resource", scale: 1000 },
  "%": { dimension: "ratio", scale: .01 }, rasio: { dimension: "ratio", scale: 1 }, "tanpa satuan": { dimension: "ratio", scale: 1 },
};
export function parseNumeric(text: string): number | null {
  const s = text.trim().replace(/−/g, "-");
  if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(s)) { const [a, b] = s.split("/").map(Number); return b ? a / b : null; }
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
  const value = Number(s.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
export function normalizeUnit(value: number, from: string, to: string): number | null {
  if (from.trim().toLowerCase() === to.trim().toLowerCase()) return value;
  const a = unitMap[from.toLowerCase()], b = unitMap[to.toLowerCase()];
  return a && b && a.dimension === b.dimension ? value * a.scale / b.scale : null;
}
export function validateInteraction(i: InteractionSpec, response: ResponseValue = {}): Diagnostic {
  const v = i.validator;
  const base = { interactionId: i.id, phase: i.phase, automatic: v.kind !== "rubric" };
  let score = 0, errorTag = i.phase === "calculation" ? "wrong calculation" : i.phase === "model" ? "wrong model" : i.phase === "decision" ? "wrong decision" : "relevant-data error";
  if (v.kind === "rubric") {
    const ratings = response.rubric ?? [];
    score = response.text?.trim() ? v.criteria.reduce((sum, _, idx) => sum + Math.max(0, Math.min(2, ratings[idx] ?? 0)), 0) / (2 * v.criteria.length) * 100 : 0;
    return { ...base, score, message: "Penilaian mandiri berdasarkan rubrik; kualitas alasan belum diverifikasi otomatis." };
  }
  if (v.kind === "numeric") {
    const value = parseNumeric(response.text ?? "");
    const normalized = value === null ? null : normalizeUnit(value, response.unit ?? v.unit, v.unit);
    if (value === null) return { ...base, score: 0, errorTag, message: "Masukkan angka valid. Pecahan dan koma desimal diterima; jangan gunakan pemisah ribuan." };
    if (normalized === null) { errorTag = "wrong unit"; return { ...base, score: 0, errorTag, message: "Satuan tidak kompatibel. Periksa dimensi dan konversinya." }; }
    score = Math.abs(normalized - v.value) <= v.tolerance + 1e-10 ? 100 : 0;
  } else if (v.kind === "choice") score = response.text === v.value ? 100 : 0;
  else if (v.kind === "set") { const chosen = new Set(response.selections ?? []); score = Math.max(0, (v.values.filter(x => chosen.has(x)).length - [...chosen].filter(x => !v.values.includes(x)).length) / Math.max(1, v.values.length) * 100); }
  else if (v.kind === "ordered" || v.kind === "equation") {
    const expected = v.kind === "ordered" ? v.values : v.tokens;
    score = expected.length === response.selections?.length && expected.every((x, idx) => x === response.selections?.[idx]) ? 100 : 0;
  }
  return { ...base, score, message: score === 100 ? "Langkah ini benar." : "Periksa kembali hubungan, data, satuan, atau urutan pada langkah ini. Anda dapat merevisi sebelum membuka pembahasan.", ...(score < 100 ? { errorTag } : {}) };
}
export function grade(q: Question, responses: Responses) { return q.interactions.map(i => validateInteraction(i, responses[i.id])); }
export function aggregate(q: Question, diagnostics: Diagnostic[], automatic: boolean): number | null {
  const rows = diagnostics.filter(d => d.automatic === automatic);
  const weight = (d: Diagnostic) => q.interactions.find(i => i.id === d.interactionId)?.weight ?? 1;
  return rows.length ? rows.reduce((sum, d) => sum + d.score * weight(d), 0) / rows.reduce((sum, d) => sum + weight(d), 0) : null;
}
export function freshProgress(): Progress {
  return { schemaVersion: 1, unlockedLevel: 1, completed: [], bookmarks: [], competencies: Object.fromEntries(phases.map(p => [p, { score: 0, evidenceCount: 0, recentTrend: 0, selfScore: 0, selfEvidenceCount: 0 }])) as Record<Phase, Mastery> };
}
export function updateProgress(progress: Progress, attempt: Attempt, history: Attempt[]): Progress {
  const next = structuredClone(progress);
  for (const phase of phases) {
    const m = next.competencies[phase];
    for (const automatic of [true, false]) {
      const ds = attempt.diagnostics.filter(d => d.phase === phase && d.automatic === automatic);
      if (!ds.length) continue;
      const raw = ds.reduce((sum, d) => sum + d.score, 0) / ds.length;
      const score = raw * hintFactors[Math.min(5, attempt.hints)] * (attempt.retry ? .85 : 1);
      if (automatic) { const old = m.score; m.score = m.evidenceCount ? .75 * old + .25 * score : score; m.evidenceCount++; m.recentTrend = m.score - old; }
      else { m.selfScore = m.selfEvidenceCount ? .75 * m.selfScore + .25 * score : score; m.selfEvidenceCount++; }
    }
  }
  if (attempt.correct && !next.completed.includes(attempt.questionId)) next.completed.push(attempt.questionId);
  const recent = [...history.filter(a => a.id !== attempt.id), attempt].filter(a => a.level === attempt.level).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3);
  if (attempt.level <= next.unlockedLevel && recent.length >= 3 && recent.filter(a => a.effectiveScore >= 70).length >= 2) next.unlockedLevel = Math.max(next.unlockedLevel, Math.min(100, attempt.level + 1));
  return next;
}
