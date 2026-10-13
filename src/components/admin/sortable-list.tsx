"use client";

import { HttpStatusCode } from "axios";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { moveItem } from "@/lib/admin-client/draft";
import { describeAuthFailure } from "@/lib/admin-client/use-admin-form";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./confirm-dialog";

export interface SortableRow {
  slug: string;
  title: string;
  meta: string;
  experienceCount?: number;
}

interface SortableListProps {
  kind: "projects" | "talks";
  items: SortableRow[];
  initialMessage?: string;
}

const LABELS = {
  projects: {
    noun: "프로젝트",
    order: "project-order",
    empty: "등록된 프로젝트가 없습니다.",
  },
  talks: {
    noun: "발표",
    order: "talk-order",
    empty: "등록된 발표가 없습니다.",
  },
} as const;

export function SortableList({
  kind,
  items: initial,
  initialMessage = "",
}: SortableListProps) {
  const label = LABELS[kind];
  const [items, setItems] = useState(initial);
  const [previousInitial, setPreviousInitial] = useState(initial);
  const [savedSlugs, setSavedSlugs] = useState(() =>
    initial.map((item) => item.slug),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [target, setTarget] = useState<SortableRow | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const savingRef = useRef(false);
  const leavingRef = useRef(false);
  const ignoreNextPopRef = useRef(false);
  const dirty =
    items.map((item) => item.slug).join("\0") !== savedSlugs.join("\0");
  if (initial !== previousInitial) {
    setPreviousInitial(initial);
    if (!dirty) {
      setItems(initial);
      setSavedSlugs(initial.map((item) => item.slug));
      setError("");
      setConflict(false);
    }
  }

  useEffect(() => {
    if (!dirty && !busy) return;
    ignoreNextPopRef.current = false;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!leavingRef.current) event.preventDefault();
    };
    // 확인을 거친 이동은 같은 클릭의 beforeunload 경고만 건너뛰고, 페이지에 남으면 다음 tick에 경고를 되살림
    const allowLeaving = () => {
      leavingRef.current = true;
      setTimeout(() => {
        leavingRef.current = false;
      }, 0);
    };
    const onClick = (event: MouseEvent) => {
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
      const anchor = targetElement.closest("a[href]");
      if (
        !anchor ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("href")?.startsWith("#")
      ) {
        return;
      }
      if (
        !window.confirm(
          "저장하지 않은 순서 변경이 있습니다. 변경을 버리고 이동할까요?",
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else {
        allowLeaving();
      }
    };
    const onPopState = () => {
      // 취소 후 history.forward()로 되돌아오며 생긴 popstate는 다시 묻지 않음
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }
      if (
        !window.confirm(
          "저장하지 않은 순서 변경이 있습니다. 변경을 버리고 이동할까요?",
        )
      ) {
        ignoreNextPopRef.current = true;
        window.history.forward();
      } else {
        allowLeaving();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState, true);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [busy, dirty]);

  function move(index: number, delta: -1 | 1) {
    setItems((current) => moveItem(current, index, delta));
    setMessage(
      `${items[index].title}을 ${index + delta + 1}번째로 이동했습니다.`,
    );
    setError("");
    setConflict(false);
  }

  async function saveOrder() {
    if (!dirty || items.length < 2 || savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    setError("");
    setConflict(false);
    try {
      const result = await adminRequest("PUT", `/api/admin/${label.order}`, {
        slugs: items.map((item) => item.slug),
      });
      if (result.ok) {
        setSavedSlugs(items.map((item) => item.slug));
        setMessage("순서를 저장했습니다.");
        return;
      }
      if (result.code === "ORDER_MISMATCH") {
        setConflict(true);
        setError(
          "다른 곳에서 목록이 변경되었습니다. 새로고침한 뒤 다시 시도하세요.",
        );
      } else {
        setError(
          describeAuthFailure(result) ??
            "순서를 저장하지 못했습니다. 잠시 후 다시 시도하세요.",
        );
      }
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  async function remove(row: SortableRow): Promise<string | null> {
    if (savingRef.current) return "목록을 저장하는 중입니다.";
    savingRef.current = true;
    setBusy(true);
    let result: Awaited<ReturnType<typeof adminRequest>>;
    try {
      result = await adminRequest("DELETE", `/api/admin/${kind}/${row.slug}`);
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
    if (result.ok || result.status === HttpStatusCode.NotFound) {
      setItems((current) => current.filter((item) => item.slug !== row.slug));
      setSavedSlugs((current) => current.filter((slug) => slug !== row.slug));
      setMessage(`${row.title}을 삭제했습니다.`);
      setError("");
      setConflict(false);
      headingRef.current?.focus();
      return null;
    }
    return (
      describeAuthFailure(result) ?? "삭제하지 못했습니다. 다시 시도하세요."
    );
  }

  return (
    <div className="space-y-16" aria-busy={busy}>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {label.noun} 목록
      </h2>
      <p aria-live="polite" className="text-small opacity-70">
        {message}
      </p>
      {dirty && (
        <div className="flex flex-wrap items-center gap-12">
          <p className="text-small">
            순서가 변경되었습니다. 저장해야 반영됩니다.
          </p>
          <AdminButton
            variant="primary"
            disabled={busy || items.length < 2}
            onClick={saveOrder}
          >
            저장
          </AdminButton>
        </div>
      )}
      {error && (
        <div className="flex flex-wrap items-center gap-12">
          <p role="alert" className="text-small">
            오류: {error}
          </p>
          {conflict && (
            <AdminButton
              onClick={() => {
                leavingRef.current = true;
                window.location.reload();
              }}
            >
              새로고침
            </AdminButton>
          )}
        </div>
      )}
      {items.length === 0 ? (
        <>
          <p className="text-body opacity-70">{label.empty}</p>
          <AdminButton href={`/admin/${kind}/new`} variant="primary">
            새 {label.noun} 만들기
          </AdminButton>
        </>
      ) : (
        <ol className="divide-y divide-white/10 border-y border-white/10">
          {items.map((item, index) => (
            // 제목 링크의 after 영역을 행 전체로 넓혀 행 어디를 눌러도 편집으로 이동하고 버튼만 그 위에 올림
            <li
              key={item.slug}
              className="group relative flex flex-col gap-12 px-12 py-16 transition-colors hover:bg-white/5 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/${kind}/${item.slug}`}
                  className="text-body break-keep underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-2 focus-visible:outline-white"
                >
                  {index + 1}. {item.title}
                </Link>
                <p className="text-small opacity-70">
                  {item.slug} · {item.meta}
                </p>
              </div>
              <div className="relative z-10 flex flex-wrap items-center gap-8">
                <AdminButton
                  variant="icon"
                  disabled={busy || index === 0}
                  aria-label={`${item.title} 위로 이동`}
                  onClick={() => move(index, -1)}
                >
                  <span aria-hidden="true">↑</span>
                </AdminButton>
                <AdminButton
                  variant="icon"
                  disabled={busy || index === items.length - 1}
                  aria-label={`${item.title} 아래로 이동`}
                  onClick={() => move(index, 1)}
                >
                  <span aria-hidden="true">↓</span>
                </AdminButton>
                <AdminButton
                  variant="danger"
                  disabled={busy}
                  aria-label={`${item.title} 삭제`}
                  onClick={() => setTarget(item)}
                >
                  삭제
                </AdminButton>
              </div>
            </li>
          ))}
        </ol>
      )}
      <ConfirmDialog
        open={target !== null}
        title={`${target?.title ?? ""}을 삭제할까요?`}
        description={
          kind === "projects" ? (
            <>
              <p>
                연결된 경험 {target?.experienceCount ?? 0}개도 함께 삭제되며
                되돌릴 수 없습니다.
              </p>
              <p>공개 주소 /work/{target?.slug}가 더 이상 열리지 않습니다.</p>
            </>
          ) : (
            <p>되돌릴 수 없습니다.</p>
          )
        }
        onConfirm={() => (target ? remove(target) : Promise.resolve(null))}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
