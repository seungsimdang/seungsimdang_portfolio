import type { Experience } from "@/types/portfolio";

// 문자열 목록은 입력 칸 이름이 목록.0.value 꼴이 되도록 { value } 객체로 들고 있음
export function toValueItems(values: string[]) {
  return values.map((value) => ({ value }));
}

export function toExperienceValues(experience: Experience) {
  return {
    title: experience.title,
    problem: experience.problem,
    solution: experience.solution,
    tradeoff: {
      advantages: experience.tradeoff.advantages,
      disadvantages: experience.tradeoff.disadvantages,
      rationale: experience.tradeoff.rationale,
    },
    result: experience.result,
    learning: experience.learning,
    links: (experience.links ?? []).map(({ label, url }) => ({ label, url })),
  };
}

export function moveItem<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
