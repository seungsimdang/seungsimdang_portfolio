"use client";

import type { ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { describedBy } from "@/lib/admin-client/described-by";
import { useFieldError } from "@/lib/admin-client/form-errors";
import { cn } from "@/utils/styleUtils";

export const inputClassName =
  "min-h-44 w-full rounded-md border border-white/25 bg-transparent px-12 py-8 text-body text-white focus-visible:outline-2 focus-visible:outline-white aria-invalid:border-2 aria-invalid:border-white read-only:opacity-70";

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
}

export function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  counter,
  counterOver,
  children,
}: FieldProps & {
  counter?: string;
  // 글자 수가 상한을 넘은 상태, 필드 오류 문구와 함께 표시
  counterOver?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <label htmlFor={id} className="block text-small">
        {label}
        {required && " (필수)"}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-small opacity-70">
          {hint}
        </p>
      )}
      {counter && (
        <p
          className={cn(
            "text-small",
            counterOver ? "text-danger" : "opacity-50",
          )}
        >
          {counter}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-small">
          오류: {error}
        </p>
      )}
    </div>
  );
}

// 값과 오류는 react-hook-form 컨텍스트에서 name으로 읽음
type RegisteredFieldProps = Omit<FieldProps, "error"> & { name: string };

interface TextFieldProps extends Omit<RegisteredFieldProps, "name"> {
  // name 없이 value만 주면 폼 밖의 읽기 전용 표시 칸
  name?: string;
  value?: string;
  type?: "text" | "email" | "url";
  readOnly?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function TextField({
  name,
  value,
  type = "text",
  readOnly,
  placeholder,
  maxLength,
  ...field
}: TextFieldProps) {
  const { register } = useFormContext();
  const error = useFieldError(name ?? "");
  return (
    <FieldShell {...field} error={error}>
      <input
        {...(name ? register(name) : { value })}
        id={field.id}
        type={type}
        readOnly={readOnly}
        placeholder={placeholder}
        maxLength={maxLength}
        required={field.required}
        aria-required={field.required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, error)}
        className={inputClassName}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends RegisteredFieldProps {
  maxLength: number;
  rows?: number;
}

export function TextAreaField({
  name,
  maxLength,
  rows = 4,
  ...field
}: TextAreaFieldProps) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  const length = String(useWatch({ name }) ?? "").length;
  return (
    <FieldShell {...field} error={error} counter={`${length}/${maxLength}`}>
      <textarea
        {...register(name)}
        id={field.id}
        rows={rows}
        aria-label={field.label}
        required={field.required}
        aria-required={field.required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, error)}
        className={inputClassName}
      />
    </FieldShell>
  );
}

interface ListInputProps {
  name: string;
  label: string;
  type?: "text" | "url";
  placeholder?: string;
}

// 목록 항목 한 칸, 오류 문구를 입력 칸 아래에 붙이고 Enter로 폼이 제출되지 않게 함
export function ListInput({ name, label, type, placeholder }: ListInputProps) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  return (
    <div className="min-w-0 flex-1 space-y-4">
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        className={inputClassName}
      />
      {error && <p className="text-small">오류: {error}</p>}
    </div>
  );
}
