"use client";

import { HttpStatusCode } from "axios";
import Image from "next/image";
import { useRef, useState } from "react";
import { AdminButton } from "./admin-button";
import { inputClassName } from "./text-fields";

const MAX_BYTES = 4 * 1024 * 1024;

interface UploadResult {
  data?: { url?: string; fieldErrors?: Record<string, string> };
}

interface ThumbnailFieldProps {
  value: string;
  title: string;
  serverError?: string;
  saving: boolean;
  onChange: (value: string) => void;
  onUploadStateChange: (uploading: boolean) => void;
}

export function ThumbnailField({
  value,
  title,
  serverError,
  saving,
  onChange,
  onUploadStateChange,
}: ThumbnailFieldProps) {
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  async function upload(file: File) {
    if (uploadingRef.current) return;
    setSelectedFileName(file.name);
    setUploadError("");
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    const expectedMime =
      extension === "png"
        ? "image/png"
        : extension === "jpg" || extension === "jpeg"
          ? "image/jpeg"
          : extension === "webp"
            ? "image/webp"
            : "";
    if (!expectedMime || file.type !== expectedMime) {
      setUploadError("PNG, JPG, WebP 파일만 올릴 수 있습니다.");
      return;
    }
    if (file.size === 0) {
      setUploadError("빈 파일은 올릴 수 없습니다.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("4MB 이하 파일만 올릴 수 있습니다.");
      return;
    }

    uploadingRef.current = true;
    setUploading(true);
    onUploadStateChange(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/admin/uploads/thumbnail", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        const result = (await response
          .json()
          .catch(() => null)) as UploadResult | null;
        setUploadError(
          result?.data?.fieldErrors?.file ??
            (response.status === HttpStatusCode.PayloadTooLarge
              ? "4MB 이하 파일만 올릴 수 있습니다."
              : "썸네일을 올리지 못했습니다. 다시 시도하세요."),
        );
        return;
      }
      const result = (await response
        .json()
        .catch(() => null)) as UploadResult | null;
      if (!result?.data?.url) {
        setUploadError("썸네일을 올리지 못했습니다. 다시 시도하세요.");
        return;
      }
      onChange(result.data.url);
    } catch {
      setUploadError("썸네일을 올리지 못했습니다. 다시 시도하세요.");
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      onUploadStateChange(false);
    }
  }

  return (
    <div className="space-y-8">
      <label htmlFor="project-thumbnail" className="block text-small">
        썸네일 파일
      </label>
      {/* 이미지가 있으면 미리보기 옆에 교체·제거를 묶고 파일 입력은 숨겨 교체 버튼으로 엶 */}
      {/* 제거는 저장 전까지 되돌릴 수 있어 위험 스타일 대신 교체와 같은 일반 버튼으로 둠 */}
      {value && (
        <div className="flex flex-col items-start gap-12 md:flex-row">
          <div className="relative h-192 w-full max-w-xs overflow-hidden rounded-md">
            <Image
              src={value}
              alt={`${title || "프로젝트"} 썸네일 미리보기`}
              fill
              sizes="320px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-8 md:flex-col">
            <AdminButton
              disabled={uploading || saving}
              onClick={() => fileInputRef.current?.click()}
            >
              이미지 교체
            </AdminButton>
            <AdminButton
              disabled={uploading || saving}
              onClick={() => onChange("")}
            >
              썸네일 제거
            </AdminButton>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        id="project-thumbnail"
        type="file"
        hidden={Boolean(value)}
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        disabled={uploading || saving}
        aria-invalid={uploadError || serverError ? true : undefined}
        aria-describedby={
          uploadError || serverError
            ? "project-thumbnail-hint project-thumbnail-error"
            : "project-thumbnail-hint"
        }
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void upload(file);
        }}
        className={inputClassName}
      />
      <p id="project-thumbnail-hint" className="text-small opacity-70">
        PNG, JPG, WebP, 4MB 이하. 업로드와 제거는 프로젝트 저장 후 반영됩니다.
      </p>
      {(uploadError || serverError) && (
        <p id="project-thumbnail-error" role="alert" className="text-small">
          오류: {uploadError || serverError}
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
    </div>
  );
}
