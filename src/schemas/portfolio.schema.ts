import { z } from "zod";

const SHORT_TEXT_MAX = 200;
const LONG_TEXT_MAX = 5000;
const LIST_MAX = 50;
const URL_MAX = 2000;
const SLUG_MAX = 64;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TALK_DATE_PATTERN = /^\d{4}\.(0[1-9]|1[0-2])$/;

// 순서 변경 요청의 slug 상한이자 프로젝트·발표 각각의 생성 개수 상한
export const ORDER_SLUGS_MAX = LIST_MAX * 2;

export function isValidThumbnail(value: string): boolean {
  const hostname = process.env.NEXT_PUBLIC_BLOB_HOSTNAME;
  if (!hostname) return false;
  try {
    const url = new URL(value);
    const authority = value.match(/^https:\/\/([^/?#]+)(?:\/|$)/)?.[1];
    return (
      url.protocol === "https:" &&
      url.hostname === hostname &&
      authority === hostname &&
      url.pathname.startsWith("/thumbnails/") &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

const shortText = z
  .string()
  .trim()
  .min(1, "필수 입력입니다")
  .max(SHORT_TEXT_MAX, `${SHORT_TEXT_MAX}자 이하로 입력해 주세요`);

const longText = z
  .string()
  .trim()
  .min(1, "필수 입력입니다")
  .max(LONG_TEXT_MAX, `${LONG_TEXT_MAX}자 이하로 입력해 주세요`);

// 빈 문자열을 허용하는 장문 (tradeoff 3필드)
const optionalLongText = z
  .string()
  .trim()
  .max(LONG_TEXT_MAX, `${LONG_TEXT_MAX}자 이하로 입력해 주세요`);

function isHttpUrl(value: string, protocols: readonly string[]) {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const httpUrl = z
  .string()
  .trim()
  .min(1, "필수 입력입니다")
  .max(URL_MAX, `${URL_MAX}자 이하로 입력해 주세요`)
  .refine(
    (v) => isHttpUrl(v, ["http:", "https:"]),
    "http 또는 https 주소만 입력할 수 있습니다",
  );

const httpsUrl = z
  .string()
  .trim()
  .min(1, "필수 입력입니다")
  .max(URL_MAX, `${URL_MAX}자 이하로 입력해 주세요`)
  .refine((v) => isHttpUrl(v, ["https:"]), "https 주소만 입력할 수 있습니다");

const slugSchema = z
  .string()
  .min(1, "필수 입력입니다")
  .max(SLUG_MAX, `${SLUG_MAX}자 이하로 입력해 주세요`)
  .regex(SLUG_PATTERN, "영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다")
  .refine((v) => v !== "new", "사용할 수 없는 값입니다");

const stringList = z
  .array(shortText)
  .max(LIST_MAX, `${LIST_MAX}개 이하로 입력해 주세요`);

// 비어 있으면 null 저장, 값이 있으면 우리 Blob URL만 허용
const thumbnail = z
  .string()
  .trim()
  .max(URL_MAX, `${URL_MAX}자 이하로 입력해 주세요`)
  .refine(
    (v) => v === "" || isValidThumbnail(v),
    "등록된 Blob 스토어의 이미지 주소만 입력할 수 있습니다",
  )
  .optional();

const optionalHttpUrl = z
  .string()
  .trim()
  .max(URL_MAX, `${URL_MAX}자 이하로 입력해 주세요`)
  .refine(
    (v) => v === "" || isHttpUrl(v, ["http:", "https:"]),
    "http 또는 https 주소만 입력할 수 있습니다",
  )
  .optional();

export const profileInputSchema = z.strictObject({
  name: shortText,
  title: shortText,
  tagline: longText,
  description: longText,
  email: z.email("이메일 형식이 올바르지 않습니다").max(SHORT_TEXT_MAX),
  github: httpsUrl,
  skills: stringList,
});

const experienceLinkSchema = z.strictObject({ label: shortText, url: httpUrl });

const experienceInputSchema = z.strictObject({
  title: shortText,
  problem: longText,
  solution: longText,
  tradeoff: z.strictObject({
    advantages: optionalLongText,
    disadvantages: optionalLongText,
    rationale: optionalLongText,
  }),
  result: longText,
  learning: longText,
  links: z
    .array(experienceLinkSchema)
    .max(LIST_MAX, `${LIST_MAX}개 이하로 입력해 주세요`)
    .optional(),
});

export const projectUpdateInputSchema = z.strictObject({
  slug: slugSchema,
  title: shortText,
  period: shortText,
  role: shortText,
  summary: longText,
  link: optionalHttpUrl,
  thumbnail,
  techStack: stringList,
  experiences: z
    .array(experienceInputSchema)
    .max(LIST_MAX, `${LIST_MAX}개 이하로 입력해 주세요`),
});

export const projectCreateInputSchema = projectUpdateInputSchema.extend({
  slug: slugSchema,
});

export const talkUpdateInputSchema = z.strictObject({
  slug: slugSchema,
  title: shortText,
  date: z
    .string()
    .trim()
    .regex(TALK_DATE_PATTERN, "YYYY.MM 형식으로 입력해 주세요"),
  venue: shortText,
  description: longText,
  impact: longText,
  link: httpUrl,
});

export const talkCreateInputSchema = talkUpdateInputSchema.extend({
  slug: slugSchema,
});

export const orderInputSchema = z.strictObject({
  slugs: z
    .array(slugSchema)
    .min(1, "1개 이상 필요합니다")
    .max(ORDER_SLUGS_MAX)
    .refine((v) => new Set(v).size === v.length, "중복된 항목이 있습니다"),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type ExperienceInput = z.infer<typeof experienceInputSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateInputSchema>;
export type ProjectCreateInput = z.infer<typeof projectCreateInputSchema>;
export type TalkUpdateInput = z.infer<typeof talkUpdateInputSchema>;
export type TalkCreateInput = z.infer<typeof talkCreateInputSchema>;
