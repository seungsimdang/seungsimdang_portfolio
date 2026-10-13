import { revalidatePath } from "next/cache";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { talkUpdateInputSchema } from "@/schemas/portfolio.schema";
import {
  deleteTalk,
  updateTalk,
} from "@/services/portfolio/portfolio-admin-service";

export const PUT = adminRoute<{ slug: string }>(async ({ request, params }) => {
  const input = await parseJsonBody(request, talkUpdateInputSchema);
  const talk = await updateTalk(params.slug, input);
  revalidatePath("/", "layout");
  return ok(talk);
});

export const DELETE = adminRoute<{ slug: string }>(async ({ params }) => {
  await deleteTalk(params.slug);
  revalidatePath("/", "layout");
  return ok({ slug: params.slug });
});
