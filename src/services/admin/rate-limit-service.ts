import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { adminRateLimits } from "@/db/schema/portfolio";

const ADMIN_WRITE_WINDOW_SECONDS = 60;
const ADMIN_WRITE_MAX_PER_WINDOW = 60;

export type WriteQuota =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

// 윈도가 지났으면 count=1로 리셋하고 아니면 count+1 하는 단일 upsert, 경쟁 조건 없이 원자적으로 처리함
export async function consumeAdminWriteQuota(
  githubId: string,
): Promise<WriteQuota> {
  const windowInterval = sql`make_interval(secs => ${ADMIN_WRITE_WINDOW_SECONDS}::double precision)`;
  const expired = sql`${adminRateLimits.windowStart} + ${windowInterval} <= now()`;
  const [row] = await db
    .insert(adminRateLimits)
    .values({ githubId, windowStart: sql`now()`, count: 1 })
    .onConflictDoUpdate({
      target: adminRateLimits.githubId,
      set: {
        windowStart: sql`case when ${expired} then now() else ${adminRateLimits.windowStart} end`,
        count: sql`case when ${expired} then 1 else ${adminRateLimits.count} + 1 end`,
      },
    })
    .returning({
      count: adminRateLimits.count,
      retryAfterSeconds: sql<number>`greatest(1, ceil(extract(epoch from (${adminRateLimits.windowStart} + ${windowInterval} - now()))))::int`,
    });
  if (row.count <= ADMIN_WRITE_MAX_PER_WINDOW) return { allowed: true };
  return { allowed: false, retryAfterSeconds: row.retryAfterSeconds };
}
