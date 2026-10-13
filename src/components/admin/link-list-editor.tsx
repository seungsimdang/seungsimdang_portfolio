"use client";

import { newKey } from "@/lib/admin-client/draft";
import { ListEditor } from "./list-editor";
import { inputClassName } from "./text-fields";

export interface LinkDraft {
  key: string;
  label: string;
  url: string;
}

interface LinkListEditorProps {
  items: LinkDraft[];
  onChange: (items: LinkDraft[]) => void;
  errors: Record<string, string>;
  path: string;
}

// experience links의 label/url 쌍 목록 편집기
export function LinkListEditor({
  items,
  onChange,
  errors,
  path,
}: LinkListEditorProps) {
  function update(key: string, patch: Partial<LinkDraft>) {
    onChange(items.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  return (
    <ListEditor
      legend="링크"
      itemLabel="링크"
      items={items}
      onChange={onChange}
      makeItem={() => ({ key: newKey(), label: "", url: "" })}
      error={errors[path]}
      renderFields={(item, index, firstFieldId) => {
        const labelError = errors[`${path}.${index}.label`];
        const urlError = errors[`${path}.${index}.url`];
        return (
          <>
            <div className="min-w-0 flex-1 space-y-4">
              <input
                id={firstFieldId}
                value={item.label}
                placeholder="표시 이름"
                aria-label={`링크 ${index + 1} 표시 이름`}
                aria-invalid={labelError ? true : undefined}
                onChange={(event) =>
                  update(item.key, { label: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                className={inputClassName}
              />
              {labelError && <p className="text-small">오류: {labelError}</p>}
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <input
                value={item.url}
                type="url"
                placeholder="https://"
                aria-label={`링크 ${index + 1} 주소`}
                aria-invalid={urlError ? true : undefined}
                onChange={(event) =>
                  update(item.key, { url: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                className={inputClassName}
              />
              {urlError && <p className="text-small">오류: {urlError}</p>}
            </div>
          </>
        );
      }}
    />
  );
}
