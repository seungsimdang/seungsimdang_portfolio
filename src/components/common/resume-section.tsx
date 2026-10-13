import type { ReactNode } from "react";
import type { ResumeEntry } from "@/types/portfolio";
import { cn } from "@/utils/styleUtils";

// 항목이 없는 섹션은 호출 측에서 렌더하지 않음
export function ResumeSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full max-w-content mx-auto container-padding py-40 md:py-48 lg:py-64">
      <div className="space-y-24 md:space-y-32">
        <div className="flex items-center gap-10">
          <h2 className="text-small whitespace-nowrap">{label}</h2>
          <div aria-hidden="true" className="flex-1 h-px bg-white/25" />
        </div>
        {children}
      </div>
    </section>
  );
}

export function ResumeEntryList({ entries }: { entries: ResumeEntry[] }) {
  return (
    <ul className="space-y-32 md:space-y-40">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr] md:gap-32"
        >
          {entry.period && (
            <p className="text-small text-white/50">{entry.period}</p>
          )}
          <div
            className={cn(
              "min-w-0 space-y-8 break-keep",
              !entry.period && "md:col-start-2",
            )}
          >
            <h3 className="text-h3">{entry.title}</h3>
            {entry.subtitle && (
              <p className="text-body text-white/50">{entry.subtitle}</p>
            )}
            {entry.details.length > 0 && (
              <ul className="list-disc pl-20 text-body space-y-4">
                {entry.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  return (
    <ul className="flex flex-wrap gap-12">
      {tags.map((tag) => (
        <li
          key={tag}
          className="px-20 py-10 border border-white/10 rounded-lg text-body"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
