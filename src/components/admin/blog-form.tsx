"use client";

import { HttpStatusCode } from "axios";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Controller, FormProvider } from "react-hook-form";
import type { z } from "zod";
import {
  POST_CONTENT_MAX,
  POST_IMPORT_MAX_BYTES,
  POST_SLUG_MAX,
} from "@/constants/blog";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { toValueItems } from "@/lib/admin-client/draft";
import { schemaResolver } from "@/lib/admin-client/form-errors";
import { todayInSeoul } from "@/lib/admin-client/post-editing";
import {
  describeAuthFailure,
  useAdminForm,
} from "@/lib/admin-client/use-admin-form";
import { parsePostMarkdown } from "@/lib/blog/frontmatter";
import {
  buildPostTemplate,
  POST_TEMPLATE_FILE_NAME,
} from "@/lib/blog/post-template";
import { parsePostFileName, slugifyPostName } from "@/lib/blog/slug";
import {
  postCreateFormSchema,
  postEditFormSchema,
} from "@/schemas/blog.schema";
import type { Post } from "@/types/blog";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./confirm-dialog";
import { FormActionBar } from "./form-parts";
import { LeaveDialog } from "./leave-dialog";
import { MarkdownEditor } from "./markdown-editor";
import { StringListEditor } from "./string-list-editor";
import { TextField } from "./text-fields";
import { useToast } from "./toast-provider";

type BlogValues = z.input<typeof postCreateFormSchema>;

const toDotDate = (date: string) => date.replaceAll("-", ".");

function toValues(post?: Post, defaultDate = ""): BlogValues {
  return {
    slug: post?.slug ?? "",
    title: post?.title ?? "",
    // 입력 형식 YYYY.MM.DD, 전송 시 YYYY-MM-DD
    publishedAt: toDotDate(post?.publishedAt ?? defaultDate),
    categories: toValueItems(post?.categories ?? []),
    tags: toValueItems(post?.tags ?? []),
    content: post?.content ?? "",
  };
}

interface BlogFormProps {
  post?: Post;
  // 새 글의 발행일 초기값 (YYYY-MM-DD)
  defaultDate?: string;
}

