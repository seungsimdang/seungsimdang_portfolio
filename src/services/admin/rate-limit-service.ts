import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { adminRateLimits } from "@/db/schema/portfolio";

const ADMIN_WRITE_WINDOW_SECONDS = 60;
const ADMIN_WRITE_MAX_PER_WINDOW = 60;

export type WriteQuota =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

// 슬라이딩 윈도 카운터 단일 upsert, 경쟁 조건 없이 원자적으로 처리함
// 버킷은 DB now()를 윈도 길이 단위로 정렬한 시작 시각
// 저장 버킷이 현재면 count+1, 직전 버킷이면 prev_count=count와 count=1, 그보다 오래됐으면 prev_count=0과 count=1
// 추정치는 prev_count * (1 - 경과초/윈도) + count
// 거부된 요청도 count를 올리므로 한도 초과 상태에서 계속 재시도하면 대기 시간이 늘어남
export async function consumeAdminWriteQuota(
  githubId: string,
): Promise<WriteQuota> {
  const windowInterval = sql`make_interval(secs => ${ADMIN_WRITE_WINDOW_SECONDS}::double precision)`;
  const bucket = sql`date_bin(${windowInterval}, now(), 'epoch'::timestamptz)`;
  const isCurrent = sql`${adminRateLimits.windowStart} = ${bucket}`;
  const isPrevious = sql`${adminRateLimits.windowStart} = ${bucket} - ${windowInterval}`;
  const [row] = await db
    .insert(adminRateLimits)
    .values({ githubId, windowStart: bucket, count: 1, prevCount: 0 })
    .onConflictDoUpdate({
      target: adminRateLimits.githubId,
      set: {
        windowStart: bucket,
        count: sql`case when ${isCurrent} then ${adminRateLimits.count} + 1 else 1 end`,
        prevCount: sql`case when ${isCurrent} then ${adminRateLimits.prevCount} when ${isPrevious} then ${adminRateLimits.count} else 0 end`,
      },
    })
    .returning({
      count: adminRateLimits.count,
      prevCount: adminRateLimits.prevCount,
      elapsedSeconds: sql<number>`extract(epoch from (now() - ${adminRateLimits.windowStart}))::float8`,
    });
  const elapsed = Number(row.elapsedSeconds);
  const remainingInBucket = ADMIN_WRITE_WINDOW_SECONDS - elapsed;
  const estimate =
    row.prevCount * (remainingInBucket / ADMIN_WRITE_WINDOW_SECONDS) +
    row.count;
  if (estimate <= ADMIN_WRITE_MAX_PER_WINDOW) return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil(secondsUntilNextAllowed(row.count, row.prevCount, elapsed)),
    ),
  };
}

// 다음 요청이 count를 1 올린 상태로 추정치가 상한 이하가 되는 시점까지의 초
// 현재 버킷 안: prev_count * (1 - t/W) + count + 1 <= MAX 에서 t = W * (1 - (MAX - count - 1) / prev_count)
// 다음 버킷: 직전 횟수가 count, 현재 횟수가 1이므로 u = W * (1 - (MAX - 1) / count), 버킷 잔여 시간에 더함
export function secondsUntilNextAllowed(
  count: number,
  prevCount: number,
  elapsed: number,
): number {
  const W = ADMIN_WRITE_WINDOW_SECONDS;
  const MAX = ADMIN_WRITE_MAX_PER_WINDOW;
  const remainingInBucket = W - elapsed;
  if (count + 1 <= MAX && prevCount > 0) {
    const withinBucket = W * (1 - (MAX - count - 1) / prevCount) - elapsed;
    if (withinBucket < remainingInBucket) return withinBucket;
  }
  return remainingInBucket + Math.max(0, W * (1 - (MAX - 1) / count));
}
