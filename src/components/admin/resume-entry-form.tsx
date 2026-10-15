"use client";

import { HttpStatusCode } from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider } from "react-hook-form";
import type { z } from "zod";
import type { ResumeKind } from "@/constants/resume";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { toValueItems } from "@/lib/admin-client/draft";
import { schemaResolver } from "@/lib/admin-client/form-errors";
import {
  describeAuthFailure,
  useAdminForm,
} from "@/lib/admin-client/use-admin-form";
import { resumeEntryFormSchema } from "@/schemas/portfolio.schema";
import type { ResumeEntry } from "@/types/portfolio";
import { ConfirmDialog } from "./confirm-dialog";
import { FormActionBar } from "./form-parts";
import { LeaveDialog } from "./leave-dialog";
import { RESUME_ADMIN_SECTIONS, RESUME_FIELD_HINTS } from "./resume-labels";
import { StringListEditor } from "./string-list-editor";
import { TextField } from "./text-fields";
import { useToast } from "./toast-provider";

type ResumeValues = z.input<typeof resumeEntryFormSchema>;

function toValues(entry?: ResumeEntry): ResumeValues {
  return {
    period: entry?.period ?? "",
    title: entry?.title ?? "",
    subtitle: entry?.subtitle ?? "",
    details: toValueItems(entry?.details ?? []),
  };
}

interface ResumeEntryFormProps {
  kind: ResumeKind;
  entry?: ResumeEntry;
}

export function ResumeEntryForm({ kind, entry }: ResumeEntryFormProps) {
  const router = useRouter();
  const { notify } = useToast();
  const isEdit = entry !== undefined;
  const [deleting, setDeleting] = useState(false);
  const noun = RESUME_ADMIN_SECTIONS.find((s) => s.kind === kind)?.noun ?? "";
  const hints = RESUME_FIELD_HINTS[kind];

  const resolver = schemaResolver(resumeEntryFormSchema);
  const form = useAdminForm({
    resolver,
    defaultValues: toValues(entry),
    save: (input) =>
      entry
        ? adminRequest<ResumeEntry>(
            "PUT",
            `/api/admin/resume-entries/${entry.id}`,
            input,
          )
        : adminRequest<ResumeEntry>("POST", "/api/admin/resume-entries", {
            kind,
            ...input,
          }),
    // 생성 후에는 편집 화면으로 이동
    onSaved: (saved) => {
      if (isEdit) return toValues(saved);
      router.push(`/admin/about/resume/${saved.id}`);
      return undefined;
    },
    listHref: "/admin/about",
  });

  async function remove(): Promise<string | null> {
    if (!entry) return null;
    const result = await adminRequest(
      "DELETE",
      `/api/admin/resume-entries/${entry.id}`,
    );
    if (result.ok || result.status === HttpStatusCode.NotFound) {
      notify({ tone: "success", message: "삭제했습니다." });
      router.push("/admin/about");
      return null;
    }
    return (
      describeAuthFailure(result) ?? "삭제하지 못했습니다. 다시 시도하세요."
    );
  }

  return (
    <FormProvider {...form.methods}>
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
        />
        <TextField
          id="resume-period"
          name="period"
          label="기간"
          placeholder="2024.07 - 2026.07"
          maxLength={100}
          hint="입력한 그대로 표시됩니다. 예: 2026.08 - 현재, 졸업 2024.08, 2024. 비우면 기간이 표시되지 않습니다."
        />
        <TextField
          id="resume-title"
          name="title"
          label="제목"
          required
          hint={hints.title}
        />
        <TextField
          id="resume-subtitle"
          name="subtitle"
          label="부제"
          hint={hints.subtitle || undefined}
        />
        <StringListEditor
          name="details"
          legend="세부 항목"
          itemLabel="세부 항목"
        />
        <FormActionBar
          saving={form.saving}
          cancelHref="/admin/about"
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
    </FormProvider>
  );
}
