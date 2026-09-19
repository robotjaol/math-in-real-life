import { describe, expect, it } from "vitest";
import { aggregate, difficultyScore, freshProgress, grade, normalizeUnit, parseNumeric, updateProgress, validateInteraction } from "@/domain/assessment/engine";
import { dailyId, generateRateVariant, seeded } from "@/domain/generation/prng";
import { defaultSettings, migrate, parseBackup } from "@/persistence/storage";
import type { Attempt, DifficultyProfile, Question } from "@/domain/question/types";
import fs from "node:fs";
const q = JSON.parse(fs.readFileSync("public/content/level-001.json", "utf8"))[0] as Question;
function attempt(id: string, value: number): Attempt { return { schemaVersion: 1, id, questionId: q.id, variantId: q.id, level: 1, domain: q.domain, topic: q.mathematicalTopics[0], timestamp: `2026-09-${id.padStart(2, "0")}T12:00:00.000Z`, elapsedSeconds: 60, hints: 0, responses: {}, scratchpad: {}, retry: 0, diagnostics: [{ interactionId: "answer-0", phase: "calculation", score: value, automatic: true, message: "" }], verifiedScore: value, selfScore: null, effectiveScore: value, correct: value === 100 }; }
describe("numeric validation", () => {
  it("supports decimal comma, fractions, negative values and exponent", () => { expect(parseNumeric("1,25")).toBe(1.25); expect(parseNumeric("3/4")).toBe(.75); expect(parseNumeric("−0.5")).toBe(-.5); expect(parseNumeric("1e3")).toBe(1000); });
  it("rejects unsafe or ambiguous input", () => { for (const s of ["", "Infinity", "NaN", "1/0", "1,000.00", "alert(1)", "2+2"]) expect(parseNumeric(s)).toBeNull(); });
  it("normalizes compatible units only", () => { expect(normalizeUnit(90, "menit", "jam")).toBe(1.5); expect(normalizeUnit(75, "%", "rasio")).toBe(.75); expect(normalizeUnit(3, "m", "jam")).toBeNull(); });
  it("keeps unit errors separate from arithmetic", () => { const i = q.interactions.find(i => i.validator.kind === "numeric")!; expect(validateInteraction(i, { text: "122", unit: "kelvin" }).errorTag).toBe("wrong unit"); expect(validateInteraction(i, { text: "120", unit: "item" }).errorTag).toBe("wrong calculation"); expect(validateInteraction(i, { text: "122", unit: "item" }).score).toBe(100); });
  it("does not award an empty rubric", () => { const i = { id: "r", phase: "decision" as const, type: "Decision Making", prompt: "", weight: 1, explanation: "", validator: { kind: "rubric" as const, criteria: ["a", "b"] } }; expect(validateInteraction(i, { rubric: [2, 2] }).score).toBe(0); expect(validateInteraction(i, { text: "Bukti", rubric: [2, 1] })).toMatchObject({ score: 75, automatic: false }); });
});
describe("progress", () => {
  it("requires two qualifying attempts in a complete three-attempt window", () => { let p = freshProgress(); const a = attempt("01", 100), b = attempt("02", 20), c = attempt("03", 100); p = updateProgress(p, a, []); expect(p.unlockedLevel).toBe(1); p = updateProgress(p, b, [a]); expect(p.unlockedLevel).toBe(1); p = updateProgress(p, c, [a, b]); expect(p.unlockedLevel).toBe(2); });
  it("keeps self evidence separate and applies hints", () => { const a = attempt("01", 100); a.hints = 5; a.diagnostics.push({ interactionId: "d", phase: "decision", score: 100, automatic: false, message: "" }); const p = updateProgress(freshProgress(), a, []); expect(p.competencies.calculation.score).toBe(50); expect(p.competencies.decision.evidenceCount).toBe(0); expect(p.competencies.decision.selfScore).toBe(50); });
  it("uses explicit difficulty weights independent of property order", () => { const keys = Object.keys(q.difficulty); expect(difficultyScore(Object.fromEntries(keys.reverse().map(k => [k, 5])) as DifficultyProfile)).toBe(100); expect(difficultyScore(q.difficulty)).toBe(0); });
});
describe("deterministic generation", () => {
  it("replays PRNG and variants exactly", () => { const a = seeded("abc"), b = seeded("abc"); expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b)); expect(generateRateVariant(12)).toEqual(generateRateVariant(12)); expect(dailyId(["a", "b", "c"], "2026-09-19")).toBe(dailyId(["a", "b", "c"], "2026-09-19")); });
  it("preserves invariants and varies context and constraints over 1000 seeds", () => { const variants = Array.from({ length: 1000 }, (_, i) => generateRateVariant(i)); expect(new Set(variants.map(v => v.context)).size).toBe(3); expect(new Set(variants.map(v => v.downtime.length)).size).toBe(3); for (const v of variants) { expect(v.availableHours).toBeGreaterThan(0); expect(v.requiredRate * v.availableHours + v.completed).toBeCloseTo(v.target); expect(v.feasible).toBe(v.requiredRate <= v.capacity); } });
});
describe("backup validation and migration", () => {
  const backup = { schemaVersion: 1, contentVersion: 1, exportedAt: "2026-09-19T00:00:00.000Z", progress: freshProgress(), settings: defaultSettings, attempts: [], mistakes: [], drafts: [], session: null, variants: [], events: [] };
  it("roundtrips a complete backup", () => expect(parseBackup(JSON.stringify(backup))).toEqual(backup));
  it("rejects future versions, malformed scores and broken references", () => { expect(() => parseBackup(JSON.stringify({ ...backup, schemaVersion: 9 }))).toThrow(); expect(() => parseBackup(JSON.stringify({ ...backup, progress: { ...backup.progress, unlockedLevel: 900 } }))).toThrow(); expect(() => migrate({ schemaVersion: 99 })).toThrow(); });
  it("migrates v0 summaries without losing bookmarks", () => expect(migrate({ schemaVersion: 0, unlockedLevel: 4, bookmarks: ["L001-Q01"] })).toMatchObject({ schemaVersion: 1, unlockedLevel: 4, bookmarks: ["L001-Q01"] }));
});
