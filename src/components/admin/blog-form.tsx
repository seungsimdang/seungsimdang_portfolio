"use client";

import { HttpStatusCode } from "axios";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import {
  POST_CONTENT_MAX,
  POST_IMPORT_MAX_BYTES,
  POST_SLUG_MAX,
} from "@/constants/blog";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { type StringItem, toStringItems } from "@/lib/admin-client/draft";
import { todayInSeoul } from "@/lib/admin-client/post-editing";
import {
  describeAuthFailure,
  type Notice,
  useAdminForm,
} from "@/lib/admin-client/use-admin-form";
import { validateWith } from "@/lib/admin-client/validate";
import { parsePostMarkdown } from "@/lib/blog/frontmatter";
import { parsePostFileName, slugifyPostName } from "@/lib/blog/slug";
import {
  postCreateInputSchema,
  postUpdateInputSchema,
} from "@/schemas/blog.schema";
import type { Post } from "@/types/blog";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./confirm-dialog";
import { FormActionBar } from "./form-parts";
import { MarkdownEditor } from "./markdown-editor";
import { StringListEditor } from "./string-list-editor";
import { TextField } from "./text-fields";

interface BlogDraft {
  slug: string;
  title: string;
  // 입력 형식 YYYY.MM.DD, 전송 시 YYYY-MM-DD
  publishedAt: string;
  categories: StringItem[];
  tags: StringItem[];
  published: boolean;
  content: string;
}

const toDotDate = (date: string) => date.replaceAll("-", ".");

function toDraft(post?: Post, defaultDate = ""): BlogDraft {
  return {
    slug: post?.slug ?? "",
    title: post?.title ?? "",
    publishedAt: toDotDate(post?.publishedAt ?? defaultDate),
    categories: toStringItems(post?.categories ?? []),
    tags: toStringItems(post?.tags ?? []),
    published: post?.published ?? true,
    content: post?.content ?? "",
  };
}

function toInput(draft: BlogDraft) {
  return {
    slug: draft.slug,
    title: draft.title,
    publishedAt: draft.publishedAt.trim().replaceAll(".", "-"),
    categories: draft.categories.map((item) => item.value),
    tags: draft.tags.map((item) => item.value),
    published: draft.published,
    content: draft.content,
  };
}

// 편집 입력에는 slug가 없으므로 제외
function toUpdateInput(draft: BlogDraft) {
  const { slug: _slug, ...rest } = toInput(draft);
  return rest;
}

interface BlogFormProps {
  post?: Post;
  initialSaved?: boolean;
  // 새 글의 발행일 초기값 (YYYY-MM-DD)
  defaultDate?: string;
}

