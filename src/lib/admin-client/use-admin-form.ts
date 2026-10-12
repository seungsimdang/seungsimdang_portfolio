"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { HttpStatus } from "@/constants/http-status";
import type { AdminResult } from "./admin-request";
import type { Validation } from "./validate";

export interface Notice {
  tone: "success" | "error";
  message: string;
  link?: { href: string; label: string };
  signOut?: boolean;
}

const SAVE_FAILED = "저장하지 못했습니다. 잠시 후 다시 시도하세요.";

// 저장 실패 응답을 화면용 알림과 필드 오류로 변환
function describeFailure(
  result: Extract<AdminResult<unknown>, { ok: false }>,
  listHref: string,
): { notice: Notice; fieldErrors: Record<string, string> } {
  const fieldErrors = { ...result.fieldErrors };
  if (result.status === HttpStatus.Unauthorized) {
    const from = encodeURIComponent(window.location.pathname);
    return {
      notice: {
        tone: "error",
        message: "세션이 만료되었습니다. 입력한 내용은 저장되지 않았습니다.",
        link: {
          href: `/admin/login?reason=expired&from=${from}`,
          label: "다시 로그인",
        },
      },
      fieldErrors,
    };
  }
  if (result.status === HttpStatus.Forbidden) {
    return {
      notice: { tone: "error", message: "권한이 없습니다.", signOut: true },
      fieldErrors,
    };
  }
  if (result.status === HttpStatus.NotFound) {
    return {
      notice: {
        tone: "error",
        message: "대상이 이미 삭제되었습니다.",
        link: { href: listHref, label: "목록으로" },
      },
      fieldErrors,
    };
  }
  if (result.code === "NOT_SEEDED") {
    return {
      notice: {
        tone: "error",
        message:
          "포트폴리오 데이터가 초기화되지 않았습니다. seed 실행 후 다시 시도하세요.",
      },
      fieldErrors,
    };
  }
  if (result.code === "SLUG_CONFLICT") {
    fieldErrors.slug = "이미 사용 중인 slug입니다.";
    return {
      notice: { tone: "error", message: "slug를 확인하세요." },
      fieldErrors,
    };
  }
  if (result.status === HttpStatus.BadRequest) {
    return {
      notice: { tone: "error", message: "입력값을 확인하세요." },
      fieldErrors,
    };
  }
  return { notice: { tone: "error", message: SAVE_FAILED }, fieldErrors };
}

// 렌더 직후 지정한 id의 요소로 포커스 이동
export function useFocusAfterRender() {
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (!pending.current) return;
    document.getElementById(pending.current)?.focus();
    pending.current = null;
  });
  return (id: string) => {
    pending.current = id;
  };
}

interface UseAdminFormOptions<D, I, R> {
  draft: D;
  setDraft: (draft: D) => void;
  validate: (draft: D) => Validation<I>;
  save: (input: I) => Promise<AdminResult<R>>;
  // 저장 성공 후 폼 기준값으로 삼을 draft, 화면을 떠나는 경우 undefined
  onSaved: (result: R) => D | undefined;
  listHref: string;
  initialSaved?: boolean;
}

// 검증, 저장, 오류 매핑, 미저장 이탈 경고를 묶은 admin 폼 공통 상태
export function useAdminForm<D, I, R>({
  draft,
  setDraft,
  validate,
  save,
  onSaved,
  listHref,
  initialSaved = false,
}: UseAdminFormOptions<D, I, R>) {
  const formRef = useRef<HTMLFormElement>(null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(
    initialSaved ? { tone: "success", message: SAVED_MESSAGE } : null,
  );
  const [saving, setSaving] = useState(false);
  const [focusTick, setFocusTick] = useState(0);

  const dirty = JSON.stringify(draft) !== baseline;
  const validation = validate(draft);
  const clientErrors =
    submitted && !validation.success ? validation.errors : {};
  const errors = { ...serverErrors, ...clientErrors };
  const errorCount = Object.keys(errors).length;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onClick = (event: MouseEvent) => {
      // 뒤로가기와 router.push 이동은 click 이벤트가 없어 보호하지 못하는 한계가 있음
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest("a[href]");
      if (
        !anchor ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("href")?.startsWith("#")
      )
        return;
      if (
        !window.confirm("저장하지 않은 변경 사항이 사라집니다. 이동할까요?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  useEffect(() => {
    if (focusTick === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [focusTick]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    setServerErrors({});
    if (!validation.success) {
      setNotice({
        tone: "error",
        message: `${Object.keys(validation.errors).length}개 항목을 확인하세요.`,
      });
      setFocusTick((tick) => tick + 1);
      return;
    }
    setSaving(true);
    setNotice(null);
    let result: Awaited<ReturnType<typeof save>>;
    try {
      result = await save(validation.data);
    } finally {
      setSaving(false);
    }
    if (!result.ok) {
      const failure = describeFailure(result, listHref);
      setServerErrors(failure.fieldErrors);
      setNotice(failure.notice);
      setFocusTick((tick) => tick + 1);
      return;
    }
    const next = onSaved(result.data);
    if (next !== undefined) setDraft(next);
    setBaseline(JSON.stringify(next ?? draft));
    setSubmitted(false);
    setNotice({ tone: "success", message: SAVED_MESSAGE });
  }

  return {
    formRef,
    errors,
    errorCount,
    // 성공 알림은 이후 편집이 시작되면 숨김
    notice: notice?.tone === "success" && dirty ? null : notice,
    saving,
    submit,
  };
}

const SAVED_MESSAGE = "저장했습니다. 공개 페이지에 반영되었습니다.";
