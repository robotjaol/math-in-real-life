import { z } from "zod";
import type { Attempt, Draft, MistakeRecord, Progress, Session, Settings } from "@/domain/question/types";
import { freshProgress } from "@/domain/assessment/engine";

export const defaultSettings: Settings = { schemaVersion: 1, theme: "system", reducedMotion: false, difficultyView: "score" };
const stores = ["attempts", "mistakes", "variants", "events", "drafts", "meta"] as const;
type Store = typeof stores[number];
let connection: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open("modelmath-db", 1);
    request.onupgradeneeded = () => { for (const name of stores) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: "id" }); };
    request.onerror = () => { connection = undefined; reject(new Error("Penyimpanan browser tidak tersedia. Izinkan penyimpanan situs agar progress dapat disimpan.")); };
    request.onblocked = () => { connection = undefined; reject(new Error("Tutup tab ModelMath lain agar migrasi penyimpanan dapat berjalan.")); };
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = undefined; }; resolve(request.result); };
  });
  return connection;
}
export async function readAll<T>(store: Store): Promise<T[]> { const db = await database(); return new Promise((resolve, reject) => { const request = db.transaction(store).objectStore(store).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
export async function readOne<T>(store: Store, id: string): Promise<T | undefined> { const db = await database(); return new Promise((resolve, reject) => { const request = db.transaction(store).objectStore(store).get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
export async function writeRecords(records: { store: Store; value: { id: string } }[], clear = false): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => { const transaction = db.transaction([...new Set(clear ? stores : records.map(r => r.store))], "readwrite");
    if (clear) for (const store of stores) transaction.objectStore(store).clear();
    for (const row of records) transaction.objectStore(row.store).put(row.value);
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(new Error("Penyimpanan gagal. Ruang perangkat mungkin penuh. Ekspor data sebelum menghapus apa pun.")); transaction.onabort = () => reject(new Error("Transaksi penyimpanan dibatalkan; data lama dipertahankan."));
  });
}
export async function saveDraft(draft: Draft) { return writeRecords([{ store: "drafts", value: draft }]); }
export async function getDraft(id: string) { return readOne<Draft>("drafts", id); }
export function readSettings(): Settings { const raw = localStorage.getItem("modelmath:settings"); return raw ? settingsSchema.parse(JSON.parse(raw)) : { ...defaultSettings }; }
export function saveSettings(settings: Settings) { localStorage.setItem("modelmath:settings", JSON.stringify(settings)); }
export async function readProgress(): Promise<Progress> {
  const saved = await readOne<{ id: string; value: Progress }>("meta", "progress");
  const legacy = localStorage.getItem("modelmath:progress");
  return saved ? progressSchema.parse(saved.value) : legacy ? progressSchema.parse(migrate(JSON.parse(legacy))) : freshProgress();
}
export async function saveProgress(progress: Progress) {
  await writeRecords([{ store: "meta", value: { id: "progress", ...{ value: progress } } }]);
  try { localStorage.setItem("modelmath:progress", JSON.stringify(progress)); } catch { /* IndexedDB remains authoritative. */ }
}
export async function saveSession(session: Session | null) {
  await writeRecords([{ store: "meta", value: { id: "session", ...{ value: session } } }]);
  localStorage.setItem("modelmath:session", JSON.stringify(session ? { id: session.id } : null));
}
export async function readSession(): Promise<Session | null> { const row = await readOne<{ id: string; value: Session | null }>("meta", "session"); return row?.value ?? null; }

const score = z.number().finite().min(0).max(100);
const phase = z.enum(["formulation", "model", "calculation", "validation", "interpretation", "decision"]);
const questionId = z.string().regex(/^L(?:00[1-9]|0[1-9]\d|100)-Q(?:0[1-9]|[1-4]\d|50)$/);
const response = z.object({ text: z.string().max(100000).optional(), selections: z.array(z.string()).optional(), unit: z.string().optional(), rubric: z.array(z.number().int().min(0).max(2)).optional() });
const mastery = z.object({ score, evidenceCount: z.number().int().nonnegative(), recentTrend: z.number().finite(), selfScore: score, selfEvidenceCount: z.number().int().nonnegative() });
const progressSchema = z.object({ schemaVersion: z.literal(1), unlockedLevel: z.number().int().min(1).max(100), completed: z.array(questionId), bookmarks: z.array(questionId), competencies: z.object({ formulation: mastery, model: mastery, calculation: mastery, validation: mastery, interpretation: mastery, decision: mastery }) });
const settingsSchema = z.object({ schemaVersion: z.literal(1), theme: z.enum(["light", "dark", "system"]), reducedMotion: z.boolean(), difficultyView: z.enum(["score", "dimensions"]) });
const attemptSchema = z.object({ schemaVersion: z.literal(1), id: z.string(), questionId, variantId: z.string(), level: z.number().int().min(1).max(100), domain: z.string(), topic: z.string(), timestamp: z.string().datetime(), elapsedSeconds: z.number().finite().nonnegative(), hints: z.number().int().min(0).max(5), responses: z.record(z.string(), response), scratchpad: z.record(z.string(), z.string()), retry: z.number().int().nonnegative(), diagnostics: z.array(z.object({ interactionId: z.string(), phase, score, automatic: z.boolean(), message: z.string(), errorTag: z.string().optional() })), verifiedScore: score.nullable(), selfScore: score.nullable(), effectiveScore: score, correct: z.boolean(), reviewOf: z.string().optional() });
const mistakeSchema = z.object({ schemaVersion: z.literal(1), id: z.string(), questionId, attemptId: z.string(), variantId: z.string(), errorTags: z.array(z.string()), timestamp: z.string().datetime(), resolved: z.boolean(), revisitCount: z.number().int().nonnegative(), nextReview: z.string().datetime() });
const draftSchema = z.object({ schemaVersion: z.literal(1), id: z.string(), responses: z.record(z.string(), response), scratchpad: z.record(z.string(), z.string()), hints: z.number().int().min(0).max(5), elapsedSeconds: z.number().finite().nonnegative(), updatedAt: z.string().datetime() });
const sessionSchema = z.object({ schemaVersion: z.literal(1), id: z.string(), mode: z.enum(["practice", "assessment"]), queue: z.array(questionId), index: z.number().int().nonnegative(), attemptIds: z.array(z.string()), size: z.number().int().min(1).max(20), band: z.number().int().min(0).max(9), streak: z.number().int() });
const auxiliarySchema = z.record(z.string(), z.unknown()).and(z.object({ id: z.string() }));
const backupSchema = z.object({ schemaVersion: z.literal(1), contentVersion: z.literal(1), exportedAt: z.string().datetime(), progress: progressSchema, settings: settingsSchema, attempts: z.array(attemptSchema), mistakes: z.array(mistakeSchema), drafts: z.array(draftSchema), session: sessionSchema.nullable(), variants: z.array(auxiliarySchema), events: z.array(auxiliarySchema) });
export type Backup = z.infer<typeof backupSchema>;
export function migrate(value: unknown): unknown {
  if (!value || typeof value !== "object") throw new Error("Format data tidak valid.");
  const row = value as Record<string, unknown>;
  if (row.schemaVersion === 1) return value;
  // Explicit v0 summary migration. Unknown versions are never silently reset.
  if (row.schemaVersion === 0 && "unlockedLevel" in row) return { ...freshProgress(), ...row, schemaVersion: 1 };
  throw new Error("Versi data belum didukung. Ekspor data lama sebelum mencoba reset.");
}
export function parseBackup(text: string): Backup {
  if (text.length > 50_000_000) throw new Error("File melebihi batas 50 MB.");
  const data = backupSchema.parse(migrate(JSON.parse(text)));
  for (const rows of [data.attempts, data.mistakes, data.drafts, data.variants, data.events]) if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error("ID data duplikat.");
  const attemptIds = new Set(data.attempts.map(a => a.id));
  if (data.mistakes.some(m => !attemptIds.has(m.attemptId))) throw new Error("Mistake mengacu pada attempt yang tidak tersedia.");
  if (data.session && (data.session.index > data.session.queue.length || data.session.attemptIds.some(id => !attemptIds.has(id)))) throw new Error("Session tidak konsisten.");
  return data;
}
export async function exportBackup(): Promise<Backup> {
  const [progress, attempts, mistakes, drafts, session, variants, events] = await Promise.all([readProgress(), readAll<Attempt>("attempts"), readAll<MistakeRecord>("mistakes"), readAll<Draft>("drafts"), readSession(), readAll<{ id: string }>("variants"), readAll<{ id: string }>("events")]);
  return { schemaVersion: 1, contentVersion: 1, exportedAt: new Date().toISOString(), progress, settings: readSettings(), attempts, mistakes, drafts, session, variants, events };
}
export async function importBackup(data: Backup) {
  const valid = parseBackup(JSON.stringify(data));
  const records: { store: Store; value: { id: string } }[] = [];
  for (const store of ["attempts", "mistakes", "drafts", "variants", "events"] as const) for (const value of valid[store]) records.push({ store, value });
  records.push({ store: "meta", value: { id: "progress", ...{ value: valid.progress } } }, { store: "meta", value: { id: "session", ...{ value: valid.session } } });
  await writeRecords(records, true); saveSettings(valid.settings); localStorage.setItem("modelmath:progress", JSON.stringify(valid.progress));
}
export async function resetData() { await writeRecords([], true); for (const key of ["settings", "progress", "session", "contentVersion"]) localStorage.removeItem(`modelmath:${key}`); }
export async function exportRawRecovery(): Promise<string> { const raw: Record<string, unknown> = { exportedAt: new Date().toISOString(), recovery: true }; for (const name of stores) raw[name] = await readAll(name); raw.localStorage = Object.fromEntries(["settings", "progress", "session"].map(k => [k, localStorage.getItem(`modelmath:${k}`)])); return JSON.stringify(raw, null, 2); }
