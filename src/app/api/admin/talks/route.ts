import { revalidatePath } from "next/cache";
import { HttpStatus } from "@/constants/http-status";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { talkCreateInputSchema } from "@/schemas/portfolio.schema";
import { createTalk } from "@/services/portfolio/portfolio-admin-service";

export const POST = adminRoute(async ({ request }) => {
  const input = await parseJsonBody(request, talkCreateInputSchema);
  const talk = await createTalk(input);
  revalidatePath("/", "layout");
  return ok(talk, HttpStatus.Created);
});
