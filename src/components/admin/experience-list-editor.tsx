"use client";

import { useState } from "react";
import { moveItem, newKey } from "@/lib/admin-client/draft";
import { useFocusAfterRender } from "@/lib/admin-client/use-admin-form";
import { AdminButton } from "./admin-button";
import { type LinkDraft, LinkListEditor } from "./link-list-editor";
import { TextAreaField, TextField } from "./text-fields";

const LONG_TEXT_MAX = 5000;
const LIST_MAX = 50;

export interface ExperienceDraft {
  key: string;
  title: string;
  problem: string;
  solution: string;
  advantages: string;
  disadvantages: string;
  rationale: string;
  result: string;
  learning: string;
  links: LinkDraft[];
}

function emptyExperience(): ExperienceDraft {
  return {
    key: newKey(),
    title: "",
    problem: "",
    solution: "",
    advantages: "",
    disadvantages: "",
    rationale: "",
    result: "",
    learning: "",
    links: [],
  };
}

interface ExperienceListEditorProps {
  items: ExperienceDraft[];
  onChange: (items: ExperienceDraft[]) => void;
  errors: Record<string, string>;
}

const ADD_ID = "experience-add";

// 프로젝트 경험 카드 목록, 삭제는 저장 전까지 폼 로컬 상태에만 반영됨
export function ExperienceListEditor({
  items,
  onChange,
  errors,
}: ExperienceListEditorProps) {
  const focusLater = useFocusAfterRender();
  const [message, setMessage] = useState("");

  function update(key: string, patch: Partial<ExperienceDraft>) {
    onChange(items.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function add() {
    const item = emptyExperience();
    onChange([...items, item]);
    focusLater(`experience-${item.key}-title`);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setMessage(`경험 ${index + 1}을 삭제했습니다. 저장해야 반영됩니다.`);
    focusLater(ADD_ID);
  }

  function move(index: number, delta: -1 | 1) {
    onChange(moveItem(items, index, delta));
    setMessage(`경험을 ${index + delta + 1}번째로 이동했습니다.`);
  }

  return (
    <section className="space-y-16" aria-labelledby="experience-heading">
      <div className="flex flex-wrap items-center justify-between gap-12">
        <h2 id="experience-heading" className="text-h3">
          경험 ({items.length})
        </h2>
        <AdminButton
          id={ADD_ID}
          disabled={items.length >= LIST_MAX}
          onClick={add}
        >
          경험 추가
        </AdminButton>
      </div>
      {errors.experiences && (
        <p className="text-small">오류: {errors.experiences}</p>
      )}
      {items.length === 0 && (
        <p className="text-small opacity-70">
          등록된 경험이 없습니다. 상세 페이지에는 경험 섹션이 표시되지 않습니다.
        </p>
      )}
      <ul className="space-y-24">
        {items.map((item, index) => {
          const prefix = `experiences.${index}`;
          const errorCount = Object.keys(errors).filter((key) =>
            key.startsWith(`${prefix}.`),
          ).length;
          const id = (name: string) => `experience-${item.key}-${name}`;
          const err = (name: string) => errors[`${prefix}.${name}`];
          return (
            <li key={item.key}>
              <fieldset
                aria-labelledby={id("heading")}
                className="space-y-16 rounded-lg border border-white/25 p-16 md:p-24"
              >
                <legend className="sr-only">
                  경험 {index + 1}: {item.title.trim() || "제목 없음"}
                  {errorCount > 0 && ` (오류 ${errorCount}개)`}
                </legend>
                <div className="flex flex-wrap items-center justify-between gap-8">
                  <h3 id={id("heading")} className="text-body">
                    경험 {index + 1}: {item.title.trim() || "제목 없음"}
                    {errorCount > 0 && ` (오류 ${errorCount}개)`}
                  </h3>
                  <div className="flex flex-wrap gap-8">
                    <AdminButton
                      variant="icon"
                      disabled={index === 0}
                      aria-label={`경험 ${index + 1} 위로 이동`}
                      onClick={() => move(index, -1)}
                    >
                      <span aria-hidden="true">↑</span>
                    </AdminButton>
                    <AdminButton
                      variant="icon"
                      disabled={index === items.length - 1}
                      aria-label={`경험 ${index + 1} 아래로 이동`}
                      onClick={() => move(index, 1)}
                    >
                      <span aria-hidden="true">↓</span>
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      aria-label={`경험 ${index + 1} 삭제`}
                      onClick={() => remove(index)}
                    >
                      삭제
                    </AdminButton>
                  </div>
                </div>
                <TextField
                  id={id("title")}
                  label="제목"
                  required
                  value={item.title}
                  error={err("title")}
                  onChange={(title) => update(item.key, { title })}
                />
                <TextAreaField
                  id={id("problem")}
                  label="problem"
                  required
                  maxLength={LONG_TEXT_MAX}
                  value={item.problem}
                  error={err("problem")}
                  onChange={(problem) => update(item.key, { problem })}
                />
                <TextAreaField
                  id={id("solution")}
                  label="solution"
                  required
                  maxLength={LONG_TEXT_MAX}
                  value={item.solution}
                  error={err("solution")}
                  onChange={(solution) => update(item.key, { solution })}
                />
                <TextAreaField
                  id={id("advantages")}
                  label="tradeoff 장점"
                  maxLength={LONG_TEXT_MAX}
                  value={item.advantages}
                  error={err("tradeoff.advantages")}
                  onChange={(advantages) => update(item.key, { advantages })}
                />
                <TextAreaField
                  id={id("disadvantages")}
                  label="tradeoff 단점"
                  maxLength={LONG_TEXT_MAX}
                  value={item.disadvantages}
                  error={err("tradeoff.disadvantages")}
                  onChange={(disadvantages) =>
                    update(item.key, { disadvantages })
                  }
                />
                <TextAreaField
                  id={id("rationale")}
                  label="tradeoff 근거"
                  hint="비워 두면 공개 페이지에서 숨겨집니다."
                  maxLength={LONG_TEXT_MAX}
                  value={item.rationale}
                  error={err("tradeoff.rationale")}
                  onChange={(rationale) => update(item.key, { rationale })}
                />
                <TextAreaField
                  id={id("result")}
                  label="result"
                  required
                  maxLength={LONG_TEXT_MAX}
                  value={item.result}
                  error={err("result")}
                  onChange={(result) => update(item.key, { result })}
                />
                <TextAreaField
                  id={id("learning")}
                  label="learning"
                  required
                  maxLength={LONG_TEXT_MAX}
                  value={item.learning}
                  error={err("learning")}
                  onChange={(learning) => update(item.key, { learning })}
                />
                <LinkListEditor
                  items={item.links}
                  onChange={(links) => update(item.key, { links })}
                  errors={errors}
                  path={`${prefix}.links`}
                />
              </fieldset>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="text-small opacity-70">
        {message}
      </p>
    </section>
  );
}
