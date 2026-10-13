import { revalidatePath } from "next/cache";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { resumeOrderInputSchema } from "@/schemas/portfolio.schema";
import { reorderResumeEntries } from "@/services/portfolio/portfolio-admin-service";

export const PUT = adminRoute(async ({ request }) => {
  const { kind, ids } = await parseJsonBody(request, resumeOrderInputSchema);
  await reorderResumeEntries(kind, ids);
  revalidatePath("/", "layout");
  return ok({ kind, ids });
});
