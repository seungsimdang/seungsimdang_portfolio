"use client";

import { HttpStatusCode } from "axios";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/utils/styleUtils";
import { AdminButton } from "./admin-button";
import { inputClassName } from "./text-fields";

const MAX_BYTES = 4 * 1024 * 1024;

interface UploadResult {
  data?: { url?: string; fieldErrors?: Record<string, string> };
}

interface ThumbnailFieldProps {
  // 한 화면에 여러 개가 놓여도 입력·힌트·오류 id가 겹치지 않게 함
  id: string;
  label: string;
  value: string;
  title: string;
  serverError?: string;
  saving: boolean;
  onChange: (value: string) => void;
  onUploadStateChange: (uploading: boolean) => void;
  // 목록 행에서는 행 삭제와 중복되는 제거 버튼을 숨김
  hideRemove?: boolean;
  // 모바일 썸네일처럼 세로형 이미지 미리보기
  portrait?: boolean;
  // 저장 시점 안내문을 목록 영역에서 한 번만 보여 줄 때 행에서는 숨김
  hideNotice?: boolean;
}

// 업로드 전에 걸러낼 파일의 오류 문구, 통과하면 빈 문자열
function validateFile(file: File): string {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  const expectedMime =
    extension === "png"
      ? "image/png"
      : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "webp"
          ? "image/webp"
          : "";
  if (!expectedMime || file.type !== expectedMime)
    return "PNG, JPG, WebP 파일만 올릴 수 있습니다.";
  if (file.size === 0) return "빈 파일은 올릴 수 없습니다.";
  if (file.size > MAX_BYTES) return "4MB 이하 파일만 올릴 수 있습니다.";
  return "";
}

const UPLOAD_FAILED = "썸네일을 올리지 못했습니다. 다시 시도하세요.";

// 업로드 요청을 보내고 응답을 URL 또는 화면에 보일 오류 문구로 바꿈
async function requestUpload(
  file: File,
): Promise<{ url: string } | { error: string }> {
  const body = new FormData();
  body.append("file", file);
  try {
    const response = await fetch("/api/admin/uploads/thumbnail", {
      method: "POST",
      body,
    });
    if (!response.ok) {
      const failed = (await response
        .json()
        .catch(() => null)) as UploadResult | null;
      return {
        error:
          failed?.data?.fieldErrors?.file ??
          (response.status === HttpStatusCode.PayloadTooLarge
            ? "4MB 이하 파일만 올릴 수 있습니다."
            : UPLOAD_FAILED),
      };
    }
    const result = (await response
      .json()
      .catch(() => null)) as UploadResult | null;
    return result?.data?.url
      ? { url: result.data.url }
      : { error: UPLOAD_FAILED };
  } catch {
    return { error: UPLOAD_FAILED };
  }
}

export function ThumbnailField({
  id,
  label,
  value,
  title,
  serverError,
  saving,
  onChange,
  onUploadStateChange,
  hideRemove = false,
  portrait = false,
  hideNotice = false,
}: ThumbnailFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  async function upload(file: File) {
    if (uploadingRef.current) return;
    setSelectedFileName(file.name);
    const fileError = validateFile(file);
    setUploadError(fileError);
    if (fileError) return;

    uploadingRef.current = true;
    setUploading(true);
    onUploadStateChange(true);
    try {
      const result = await requestUpload(file);
      if ("error" in result) setUploadError(result.error);
      else onChange(result.url);
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      onUploadStateChange(false);
    }
  }

  return (
    <div className="min-w-0 flex-1 space-y-8">
      <label htmlFor={id} className="block text-small">
        {label}
      </label>
      {/* 이미지가 있으면 미리보기 옆에 교체·제거를 묶고 파일 입력은 숨겨 교체 버튼으로 엶 */}
      {/* 제거는 저장 전까지 되돌릴 수 있어 위험 스타일 대신 교체와 같은 일반 버튼으로 둠 */}
      {value && (
        <ThumbnailPreview
          value={value}
          title={title}
          portrait={portrait}
          disabled={uploading || saving}
          hideRemove={hideRemove}
          onReplace={() => fileInputRef.current?.click()}
          onRemove={() => onChange("")}
        />
      )}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        hidden={Boolean(value)}
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        disabled={uploading || saving}
        aria-invalid={uploadError || serverError ? true : undefined}
        aria-describedby={
          uploadError || serverError ? `${hintId} ${errorId}` : hintId
        }
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void upload(file);
        }}
        className={inputClassName}
      />
      <p id={hintId} className="text-small opacity-70">
        PNG, JPG, WebP, 4MB 이하.
        {!hideNotice && " 업로드와 제거는 프로젝트 저장 후 반영됩니다."}
      </p>
      <ThumbnailStatus
        errorId={errorId}
        error={uploadError || serverError}
        uploading={uploading}
        selectedFileName={selectedFileName}
      />
    </div>
  );
}

interface ThumbnailPreviewProps {
  value: string;
  title: string;
  portrait: boolean;
  disabled: boolean;
  hideRemove: boolean;
  onReplace: () => void;
  onRemove: () => void;
}

function ThumbnailPreview({
  value,
  title,
  portrait,
  disabled,
  hideRemove,
  onReplace,
  onRemove,
}: ThumbnailPreviewProps) {
  return (
    <div className="flex flex-col items-start gap-12 md:flex-row">
      <div
        className={cn(
          "relative h-192 overflow-hidden rounded-md",
          portrait ? "w-108" : "w-full max-w-xs",
        )}
      >
        <Image
          src={value}
          alt={`${title || "프로젝트"} 썸네일 미리보기`}
          fill
          sizes={portrait ? "108px" : "320px"}
          className="object-cover"
        />
      </div>
      <div className="flex shrink-0 flex-wrap gap-8 md:flex-col">
        <AdminButton disabled={disabled} onClick={onReplace}>
          이미지 교체
        </AdminButton>
        {!hideRemove && (
          <AdminButton disabled={disabled} onClick={onRemove}>
            썸네일 제거
          </AdminButton>
        )}
      </div>
    </div>
  );
}

interface ThumbnailStatusProps {
  errorId: string;
  error?: string;
  uploading: boolean;
  selectedFileName: string;
}

function ThumbnailStatus({
  errorId,
  error,
  uploading,
  selectedFileName,
}: ThumbnailStatusProps) {
  return (
    <>
      {error && (
        <p id={errorId} role="alert" className="text-small">
          오류: {error}
        </p>
      )}
      {uploading && (
        <p role="status" className="text-small">
          썸네일 업로드 중...
        </p>
      )}
      {selectedFileName && (
        <p className="text-small opacity-70">선택한 파일: {selectedFileName}</p>
      )}
    </>
  );
}
