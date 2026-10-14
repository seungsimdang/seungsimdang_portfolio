import { handleImageUpload } from "@/lib/api/image-upload";
import { adminRoute } from "@/lib/auth/admin-route";
import { isValidThumbnail } from "@/schemas/portfolio.schema";

export const POST = adminRoute(({ request }) =>
  handleImageUpload(request, {
    allowGif: false,
    pathname: "thumbnails/image",
    isValidUrl: isValidThumbnail,
  }),
);
