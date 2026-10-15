"use client";

import { HttpStatusCode } from "axios";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Controller, FormProvider, type Resolver } from "react-hook-form";
import type { z } from "zod";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { toExperienceValues, toValueItems } from "@/lib/admin-client/draft";
import { schemaResolver } from "@/lib/admin-client/form-errors";
import {
  describeAuthFailure,
  useAdminForm,
} from "@/lib/admin-client/use-admin-form";
import {
  projectFormKeepThumbnailSchema,
  projectFormSchema,
} from "@/schemas/portfolio.schema";
import type { Project } from "@/types/portfolio";
import { ConfirmDialog } from "./confirm-dialog";
import { ExperienceListEditor } from "./experience-list-editor";
import { FormActionBar } from "./form-parts";
import { LeaveDialog } from "./leave-dialog";
import { StringListEditor } from "./string-list-editor";
import { TextAreaField, TextField } from "./text-fields";
import { ThumbnailField } from "./thumbnail-field";
import { useToast } from "./toast-provider";

const UPLOADING_MESSAGE = "이미지 업로드가 끝난 뒤 저장하세요.";

type ProjectValues = z.input<typeof projectFormSchema>;
type ProjectInput = z.output<typeof projectFormSchema>;

function toValues(project?: Project): ProjectValues {
  return {
    slug: project?.slug ?? "",
    title: project?.title ?? "",
    period: project?.period ?? "",
    role: project?.role ?? "",
    summary: project?.summary ?? "",
    link: project?.link ?? "",
    thumbnail: project?.thumbnail ?? "",
    techStack: toValueItems(project?.techStack ?? []),
    experiences: (project?.experiences ?? []).map(toExperienceValues),
  };
}

interface ProjectFormProps {
  project?: Project;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const { notify } = useToast();
  const isEdit = project !== undefined;
  const savedSlug = useRef(project?.slug ?? "");
  const savedThumbnail = useRef(project?.thumbnail ?? "");
  const [deleting, setDeleting] = useState(false);
  const [slugChange, setSlugChange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);

  const resolver: Resolver<ProjectValues, unknown, ProjectInput> = (
    values,
    context,
    options,
  ) =>
    schemaResolver(
      isEdit && values.thumbnail?.trim() === savedThumbnail.current
        ? projectFormKeepThumbnailSchema
        : projectFormSchema,
    )(values, context, options);

  const form = useAdminForm({
    resolver,
    defaultValues: toValues(project),
    save: (input) => {
      if (!isEdit)
        return adminRequest<Project>("POST", "/api/admin/projects", input);
      // 썸네일을 바꾸지 않았으면 서버에 보내지 않음
      const { thumbnail, ...rest } = input;
      return adminRequest<Project>(
        "PUT",
        `/api/admin/projects/${savedSlug.current}`,
        thumbnail === savedThumbnail.current ? rest : input,
      );
    },
    // 저장 응답으로 폼 기준값을 갱신, 생성 후에는 편집 화면으로 이동
    onSaved: (saved) => {
      if (isEdit) {
        if (saved.slug !== savedSlug.current) {
          savedSlug.current = saved.slug;
          void router.replace(`/admin/projects/${saved.slug}`);
        }
        savedThumbnail.current = saved.thumbnail ?? "";
        return toValues(saved);
      }
      router.push(`/admin/projects/${saved.slug}`);
      return undefined;
    },
    listHref: "/admin/projects",
  });
  const { watch, getValues, control } = form.methods;
  const slug = watch("slug");

  async function remove(): Promise<string | null> {
    if (!project) return null;
    const result = await adminRequest(
      "DELETE",
      `/api/admin/projects/${savedSlug.current}`,
    );
    if (result.ok || result.status === HttpStatusCode.NotFound) {
      notify({ tone: "success", message: "삭제했습니다." });
      router.push("/admin/projects");
      return null;
    }
    return (
      describeAuthFailure(result) ?? "삭제하지 못했습니다. 다시 시도하세요."
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (uploadingRef.current) {
      event.preventDefault();
      return;
    }
    // 검증보다 먼저 묻고, 확인하면 모달에서 저장을 이어감
    if (isEdit && getValues("slug") !== savedSlug.current) {
      event.preventDefault();
      setSlugChange({ from: savedSlug.current, to: getValues("slug") });
      return;
    }
    return form.submit(event);
  }

  return (
    <FormProvider {...form.methods}>
      <form
        ref={form.formRef}
        noValidate
        aria-busy={form.saving || uploading}
        onSubmit={submit}
        className="space-y-24"
      >
        <TextField
          id="project-slug"
          name="slug"
          label="slug"
          required
          maxLength={64}
          hint={
            isEdit
              ? `영문 소문자, 숫자, 하이픈(-) 64자 이하. 공개 주소: /work/${slug}`
              : `영문 소문자, 숫자, 하이픈(-)만 사용합니다. 공개 주소: /work/${slug || "slug"}`
          }
        />
        <TextField id="project-title" name="title" label="제목" required />
        <TextField id="project-period" name="period" label="기간" required />
        <TextField id="project-role" name="role" label="역할" required />
        <TextAreaField
          id="project-summary"
          name="summary"
          label="요약"
          required
          maxLength={5000}
        />
        <TextField
          id="project-link"
          name="link"
          label="프로젝트 링크"
          type="url"
        />
        <Controller
          name="thumbnail"
          control={control}
          render={({ field }) => (
            <ThumbnailField
              value={field.value ?? ""}
              title={watch("title")}
              serverError={form.errors.thumbnail?.message}
              saving={form.saving}
              onChange={field.onChange}
              onUploadStateChange={(value) => {
                uploadingRef.current = value;
                setUploading(value);
              }}
            />
          )}
        />
        <StringListEditor
          name="techStack"
          legend="기술 스택"
          itemLabel="기술"
        />
        <ExperienceListEditor />
        <FormActionBar
          saving={form.saving || uploading}
          cancelHref="/admin/projects"
          onDelete={isEdit ? () => setDeleting(true) : undefined}
          deleteLabel="프로젝트 삭제"
        />
        <LeaveDialog guard={form.leaveGuard} />
        <ConfirmDialog
          open={slugChange !== null}
          title="주소를 바꿀까요?"
          description={
            <p>
              프로젝트 주소가 /work/{slugChange?.from}에서 /work/
              {slugChange?.to}
              (으)로 변경됩니다. 이전 주소는 더 이상 열리지 않으며 자동 이동도
              제공되지 않습니다. 저장할까요?
            </p>
          }
          confirmLabel="저장"
          busyLabel="저장 중..."
          variant="primary"
          onConfirm={async () => {
            if (uploadingRef.current) return UPLOADING_MESSAGE;
            void form.submit();
            return null;
          }}
          onClose={() => setSlugChange(null)}
        />
        {project && (
          <ConfirmDialog
            open={deleting}
            title={`${project.title}을 삭제할까요?`}
            description={
              <>
                <p>
                  연결된 경험 {project.experiences.length}개도 함께 삭제되며
                  되돌릴 수 없습니다.
                </p>
                <p>공개 주소 /work/{project.slug}가 더 이상 열리지 않습니다.</p>
              </>
            }
            onConfirm={remove}
            onClose={() => setDeleting(false)}
          />
        )}
      </form>
    </FormProvider>
  );
}
