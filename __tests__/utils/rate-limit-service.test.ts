import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let row: { count: number; prevCount: number; elapsedSeconds: number };
vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: async () => [row] }),
      }),
    }),
  },
}));

import {
  consumeAdminWriteQuota,
  secondsUntilNextAllowed,
} from "@/services/admin/rate-limit-service";

beforeEach(() => {
  row = { count: 1, prevCount: 0, elapsedSeconds: 0 };
});

describe("secondsUntilNextAllowed", () => {
  it("현재 버킷 안에서 해소되면 그 시점까지의 초를 반환한다", () => {
    // t=31초에 추정치 60 * (29/60) + 31 = 60이 되어 다음 요청이 상한 이하
    expect(secondsUntilNextAllowed(30, 60, 0)).toBeCloseTo(31, 6);
  });

  it("경과 시간만큼 대기 시간이 줄어든다", () => {
    expect(secondsUntilNextAllowed(30, 60, 10)).toBeCloseTo(21, 6);
  });

  it("직전 횟수가 0이면 다음 버킷까지의 잔여 시간을 반환한다", () => {
    expect(secondsUntilNextAllowed(59, 0, 20)).toBeCloseTo(40, 6);
  });

  it("count가 상한 이상이면 잔여 시간에 다음 버킷 가중치 대기를 더한다", () => {
    // 잔여 50초 + 60 * (1 - 59/61)
    expect(secondsUntilNextAllowed(61, 0, 10)).toBeCloseTo(
      50 + (60 * 2) / 61,
      6,
    );
  });

  it("count가 상한과 같으면 다음 요청 1건이 상한을 넘으므로 다음 버킷 기준이다", () => {
    expect(secondsUntilNextAllowed(60, 5, 0)).toBeCloseTo(
      60 + 60 * (1 - 59 / 60),
      6,
    );
  });

  it("count가 상한보다 1 작고 직전 횟수가 있으면 버킷 끝까지를 넘지 않는다", () => {
    expect(secondsUntilNextAllowed(59, 10, 0)).toBeCloseTo(60, 6);
  });

  it("count가 매우 커도 다음 버킷 대기가 윈도 길이의 2배 이하다", () => {
    expect(secondsUntilNextAllowed(10_000, 0, 0)).toBeLessThanOrEqual(120);
  });
});

describe("consumeAdminWriteQuota", () => {
  it("추정치가 정확히 상한이면 허용한다", async () => {
    row = { count: 60, prevCount: 0, elapsedSeconds: 30 };
    expect(await consumeAdminWriteQuota("1")).toEqual({ allowed: true });
  });

  it("직전 버킷 가중치를 더해 상한을 넘으면 거부한다", async () => {
    // 추정치 60 * 0.5 + 31 = 61
    row = { count: 31, prevCount: 60, elapsedSeconds: 30 };
    const quota = await consumeAdminWriteQuota("1");
    expect(quota.allowed).toBe(false);
  });

  it("가중치가 반영돼 상한 이하면 허용한다", async () => {
    // 추정치 60 * 0.5 + 30 = 60
    row = { count: 30, prevCount: 60, elapsedSeconds: 30 };
    expect(await consumeAdminWriteQuota("1")).toEqual({ allowed: true });
  });

  it("거부 시 Retry-After 초를 올림한 정수로 반환한다", async () => {
    row = { count: 61, prevCount: 0, elapsedSeconds: 10 };
    const quota = await consumeAdminWriteQuota("1");
    expect(quota).toEqual({
      allowed: false,
      retryAfterSeconds: Math.ceil(50 + (60 * 2) / 61),
    });
  });

  it("거부 시 Retry-After는 최소 1초다", async () => {
    row = { count: 59, prevCount: 1000, elapsedSeconds: 59.9 };
    const quota = await consumeAdminWriteQuota("1");
    expect(quota).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it("거부 후 Retry-After만큼 기다린 뒤 다음 요청은 허용된다", async () => {
    row = { count: 30, prevCount: 200, elapsedSeconds: 0 };
    const denied = await consumeAdminWriteQuota("1");
    expect(denied.allowed).toBe(false);
    if (denied.allowed) return;
    const wait = secondsUntilNextAllowed(30, 200, 0);
    const estimate = 200 * ((60 - wait) / 60) + 31;
    expect(denied.retryAfterSeconds).toBe(Math.ceil(wait));
    expect(estimate).toBeLessThanOrEqual(60 + 1e-9);
  });
});