export function BlogForm({ post, initialSaved, defaultDate }: BlogFormProps) {
  const router = useRouter();
  const isEdit = post !== undefined;
  const [draft, setDraft] = useState(() => toDraft(post, defaultDate));
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  // 업로드, 가져오기, 삭제 결과처럼 저장 훅 밖에서 생기는 알림
  const [localNotice, setLocalNotice] = useState<Notice | null>(null);
  const [importedName, setImportedName] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof BlogDraft>(key: K, value: BlogDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const form = useAdminForm({
    draft,
    setDraft,
    validate: (d) =>
      isEdit
        ? validateWith(postUpdateInputSchema, toUpdateInput(d))
        : validateWith(postCreateInputSchema, toInput(d)),
    save: (input) =>
      isEdit
        ? adminRequest<Post>(
            "PUT",
            `/api/admin/posts/${encodeURIComponent(post.slug)}`,
            input,
          )
        : adminRequest<Post>("POST", "/api/admin/posts", input),
    // 생성 후에는 편집 화면으로 이동
    onSaved: (saved) => {
      if (isEdit) return toDraft(saved);
      router.push(`/admin/blog/${encodeURIComponent(saved.slug)}?saved=1`);
      return undefined;
    },
    listHref: "/admin/blog",
    initialSaved,
  });
  const { errors } = form;
  const notice = localNotice ?? form.notice;

  async function remove(): Promise<string | null> {
    if (!post) return null;
    const result = await adminRequest(
      "DELETE",
      `/api/admin/posts/${encodeURIComponent(post.slug)}`,
    );
    if (result.ok || result.status === HttpStatusCode.NotFound) {
      router.push("/admin/blog?deleted=1");
      return null;
    }
    return (
      describeAuthFailure(result) ?? "삭제하지 못했습니다. 다시 시도하세요."
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (uploading) {
      event.preventDefault();
      return;
    }
    setLocalNotice(null);
    return form.submit(event);
  }

  async function importFile(file: File) {
    const fail = (message: string) =>
      setLocalNotice({ tone: "error", message });
    if (!/\.(md|markdown)$/i.test(file.name)) {
      fail(".md 또는 .markdown 파일만 가져올 수 있습니다.");
      return;
    }
    if (file.size > POST_IMPORT_MAX_BYTES) {
      fail("1MB 이하 파일만 가져올 수 있습니다.");
      return;
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
    } catch {
      fail("UTF-8 텍스트 파일만 가져올 수 있습니다.");
      return;
    }
    const hasInput =
      draft.title.trim() !== "" ||
      draft.content.trim() !== "" ||
      draft.slug.trim() !== "";
    if (
      hasInput &&
      !window.confirm("입력한 내용이 .md 파일 내용으로 바뀝니다. 계속할까요?")
    ) {
      return;
    }
    const parsed = parsePostMarkdown(text);
    const baseName = file.name.replace(/\.(md|markdown)$/i, "");
    const name = parsePostFileName(`${baseName}.md`);
    const { frontmatter } = parsed;
    const title = frontmatter.title || name.title;
    const date = name.date ?? frontmatter.date ?? todayInSeoul();
    setDraft({
      // 파일명에 날짜가 있으면 파일명 전체, 없으면 날짜와 제목으로 slug 제안
      slug: slugifyPostName(name.date ? baseName : `${date}-${title}`),
      title,
      publishedAt: toDotDate(date),
      categories: toStringItems(frontmatter.categories ?? []),
      tags: toStringItems(frontmatter.tags ?? []),
      published: frontmatter.published ?? true,
      content: parsed.body,
    });
    setImportedName(file.name);
    setLocalNotice(
      parsed.error
        ? {
            tone: "error",
            message:
              "frontmatter를 읽지 못해 전체를 본문으로 불러왔습니다. 내용을 확인하고 저장하세요.",
          }
        : {
            tone: "success",
            message: "파일을 불러왔습니다. 내용을 확인하고 저장하세요.",
          },
    );
  }

  return (
    <form
      ref={form.formRef}
      noValidate
      aria-busy={form.saving}
      onSubmit={submit}
      className="space-y-24"
    >
      {!isEdit && (
        <div className="space-y-8">
          <p className="text-small">.md 가져오기</p>
          <p className="text-small opacity-70">
            frontmatter(title, categories, tags, published)와 본문을 폼에
            채웁니다. 저장은 직접 눌러야 합니다. 본문 이미지는 자동으로 올라가지
            않으니 필요하면 본문의 이미지 삽입을 사용하세요.
          </p>
          <div className="flex flex-wrap items-center gap-12">
            <AdminButton onClick={() => importInputRef.current?.click()}>
              파일 선택
            </AdminButton>
            {importedName && (
              <p className="text-small text-white/70">
                선택한 파일: {importedName}
              </p>
            )}
          </div>
          <input
            ref={importInputRef}
            type="file"
            hidden
            aria-label=".md 파일 선택"
            accept=".md,.markdown,text/markdown"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void importFile(file);
            }}
          />
        </div>
      )}
      <TextField
        id="post-slug"
        label="slug"
        required
        maxLength={POST_SLUG_MAX}
        readOnly={isEdit}
        value={draft.slug}
        error={errors.slug}
        hint={
          isEdit
            ? "글 주소는 만든 뒤 바꿀 수 없습니다."
            : "한글, 영문 소문자, 숫자, 하이픈(-)만 사용합니다. 예: 2024-10-06-제목"
        }
        onChange={(v) => set("slug", v)}
      />
      <TextField
        id="post-title"
        label="제목"
        required
        value={draft.title}
        error={errors.title}
        onChange={(v) => set("title", v)}
      />
      <TextField
        id="post-published-at"
        label="발행일"
        required
        placeholder="2024.10.06"
        hint="예: 2024.10.06"
        value={draft.publishedAt}
        error={errors.publishedAt}
        onChange={(v) => set("publishedAt", v)}
      />
      <StringListEditor
        legend="카테고리"
        itemLabel="카테고리"
        items={draft.categories}
        onChange={(items) => set("categories", items)}
        errors={errors}
        path="categories"
      />
      <StringListEditor
        legend="태그"
        itemLabel="태그"
        items={draft.tags}
        onChange={(items) => set("tags", items)}
        errors={errors}
        path="tags"
      />
      <div className="space-y-8">
        <label className="flex items-center gap-8 text-small">
          <input
            type="checkbox"
            checked={draft.published}
            aria-describedby="post-published-hint"
            onChange={(event) => set("published", event.target.checked)}
          />
          공개
        </label>
        <p id="post-published-hint" className="text-small opacity-70">
          해제하면 공개 목록에서 즉시 사라집니다.
        </p>
      </div>
      <MarkdownEditor
        id="post-content"
        value={draft.content}
        onChange={(v) => set("content", v)}
        error={errors.content}
        hint={`마크다운. 최대 ${POST_CONTENT_MAX.toLocaleString("ko-KR")}자.`}
        saving={form.saving}
        onNotice={setLocalNotice}
        onUploadStateChange={setUploading}
      />
      <FormActionBar
        saving={form.saving}
        saveDisabled={uploading}
        notice={notice}
        detailed
        busyMessage={uploading ? "이미지 업로드 중..." : undefined}
        cancelHref="/admin/blog"
        onDelete={isEdit ? () => setDeleting(true) : undefined}
        deleteLabel="글 삭제"
      />
      {post && (
        <ConfirmDialog
          open={deleting}
          title={`${post.title}을 삭제할까요?`}
          description={
            <p>되돌릴 수 없습니다. 공개 글이면 공개 주소도 사라집니다.</p>
          }
          onConfirm={remove}
          onClose={() => setDeleting(false)}
        />
      )}
    </form>
  );
}
