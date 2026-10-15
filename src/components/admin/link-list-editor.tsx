"use client";

import { ListEditor } from "./list-editor";
import { ListInput } from "./text-fields";

// experience links의 label/url 쌍 목록 편집기
export function LinkListEditor({ name }: { name: string }) {
  return (
    <ListEditor
      name={name}
      legend="링크"
      itemLabel="링크"
      makeItem={() => ({ label: "", url: "" })}
      renderFields={(index) => (
        <>
          <ListInput
            name={`${name}.${index}.label`}
            label={`링크 ${index + 1} 표시 이름`}
            placeholder="표시 이름"
          />
          <ListInput
            name={`${name}.${index}.url`}
            label={`링크 ${index + 1} 주소`}
            type="url"
            placeholder="https://"
          />
        </>
      )}
    />
  );
}
