"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PendingLeave =
  | { type: "link"; anchor: HTMLAnchorElement }
  | { type: "back"; targetKey: string };

interface LeaveConfirmOptions {
  // 브라우저 뒤로가기·앞으로가기도 가로챌지 여부, Navigation API가 없는 브라우저에서는 가로채지 않음
  guardBack?: boolean;
}

// 확인 후 이동이 끝날 때까지 beforeunload 기본 창을 우회하는 최대 시간
const LEAVE_MS = 5000;

// 이동 방향과 단계 수를 몰라도 기록 항목 키로 정확히 위치를 지정하는 Navigation API 접근
function getNavigation() {
  return "navigation" in window ? window.navigation : undefined;
}

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
    const navigation = getNavigation();
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
    // 기록 이동은 popstate 시점에 이미 라우터가 먼저 처리하므로, 그 앞 단계인 navigate 이벤트에서 취소해 주소와 화면을 이탈 전으로 유지
    const onNavigate = (event: NavigateEvent) => {
      if (
        event.navigationType !== "traverse" ||
        !event.cancelable ||
        !event.destination.sameDocument
      ) {
        return;
      }
      if (bypassPopRef.current) {
        bypassPopRef.current = false;
        return;
      }
      event.preventDefault();
      if (!pendingRef.current && event.destination.key) {
        request({ type: "back", targetKey: event.destination.key });
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    if (guardBack) navigation?.addEventListener("navigate", onNavigate);
    return () => {
      bypassPopRef.current = false;
      navigation?.removeEventListener("navigate", onNavigate);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, guardBack, request]);

  // 확인 후 처음 의도한 이동을 수행, 링크는 같은 요소를 다시 눌러 라우터와 일반 이동 모두 그대로 처리
  async function proceed(): Promise<string | null> {
    const current = pendingRef.current;
    if (!current) return null;
    if (current.type === "link") {
      if (!current.anchor.isConnected) return null;
      allowLeaving(LEAVE_MS);
      bypassClickRef.current = true;
      try {
        current.anchor.click();
      } finally {
        bypassClickRef.current = false;
      }
      return null;
    }
    allowLeaving(LEAVE_MS);
    bypassPopRef.current = true;
    setTimeout(() => {
      bypassPopRef.current = false;
    }, LEAVE_MS);
    getNavigation()
      ?.traverseTo(current.targetKey)
      ?.finished?.catch(() => {
        bypassPopRef.current = false;
      });
    return null;
  }

  return {
    open: pending !== null,
    proceed,
    stay: () => request(null),
    leavingRef,
  };
}
