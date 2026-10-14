"use client";

import { HttpStatusCode } from "axios";
import { useEffect, useRef, useState } from "react";
import { MarkdownBody } from "@/components/common/markdown-body";
import { describedBy } from "@/lib/admin-client/described-by";
import { insertImageMarkdown } from "@/lib/admin-client/post-editing";
import type { Notice } from "@/lib/admin-client/use-admin-form";
import { renderMarkdown } from "@/lib/markdown/render-markdown";
import { cn } from "@/utils/styleUtils";
import { AdminButton } from "./admin-button";
import { FieldShell, inputClassName } from "./text-fields";

const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};
const FORMAT_ERROR = "PNG, JPG, WebP, GIF 파일만 올릴 수 있습니다.";
const UPLOAD_FAILED = "이미지를 올리지 못했습니다. 다시 시도하세요.";

interface UploadResult {
  data?: { url?: string; fieldErrors?: Record<string, string> };
}

interface MarkdownEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint: string;
  saving: boolean;
  onNotice: (notice: Notice) => void;
  onUploadStateChange: (uploading: boolean) => void;
}

// 본문 textarea, 커서 위치 이미지 삽입, 작성/미리보기 전환
export function MarkdownEditor({
  id,
  value,
  onChange,
  error,
  hint,
  saving,
  onNotice,
  onUploadStateChange,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  // 업로드 시작 시점의 커서, 포커스가 버튼으로 옮겨져도 유지
  const savedPosition = useRef<number | null>(null);
  // 비동기 업로드가 끝난 시점의 최신 본문을 읽기 위한 참조
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function openFilePicker() {
    savedPosition.current = textareaRef.current?.selectionEnd ?? null;
    fileInputRef.current?.click();
  }

  function insert(url: string, file: File) {
    const textarea = textareaRef.current;
    const current = valueRef.current;
    const focused = textarea !== null && document.activeElement === textarea;
    const position = focused
      ? textarea.selectionEnd
      : (savedPosition.current ?? current.length);
    const alt = file.name.replace(/\.[^.]+$/, "");
    const next = insertImageMarkdown(current, position, alt, url);
    onChange(next.text);
    // 값 반영 뒤 커서 이동과 포커스 복귀
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  async function upload(file: File) {
    if (uploadingRef.current) return;
    const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
    const fail = (message: string) => onNotice({ tone: "error", message });
    if (!IMAGE_MIME[extension] || file.type !== IMAGE_MIME[extension]) {
      fail(FORMAT_ERROR);
      return;
    }
    if (file.size === 0) {
      fail("빈 파일은 올릴 수 없습니다.");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      fail("4MB 이하 파일만 올릴 수 있습니다.");
      return;
    }

    uploadingRef.current = true;
    setUploading(true);
    onUploadStateChange(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/admin/uploads/post-image", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        const result = (await response
          .json()
          .catch(() => null)) as UploadResult | null;
        fail(
          result?.data?.fieldErrors?.file ??
            (response.status === HttpStatusCode.PayloadTooLarge
              ? "4MB 이하 파일만 올릴 수 있습니다."
              : UPLOAD_FAILED),
        );
        return;
      }
      const result = (await response
        .json()
        .catch(() => null)) as UploadResult | null;
      const url = result?.data?.url;
      if (!url) {
        fail(UPLOAD_FAILED);
        return;
      }
      insert(url, file);
      onNotice({
        tone: "success",
        message: "이미지를 본문에 넣었습니다. alt 텍스트를 확인하세요.",
      });
    } catch {
      fail(UPLOAD_FAILED);
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      onUploadStateChange(false);
    }
  }

  return (
    <FieldShell
      id={id}
      label="본문"
      required
      hint={hint}
      error={error}
      counter={`${value.length}자`}
    >
      <div className="flex flex-wrap items-center gap-8">
        <AdminButton disabled={uploading || saving} onClick={openFilePicker}>
          {uploading ? "업로드 중..." : "이미지 삽입"}
        </AdminButton>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          aria-label="본문에 넣을 이미지 파일"
          accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void upload(file);
          }}
        />
        <div className="ml-auto flex gap-8">
          <AdminButton
            variant={preview ? "secondary" : "primary"}
            aria-pressed={!preview}
            onClick={() => setPreview(false)}
          >
            작성
          </AdminButton>
          <AdminButton
            variant={preview ? "primary" : "secondary"}
            aria-pressed={preview}
            onClick={() => setPreview(true)}
          >
            미리보기
          </AdminButton>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        rows={24}
        hidden={preview}
        required
        aria-required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClassName, "min-h-320 resize-y font-mono")}
      />
      {preview && (
        <div className="min-h-320 rounded-md border border-white/25 p-16">
          {value.trim() ? (
            <MarkdownBody>{renderMarkdown(value)}</MarkdownBody>
          ) : (
            <p className="text-small opacity-70">미리볼 내용이 없습니다.</p>
          )}
        </div>
      )}
    </FieldShell>
  );
}
