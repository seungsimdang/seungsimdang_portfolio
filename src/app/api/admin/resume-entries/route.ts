import { HttpStatusCode } from "axios";
import { revalidatePath } from "next/cache";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { resumeEntryCreateInputSchema } from "@/schemas/portfolio.schema";
import { createResumeEntry } from "@/services/portfolio/portfolio-admin-service";

export const POST = adminRoute(async ({ request }) => {
  const input = await parseJsonBody(request, resumeEntryCreateInputSchema);
  const entry = await createResumeEntry(input);
  revalidatePath("/", "layout");
  return ok(entry, HttpStatusCode.Created);
});
