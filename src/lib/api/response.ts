import "server-only";
import { HttpStatusCode } from "axios";
import type { ApiErrorBody, CustomData } from "@/types/api-types";
import type { ApiError } from "./api-error";

export function ok<T>(data: T, status: number = HttpStatusCode.Ok) {
  return Response.json({ data, status } satisfies CustomData<T>, { status });
}

export function fail(error: ApiError) {
  const body: ApiErrorBody = {
    code: error.code,
    message: error.message,
    ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
  };
  return Response.json(
    { data: body, status: error.status } satisfies CustomData<ApiErrorBody>,
    { status: error.status, headers: error.headers },
  );
}
