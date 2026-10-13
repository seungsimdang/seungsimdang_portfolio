"use client";

import { HttpStatusCode } from "axios";
import Link from "next/link";
import { type RefObject, useEffect, useRef, useState } from "react";
import type { ResumeKind } from "@/constants/resume";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { moveItem } from "@/lib/admin-client/draft";
import { describeAuthFailure } from "@/lib/admin-client/use-admin-form";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./confirm-dialog";

export interface SortableRow {
  id: string;
  title: string;
  meta: string;
  experienceCount?: number;
}

interface SortableListProps {
  kind: "projects" | "talks" | "resume";
  items: SortableRow[];
  initialMessage?: string;
  // resume 전용: 정렬 대상 구분, 명사, 화면의 가시 제목 id
  resumeKind?: ResumeKind;
  noun?: string;
  headingId?: string;
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

const RESUME_BASE = "/api/admin/resume-entries";

// 미저장 변경이 있는 동안 새로고침과 링크, 뒤로가기 이동을 확인
function useLeaveGuard(active: boolean, leavingRef: RefObject<boolean>) {
  const ignoreNextPopRef = useRef(false);
  useEffect(() => {
    if (!active) return;
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
  }, [active, leavingRef]);
}

interface SortableItemProps {
  item: SortableRow;
  index: number;
  count: number;
  kind: SortableListProps["kind"];
  busy: boolean;
  onMove: (index: number, delta: -1 | 1) => void;
  onRemove: (item: SortableRow) => void;
}

function SortableItem({
  item,
  index,
  count,
  kind,
  busy,
  onMove,
  onRemove,
}: SortableItemProps) {
  return (
    // 제목 링크의 after 영역을 행 전체로 넓혀 행 어디를 눌러도 편집으로 이동하고 버튼만 그 위에 올림
    <li className="group relative flex flex-col gap-12 px-12 py-16 transition-colors hover:bg-white/5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <Link
          href={`/admin/${kind}/${item.id}`}
          className="text-body break-keep underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-2 focus-visible:outline-white"
        >
          {index + 1}. {item.title}
        </Link>
        {kind === "resume" ? (
          item.meta && <p className="text-small opacity-70">{item.meta}</p>
        ) : (
          <p className="text-small opacity-70">
            {item.id} · {item.meta}
          </p>
        )}
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-8">
        <AdminButton
          variant="icon"
          disabled={busy || index === 0}
          aria-label={`${item.title} 위로 이동`}
          onClick={() => onMove(index, -1)}
        >
          <span aria-hidden="true">↑</span>
        </AdminButton>
        <AdminButton
          variant="icon"
          disabled={busy || index === count - 1}
          aria-label={`${item.title} 아래로 이동`}
          onClick={() => onMove(index, 1)}
        >
          <span aria-hidden="true">↓</span>
        </AdminButton>
        <AdminButton
          variant="danger"
          disabled={busy}
          aria-label={`${item.title} 삭제`}
          onClick={() => onRemove(item)}
        >
          삭제
        </AdminButton>
      </div>
    </li>
  );
}

function SortableError({
  error,
  conflict,
  onReload,
}: {
  error: string;
  conflict: boolean;
  onReload: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-12">
      <p role="alert" className="text-small">
        오류: {error}
      </p>
      {conflict && <AdminButton onClick={onReload}>새로고침</AdminButton>}
    </div>
  );
}

function RemoveDescription({
  kind,
  target,
}: {
  kind: SortableListProps["kind"];
  target: SortableRow | null;
}) {
  if (kind !== "projects") return <p>되돌릴 수 없습니다.</p>;
  return (
    <>
      <p>
        연결된 경험 {target?.experienceCount ?? 0}개도 함께 삭제되며 되돌릴 수
        없습니다.
      </p>
      <p>공개 주소 /work/{target?.id}가 더 이상 열리지 않습니다.</p>
    </>
  );
}

export function SortableList({
  kind,
  items: initial,
  initialMessage = "",
  resumeKind,
  noun,
  headingId,
}: SortableListProps) {
  const isResume = kind === "resume";
  const label = isResume
    ? { noun: noun ?? "", empty: `등록된 ${noun}이 없습니다.` }
    : LABELS[kind];
  const [items, setItems] = useState(initial);
  const [previousInitial, setPreviousInitial] = useState(initial);
  const [savedIds, setSavedIds] = useState(() =>
    initial.map((item) => item.id),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [target, setTarget] = useState<SortableRow | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const savingRef = useRef(false);
  const leavingRef = useRef(false);
  const dirty = items.map((item) => item.id).join("\0") !== savedIds.join("\0");
  if (initial !== previousInitial) {
    setPreviousInitial(initial);
    if (!dirty) {
      setItems(initial);
      setSavedIds(initial.map((item) => item.id));
      setError("");
      setConflict(false);
    }
  }

  useLeaveGuard(dirty || busy, leavingRef);

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
      const ids = items.map((item) => item.id);
      const result =
        kind === "resume"
          ? await adminRequest("PUT", "/api/admin/resume-order", {
              kind: resumeKind,
              ids,
            })
          : await adminRequest("PUT", `/api/admin/${LABELS[kind].order}`, {
              slugs: ids,
            });
      if (result.ok) {
        setSavedIds(items.map((item) => item.id));
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
      result = await adminRequest(
        "DELETE",
        `${isResume ? RESUME_BASE : `/api/admin/${kind}`}/${row.id}`,
      );
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
    if (result.ok || result.status === HttpStatusCode.NotFound) {
      setItems((current) => current.filter((item) => item.id !== row.id));
      setSavedIds((current) => current.filter((id) => id !== row.id));
      setMessage(`${row.title}을 삭제했습니다.`);
      setError("");
      setConflict(false);
      (headingId
        ? document.getElementById(headingId)
        : headingRef.current
      )?.focus();
      return null;
    }
    return (
      describeAuthFailure(result) ?? "삭제하지 못했습니다. 다시 시도하세요."
    );
  }

  return (
    <div className="space-y-16" aria-busy={busy}>
      {!isResume && (
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">
          {label.noun} 목록
        </h2>
      )}
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
        <SortableError
          error={error}
          conflict={conflict}
          onReload={() => {
            leavingRef.current = true;
            window.location.reload();
          }}
        />
      )}
      {items.length === 0 ? (
        <>
          <p className="text-body opacity-70">{label.empty}</p>
          {!isResume && (
            <AdminButton href={`/admin/${kind}/new`} variant="primary">
              새 {label.noun} 만들기
            </AdminButton>
          )}
        </>
      ) : (
        <ol className="divide-y divide-white/10 border-y border-white/10">
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              count={items.length}
              kind={kind}
              busy={busy}
              onMove={move}
              onRemove={setTarget}
            />
          ))}
        </ol>
      )}
      <ConfirmDialog
        open={target !== null}
        title={`${target?.title ?? ""}을 삭제할까요?`}
        description={<RemoveDescription kind={kind} target={target} />}
        onConfirm={() => (target ? remove(target) : Promise.resolve(null))}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
