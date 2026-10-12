import type { ApiErrorBody, CustomData } from "@/types/api-types";

export type AdminResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      // 네트워크 오류나 비정상 응답은 0
      status: number;
      code?: ApiErrorBody["code"];
      fieldErrors?: Record<string, string>;
    };

// admin Route Handler 호출, 응답은 CustomData 형태로만 해석
export async function adminRequest<T>(
  method: "POST" | "PUT" | "DELETE",
  url: string,
  body?: unknown,
): Promise<AdminResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const failure = (await response.json().catch(() => null)) as CustomData<
        ApiErrorBody | undefined
      > | null;
      return {
        ok: false,
        status: response.status,
        code: failure?.data?.code,
        fieldErrors: failure?.data?.fieldErrors,
      };
    }
    const json = (await response
      .json()
      .catch(() => null)) as CustomData<T> | null;
    return json
      ? { ok: true, data: json.data }
      : { ok: false, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
