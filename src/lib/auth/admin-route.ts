import "server-only";
import { HttpStatus } from "@/constants/http-status";
import { ApiError, apiErrors } from "@/lib/api/api-error";
import { fail } from "@/lib/api/response";
import {
  NotFoundError,
  OrderMismatchError,
  SlugConflictError,
} from "@/services/portfolio/portfolio-admin-service";
import { requireAdmin } from "./require-admin";

interface AdminRouteContext<P> {
  request: Request;
  params: P;
  githubId: string;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Origin 검사, 관리자 가드, 에러 변환을 공통 처리하고 핸들러에는 비즈니스 로직만 남김
export function adminRoute<
  P extends Record<string, string> = Record<string, never>,
>(handler: (ctx: AdminRouteContext<P>) => Promise<Response>) {
  return async (
    request: Request,
    routeContext: { params: Promise<P> },
  ): Promise<Response> => {
    try {
      if (MUTATING_METHODS.has(request.method) && !isSameOrigin(request)) {
        return fail(apiErrors.forbiddenOrigin());
      }
      const guard = await requireAdmin();
      if (!guard.ok) {
        return fail(
          guard.status === HttpStatus.Unauthorized
            ? apiErrors.unauthorized()
            : apiErrors.forbidden(),
        );
      }
      return await handler({
        request,
        params: await routeContext.params,
        githubId: guard.githubId,
      });
    } catch (error) {
      if (error instanceof ApiError) return fail(error);
      if (error instanceof SlugConflictError)
        return fail(apiErrors.slugConflict());
      if (error instanceof NotFoundError) return fail(apiErrors.notFound());
      if (error instanceof OrderMismatchError)
        return fail(apiErrors.orderMismatch());
      console.error(
        "admin route error:",
        error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
      );
      return fail(apiErrors.internal());
    }
  };
}
