"use client";

import { HttpStatusCode } from "axios";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin-client/admin-request";
import {
  describeAuthFailure,
  useAdminForm,
} from "@/lib/admin-client/use-admin-form";
import { validateWith } from "@/lib/admin-client/validate";
import {
  talkCreateInputSchema,
  talkUpdateInputSchema,
} from "@/schemas/portfolio.schema";
import type { TechTalk } from "@/types/portfolio";
import { ConfirmDialog } from "./confirm-dialog";
import { FormActionBar } from "./form-parts";
import { LeaveDialog } from "./leave-dialog";
import { TextAreaField, TextField } from "./text-fields";
import { useToast } from "./toast-provider";

interface TalkDraft {
  slug: string;
  title: string;
  date: string;
  venue: string;
  description: string;
  impact: string;
  link: string;
}

function toDraft(talk?: TechTalk): TalkDraft {
  return {
    slug: talk?.slug ?? "",
    title: talk?.title ?? "",
    date: talk?.date ?? "",
    venue: talk?.venue ?? "",
    description: talk?.description ?? "",
    impact: talk?.impact ?? "",
    link: talk?.link ?? "",
  };
}

function toInput(draft: TalkDraft) {
  const { slug, ...rest } = draft;
  return { slug, ...rest };
}

interface TalkFormProps {
  talk?: TechTalk;
}

export function TalkForm({ talk }: TalkFormProps) {
  const router = useRouter();
  const { notify } = useToast();
  const isEdit = talk !== undefined;
  const savedSlug = useRef(talk?.slug ?? "");
  const [draft, setDraft] = useState(() => toDraft(talk));
  const [deleting, setDeleting] = useState(false);
  const [slugChange, setSlugChange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const set = <K extends keyof TalkDraft>(key: K, value: TalkDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const form = useAdminForm({
    draft,
    setDraft,
    validate: (d) =>
      isEdit
        ? validateWith(talkUpdateInputSchema, toInput(d))
        : validateWith(talkCreateInputSchema, toInput(d)),
    save: (input) =>
      isEdit
        ? adminRequest<TechTalk>(
            "PUT",
            `/api/admin/talks/${savedSlug.current}`,
            input,
          )
        : adminRequest<TechTalk>("POST", "/api/admin/talks", input),
    // 생성 후에는 편집 화면으로 이동
    onSaved: (saved) => {
      if (isEdit) {
        if (saved.slug !== savedSlug.current) {
          savedSlug.current = saved.slug;
          void router.replace(`/admin/talks/${saved.slug}`);
        }
        return toDraft(saved);
      }
      router.push(`/admin/talks/${saved.slug}`);
      return undefined;
    },
    listHref: "/admin/talks",
  });
  const { errors } = form;

  async function remove(): Promise<string | null> {
    if (!talk) return null;
    const result = await adminRequest(
      "DELETE",
      `/api/admin/talks/${savedSlug.current}`,
    );
    if (result.ok || result.status === HttpStatusCode.NotFound) {
      notify({ tone: "success", message: "삭제했습니다." });
      router.push("/admin/talks");
      return null;
    }
    return (
      describeAuthFailure(result) ?? "삭제하지 못했습니다. 다시 시도하세요."
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    // 검증보다 먼저 묻고, 확인하면 모달에서 저장을 이어감
    if (isEdit && draft.slug !== savedSlug.current) {
      event.preventDefault();
      setSlugChange({ from: savedSlug.current, to: draft.slug });
      return;
    }
    return form.submit(event);
  }

  return (
    <form
      ref={form.formRef}
      noValidate
      aria-busy={form.saving}
      onSubmit={submit}
      className="space-y-24"
    >
      <TextField
        id="talk-slug"
        label="slug"
        required
        maxLength={64}
        value={draft.slug}
        error={errors.slug}
        hint={
          isEdit
            ? "영문 소문자, 숫자, 하이픈(-) 64자 이하입니다."
            : "영문 소문자, 숫자, 하이픈(-)만 사용합니다."
        }
        onChange={(v) => set("slug", v)}
      />
      <TextField
        id="talk-title"
        label="제목"
        required
        value={draft.title}
        error={errors.title}
        onChange={(v) => set("title", v)}
      />
      <TextField
        id="talk-date"
        label="날짜"
        required
        placeholder="2025.06"
        hint="예: 2025.06"
        value={draft.date}
        error={errors.date}
        onChange={(v) => set("date", v)}
      />
      <TextField
        id="talk-venue"
        label="장소"
        required
        value={draft.venue}
        error={errors.venue}
        onChange={(v) => set("venue", v)}
      />
      <TextAreaField
        id="talk-description"
        label="설명"
        required
        maxLength={5000}
        value={draft.description}
        error={errors.description}
        onChange={(v) => set("description", v)}
      />
      <TextAreaField
        id="talk-impact"
        label="impact"
        required
        maxLength={5000}
        value={draft.impact}
        error={errors.impact}
        onChange={(v) => set("impact", v)}
      />
      <TextField
        id="talk-link"
        label="링크"
        type="url"
        required
        value={draft.link}
        error={errors.link}
        onChange={(v) => set("link", v)}
      />
      <FormActionBar
        saving={form.saving}
        cancelHref="/admin/talks"
        onDelete={isEdit ? () => setDeleting(true) : undefined}
        deleteLabel="발표 삭제"
      />
      <LeaveDialog guard={form.leaveGuard} />
      <ConfirmDialog
        open={slugChange !== null}
        title="주소를 바꿀까요?"
        description={
          <p>
            발표 slug가 {slugChange?.from}에서 {slugChange?.to}(으)로
            변경됩니다. 발표에는 slug별 공개 상세 주소가 없으며 자동 이동도
            제공되지 않습니다. 저장할까요?
          </p>
        }
        confirmLabel="저장"
        busyLabel="저장 중..."
        variant="primary"
        onConfirm={async () => {
          void form.submit();
          return null;
        }}
        onClose={() => setSlugChange(null)}
      />
      {talk && (
        <ConfirmDialog
          open={deleting}
          title={`${talk.title}을 삭제할까요?`}
          description={<p>되돌릴 수 없습니다.</p>}
          onConfirm={remove}
          onClose={() => setDeleting(false)}
        />
      )}
    </form>
  );
}
