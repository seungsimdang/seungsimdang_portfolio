"use client";

import { ListEditor } from "./list-editor";
import { ListInput } from "./text-fields";

interface StringListEditorProps {
  // 폼 값의 목록 이름 (예: "skills"), 항목은 { value } 객체
  name: string;
  legend: string;
  itemLabel: string;
  hint?: string;
}

// skills, techStack처럼 순서 있는 문자열 목록 편집기
export function StringListEditor({
  name,
  legend,
  itemLabel,
  hint,
}: StringListEditorProps) {
  return (
    <ListEditor
      name={name}
      legend={legend}
      itemLabel={itemLabel}
      makeItem={() => ({ value: "" })}
      hint={hint}
      renderFields={(index) => (
        <ListInput
          name={`${name}.${index}.value`}
          label={`${itemLabel} ${index + 1}`}
        />
      )}
    />
  );
}
