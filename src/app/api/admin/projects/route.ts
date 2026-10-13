import { revalidatePath } from "next/cache";
import { HttpStatus } from "@/constants/http-status";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { projectCreateInputSchema } from "@/schemas/portfolio.schema";
import { createProject } from "@/services/portfolio/portfolio-admin-service";

export const POST = adminRoute(async ({ request }) => {
  const input = await parseJsonBody(request, projectCreateInputSchema);
  const project = await createProject(input);
  revalidatePath("/", "layout");
  return ok(project, HttpStatus.Created);
});
