"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useFieldError } from "@/lib/admin-client/form-errors";
import { THUMBNAIL_LIST_MAX } from "@/schemas/portfolio.schema";
import { ListEditor } from "./list-editor";
import { ThumbnailField } from "./thumbnail-field";

const EMPTY_ROW_MESSAGE = "이미지를 올리거나 빈 항목을 삭제하세요.";
const REQUIRED_MESSAGE = "필수 입력입니다";

interface ThumbnailListFieldProps {
  name: "thumbnails" | "mobileThumbnails";
  legend: string;
  itemLabel: string;
  hint: string;
  title: string;
  saving: boolean;
  // 어느 목록이든 업로드 중이면 행이 움직여 결과가 엉뚱한 행에 들어가므로 구조 변경을 막음
  locked: boolean;
  portrait?: boolean;
  onUploadStateChange: (uploading: boolean) => void;
}

interface ThumbnailRowProps
  extends Omit<ThumbnailListFieldProps, "legend" | "hint" | "locked"> {
  index: number;
}

function ThumbnailRow({
  name,
  itemLabel,
  index,
  title,
  saving,
  portrait,
  onUploadStateChange,
}: ThumbnailRowProps) {
  const { control } = useFormContext();
  const error = useFieldError(`${name}.${index}.value`);
  return (
    <Controller
      name={`${name}.${index}.value`}
      control={control}
      render={({ field }) => (
        <ThumbnailField
          id={`project-${name}-${index}`}
          label={`${itemLabel} ${index + 1} 파일`}
          value={field.value ?? ""}
          title={title}
          serverError={error === REQUIRED_MESSAGE ? EMPTY_ROW_MESSAGE : error}
          saving={saving}
          onChange={field.onChange}
          onUploadStateChange={onUploadStateChange}
          hideRemove
          hideNotice
          portrait={portrait}
        />
      )}
    />
  );
}

// 기본·모바일 썸네일 목록 하나를 편집하는 필드, 행마다 업로드 필드를 재사용
export function ThumbnailListField({
  name,
  legend,
  itemLabel,
  hint,
  title,
  saving,
  locked,
  portrait,
  onUploadStateChange,
}: ThumbnailListFieldProps) {
  return (
    <ListEditor
      name={name}
      legend={legend}
      itemLabel={itemLabel}
      hint={hint}
      max={THUMBNAIL_LIST_MAX}
      locked={locked}
      makeItem={() => ({ value: "" })}
      renderFields={(index) => (
        <ThumbnailRow
          name={name}
          itemLabel={itemLabel}
          index={index}
          title={title}
          saving={saving}
          portrait={portrait}
          onUploadStateChange={onUploadStateChange}
        />
      )}
    />
  );
}
