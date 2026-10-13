"use client";

import { newKey, type StringItem } from "@/lib/admin-client/draft";
import { ListEditor } from "./list-editor";
import { inputClassName } from "./text-fields";

interface StringListEditorProps {
  legend: string;
  itemLabel: string;
  items: StringItem[];
  onChange: (items: StringItem[]) => void;
  // 서버와 클라이언트 검증 오류 맵과 이 목록의 경로 접두 (예: "skills")
  errors: Record<string, string>;
  path: string;
  hint?: string;
}

// skills, techStack처럼 순서 있는 문자열 목록 편집기
export function StringListEditor({
  legend,
  itemLabel,
  items,
  onChange,
  errors,
  path,
  hint,
}: StringListEditorProps) {
  return (
    <ListEditor
      legend={legend}
      itemLabel={itemLabel}
      items={items}
      onChange={onChange}
      makeItem={() => ({ key: newKey(), value: "" })}
      hint={hint}
      error={errors[path]}
      renderFields={(item, index, firstFieldId) => {
        const error = errors[`${path}.${index}`];
        return (
          <div className="min-w-0 flex-1 space-y-4">
            <input
              id={firstFieldId}
              value={item.value}
              aria-label={`${itemLabel} ${index + 1}`}
              aria-invalid={error ? true : undefined}
              onChange={(event) =>
                onChange(
                  items.map((it) =>
                    it.key === item.key
                      ? { ...it, value: event.target.value }
                      : it,
                  ),
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              className={inputClassName}
            />
            {error && <p className="text-small">오류: {error}</p>}
          </div>
        );
      }}
    />
  );
}
