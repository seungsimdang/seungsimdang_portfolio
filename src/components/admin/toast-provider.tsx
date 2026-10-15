"use client";

import Link from "next/link";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/utils/styleUtils";
import { AdminButton } from "./admin-button";
import { SignOutButton } from "./sign-out-button";

export interface Notice {
  tone: "success" | "warning" | "error";
  message: string;
  link?: { href: string; label: string };
  signOut?: boolean;
  action?: { label: string; onClick: () => void };
}

interface ToastEntry {
  id: number;
  // 같은 내용이 다시 들어오면 갱신해 다시 낭독하고 소멸 타이머를 처음부터 시작
  renderKey: number;
  notice: Notice;
  group?: string;
}

interface ToastApi {
  // group이 같은 이전 오류·경고는 새 성공 알림이 생길 때 치움
  notify: (notice: Notice, group?: string) => void;
  clearGroup: (group: string) => void;
}

const MAX_TOASTS = 3;
const SUCCESS_VISIBLE_MS = 6000;
const CLOSE_LABEL = "알림 닫기";

const PREFIX: Record<Notice["tone"], string> = {
  success: "완료: ",
  warning: "주의: ",
  error: "오류: ",
};

const TONE_CLASS: Record<Notice["tone"], string> = {
  success: "border-white/25",
  warning: "border-white",
  error: "border-danger",
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("ToastProvider 안에서만 사용할 수 있습니다.");
  return api;
}

function sameNotice(a: Notice, b: Notice) {
  return (
    a.tone === b.tone &&
    a.message === b.message &&
    a.signOut === b.signOut &&
    a.action?.label === b.action?.label &&
    a.link?.href === b.link?.href &&
    a.link?.label === b.link?.label
  );
}

// 상한을 넘으면 가장 오래된 성공을 먼저, 없으면 가장 오래된 알림을 제거
function trim(entries: ToastEntry[]) {
  const next = [...entries];
  while (next.length > MAX_TOASTS) {
    const index = next.findIndex((entry) => entry.notice.tone === "success");
    next.splice(index === -1 ? 0 : index, 1);
  }
  return next;
}

function ToastItem({
  entry,
  onDismiss,
}: {
  entry: ToastEntry;
  onDismiss: (id: number) => void;
}) {
  const { notice } = entry;
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const autoDismiss = notice.tone === "success";

  useEffect(() => {
    if (!autoDismiss || paused) return;
    const timer = setTimeout(() => onDismiss(entry.id), SUCCESS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [autoDismiss, paused, entry.id, onDismiss]);

  function dismissWithFocus() {
    const element = ref.current;
    const neighbor =
      element?.nextElementSibling ?? element?.previousElementSibling;
    const closeButton = neighbor?.querySelector<HTMLElement>(
      `button[aria-label="${CLOSE_LABEL}"]`,
    );
    onDismiss(entry.id);
    if (closeButton) closeButton.focus();
    else document.getElementById("admin-main")?.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    dismissWithFocus();
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 소멸 일시정지와 Esc 닫기를 위해 내부 포커스와 포인터 이벤트만 관찰
    <div
      ref={ref}
      role={notice.tone === "error" ? "alert" : "status"}
      onKeyDown={onKeyDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={cn(
        "pointer-events-auto flex items-start gap-8 rounded-md border bg-black py-8 pr-4 pl-16 text-small",
        TONE_CLASS[notice.tone],
      )}
    >
      <div className="min-w-0 flex-1 py-12 break-words">
        <p>
          {PREFIX[notice.tone]}
          {notice.message}
        </p>
        {(notice.link || notice.signOut || notice.action) && (
          <div className="mt-8 flex flex-wrap items-center gap-12">
            {notice.link && (
              <Link
                href={notice.link.href}
                className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-white"
              >
                {notice.link.label}
              </Link>
            )}
            {notice.signOut && <SignOutButton />}
            {notice.action && (
              <AdminButton onClick={notice.action.onClick}>
                {notice.action.label}
              </AdminButton>
            )}
          </div>
        )}
      </div>
      <AdminButton
        variant="icon"
        aria-label={CLOSE_LABEL}
        onClick={dismissWithFocus}
      >
        <span aria-hidden="true">×</span>
      </AdminButton>
    </div>
  );
}

// 뷰포트 하단에 고정되는 결과 알림 영역, 라우트 이동에도 유지되는 레이아웃에 둠
export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const notify = useCallback((notice: Notice, group?: string) => {
    counter.current += 1;
    const serial = counter.current;
    setEntries((current) => {
      const base =
        group && notice.tone === "success"
          ? current.filter(
              (entry) =>
                entry.group !== group || entry.notice.tone === "success",
            )
          : current;
      const duplicate = base.find((entry) => sameNotice(entry.notice, notice));
      if (duplicate) {
        return base.map((entry) =>
          entry === duplicate ? { ...entry, renderKey: serial, group } : entry,
        );
      }
      return trim([...base, { id: serial, renderKey: serial, notice, group }]);
    });
  }, []);

  const clearGroup = useCallback((group: string) => {
    setEntries((current) => {
      const next = current.filter(
        (entry) => entry.group !== group || entry.notice.tone === "success",
      );
      return next.length === current.length ? current : next;
    });
  }, []);

  const api = useMemo(() => ({ notify, clearGroup }), [notify, clearGroup]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section
        aria-label="알림"
        className="pointer-events-none fixed inset-x-16 bottom-(--admin-toast-bottom) z-40 flex flex-col gap-8 md:right-24 md:left-auto md:w-full md:max-w-480"
      >
        {entries.map((entry) => (
          <ToastItem key={entry.renderKey} entry={entry} onDismiss={dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  );
}
