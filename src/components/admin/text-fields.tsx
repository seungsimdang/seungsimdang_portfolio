"use client";

import type { ReactNode } from "react";
import { describedBy } from "@/lib/admin-client/described-by";
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

interface TextFieldProps extends FieldProps {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "url";
  readOnly?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function TextField({
  value,
  onChange,
  type = "text",
  readOnly,
  placeholder,
  maxLength,
  ...field
}: TextFieldProps) {
  return (
    <FieldShell {...field}>
      <input
        id={field.id}
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        maxLength={maxLength}
        required={field.required}
        aria-required={field.required}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, field.error)}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends FieldProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
}

export function TextAreaField({
  value,
  onChange,
  maxLength,
  rows = 4,
  ...field
}: TextAreaFieldProps) {
  return (
    <FieldShell {...field} counter={`${value.length}/${maxLength}`}>
      <textarea
        id={field.id}
        value={value}
        rows={rows}
        aria-label={field.label}
        required={field.required}
        aria-required={field.required}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, field.error)}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </FieldShell>
  );
}
