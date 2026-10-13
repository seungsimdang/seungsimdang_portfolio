import { revalidatePath } from "next/cache";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { resumeEntryUpdateInputSchema } from "@/schemas/portfolio.schema";
import {
  deleteResumeEntry,
  updateResumeEntry,
} from "@/services/portfolio/portfolio-admin-service";

export const PUT = adminRoute<{ id: string }>(async ({ request, params }) => {
  const input = await parseJsonBody(request, resumeEntryUpdateInputSchema);
  const entry = await updateResumeEntry(params.id, input);
  revalidatePath("/", "layout");
  return ok(entry);
});

export const DELETE = adminRoute<{ id: string }>(async ({ params }) => {
  await deleteResumeEntry(params.id);
  revalidatePath("/", "layout");
  return ok({ id: params.id });
});
