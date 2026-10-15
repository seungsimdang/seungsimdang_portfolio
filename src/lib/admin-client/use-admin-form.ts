"use client";

import { HttpStatusCode } from "axios";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { type Notice, useToast } from "@/components/admin/toast-provider";
import type { AdminResult } from "./admin-request";
import { useLeaveConfirm } from "./use-leave-confirm";
import type { Validation } from "./validate";

const SAVE_FAILED = "저장하지 못했습니다. 잠시 후 다시 시도하세요.";
const SAVED_MESSAGE = "저장했습니다. 공개 페이지에 반영되었습니다.";
const SESSION_EXPIRED = "세션이 만료되었습니다. 다시 로그인하세요.";
const FORBIDDEN_MESSAGE = "권한이 없습니다.";
const FORBIDDEN_ORIGIN_MESSAGE = "요청 출처가 허용되지 않습니다.";

const RATE_LIMITED_MESSAGE =
  "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";

type AdminFailure = Extract<AdminResult<unknown>, { ok: false }>;

// 목록 순서 변경과 삭제처럼 알림 구조가 필요 없는 경로의 401/403 문구
export function describeAuthFailure(result: AdminFailure): string | null {
  if (result.status === HttpStatusCode.Unauthorized) return SESSION_EXPIRED;
  if (result.status === HttpStatusCode.Forbidden) {
    return result.code === "FORBIDDEN_ORIGIN"
      ? FORBIDDEN_ORIGIN_MESSAGE
      : FORBIDDEN_MESSAGE;
  }
  if (result.status === HttpStatusCode.TooManyRequests)
    return RATE_LIMITED_MESSAGE;
  return null;
}

// 저장 실패 응답을 화면용 알림과 필드 오류로 변환
function describeFailure(
  result: AdminFailure,
  listHref: string,
): { notice: Notice; fieldErrors: Record<string, string> } {
  const fieldErrors = { ...result.fieldErrors };
  if (result.status === HttpStatusCode.Unauthorized) {
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
  if (result.status === HttpStatusCode.Forbidden) {
    // 출처 거부는 계정 문제가 아니므로 로그아웃을 유도하지 않음
    const originDenied = result.code === "FORBIDDEN_ORIGIN";
    return {
      notice: {
        tone: "error",
        message: originDenied ? FORBIDDEN_ORIGIN_MESSAGE : FORBIDDEN_MESSAGE,
        signOut: !originDenied,
      },
      fieldErrors,
    };
  }
  if (result.status === HttpStatusCode.NotFound) {
    return {
      notice: {
        tone: "error",
        message: "대상이 이미 삭제되었습니다.",
        link: { href: listHref, label: "목록으로" },
      },
      fieldErrors,
    };
  }
  if (result.status === HttpStatusCode.TooManyRequests) {
    return {
      notice: { tone: "error", message: RATE_LIMITED_MESSAGE },
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
  if (result.code === "LIMIT_EXCEEDED") {
    return {
      notice: {
        tone: "error",
        message: "더 만들 수 없습니다. 기존 항목을 삭제한 뒤 다시 시도하세요.",
      },
      fieldErrors,
    };
  }
  if (result.code === "SLUG_CONFLICT") {
    fieldErrors.slug = "이미 사용 중인 주소입니다.";
    return {
      notice: { tone: "error", message: "slug를 확인하세요." },
      fieldErrors,
    };
  }
  if (result.status === HttpStatusCode.BadRequest) {
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
}

// 검증, 저장, 오류 매핑, 미저장 이탈 경고를 묶은 admin 폼 공통 상태
export function useAdminForm<D, I, R>({
  draft,
  setDraft,
  validate,
  save,
  onSaved,
  listHref,
}: UseAdminFormOptions<D, I, R>) {
  const formRef = useRef<HTMLFormElement>(null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const { notify, clearGroup } = useToast();
  // 같은 폼의 이전 오류 알림만 치우기 위한 식별자
  const toastGroup = useId();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [focusTick, setFocusTick] = useState(0);

  const dirty = JSON.stringify(draft) !== baseline;
  const validation = validate(draft);
  const clientErrors =
    submitted && !validation.success ? validation.errors : {};
  const errors = { ...serverErrors, ...clientErrors };
  const errorCount = Object.keys(errors).length;

  const leaveGuard = useLeaveConfirm(dirty);

  useEffect(() => {
    if (focusTick === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [focusTick]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (savingRef.current) return;
    setSubmitted(true);
    setServerErrors({});
    clearGroup(toastGroup);
    if (!validation.success) {
      notify(
        {
          tone: "error",
          message: `${Object.keys(validation.errors).length}개 항목을 확인하세요.`,
        },
        toastGroup,
      );
      setFocusTick((tick) => tick + 1);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    let result: Awaited<ReturnType<typeof save>>;
    try {
      result = await save(validation.data);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    if (!result.ok) {
      const failure = describeFailure(result, listHref);
      setServerErrors(failure.fieldErrors);
      notify(failure.notice, toastGroup);
      setFocusTick((tick) => tick + 1);
      return;
    }
    // 저장 직후 화면이 바뀌는 경로에서도 알림이 남도록 이동 전에 먼저 띄움
    notify({ tone: "success", message: SAVED_MESSAGE }, toastGroup);
    const next = onSaved(result.data);
    if (next !== undefined) setDraft(next);
    setBaseline(JSON.stringify(next ?? draft));
    setSubmitted(false);
  }

  return {
    formRef,
    errors,
    errorCount,
    focusTick,
    saving,
    submit,
    leaveGuard,
    // 저장 훅 밖(업로드, 가져오기)에서 생긴 결과도 같은 폼의 알림으로 묶음
    notify: (notice: Notice) => notify(notice, toastGroup),
  };
}
