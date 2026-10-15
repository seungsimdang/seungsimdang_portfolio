"use client";

import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useFieldError } from "@/lib/admin-client/form-errors";
import { AdminButton } from "./admin-button";

const LIST_MAX = 50;

interface ListEditorProps {
  // 폼 값의 배열 이름, useFieldArray가 항목 key(field.id)와 이동·삭제를 맡음
  name: string;
  legend: string;
  // 이동 버튼 이름에 쓰는 항목명 (예: "스킬")
  itemLabel: string;
  makeItem: () => object;
  renderFields: (index: number) => ReactNode;
  hint?: string;
}

// 항목 추가, 삭제, 위/아래 이동과 포커스 이동을 맡는 목록 편집 공통 틀
export function ListEditor({
  name,
  legend,
  itemLabel,
  makeItem,
  renderFields,
  hint,
}: ListEditorProps) {
  const scope = useId();
  const { control } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name });
  const error = useFieldError(name);
  const listRef = useRef<HTMLUListElement>(null);
  const [message, setMessage] = useState("");
  const addId = `${scope}-add`;
  const errorId = `${scope}-error`;
  const atMax = fields.length >= LIST_MAX;

  function removeAt(index: number) {
    remove(index);
    // 삭제 뒤 같은 자리(마지막이면 바로 앞) 항목의 첫 입력, 항목이 없으면 추가 버튼으로 포커스
    const target = Math.min(index, fields.length - 2);
    requestAnimationFrame(() => {
      const row = listRef.current?.children[target];
      const input = row?.querySelector<HTMLElement>("input, textarea");
      (input ?? document.getElementById(addId))?.focus();
    });
    setMessage(`${itemLabel} ${index + 1}을 삭제했습니다.`);
  }

  function moveBy(index: number, delta: -1 | 1) {
    move(index, index + delta);
    setMessage(`${itemLabel}을 ${index + delta + 1}번째로 이동했습니다.`);
  }

  return (
    <fieldset
      className="space-y-12"
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="text-small">{legend}</legend>
      {hint && <p className="text-small opacity-70">{hint}</p>}
      <ul ref={listRef} className="space-y-12">
        {fields.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-col gap-8 md:flex-row md:items-start"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-8 md:flex-row">
              {renderFields(index)}
            </div>
            <div className="flex flex-wrap gap-8">
              <AdminButton
                variant="icon"
                disabled={index === 0}
                aria-label={`${itemLabel} ${index + 1} 위로 이동`}
                onClick={() => moveBy(index, -1)}
              >
                <span aria-hidden="true">↑</span>
              </AdminButton>
              <AdminButton
                variant="icon"
                disabled={index === fields.length - 1}
                aria-label={`${itemLabel} ${index + 1} 아래로 이동`}
                onClick={() => moveBy(index, 1)}
              >
                <span aria-hidden="true">↓</span>
              </AdminButton>
              <AdminButton
                variant="danger"
                aria-label={`${itemLabel} ${index + 1} 삭제`}
                onClick={() => removeAt(index)}
              >
                삭제
              </AdminButton>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-12">
        <AdminButton
          id={addId}
          disabled={atMax}
          onClick={() => append(makeItem())}
        >
          {itemLabel} 추가
        </AdminButton>
        {atMax && (
          <span className="text-small opacity-70">최대 {LIST_MAX}개</span>
        )}
      </div>
      {error && (
        <p id={errorId} tabIndex={-1} data-error-focus className="text-small">
          오류: {error}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </fieldset>
  );
}
