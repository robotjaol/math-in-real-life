export function hash(seed: string): number { let value = 2166136261; for (const char of seed) { value ^= char.charCodeAt(0); value = Math.imul(value, 16777619); } return value >>> 0; }
export function seeded(seed: string): () => number { let a = hash(seed); return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function shuffled<T>(items: T[], seed: string): T[] { const random = seeded(seed), result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
export function localDate(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function dailyId(ids: string[], date = localDate()): string { return ids[hash(`${date}:curriculum-1`) % ids.length]; }
export type RateVariant = { templateId: "recovery-rate"; variantNumber: number; curriculumVersion: 1; context: string; target: number; completed: number; hours: number; downtime: number[]; capacity: number; availableHours: number; requiredRate: number; feasible: boolean };
export function generateRateVariant(variantNumber: number): RateVariant {
  if (!Number.isInteger(variantNumber) || variantNumber < 0) throw new Error("Nomor variant tidak valid");
  const r = seeded(`recovery-rate:${variantNumber}:1`);
  const context = ["produksi", "backlog pusat layanan", "picking gudang"][Math.floor(r() * 3)];
  const target = 300 + Math.floor(r() * 500), completed = Math.floor(target * r() * .3), hours = 6 + Math.floor(r() * 4);
  const downtime = Array.from({ length: 1 + Math.floor(r() * 3) }, () => 15 + Math.floor(r() * 30));
  const availableHours = hours - downtime.reduce((a, b) => a + b, 0) / 60;
  if (availableHours <= 0) throw new Error("Waktu operasi harus positif");
  const requiredRate = (target - completed) / availableHours, capacity = 60 + Math.floor(r() * 70);
  return { templateId: "recovery-rate", variantNumber, curriculumVersion: 1, context, target, completed, hours, downtime, capacity, availableHours, requiredRate, feasible: requiredRate <= capacity };
}
