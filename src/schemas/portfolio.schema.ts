import { z } from "zod";
import { RESUME_KINDS } from "@/constants/resume";

const SHORT_TEXT_MAX = 200;
const LONG_TEXT_MAX = 5000;
const LIST_MAX = 50;
const URL_MAX = 2000;
const PERIOD_MAX = 100;
const SLUG_MAX = 64;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TALK_DATE_PATTERN = /^\d{4}\.(0[1-9]|1[0-2])$/;

// 순서 변경 요청의 slug 상한이자 프로젝트·발표 각각의 생성 개수 상한
export const ORDER_SLUGS_MAX = LIST_MAX * 2;

// kind별 이력 생성 상한이자 정렬 요청 id 상한
export const RESUME_KIND_MAX = LIST_MAX;

function isBlobUrlUnder(value: string, prefix: string): boolean {
  const hostname = process.env.NEXT_PUBLIC_BLOB_HOSTNAME;
  if (!hostname) return false;
  try {
    const url = new URL(value);
    const authority = value.match(/^https:\/\/([^/?#]+)(?:\/|$)/)?.[1];
    return (
      url.protocol === "https:" &&
      url.hostname === hostname &&
      authority === hostname &&
      url.pathname.startsWith(prefix) &&
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

export function isValidThumbnail(value: string): boolean {
  return isBlobUrlUnder(value, "/thumbnails/");
}

export function isValidPostImage(value: string): boolean {
  return isBlobUrlUnder(value, "/blog/images/");
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

const limitedList = <T extends z.ZodType>(item: T) =>
  z.array(item).max(LIST_MAX, `${LIST_MAX}개 이하로 입력해 주세요`);

const stringList = limitedList(shortText);

// 폼은 입력 칸 이름이 skills.0.value 꼴이 되도록 문자열을 { value } 객체로 들고 있다가 서버 입력 모양으로 되돌림
const formStringList = limitedList(z.object({ value: shortText })).transform(
  (items) => items.map((item) => item.value),
);

// DB check(projects_thumbnails_max)와 admin 폼 상한이 같은 값을 씀
export const THUMBNAIL_LIST_MAX = 10;

const thumbnailUrl = z
  .string()
  .trim()
  .min(1, "필수 입력입니다")
  .max(URL_MAX, `${URL_MAX}자 이하로 입력해 주세요`)
  .refine(
    isValidThumbnail,
    "등록된 Blob 스토어의 이미지 주소만 입력할 수 있습니다",
  );

// 순서가 곧 전환 순서라 중복은 임의로 제거하지 않고 거부함
const hasNoDuplicate = (items: readonly unknown[]) =>
  new Set(items).size === items.length;

const thumbnailList = z
  .array(thumbnailUrl)
  .max(THUMBNAIL_LIST_MAX, `${THUMBNAIL_LIST_MAX}장 이하로 입력해 주세요`)
  .refine(hasNoDuplicate, "중복된 이미지가 있습니다");

// 폼은 useFieldArray가 { value } 객체를 요구해 검증 뒤 문자열 배열로 되돌림
const formThumbnailList = z
  .array(z.object({ value: thumbnailUrl }))
  .max(THUMBNAIL_LIST_MAX, `${THUMBNAIL_LIST_MAX}장 이하로 입력해 주세요`)
  .refine(
    (items) => hasNoDuplicate(items.map((item) => item.value)),
    "중복된 이미지가 있습니다",
  )
  .transform((items) => items.map((item) => item.value));

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
  tools: stringList,
});

// 탭별 폼이 보낸 항목만 갱신하므로 모든 키를 선택으로 두고, 값이 있는 항목이 없으면 거부함
export const profileUpdateInputSchema = profileInputSchema
  .partial()
  .refine(
    (v) => Object.values(v).some((value) => value !== undefined),
    "변경할 항목이 없습니다",
  );

// 빈 문자열 허용
const optionalShortText = z
  .string()
  .trim()
  .max(SHORT_TEXT_MAX, `${SHORT_TEXT_MAX}자 이하로 입력해 주세요`);

export const resumeEntryUpdateInputSchema = z.strictObject({
  period: z
    .string()
    .trim()
    .max(PERIOD_MAX, `${PERIOD_MAX}자 이하로 입력해 주세요`),
  title: shortText,
  subtitle: optionalShortText,
  details: stringList,
});

// kind는 생성 시에만 받고 수정으로 바꾸지 않음
export const resumeEntryCreateInputSchema = resumeEntryUpdateInputSchema.extend(
  { kind: z.enum(RESUME_KINDS) },
);

export const resumeOrderInputSchema = z.strictObject({
  kind: z.enum(RESUME_KINDS),
  ids: z
    .array(z.uuid("올바른 id가 아닙니다"))
    .min(1, "1개 이상 필요합니다")
    .max(RESUME_KIND_MAX)
    .refine((v) => new Set(v).size === v.length, "중복된 항목이 있습니다"),
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

const projectInputShape = {
  slug: slugSchema,
  title: shortText,
  period: shortText,
  role: shortText,
  summary: longText,
  link: optionalHttpUrl,
  thumbnails: thumbnailList.optional(),
  mobileThumbnails: thumbnailList.optional(),
  techStack: stringList,
  experiences: z
    .array(experienceInputSchema)
    .max(LIST_MAX, `${LIST_MAX}개 이하로 입력해 주세요`),
};

// 두 목록이 함께 제공된 경우만 판정하고 한쪽만 제공된 요청은 서비스가 기존 행과 합쳐 판정함
// refine이 붙은 스키마는 extend할 수 없어 최종 export 스키마에만 적용함
function withThumbnailRules<
  S extends z.ZodType<{
    thumbnails?: readonly unknown[];
    mobileThumbnails?: readonly unknown[];
  }>,
>(schema: S) {
  return schema.superRefine((value, ctx) => {
    if (
      value.thumbnails !== undefined &&
      value.mobileThumbnails !== undefined &&
      value.mobileThumbnails.length > 0 &&
      value.thumbnails.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["mobileThumbnails"],
        message: "기본 이미지를 먼저 등록해 주세요",
      });
    }
  });
}

const projectUpdateObject = z.strictObject(projectInputShape);

export const projectUpdateInputSchema = withThumbnailRules(projectUpdateObject);

export const projectCreateInputSchema = withThumbnailRules(
  projectUpdateObject.extend({ slug: slugSchema }),
);

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

const profileFormSchema = profileInputSchema.extend({
  skills: formStringList,
  tools: formStringList,
});

const PROFILE_SECTION_KEYS = {
  home: ["name", "title", "tagline", "description"],
  about: ["skills", "tools"],
  contact: ["email", "github"],
} as const;

export type ProfileFormValues = z.input<typeof profileFormSchema>;
export type ProfileFormInput = Partial<z.output<typeof profileFormSchema>>;

// 폼 값에는 다른 탭 항목도 들어 있어, 해당 섹션 키만 골라 느슨한 객체로 검증하고 내보냄
export function profileSectionFormSchema(
  section: keyof typeof PROFILE_SECTION_KEYS,
): z.ZodType<ProfileFormInput, ProfileFormValues> {
  const shape = profileFormSchema.shape;
  return z.object(
    Object.fromEntries(
      PROFILE_SECTION_KEYS[section].map((key) => [key, shape[key]]),
    ),
  ) as unknown as z.ZodType<ProfileFormInput, ProfileFormValues>;
}

export const resumeEntryFormSchema = resumeEntryUpdateInputSchema.extend({
  details: formStringList,
});

const projectFormObject = projectUpdateObject.extend({
  thumbnails: formThumbnailList,
  mobileThumbnails: formThumbnailList,
  techStack: formStringList,
});

export const projectFormSchema = withThumbnailRules(projectFormObject);

// 수정 화면에서 목록을 바꾸지 않았으면 서버에 보내지 않으므로 기존 값은 형식을 따지지 않고 개수만 제한함
const keepThumbnailList = z
  .array(z.object({ value: z.string().trim() }))
  .max(THUMBNAIL_LIST_MAX, `${THUMBNAIL_LIST_MAX}장 이하로 입력해 주세요`);

export const projectFormKeepThumbnailsSchema = projectFormObject.extend({
  thumbnails: keepThumbnailList,
  mobileThumbnails: keepThumbnailList,
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>;
export type ExperienceInput = z.infer<typeof experienceInputSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateInputSchema>;
export type ProjectCreateInput = z.infer<typeof projectCreateInputSchema>;
export type TalkUpdateInput = z.infer<typeof talkUpdateInputSchema>;
export type TalkCreateInput = z.infer<typeof talkCreateInputSchema>;
export type ResumeEntryCreateInput = z.infer<
  typeof resumeEntryCreateInputSchema
>;
export type ResumeEntryUpdateInput = z.infer<
  typeof resumeEntryUpdateInputSchema
>;
