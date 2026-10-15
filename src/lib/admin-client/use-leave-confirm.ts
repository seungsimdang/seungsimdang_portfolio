"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PendingLeave =
  | { type: "link"; anchor: HTMLAnchorElement }
  | { type: "back" };

interface LeaveConfirmOptions {
  // 브라우저 뒤로가기도 가로챌지 여부, 되돌아온 이동을 뒤로가기로 가정함
  guardBack?: boolean;
}

// popstate 되돌림 직후 도착하는 이벤트를 무시하는 최대 대기 시간
const IGNORE_POP_MS = 500;
const BYPASS_POP_MS = 1000;

// 미저장 변경이 있는 동안 새로고침은 브라우저 기본 창으로, 링크 클릭과 뒤로가기는 확인 모달로 막는 공통 상태
export function useLeaveConfirm(
  active: boolean,
  { guardBack = false }: LeaveConfirmOptions = {},
) {
  const [pending, setPending] = useState<PendingLeave | null>(null);
  const pendingRef = useRef<PendingLeave | null>(null);
  // 확인을 거친 이동에서 beforeunload 기본 창이 한 번 더 뜨지 않게 함
  const leavingRef = useRef(false);
  const bypassClickRef = useRef(false);
  const bypassPopRef = useRef(false);
  const ignorePopRef = useRef(false);

  const request = useCallback((next: PendingLeave | null) => {
    pendingRef.current = next;
    setPending(next);
  }, []);

  function allowLeaving(ms: number) {
    leavingRef.current = true;
    setTimeout(() => {
      leavingRef.current = false;
    }, ms);
  }

  useEffect(() => {
    if (!active) return;
    let ignoreTimer: ReturnType<typeof setTimeout> | undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!leavingRef.current) event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (bypassClickRef.current) return;
      const targetElement = event.target;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(targetElement instanceof Element)
      ) {
        return;
      }
      const anchor = targetElement.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("href")?.startsWith("#")
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      // 이미 모달이 열려 있으면 추가 클릭은 무시
      if (!pendingRef.current) request({ type: "link", anchor });
    };
    // 라우터가 이동을 처리하기 전에 이벤트를 막고, 주소만 먼저 바뀐 기록을 되돌려 화면과 주소를 이탈 전으로 유지
    const onPopState = (event: PopStateEvent) => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        event.stopImmediatePropagation();
        return;
      }
      if (bypassPopRef.current) {
        bypassPopRef.current = false;
        return;
      }
      event.stopImmediatePropagation();
      ignorePopRef.current = true;
      clearTimeout(ignoreTimer);
      ignoreTimer = setTimeout(() => {
        ignorePopRef.current = false;
      }, IGNORE_POP_MS);
      window.history.forward();
      if (!pendingRef.current) request({ type: "back" });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    if (guardBack) window.addEventListener("popstate", onPopState, true);
    return () => {
      clearTimeout(ignoreTimer);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
    };
  }, [active, guardBack, request]);

  // 확인 후 처음 의도한 이동을 수행, 링크는 같은 요소를 다시 눌러 라우터와 일반 이동 모두 그대로 처리
  async function proceed(): Promise<string | null> {
    const current = pendingRef.current;
    if (!current) return null;
    if (current.type === "link") {
      if (!current.anchor.isConnected) return null;
      allowLeaving(0);
      bypassClickRef.current = true;
      try {
        current.anchor.click();
      } finally {
        bypassClickRef.current = false;
      }
      return null;
    }
    allowLeaving(BYPASS_POP_MS);
    bypassPopRef.current = true;
    setTimeout(() => {
      bypassPopRef.current = false;
    }, BYPASS_POP_MS);
    window.history.back();
    return null;
  }

  return {
    open: pending !== null,
    proceed,
    stay: () => request(null),
    leavingRef,
  };
}
