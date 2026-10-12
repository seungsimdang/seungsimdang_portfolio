"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HttpStatus } from "@/constants/http-status";
import { adminRequest } from "@/lib/admin-client/admin-request";
import {
  type StringItem,
  toExperienceDraft,
  toStringItems,
} from "@/lib/admin-client/draft";
import {
  describeAuthFailure,
  useAdminForm,
} from "@/lib/admin-client/use-admin-form";
import { validateWith } from "@/lib/admin-client/validate";
import {
  projectCreateInputSchema,
  projectUpdateInputSchema,
} from "@/schemas/portfolio.schema";
import type { Project } from "@/types/portfolio";
import { ConfirmDialog } from "./confirm-dialog";
import {
  type ExperienceDraft,
  ExperienceListEditor,
} from "./experience-list-editor";
import { FormActionBar, FormStatus } from "./form-parts";
import { StringListEditor } from "./string-list-editor";
import { TextAreaField, TextField } from "./text-fields";

interface ProjectDraft {
  slug: string;
  title: string;
  period: string;
  role: string;
  summary: string;
  link: string;
  thumbnail: string;
  techStack: StringItem[];
  experiences: ExperienceDraft[];
}

function toDraft(project?: Project): ProjectDraft {
  return {
    slug: project?.slug ?? "",
    title: project?.title ?? "",
    period: project?.period ?? "",
    role: project?.role ?? "",
    summary: project?.summary ?? "",
    link: project?.link ?? "",
    thumbnail: project?.thumbnail ?? "",
    techStack: toStringItems(project?.techStack ?? []),
    experiences: (project?.experiences ?? []).map(toExperienceDraft),
  };
}

function toInput(draft: ProjectDraft, includeSlug: boolean) {
  const { slug, techStack, experiences, ...rest } = draft;
  return {
    ...(includeSlug ? { slug } : {}),
    ...rest,
    techStack: techStack.map((item) => item.value),
    experiences: experiences.map((e) => ({
      title: e.title,
      problem: e.problem,
      solution: e.solution,
      tradeoff: {
        advantages: e.advantages,
        disadvantages: e.disadvantages,
        rationale: e.rationale,
      },
      result: e.result,
      learning: e.learning,
      links: e.links.map(({ label, url }) => ({ label, url })),
    })),
  };
}

interface ProjectFormProps {
  project?: Project;
  initialSaved?: boolean;
}

export function ProjectForm({ project, initialSaved }: ProjectFormProps) {
  const router = useRouter();
  const isEdit = project !== undefined;
  const [draft, setDraft] = useState(() => toDraft(project));
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const form = useAdminForm({
    draft,
    setDraft,
    validate: (d) =>
      isEdit
        ? validateWith(projectUpdateInputSchema, toInput(d, false))
        : validateWith(projectCreateInputSchema, toInput(d, true)),
    save: (input) =>
      isEdit
        ? adminRequest<Project>(
            "PUT",
            `/api/admin/projects/${project.slug}`,
            input,
          )
        : adminRequest<Project>("POST", "/api/admin/projects", input),
    // 저장 응답의 새 experience id를 key로 삼아 폼 기준값을 갱신, 생성 후에는 편집 화면으로 이동
    onSaved: (saved) => {
      if (isEdit) return toDraft(saved);
      router.push(`/admin/projects/${saved.slug}?saved=1`);
      return undefined;
    },
    listHref: "/admin/projects",
    initialSaved,
  });
  const { errors } = form;

  async function remove(): Promise<string | null> {
    if (!project) return null;
    const result = await adminRequest(
      "DELETE",
      `/api/admin/projects/${project.slug}`,
    );
    if (result.ok || result.status === HttpStatus.NotFound) {
      router.push("/admin/projects?deleted=1");
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
        id="project-slug"
        label="slug"
        required
        readOnly={isEdit}
        value={draft.slug}
        error={errors.slug}
        hint={
          isEdit
            ? `slug는 변경할 수 없습니다. 공개 주소: /work/${draft.slug}`
            : `영문 소문자, 숫자, 하이픈(-)만 사용합니다. 공개 주소: /work/${draft.slug || "slug"}`
        }
        onChange={(v) => set("slug", v)}
      />
      <TextField
        id="project-title"
        label="제목"
        required
        value={draft.title}
        error={errors.title}
        onChange={(v) => set("title", v)}
      />
      <TextField
        id="project-period"
        label="기간"
        required
        value={draft.period}
        error={errors.period}
        onChange={(v) => set("period", v)}
      />
      <TextField
        id="project-role"
        label="역할"
        required
        value={draft.role}
        error={errors.role}
        onChange={(v) => set("role", v)}
      />
      <TextAreaField
        id="project-summary"
        label="요약"
        required
        maxLength={5000}
        value={draft.summary}
        error={errors.summary}
        onChange={(v) => set("summary", v)}
      />
      <TextField
        id="project-link"
        label="프로젝트 링크"
        type="url"
        value={draft.link}
        error={errors.link}
        onChange={(v) => set("link", v)}
      />
      <TextField
        id="project-thumbnail"
        label="썸네일 경로"
        value={draft.thumbnail}
        error={errors.thumbnail}
        hint="저장소에 있는 이미지 경로(/images/...)만 입력할 수 있습니다."
        onChange={(v) => set("thumbnail", v)}
      />
      <StringListEditor
        legend="기술 스택"
        itemLabel="기술"
        items={draft.techStack}
        onChange={(items) => set("techStack", items)}
        errors={errors}
        path="techStack"
      />
      <ExperienceListEditor
        items={draft.experiences}
        onChange={(items) => set("experiences", items)}
        errors={errors}
      />
      <FormActionBar
        saving={form.saving}
        cancelHref="/admin/projects"
        onDelete={isEdit ? () => setDeleting(true) : undefined}
        deleteLabel="프로젝트 삭제"
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
  );
}
