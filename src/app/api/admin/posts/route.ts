import { HttpStatusCode } from "axios";
import { revalidatePath } from "next/cache";
import { POST_BODY_MAX_BYTES } from "@/constants/blog";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { postCreateInputSchema } from "@/schemas/blog.schema";
import { createPost } from "@/services/blog/blog-admin-service";

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
