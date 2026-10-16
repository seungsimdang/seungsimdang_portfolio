"use client";

import { HttpStatusCode } from "axios";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { FormProvider, type Resolver } from "react-hook-form";
import type { z } from "zod";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { toExperienceValues, toValueItems } from "@/lib/admin-client/draft";
import { schemaResolver } from "@/lib/admin-client/form-errors";
import {
  describeAuthFailure,
  useAdminForm,
} from "@/lib/admin-client/use-admin-form";
import {
  projectFormKeepThumbnailsSchema,
  projectFormSchema,
} from "@/schemas/portfolio.schema";
import type { Project } from "@/types/portfolio";
import { ConfirmDialog } from "./confirm-dialog";
import { ExperienceListEditor } from "./experience-list-editor";
import { FormActionBar } from "./form-parts";
import { LeaveDialog } from "./leave-dialog";
import { StringListEditor } from "./string-list-editor";
import { TextAreaField, TextField } from "./text-fields";
import { ThumbnailListField } from "./thumbnail-list-field";
import { useToast } from "./toast-provider";

const UPLOADING_MESSAGE = "이미지 업로드가 끝난 뒤 저장하세요.";

type ProjectValues = z.input<typeof projectFormSchema>;
type ProjectInput = z.output<typeof projectFormSchema>;

function toUrls(items: { value: string }[] | undefined): string[] {
  return (items ?? []).map((item) => item.value.trim()).filter(Boolean);
}

function isSameUrls(a: string[], b: string[]) {
  return a.length === b.length && a.every((url, index) => url === b[index]);
}

function toValues(project?: Project): ProjectValues {
  return {
    slug: project?.slug ?? "",
    title: project?.title ?? "",
    period: project?.period ?? "",
    role: project?.role ?? "",
    summary: project?.summary ?? "",
    link: project?.link ?? "",
    thumbnails: toValueItems(project?.thumbnails ?? []),
    mobileThumbnails: toValueItems(project?.mobileThumbnails ?? []),
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
  const savedThumbnails = useRef(project?.thumbnails ?? []);
  const savedMobileThumbnails = useRef(project?.mobileThumbnails ?? []);
  const [deleting, setDeleting] = useState(false);
  const [slugChange, setSlugChange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const uploadCountRef = useRef(0);

  // 두 목록의 어느 행이든 업로드 중이면 저장과 행 구조 변경을 막기 위해 진행 중인 업로드 수를 셈
  function trackUpload(active: boolean) {
    uploadCountRef.current += active ? 1 : -1;
    uploadingRef.current = uploadCountRef.current > 0;
    setUploading(uploadingRef.current);
  }

  function changedLists(values: {
    thumbnails?: { value: string }[];
    mobileThumbnails?: { value: string }[];
  }) {
    return {
      thumbnails: !isSameUrls(
        toUrls(values.thumbnails),
        savedThumbnails.current,
      ),
      mobileThumbnails: !isSameUrls(
        toUrls(values.mobileThumbnails),
        savedMobileThumbnails.current,
      ),
    };
  }

  const resolver: Resolver<ProjectValues, unknown, ProjectInput> = (
    values,
    context,
    options,
  ) => {
    const changed = changedLists(values);
    // 하나라도 바뀌면 두 목록 모두 엄격 검증하므로, 안 바뀐 목록의 레거시 값은 거부될 수 있음
    // 현재 저장된 값은 모두 Blob URL이라 실질 영향은 없음
    const unchanged =
      isEdit && !changed.thumbnails && !changed.mobileThumbnails;
    // keep 스키마의 목록 출력은 { value }[]라 타입이 다르지만, save가 폼 원본 값에서 목록을 따로 만들어 출력 목록은 쓰지 않음
    const schema = (unchanged
      ? projectFormKeepThumbnailsSchema
      : projectFormSchema) as unknown as typeof projectFormSchema;
    return schemaResolver(schema)(values, context, options);
  };

  const form = useAdminForm({
    resolver,
    defaultValues: toValues(project),
    save: (input, values) => {
      // 검증 경로에 따라 목록 출력 모양이 달라 폼 원본 값에서 다시 만듦
      const { thumbnails: _t, mobileThumbnails: _m, ...rest } = input;
      const lists = {
        thumbnails: toUrls(values.thumbnails),
        mobileThumbnails: toUrls(values.mobileThumbnails),
      };
      if (!isEdit)
        return adminRequest<Project>("POST", "/api/admin/projects", {
          ...rest,
          ...lists,
        });
      // 바꾸지 않은 목록은 서버에 보내지 않아 기존 값을 유지함
      const changed = changedLists(values);
      return adminRequest<Project>(
        "PUT",
        `/api/admin/projects/${savedSlug.current}`,
        {
          ...rest,
          ...(changed.thumbnails && { thumbnails: lists.thumbnails }),
          ...(changed.mobileThumbnails && {
            mobileThumbnails: lists.mobileThumbnails,
          }),
        },
      );
    },
    // 저장 응답으로 폼 기준값을 갱신, 생성 후에는 편집 화면으로 이동
    onSaved: (saved) => {
      if (isEdit) {
        if (saved.slug !== savedSlug.current) {
          savedSlug.current = saved.slug;
          void router.replace(`/admin/projects/${saved.slug}`);
        }
        savedThumbnails.current = saved.thumbnails;
        savedMobileThumbnails.current = saved.mobileThumbnails;
        return toValues(saved);
      }
      router.push(`/admin/projects/${saved.slug}`);
      return undefined;
    },
    listHref: "/admin/projects",
  });
  const { watch, getValues } = form.methods;
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
        <fieldset className="space-y-24">
          <legend className="text-small">썸네일</legend>
          <p className="text-small opacity-70">
            순서가 곧 전환 순서입니다. 2장 이상이면 공개 화면에서 4초마다
            전환됩니다. 업로드와 제거는 프로젝트 저장 후 반영됩니다.
          </p>
          <ThumbnailListField
            name="thumbnails"
            legend="기본 썸네일"
            itemLabel="기본 썸네일"
            hint="PC 화면에 표시되며, 모바일 썸네일이 없으면 모바일에서도 사용합니다."
            title={watch("title")}
            saving={form.saving}
            locked={uploading}
            onUploadStateChange={trackUpload}
          />
          <ThumbnailListField
            name="mobileThumbnails"
            legend="모바일 썸네일"
            itemLabel="모바일 썸네일"
            hint="모바일 화면(768px 미만)에 표시됩니다. 비워두면 기본 썸네일을 사용합니다."
            title={watch("title")}
            saving={form.saving}
            locked={uploading}
            portrait
            onUploadStateChange={trackUpload}
          />
        </fieldset>
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
