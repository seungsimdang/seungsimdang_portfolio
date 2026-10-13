"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HttpStatus } from "@/constants/http-status";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { moveItem } from "@/lib/admin-client/draft";
import { describeAuthFailure } from "@/lib/admin-client/use-admin-form";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./confirm-dialog";

export interface SortableRow {
  slug: string;
  title: string;
  // 제목 아래 보조 텍스트 (기간, 날짜와 장소 등)
  meta: string;
  // 프로젝트만, 삭제 안내에 쓰는 연결 경험 수
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

// 목록 순서 변경은 즉시 저장하고, 삭제는 확인 대화상자를 거침
export function SortableList({
  kind,
  items: initial,
  initialMessage = "",
}: SortableListProps) {
  const label = LABELS[kind];
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<SortableRow | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  async function move(index: number, delta: -1 | 1) {
    const previous = items;
    const next = moveItem(items, index, delta);
    setItems(next);
    setBusy(true);
    setError("");
    let result: Awaited<ReturnType<typeof adminRequest>>;
    try {
      result = await adminRequest("PUT", `/api/admin/${label.order}`, {
        slugs: next.map((item) => item.slug),
      });
    } finally {
      setBusy(false);
    }
    if (result.ok) {
      setMessage(
        `${previous[index].title}을 ${index + delta + 1}번째로 이동했습니다.`,
      );
      return;
    }
    setItems(previous);
    setError(
      describeAuthFailure(result) ??
        (result.code === "ORDER_MISMATCH"
          ? "다른 곳에서 목록이 변경되었습니다. 새로고침한 뒤 다시 시도하세요."
          : "순서를 저장하지 못했습니다. 잠시 후 다시 시도하세요."),
    );
  }

  async function remove(row: SortableRow): Promise<string | null> {
    const result = await adminRequest(
      "DELETE",
      `/api/admin/${kind}/${row.slug}`,
    );
    if (result.ok || result.status === HttpStatus.NotFound) {
      setItems((current) => current.filter((item) => item.slug !== row.slug));
      setMessage(`${row.title}을 삭제했습니다.`);
      setError("");
      headingRef.current?.focus();
      return null;
    }
    return (
      describeAuthFailure(result) ?? "삭제하지 못했습니다. 다시 시도하세요."
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-16">
        <p role="status" className="text-small">
          {message}
        </p>
        <p className="text-body opacity-70">{label.empty}</p>
        <Button href={`/admin/${kind}/new`}>새 {label.noun} 만들기</Button>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {label.noun} 목록
      </h2>
      <p aria-live="polite" className="text-small opacity-70">
        {message}
      </p>
      {error && (
        <p role="alert" className="text-small">
          오류: {error}
        </p>
      )}
      <ol className="divide-y divide-white/10 border-y border-white/10">
        {items.map((item, index) => (
          <li
            key={item.slug}
            aria-busy={busy}
            className="flex flex-col gap-12 py-16 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <p className="text-body break-keep">
                {index + 1}. {item.title}
              </p>
              <p className="text-small opacity-70">
                {item.slug} · {item.meta}
              </p>
            </div>
            <div className="flex flex-wrap gap-8">
              <AdminButton
                disabled={busy || index === 0}
                aria-label={`${item.title} 위로 이동`}
                onClick={() => move(index, -1)}
              >
                위로
              </AdminButton>
              <AdminButton
                disabled={busy || index === items.length - 1}
                aria-label={`${item.title} 아래로 이동`}
                onClick={() => move(index, 1)}
              >
                아래로
              </AdminButton>
              <AdminButton href={`/admin/${kind}/${item.slug}`}>
                편집
              </AdminButton>
              <AdminButton
                variant="danger"
                aria-label={`${item.title} 삭제`}
                onClick={() => setTarget(item)}
              >
                삭제
              </AdminButton>
            </div>
          </li>
        ))}
      </ol>
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
