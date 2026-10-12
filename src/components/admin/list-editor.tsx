"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { moveItem } from "@/lib/admin-client/draft";
import { useFocusAfterRender } from "@/lib/admin-client/use-admin-form";
import { AdminButton } from "./admin-button";

const LIST_MAX = 50;

interface ListEditorProps<T extends { key: string }> {
  legend: string;
  // 이동 버튼 이름에 쓰는 항목명 (예: "스킬")
  itemLabel: string;
  items: T[];
  onChange: (items: T[]) => void;
  makeItem: () => T;
  // 항목 입력 요소들 렌더, 첫 입력에 firstFieldId를 id로 부여해야 포커스 이동이 동작함
  renderFields: (item: T, index: number, firstFieldId: string) => ReactNode;
  hint?: string;
  error?: string;
}

// 항목 추가, 삭제, 위/아래 이동과 포커스 이동을 맡는 목록 편집 공통 틀
export function ListEditor<T extends { key: string }>({
  legend,
  itemLabel,
  items,
  onChange,
  makeItem,
  renderFields,
  hint,
  error,
}: ListEditorProps<T>) {
  const scope = useId();
  const focusLater = useFocusAfterRender();
  const [message, setMessage] = useState("");
  const addId = `${scope}-add`;
  const fieldId = (key: string) => `${scope}-${key}-field`;
  const atMax = items.length >= LIST_MAX;

  function add() {
    const item = makeItem();
    onChange([...items, item]);
    focusLater(fieldId(item.key));
  }

  function remove(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
    const neighbor = next[index] ?? next[index - 1];
    focusLater(neighbor ? fieldId(neighbor.key) : addId);
    setMessage(`${itemLabel} ${index + 1}을 삭제했습니다.`);
  }

  function move(index: number, delta: -1 | 1) {
    onChange(moveItem(items, index, delta));
    setMessage(`${itemLabel}을 ${index + delta + 1}번째로 이동했습니다.`);
  }

  return (
    <fieldset className="space-y-12">
      <legend className="text-small">{legend}</legend>
      {hint && <p className="text-small opacity-70">{hint}</p>}
      <ul className="space-y-12">
        {items.map((item, index) => (
          <li
            key={item.key}
            className="flex flex-col gap-8 md:flex-row md:items-start"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-8 md:flex-row">
              {renderFields(item, index, fieldId(item.key))}
            </div>
            <div className="flex flex-wrap gap-8">
              <AdminButton
                variant="icon"
                disabled={index === 0}
                aria-label={`${itemLabel} ${index + 1} 위로 이동`}
                onClick={() => move(index, -1)}
              >
                <span aria-hidden="true">↑</span>
              </AdminButton>
              <AdminButton
                variant="icon"
                disabled={index === items.length - 1}
                aria-label={`${itemLabel} ${index + 1} 아래로 이동`}
                onClick={() => move(index, 1)}
              >
                <span aria-hidden="true">↓</span>
              </AdminButton>
              <AdminButton
                variant="danger"
                aria-label={`${itemLabel} ${index + 1} 삭제`}
                onClick={() => remove(index)}
              >
                삭제
              </AdminButton>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-12">
        <AdminButton id={addId} disabled={atMax} onClick={add}>
          {itemLabel} 추가
        </AdminButton>
        {atMax && (
          <span className="text-small opacity-70">최대 {LIST_MAX}개</span>
        )}
      </div>
      {error && <p className="text-small">오류: {error}</p>}
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </fieldset>
  );
}
