"use client";

import { HttpStatusCode } from "axios";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { MarkdownBody } from "@/components/common/markdown-body";
import { describedBy } from "@/lib/admin-client/described-by";
import { insertImageMarkdown } from "@/lib/admin-client/post-editing";
import { renderMarkdown } from "@/lib/markdown/render-markdown";
import { cn } from "@/utils/styleUtils";
import { AdminButton } from "./admin-button";
import { FieldShell, inputClassName } from "./text-fields";
import type { Notice } from "./toast-provider";

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

type EditorTab = "write" | "preview";

const TABS: { key: EditorTab; label: string }[] = [
  { key: "write", label: "작성" },
  { key: "preview", label: "미리보기" },
];

interface UploadResult {
  data?: { url?: string; fieldErrors?: Record<string, string> };
}

interface MarkdownEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  // 서버 검증과 같은 문자열 길이 기준의 상한
  maxLength: number;
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
  maxLength,
  saving,
  onNotice,
  onUploadStateChange,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<EditorTab>("write");
  // 비동기 업로드 완료 시점의 탭을 읽기 위한 참조
  const tabRef = useRef<EditorTab>("write");
  // 오류가 새로 생기면 렌더 중에 작성 탭으로 되돌려, 부모의 포커스 effect가 보이는 textarea를 찾도록 함
  const [hadError, setHadError] = useState(Boolean(error));
  if (Boolean(error) !== hadError) {
    setHadError(Boolean(error));
    if (error) setTab("write");
  }
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
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
      // 미리보기 탭에서는 숨겨진 textarea로 포커스를 옮기지 않음
      if (tabRef.current === "write") textarea?.focus();
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

  const tabId = (key: EditorTab) => `${id}-tab-${key}`;
  const panelId = (key: EditorTab) => `${id}-panel-${key}`;

  function selectTab(key: EditorTab, moveFocus: boolean) {
    tabRef.current = key;
    setTab(key);
    if (moveFocus) document.getElementById(tabId(key))?.focus();
  }

  // 방향키 이동이 곧 선택, 탭이 둘뿐이라 좌우는 서로 순환
  function onTabKeyDown(event: KeyboardEvent) {
    const other = tab === "write" ? "preview" : "write";
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      selectTab(other, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectTab("write", true);
    } else if (event.key === "End") {
      event.preventDefault();
      selectTab("preview", true);
    }
  }

  return (
    <FieldShell
      id={id}
      label="본문"
      required
      error={error}
      counter={`${value.length.toLocaleString("ko-KR")} / ${maxLength.toLocaleString("ko-KR")}자`}
      counterOver={value.length > maxLength}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-16 gap-y-8">
        <div
          role="tablist"
          aria-label="본문 편집 방식"
          className="flex gap-16"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              id={tabId(key)}
              type="button"
              role="tab"
              aria-selected={tab === key}
              aria-controls={panelId(key)}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => selectTab(key, false)}
              className={cn(
                "flex min-h-44 items-center text-sm underline-offset-8 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white",
                tab === key ? "underline opacity-100" : "opacity-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
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
      </div>
      {/* 값과 커서, 스크롤이 보존되도록 작성 패널은 숨기기만 하고 언마운트하지 않음 */}
      <div
        role="tabpanel"
        id={panelId("write")}
        aria-labelledby={tabId("write")}
        hidden={tab !== "write"}
      >
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          rows={24}
          required
          aria-required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, undefined, error)}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClassName, "min-h-320 resize-y font-mono")}
        />
      </div>
      <div
        role="tabpanel"
        id={panelId("preview")}
        aria-labelledby={tabId("preview")}
        hidden={tab !== "preview"}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: 패널 안에 포커스 가능한 요소가 없을 때 키보드로 닿도록 함
        tabIndex={0}
        className="min-h-320 rounded-md border border-white/25 p-16 focus-visible:outline-2 focus-visible:outline-white"
      >
        {tab === "preview" &&
          (value.trim() ? (
            <MarkdownBody>{renderMarkdown(value)}</MarkdownBody>
          ) : (
            <p className="text-small opacity-70">미리볼 내용이 없습니다.</p>
          ))}
      </div>
    </FieldShell>
  );
}