export function BlogForm({ post, defaultDate }: BlogFormProps) {
  const router = useRouter();
  const { notify } = useToast();
  const isEdit = post !== undefined;
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  // 덮어쓰기 확인을 기다리는 가져오기 파일
  const [pendingImport, setPendingImport] = useState<{
    text: string;
    name: string;
  } | null>(null);
  const [importedName, setImportedName] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const resolver = schemaResolver(
    isEdit ? postEditFormSchema : postCreateFormSchema,
  );
  const form = useAdminForm({
    resolver,
    defaultValues: toValues(post, defaultDate),
    save: (input) => {
      if (!post) return adminRequest<Post>("POST", "/api/admin/posts", input);
      // 편집 입력에는 slug가 없으므로 제외
      const { slug: _slug, ...rest } = input;
      return adminRequest<Post>(
        "PUT",
        `/api/admin/posts/${encodeURIComponent(post.slug)}`,
        rest,
      );
    },
    // 생성 후에는 편집 화면으로 이동
    onSaved: (saved) => {
      if (isEdit) return toValues(saved);
      router.push(`/admin/blog/${encodeURIComponent(saved.slug)}`);
      return undefined;
    },
    listHref: "/admin/blog",
  });
  const { control, getValues, reset } = form.methods;

  async function remove(): Promise<string | null> {
    if (!post) return null;
    const result = await adminRequest(
      "DELETE",
      `/api/admin/posts/${encodeURIComponent(post.slug)}`,
    );
    if (result.ok || result.status === HttpStatusCode.NotFound) {
      notify({ tone: "success", message: "삭제했습니다." });
      router.push("/admin/blog");
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
    return form.submit(event);
  }

  function applyImport(text: string, fileName: string) {
    const parsed = parsePostMarkdown(text);
    const baseName = fileName.replace(/\.(md|markdown)$/i, "");
    const name = parsePostFileName(`${baseName}.md`);
    const { frontmatter } = parsed;
    const title = frontmatter.title || name.title;
    const date = name.date ?? frontmatter.date ?? todayInSeoul();
    reset(
      {
        // 파일명에 날짜가 있으면 파일명 전체, 없으면 날짜와 제목으로 slug 제안
        slug: slugifyPostName(name.date ? baseName : `${date}-${title}`),
        title,
        publishedAt: toDotDate(date),
        categories: toValueItems(frontmatter.categories ?? []),
        tags: toValueItems(frontmatter.tags ?? []),
        content: parsed.body,
      },
      // 기준값은 유지해 가져온 내용이 미저장 변경으로 잡히게 함
      { keepDefaultValues: true },
    );
    setImportedName(fileName);
    if (parsed.error) {
      form.notify({
        tone: "error",
        message:
          "frontmatter를 읽지 못해 전체를 본문으로 불러왔습니다. 내용을 확인하고 저장하세요.",
      });
    } else if (frontmatter.unpublished) {
      form.notify({
        tone: "warning",
        message:
          "파일을 불러왔습니다. 이 파일은 비공개(published: false)였지만 저장하면 공개 글이 됩니다. 내용을 확인하고 저장하세요.",
      });
    } else {
      form.notify({
        tone: "success",
        message: "파일을 불러왔습니다. 내용을 확인하고 저장하세요.",
      });
    }
  }

  function downloadTemplate() {
    const blob = new Blob([buildPostTemplate(todayInSeoul())], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = POST_TEMPLATE_FILE_NAME;
    anchor.click();
    // 동기 해제 시 일부 브라우저에서 다운로드 시작 전에 URL이 무효화되므로 다음 작업으로 미룸
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function importFile(file: File) {
    const fail = (message: string) => form.notify({ tone: "error", message });
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
    const current = getValues();
    const hasInput =
      current.title.trim() !== "" ||
      current.content.trim() !== "" ||
      current.slug.trim() !== "";
    if (hasInput) {
      setPendingImport({ text, name: file.name });
      return;
    }
    applyImport(text, file.name);
  }

  return (
    <FormProvider {...form.methods}>
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
              템플릿을 내려받아 작성한 뒤 파일 선택으로 불러오세요.
              frontmatter(title, date, categories, tags)와 본문을 폼에 채웁니다.
              저장은 직접 눌러야 합니다. 본문 이미지는 자동으로 올라가지 않으니
              필요하면 본문의 이미지 삽입을 사용하세요.
            </p>
            <div className="flex flex-wrap items-center gap-12">
              <AdminButton onClick={() => importInputRef.current?.click()}>
                파일 선택
              </AdminButton>
              <AdminButton onClick={downloadTemplate}>
                템플릿 다운로드
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
          name="slug"
          label="slug"
          required
          maxLength={POST_SLUG_MAX}
          readOnly={isEdit}
          hint={
            isEdit
              ? "글 주소는 만든 뒤 바꿀 수 없습니다."
              : "한글, 영문 소문자, 숫자, 하이픈(-)만 사용합니다. 예: 2024-10-06-제목"
          }
        />
        <TextField id="post-title" name="title" label="제목" required />
        <TextField
          id="post-published-at"
          name="publishedAt"
          label="발행일"
          required
          placeholder="2024.10.06"
          hint="예: 2024.10.06"
        />
        <StringListEditor
          name="categories"
          legend="카테고리"
          itemLabel="카테고리"
        />
        <StringListEditor name="tags" legend="태그" itemLabel="태그" />
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <MarkdownEditor
              id="post-content"
              value={field.value}
              onChange={field.onChange}
              error={form.errors.content?.message}
              focusTick={form.focusTick}
              maxLength={POST_CONTENT_MAX}
              saving={form.saving}
              onNotice={form.notify}
              onUploadStateChange={setUploading}
            />
          )}
        />
        <FormActionBar
          saving={form.saving}
          saveDisabled={uploading}
          busyMessage={uploading ? "이미지 업로드 중..." : undefined}
          cancelHref="/admin/blog"
          onDelete={isEdit ? () => setDeleting(true) : undefined}
          deleteLabel="글 삭제"
        />
        <LeaveDialog guard={form.leaveGuard} />
        <ConfirmDialog
          open={pendingImport !== null}
          title=".md 파일로 덮어쓸까요?"
          description={
            <p>입력한 내용이 .md 파일 내용으로 바뀝니다. 계속할까요?</p>
          }
          confirmLabel="덮어쓰기"
          busyLabel="덮어쓰는 중..."
          onConfirm={async () => {
            if (pendingImport)
              applyImport(pendingImport.text, pendingImport.name);
            return null;
          }}
          onClose={() => setPendingImport(null)}
        />
        {post && (
          <ConfirmDialog
            open={deleting}
            title={`${post.title}을 삭제할까요?`}
            description={<p>되돌릴 수 없습니다. 글 주소도 함께 사라집니다.</p>}
            onConfirm={remove}
            onClose={() => setDeleting(false)}
          />
        )}
      </form>
    </FormProvider>
  );
}
