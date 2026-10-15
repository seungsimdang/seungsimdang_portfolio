import { HttpStatusCode } from "axios";
import { revalidatePath } from "next/cache";
import { POST_ADMIN_PAGE_SIZE, POST_BODY_MAX_BYTES } from "@/constants/blog";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { postCreateInputSchema } from "@/schemas/blog.schema";
import { createPost } from "@/services/blog/blog-admin-service";
import { listPosts } from "@/services/blog/blog-service";
import { parseBlogListParams } from "@/utils/blog-query-params";

export const GET = adminRoute(async ({ request }) => {
  const { page, category, q } = parseBlogListParams(
    new URL(request.url).searchParams,
  );
  return ok(await listPosts(page, POST_ADMIN_PAGE_SIZE, category, q));
});

export const POST = adminRoute(async ({ request }) => {
  const input = await parseJsonBody(
    request,
    postCreateInputSchema,
    POST_BODY_MAX_BYTES,
  );
  const post = await createPost(input);
  revalidatePath("/", "layout");
  return ok(post, HttpStatusCode.Created);
});
