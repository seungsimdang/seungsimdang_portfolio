"use client";

import { useId, useState } from "react";
import { get, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { countErrors, useFieldError } from "@/lib/admin-client/form-errors";
import { focusAfterRender } from "@/lib/admin-client/use-admin-form";
import { AdminButton } from "./admin-button";
import { LinkListEditor } from "./link-list-editor";
import { TextAreaField, TextField } from "./text-fields";

const LONG_TEXT_MAX = 5000;
const LIST_MAX = 50;

function emptyExperience() {
  return {
    title: "",
    problem: "",
    solution: "",
    tradeoff: { advantages: "", disadvantages: "", rationale: "" },
    result: "",
    learning: "",
    links: [],
  };
}

const ADD_ID = "experience-add";
const ERROR_ID = "experience-list-error";

// 프로젝트 경험 카드 목록, 삭제는 저장 전까지 폼 로컬 상태에만 반영됨
export function ExperienceListEditor() {
  const scope = useId();
  const { control, formState } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "experiences",
  });
  const titles: { title?: string }[] = useWatch({ name: "experiences" }) ?? [];
  const listError = useFieldError("experiences");
  const [message, setMessage] = useState("");

  function removeAt(index: number) {
    remove(index);
    setMessage(`경험 ${index + 1}을 삭제했습니다. 저장해야 반영됩니다.`);
    focusAfterRender(ADD_ID);
  }

  function moveBy(index: number, delta: -1 | 1) {
    move(index, index + delta);
    setMessage(`경험을 ${index + delta + 1}번째로 이동했습니다.`);
  }

  return (
    <section
      className="space-y-16"
      aria-labelledby="experience-heading"
      aria-describedby={listError ? ERROR_ID : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-12">
        <h2 id="experience-heading" className="text-h3">
          경험 ({fields.length})
        </h2>
        <AdminButton
          id={ADD_ID}
          disabled={fields.length >= LIST_MAX}
          onClick={() => append(emptyExperience())}
        >
          경험 추가
        </AdminButton>
      </div>
      {listError && (
        <p id={ERROR_ID} tabIndex={-1} data-error-focus className="text-small">
          오류: {listError}
        </p>
      )}
      {fields.length === 0 && (
        <p className="text-small opacity-70">
          등록된 경험이 없습니다. 상세 페이지에는 경험 섹션이 표시되지 않습니다.
        </p>
      )}
      <ul className="space-y-24">
        {fields.map((item, index) => {
          const prefix = `experiences.${index}`;
          const errorCount = countErrors(get(formState.errors, prefix));
          const heading = titles[index]?.title?.trim() || "제목 없음";
          const id = (name: string) => `${scope}-${index}-${name}`;
          return (
            <li key={item.id}>
              <fieldset
                aria-labelledby={id("heading")}
                className="space-y-16 rounded-lg border border-white/25 p-16 md:p-24"
              >
                <legend className="sr-only">
                  경험 {index + 1}: {heading}
                  {errorCount > 0 && ` (오류 ${errorCount}개)`}
                </legend>
                <div className="flex flex-wrap items-center justify-between gap-8">
                  <h3 id={id("heading")} className="text-body">
                    경험 {index + 1}: {heading}
                    {errorCount > 0 && ` (오류 ${errorCount}개)`}
                  </h3>
                  <div className="flex flex-wrap gap-8">
                    <AdminButton
                      variant="icon"
                      disabled={index === 0}
                      aria-label={`경험 ${index + 1} 위로 이동`}
                      onClick={() => moveBy(index, -1)}
                    >
                      <span aria-hidden="true">↑</span>
                    </AdminButton>
                    <AdminButton
                      variant="icon"
                      disabled={index === fields.length - 1}
                      aria-label={`경험 ${index + 1} 아래로 이동`}
                      onClick={() => moveBy(index, 1)}
                    >
                      <span aria-hidden="true">↓</span>
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      aria-label={`경험 ${index + 1} 삭제`}
                      onClick={() => removeAt(index)}
                    >
                      삭제
                    </AdminButton>
                  </div>
                </div>
                <TextField
                  id={id("title")}
                  label="제목"
                  required
                  name={`${prefix}.title`}
                />
                <TextAreaField
                  id={id("problem")}
                  label="problem"
                  required
                  maxLength={LONG_TEXT_MAX}
                  name={`${prefix}.problem`}
                />
                <TextAreaField
                  id={id("solution")}
                  label="solution"
                  required
                  maxLength={LONG_TEXT_MAX}
                  name={`${prefix}.solution`}
                />
                <TextAreaField
                  id={id("advantages")}
                  label="tradeoff 장점"
                  maxLength={LONG_TEXT_MAX}
                  name={`${prefix}.tradeoff.advantages`}
                />
                <TextAreaField
                  id={id("disadvantages")}
                  label="tradeoff 단점"
                  maxLength={LONG_TEXT_MAX}
                  name={`${prefix}.tradeoff.disadvantages`}
                />
                <TextAreaField
                  id={id("rationale")}
                  label="tradeoff 근거"
                  hint="비워 두면 공개 페이지에서 숨겨집니다."
                  maxLength={LONG_TEXT_MAX}
                  name={`${prefix}.tradeoff.rationale`}
                />
                <TextAreaField
                  id={id("result")}
                  label="result"
                  required
                  maxLength={LONG_TEXT_MAX}
                  name={`${prefix}.result`}
                />
                <TextAreaField
                  id={id("learning")}
                  label="learning"
                  required
                  maxLength={LONG_TEXT_MAX}
                  name={`${prefix}.learning`}
                />
                <LinkListEditor name={`${prefix}.links`} />
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
