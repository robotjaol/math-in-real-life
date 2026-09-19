import type { Attempt, MistakeRecord, QuestionMeta } from "@/domain/question/types";
import { shuffled } from "./prng";
export function selectPractice(questions: QuestionMeta[], attempts: Attempt[], mistakes: MistakeRecord[], seed: string, size: number): string[] {
  const pending = new Set(mistakes.filter(m => !m.resolved).map(m => m.questionId));
  const topics = new Map<string, Attempt[]>();
  for (const a of attempts) topics.set(a.topic, [...(topics.get(a.topic) ?? []), a].slice(-10));
  const recentDomains = [...attempts].sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,5).map(a=>a.domain);
  const rank = (q: QuestionMeta) => {
    const history = topics.get(q.topic) ?? [];
    const weakness = history.length ? 1 - history.reduce((s,a)=>s+(a.verifiedScore??0),0)/history.length/100 : .5;
    const hints = history.length ? history.reduce((s,a)=>s+a.hints/5,0)/history.length : 0;
    const time = history.length ? Math.min(1,history.reduce((s,a)=>s+a.elapsedSeconds,0)/history.length/(q.estimatedMinutes*60*2)) : 0;
    return (pending.has(q.id)?4:0)+weakness*2+hints*.5+time*.3-(attempts.some(a=>a.questionId===q.id&&a.correct)?.7:0)-recentDomains.filter(d=>d===q.domain).length*.15;
  };
  return shuffled(questions,seed).sort((a,b)=>rank(b)-rank(a)).slice(0,size).map(q=>q.id);
}
