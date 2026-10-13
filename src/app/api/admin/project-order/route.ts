import { revalidatePath } from "next/cache";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { orderInputSchema } from "@/schemas/portfolio.schema";
import { reorderProjects } from "@/services/portfolio/portfolio-admin-service";

export const PUT = adminRoute(async ({ request }) => {
  const { slugs } = await parseJsonBody(request, orderInputSchema);
  await reorderProjects(slugs);
  revalidatePath("/", "layout");
  return ok({ slugs });
});
