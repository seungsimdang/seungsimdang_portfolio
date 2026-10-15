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

const limitedLabels = <T extends z.ZodType>(item: T, max: number) =>
  z.array(item).max(max, `${max}개 이하로 입력해 주세요`);

// 중복 값은 하나로 합침
const unique = (values: string[]) => [...new Set(values)];

const labelList = (max: number) => limitedLabels(label, max).transform(unique);

// 폼은 입력 칸 이름이 tags.0.value 꼴이 되도록 { value } 객체로 들고 있다가 서버 입력 모양으로 되돌림
const formLabelList = (max: number) =>
  limitedLabels(z.object({ value: label }), max).transform((items) =>
    unique(items.map((item) => item.value)),
  );

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
});

export const postCreateInputSchema = postUpdateInputSchema.extend({
  slug: postSlugSchema,
});

// 폼 발행일은 YYYY.MM.DD 로 입력받아 서버 날짜 규칙에 넘김
const formPublishedAt = z
  .string()
  .transform((value) => value.trim().replaceAll(".", "-"))
  .pipe(postUpdateInputSchema.shape.publishedAt);

const postFormShape = {
  categories: formLabelList(CATEGORY_MAX),
  tags: formLabelList(TAG_MAX),
  publishedAt: formPublishedAt,
};

// 수정 화면의 slug는 읽기 전용이라 검증하지 않고 전송 단계에서 뺌
export const postEditFormSchema = postUpdateInputSchema.extend({
  ...postFormShape,
  slug: z.string(),
});

export const postCreateFormSchema = postCreateInputSchema.extend(postFormShape);

export type PostCreateInput = z.infer<typeof postCreateInputSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateInputSchema>;
