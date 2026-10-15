"use client";

import { HttpStatusCode } from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ResumeKind } from "@/constants/resume";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { type StringItem, toStringItems } from "@/lib/admin-client/draft";
import {
  describeAuthFailure,
  useAdminForm,
} from "@/lib/admin-client/use-admin-form";
import { validateWith } from "@/lib/admin-client/validate";
import {
  resumeEntryCreateInputSchema,
  resumeEntryUpdateInputSchema,
} from "@/schemas/portfolio.schema";
import type { ResumeEntry } from "@/types/portfolio";
import { ConfirmDialog } from "./confirm-dialog";
import { FormActionBar } from "./form-parts";
import { LeaveDialog } from "./leave-dialog";
import { RESUME_ADMIN_SECTIONS, RESUME_FIELD_HINTS } from "./resume-labels";
import { StringListEditor } from "./string-list-editor";
import { TextField } from "./text-fields";
import { useToast } from "./toast-provider";

interface ResumeDraft {
  period: string;
  title: string;
  subtitle: string;
  details: StringItem[];
}

function toDraft(entry?: ResumeEntry): ResumeDraft {
  return {
    period: entry?.period ?? "",
    title: entry?.title ?? "",
    subtitle: entry?.subtitle ?? "",
    details: toStringItems(entry?.details ?? []),
  };
}

function toInput(draft: ResumeDraft) {
  return { ...draft, details: draft.details.map((item) => item.value) };
}

interface ResumeEntryFormProps {
  kind: ResumeKind;
  entry?: ResumeEntry;
}

export function ResumeEntryForm({ kind, entry }: ResumeEntryFormProps) {
  const router = useRouter();
  const { notify } = useToast();
  const isEdit = entry !== undefined;
  const [draft, setDraft] = useState(() => toDraft(entry));
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof ResumeDraft>(key: K, value: ResumeDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const noun = RESUME_ADMIN_SECTIONS.find((s) => s.kind === kind)?.noun ?? "";
  const hints = RESUME_FIELD_HINTS[kind];

  const form = useAdminForm({
    draft,
    setDraft,
    validate: (d) =>
      isEdit
        ? validateWith(resumeEntryUpdateInputSchema, toInput(d))
        : validateWith(resumeEntryCreateInputSchema, { kind, ...toInput(d) }),
    save: (input) =>
      entry
        ? adminRequest<ResumeEntry>(
            "PUT",
            `/api/admin/resume-entries/${entry.id}`,
            input,
          )
        : adminRequest<ResumeEntry>("POST", "/api/admin/resume-entries", input),
    // 생성 후에는 편집 화면으로 이동
    onSaved: (saved) => {
      if (isEdit) return toDraft(saved);
      router.push(`/admin/resume/${saved.id}`);
      return undefined;
    },
    listHref: "/admin/resume",
  });
  const { errors } = form;

  async function remove(): Promise<string | null> {
    if (!entry) return null;
    const result = await adminRequest(
      "DELETE",
      `/api/admin/resume-entries/${entry.id}`,
    );
    if (result.ok || result.status === HttpStatusCode.NotFound) {
      notify({ tone: "success", message: "삭제했습니다." });
      router.push("/admin/resume");
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
      <TextField
        id="resume-kind"
        label="구분"
        readOnly
        value={noun}
        hint="구분은 변경할 수 없습니다."
        onChange={() => undefined}
      />
      <TextField
        id="resume-period"
        label="기간"
        placeholder="2024.07 - 2026.07"
        maxLength={100}
        value={draft.period}
        error={errors.period}
        hint="입력한 그대로 표시됩니다. 예: 2026.08 - 현재, 졸업 2024.08, 2024. 비우면 기간이 표시되지 않습니다."
        onChange={(v) => set("period", v)}
      />
      <TextField
        id="resume-title"
        label="제목"
        required
        value={draft.title}
        error={errors.title}
        hint={hints.title}
        onChange={(v) => set("title", v)}
      />
      <TextField
        id="resume-subtitle"
        label="부제"
        value={draft.subtitle}
        error={errors.subtitle}
        hint={hints.subtitle || undefined}
        onChange={(v) => set("subtitle", v)}
      />
      <StringListEditor
        legend="세부 항목"
        itemLabel="세부 항목"
        items={draft.details}
        onChange={(details) => set("details", details)}
        errors={errors}
        path="details"
      />
      <FormActionBar
        saving={form.saving}
        cancelHref="/admin/resume"
        onDelete={isEdit ? () => setDeleting(true) : undefined}
        deleteLabel="이력 삭제"
      />
      <LeaveDialog guard={form.leaveGuard} />
      {entry && (
        <ConfirmDialog
          open={deleting}
          title={`${entry.title}을 삭제할까요?`}
          description={<p>되돌릴 수 없습니다.</p>}
          onConfirm={remove}
          onClose={() => setDeleting(false)}
        />
      )}
    </form>
  );
}
