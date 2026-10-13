import type { ExperienceDraft } from "@/components/admin/experience-list-editor";
import type { Experience } from "@/types/portfolio";

let keySeed = 0;

// 목록 편집용 클라이언트 전용 key, 서버로 보내지 않음
export function newKey() {
  keySeed += 1;
  return `k${keySeed}`;
}

export interface StringItem {
  key: string;
  value: string;
}

export function toStringItems(values: string[]): StringItem[] {
  return values.map((value) => ({ key: newKey(), value }));
}

export function moveItem<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function toExperienceDraft(experience: Experience): ExperienceDraft {
  return {
    key: experience.id,
    title: experience.title,
    problem: experience.problem,
    solution: experience.solution,
    advantages: experience.tradeoff.advantages,
    disadvantages: experience.tradeoff.disadvantages,
    rationale: experience.tradeoff.rationale,
    result: experience.result,
    learning: experience.learning,
    links: (experience.links ?? []).map((link) => ({ key: newKey(), ...link })),
  };
}
