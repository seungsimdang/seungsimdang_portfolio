import { revalidatePath } from "next/cache";
import { POST_BODY_MAX_BYTES } from "@/constants/blog";
import { apiErrors } from "@/lib/api/api-error";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { decodePostSlug } from "@/lib/blog/slug";
import { postSlugSchema, postUpdateInputSchema } from "@/schemas/blog.schema";
import { deletePost, updatePost } from "@/services/blog/blog-admin-service";

// 디코딩 불가 또는 형식 오류 slug는 DB 호출 없이 404 처리함
function resolveSlug(raw: string): string {
  const slug = decodePostSlug(raw);
  if (!slug || !postSlugSchema.safeParse(slug).success) {
    throw apiErrors.notFound();
  }
  return slug;
}

export const PUT = adminRoute<{ slug: string }>(async ({ request, params }) => {
  const slug = resolveSlug(params.slug);
  const input = await parseJsonBody(
    request,
    postUpdateInputSchema,
    POST_BODY_MAX_BYTES,
  );
  const post = await updatePost(slug, input);
  revalidatePath("/", "layout");
  return ok(post);
});

export const DELETE = adminRoute<{ slug: string }>(async ({ params }) => {
  const slug = resolveSlug(params.slug);
  await deletePost(slug);
  revalidatePath("/", "layout");
  return ok({ slug });
});
