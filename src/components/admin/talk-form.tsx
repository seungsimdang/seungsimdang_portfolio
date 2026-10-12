"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HttpStatus } from "@/constants/http-status";
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
import { FormActionBar, FormStatus } from "./form-parts";
import { TextAreaField, TextField } from "./text-fields";

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

function toInput(draft: TalkDraft, includeSlug: boolean) {
  const { slug, ...rest } = draft;
  return includeSlug ? { slug, ...rest } : rest;
}

interface TalkFormProps {
  talk?: TechTalk;
  initialSaved?: boolean;
}

export function TalkForm({ talk, initialSaved }: TalkFormProps) {
  const router = useRouter();
  const isEdit = talk !== undefined;
  const [draft, setDraft] = useState(() => toDraft(talk));
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof TalkDraft>(key: K, value: TalkDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const form = useAdminForm({
    draft,
    setDraft,
    validate: (d) =>
      isEdit
        ? validateWith(talkUpdateInputSchema, toInput(d, false))
        : validateWith(talkCreateInputSchema, toInput(d, true)),
    save: (input) =>
      isEdit
        ? adminRequest<TechTalk>("PUT", `/api/admin/talks/${talk.slug}`, input)
        : adminRequest<TechTalk>("POST", "/api/admin/talks", input),
    // 생성 후에는 편집 화면으로 이동
    onSaved: (saved) => {
      if (isEdit) return toDraft(saved);
      router.push(`/admin/talks/${saved.slug}?saved=1`);
      return undefined;
    },
    listHref: "/admin/talks",
    initialSaved,
  });
  const { errors } = form;

  async function remove(): Promise<string | null> {
    if (!talk) return null;
    const result = await adminRequest(
      "DELETE",
      `/api/admin/talks/${talk.slug}`,
    );
    if (result.ok || result.status === HttpStatus.NotFound) {
      router.push("/admin/talks?deleted=1");
      return null;
    }
    return (
      describeAuthFailure(result) ?? "삭제하지 못했습니다. 다시 시도하세요."
    );
  }

  return (
    <form
      ref={form.formRef}
      noValidate
      aria-busy={form.saving}
      onSubmit={form.submit}
      className="space-y-24"
    >
      <FormStatus notice={form.notice} />
      <TextField
        id="talk-slug"
        label="slug"
        required
        readOnly={isEdit}
        value={draft.slug}
        error={errors.slug}
        hint={
          isEdit
            ? "slug는 변경할 수 없습니다."
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
