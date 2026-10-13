import { revalidatePath } from "next/cache";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { projectUpdateInputSchema } from "@/schemas/portfolio.schema";
import {
  deleteProject,
  updateProject,
} from "@/services/portfolio/portfolio-admin-service";

export const PUT = adminRoute<{ slug: string }>(async ({ request, params }) => {
  const input = await parseJsonBody(request, projectUpdateInputSchema);
  const project = await updateProject(params.slug, input);
  revalidatePath("/", "layout");
  return ok(project);
});

export const DELETE = adminRoute<{ slug: string }>(async ({ params }) => {
  await deleteProject(params.slug);
  revalidatePath("/", "layout");
  return ok({ slug: params.slug });
});
