import { handleImageUpload } from "@/lib/api/image-upload";
import { adminRoute } from "@/lib/auth/admin-route";
import { isValidPostImage } from "@/schemas/portfolio.schema";

export const POST = adminRoute(({ request }) =>
  handleImageUpload(request, {
    allowGif: true,
    pathname: "blog/images/image",
    isValidUrl: isValidPostImage,
  }),
);
