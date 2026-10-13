---
paths:
  - "src/**/*.{tsx,css}"
---

# Tailwind CSS 핵심 규칙

Tailwind **v4**. 설정은 `tailwind.config.*`가 아니라 `src/app/globals.css`의 `@theme` / `@theme inline` 블록에 있다.

## 목차

- [⚠️ Spacing = px (프로젝트 필수 규칙)](#-spacing--px-프로젝트-필수-규칙)
- [디자인 토큰만 사용](#디자인-토큰만-사용)
- [cn 사용 기준](#cn-사용-기준)

## ⚠️ Spacing = px (프로젝트 필수 규칙)

`@theme`에서 `--spacing: 1px` 로 재정의되어 있다. **숫자 1 = 1px** (Tailwind 기본 `0.25rem` 아님):

- `p-4` = 4px, `min-h-72` = 72px, `gap-8` = 8px, `px-12` = 12px, `rounded-xl` 등 토큰은 그대로.

**클래스 값을 정할 때 반드시 px로 환산한다.**

## 디자인 토큰만 사용

1. 색은 흑백 기본 팔레트(`white`, `black`과 투명도 수식어 `/10`, `/25` 등)와 `globals.css`에 정의된 토큰(`danger`, `background`, `foreground`)만 쓴다. 다른 기본 팔레트 색(`red-500` 등)과 임의 색 값(`[#...]`) 금지.
   - 간격·크기 토큰: `max-w-content`, `max-w-heading`, `h-header`, `min-h-project-info`, `h-card`, `h-card-tall`, `h-card-stuck` 등.
2. 새 색/간격 값이 필요하면 인라인 임의 값 대신 `globals.css`의 `@theme`에 토큰을 추가한다.
3. CSS 커스텀 프로퍼티 참조는 v4 괄호 표기: `bg-(--brand)`, `h-(--x)` (`[var(--x)]` 아님).
4. **예외로 `[]` 허용**: 소수점 등 완전히 임의의 1회성 값. 그래도 우선은 토큰화를 검토한다.
5. **의미 있는 토큰을 그 의미 외 용도로 재사용 금지** - `--danger`(삭제·오류 지시색)는 정의된 의미로만 쓴다. 단순 강조나 장식 용도가 필요하면 전용 토큰을 `@theme`에 새로 추가한다.

## `cn` 사용 기준

`cn`은 `src/utils/styleUtils.ts` (`twMerge(clsx(...))`).

| 상황 | ✅ | ❌ |
|------|-----|-----|
| 조건부/다중 상태 | `cn("base", isActive && "active")` | `"base " + (isActive ? "active" : "")` |
| 정적 단일 문자열 | `className="text-sm font-medium"` | `cn("text-sm font-medium")` |
| variant 매핑 | `cn(base, variant[v], size[s])` | 템플릿 리터럴 남용 |
