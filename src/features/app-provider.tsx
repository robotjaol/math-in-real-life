"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Attempt, MistakeRecord, Progress, Question, QuestionMeta, Session, Settings } from "@/domain/question/types";
import { freshProgress, updateProgress } from "@/domain/assessment/engine";
import * as storage from "@/persistence/storage";
type AppState = { ready: boolean; error: string; progress: Progress; settings: Settings; attempts: Attempt[]; mistakes: MistakeRecord[]; session: Session | null; refresh: () => Promise<void>; saveAttempt: (a: Attempt) => Promise<void>; bookmark: (id: string) => Promise<void>; configure: (s: Settings) => void; setSession: (s: Session | null) => Promise<void>; reportError: (message: string) => void };
const Context = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  const [progress, setProgress] = useState(freshProgress), [settings, setSettings] = useState(storage.defaultSettings), [attempts, setAttempts] = useState<Attempt[]>([]), [mistakes, setMistakes] = useState<MistakeRecord[]>([]), [session, setSessionState] = useState<Session | null>(null);
  const refresh = useCallback(async () => { try { const [p, a, m, s] = await Promise.all([storage.readProgress(), storage.readAll<Attempt>("attempts"), storage.readAll<MistakeRecord>("mistakes"), storage.readSession()]); setProgress(p); setAttempts(a); setMistakes(m); setSessionState(s); setSettings(storage.readSettings()); setError(""); setReady(true); } catch (e) { setError(String(e)); } }, []);
  useEffect(() => { void refresh(); if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") void navigator.serviceWorker.register("/sw.js").catch(() => setError("Cache offline belum tersedia. Coba muat ulang saat terhubung.")); }, [refresh]);
  useEffect(() => { const mq = window.matchMedia("(prefers-color-scheme: dark)"); const apply = () => document.documentElement.dataset.theme = settings.theme === "system" ? mq.matches ? "dark" : "light" : settings.theme; apply(); mq.addEventListener("change", apply); document.documentElement.dataset.motion = settings.reducedMotion ? "reduced" : "auto"; return () => mq.removeEventListener("change", apply); }, [settings]);
  const saveAttempt = async (a: Attempt) => {
    const latest = await storage.readAll<Attempt>("attempts");
    if (latest.some(row => row.id === a.id)) return;
    const p = updateProgress(await storage.readProgress(), a, latest);
    const errors = [...new Set(a.diagnostics.filter(d => d.automatic && d.score < 100).map(d => d.errorTag ?? "wrong model"))];
    const records: Parameters<typeof storage.writeRecords>[0] = [{ store: "attempts", value: a }, { store: "meta", value: { id: "progress", ...{ value: p } } }, { store: "events", value: { id: a.id, ...{ type: "attempt", timestamp: a.timestamp, questionId: a.questionId } } }];
    if (errors.length) records.push({ store: "mistakes", value: { id: `mistake:${a.id}`, ...{ schemaVersion: 1, questionId: a.questionId, attemptId: a.id, variantId: a.variantId, errorTags: errors, timestamp: a.timestamp, resolved: false, revisitCount: 0, nextReview: new Date(Date.now() + 86400000).toISOString() } } });
    if (a.reviewOf) { const old = await storage.readOne<MistakeRecord>("mistakes", a.reviewOf); if (old) { const updated = { ...old, resolved: a.correct, revisitCount: old.revisitCount + 1, nextReview: new Date(Date.now() + [1, 3, 7, 21][Math.min(old.revisitCount + 1, 3)] * 86400000).toISOString() }; records.push({ store: "mistakes", value: updated }); } }
    await storage.writeRecords(records); await refresh();
  };
  const bookmark = async (id: string) => { const p = await storage.readProgress(); p.bookmarks = p.bookmarks.includes(id) ? p.bookmarks.filter(x => x !== id) : [...p.bookmarks, id]; await storage.saveProgress(p); setProgress(p); };
  const configure = (s: Settings) => { try { storage.saveSettings(s); setSettings(s); } catch (e) { setError(String(e)); } };
  const setSession = async (s: Session | null) => { await storage.saveSession(s); setSessionState(s); };
  return <Context.Provider value={{ ready, error, progress, settings, attempts, mistakes, session, refresh, saveAttempt, bookmark, configure, setSession, reportError: setError }}>{children}</Context.Provider>;
}
export function useApp() { const app = useContext(Context); if (!app) throw new Error("AppProvider required"); return app; }
let metaPromise: Promise<QuestionMeta[]> | undefined;
export function loadIndex(): Promise<QuestionMeta[]> { if (!metaPromise) metaPromise = fetch("/content/index.json").then(r => { if (!r.ok) throw new Error("Indeks soal belum tersedia offline. Buka library saat terhubung terlebih dahulu."); return r.json(); }).catch(e => { metaPromise = undefined; throw e; }); return metaPromise; }
const levels = new Map<number, Promise<Question[]>>();
export function loadLevel(level: number): Promise<Question[]> {
  if (!Number.isInteger(level) || level < 1 || level > 100) return Promise.reject(new Error("Level tidak valid."));
  if (!levels.has(level)) levels.set(level, fetch(`/content/level-${String(level).padStart(3, "0")}.json`).then(r => { if (!r.ok) throw new Error("Level ini belum tersimpan offline. Buka sekali saat terhubung, lalu coba lagi."); return r.json(); }).catch(e => { levels.delete(level); throw e; }));
  return levels.get(level)!;
}
export async function loadQuestion(id: string): Promise<Question> { if (!/^L\d{3}-Q\d{2}$/.test(id)) throw new Error("ID soal tidak valid."); const q = (await loadLevel(Number(id.slice(1, 4)))).find(q => q.id === id); if (!q) throw new Error("Soal tidak ditemukan."); return q; }
export function useIndex() { const [data, setData] = useState<QuestionMeta[]>([]), [error, setError] = useState(""); useEffect(() => { let alive = true; loadIndex().then(rows => { if (alive) setData(rows); }).catch(e => { if (alive) setError(String(e)); }); return () => { alive = false; }; }, []); return { data, error }; }
