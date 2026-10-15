import { revalidatePath } from "next/cache";
import { parseJsonBody } from "@/lib/api/parse-body";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { profileUpdateInputSchema } from "@/schemas/portfolio.schema";
import { updateProfile } from "@/services/portfolio/portfolio-admin-service";

export const PUT = adminRoute(async ({ request }) => {
  const input = await parseJsonBody(request, profileUpdateInputSchema);
  const profile = await updateProfile(input);
  revalidatePath("/", "layout");
  return ok(profile);
});
