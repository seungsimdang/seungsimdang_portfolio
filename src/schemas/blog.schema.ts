import { z } from "zod";
import {
  POST_CONTENT_MAX,
  POST_LABEL_MAX,
  POST_SLUG_MAX,
} from "@/constants/blog";

const CATEGORY_MAX = 10;
const TAG_MAX = 20;
const TITLE_MAX = 200;

export const postSlugSchema = z
  .string()
  .max(POST_SLUG_MAX, `${POST_SLUG_MAX}자 이하로 입력해 주세요`)
  .regex(
    /^[a-z0-9가-힣]+(-[a-z0-9가-힣]+)*$/u,
    "한글, 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다",
  )
  .refine((v) => v !== "new", "사용할 수 없는 값입니다");

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const label = z
  .string()
  .trim()
  .normalize("NFC")
  .min(1, "필수 입력입니다")
  .max(POST_LABEL_MAX, `${POST_LABEL_MAX}자 이하로 입력해 주세요`);

// 중복 값은 하나로 합침
const labelList = (max: number) =>
  z
    .array(label)
    .max(max, `${max}개 이하로 입력해 주세요`)
    .transform((values) => [...new Set(values)]);

export const postUpdateInputSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .normalize("NFC")
    .min(1, "필수 입력입니다")
    .max(TITLE_MAX, `${TITLE_MAX}자 이하로 입력해 주세요`),
  content: z
    .string()
    .max(POST_CONTENT_MAX, `${POST_CONTENT_MAX}자 이하로 입력해 주세요`),
  categories: labelList(CATEGORY_MAX),
  tags: labelList(TAG_MAX),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식으로 입력해 주세요")
    .refine(isRealDate, "올바른 날짜가 아닙니다"),
  published: z.boolean(),
});

export const postCreateInputSchema = postUpdateInputSchema.extend({
  slug: postSlugSchema,
});

export type PostCreateInput = z.infer<typeof postCreateInputSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateInputSchema>;
