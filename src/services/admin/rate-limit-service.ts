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
  // count가 상한 초과면 현재 버킷 끝까지 대기
  // 그 외에는 직전 버킷 가중치가 상한 여유분 이하로 줄어드는 시점까지 대기, 즉 W * (1 - 여유분/prev_count) - 경과초
  const waitSeconds =
    row.count > ADMIN_WRITE_MAX_PER_WINDOW
      ? remainingInBucket
      : Math.min(
          remainingInBucket,
          ADMIN_WRITE_WINDOW_SECONDS *
            (1 - (ADMIN_WRITE_MAX_PER_WINDOW - row.count) / row.prevCount) -
            elapsed,
        );
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil(waitSeconds)),
  };
}
