# design-spec: about 페이지 이력서 기반 재구성 (T03)

- 작성일: 2026-10-13
- 입력: `requirements.md`, `00-input.md`, 현재 `about/page.tsx`, `globals.css`, admin `talks`/`profile` 화면
- 원칙: 새 색/폰트/아이콘 없음(흑백 토큰만). 기존 컴포넌트 재사용 우선. 코드는 작성하지 않으며 클래스 값은 구현 지침(Tailwind spacing 1 = 1px)이다.

## 목차

- [1. 요약](#1-요약)
- [2. 공개 about 페이지](#2-공개-about-페이지)
- [3. admin 이력 관리](#3-admin-이력-관리)
- [4. 컴포넌트 목록](#4-컴포넌트-목록)
- [5. 접근성과 반응형](#5-접근성과-반응형)
- [6. 개발자에게 넘기는 확인점](#6-개발자에게-넘기는-확인점)

## 1. 요약

- 공개: `PageHeader` > `.experience` > `.stack` > `.tools` > `.education` > `.activities` > `.award` > `.certification` > `.language` > CTA. 빈 섹션은 라벨째 숨김.
- 섹션 간격: 현재(섹션당 상하 80~180px, 섹션 사이 160~360px)를 섹션 사이 **80px(모바일) / 96px(md) / 128px(lg)** 로 줄인다.
- admin: `/admin/resume` 한 화면에 kind 6개 섹션 목록. 기존 `SortableList`를 섹션마다 한 개씩 재사용. 추가/편집 폼만 신규(`ResumeEntryForm`). 프로필 폼에 `StringListEditor` 한 개 추가(tools).
- 신규 컴포넌트는 admin `ResumeEntryForm` 1개와 공개 표시용 프레젠테이션 3개(섹션 셸, 항목 목록, 태그 목록)뿐이다.

## 2. 공개 about 페이지

### 2.1 섹션 순서와 라벨

| 순서 | 라벨(h2) | 데이터 | 표시 형식 |
|------|----------|--------|-----------|
| 1 | `.experience` | resume kind=work | 항목 목록 |
| 2 | `.stack` | `profile.skills` | 태그 목록 |
| 3 | `.tools` | `profile.tools` | 태그 목록 |
| 4 | `.education` | kind=education | 항목 목록 |
| 5 | `.activities` | kind=activity | 항목 목록 |
| 6 | `.award` | kind=award | 항목 목록 |
| 7 | `.certification` | kind=certification | 항목 목록 |
| 8 | `.language` | kind=language | 항목 목록 |
| 9 | CTA | 고정 | 기존 CTA 그대로 |

- 상단은 기존 `PageHeader title="about"`(h1) 유지. tagline, `.hello`, 장식 원(about 본문 쪽)은 제거.
- 라벨 행은 기존 패턴 유지: `h2.text-small` + 오른쪽으로 늘어나는 `h-px bg-white/25` 선. 라벨 앞 점(`.`)은 텍스트의 일부.

### 2.2 섹션 간격 (구체 값과 근거)

현재 `section-spacing`은 `padding-top` + `padding-bottom` 각각 80/120/160/180px(모바일/태블릿/랩탑/데스크톱)이라 인접 섹션 사이가 160~360px이다. 이력 섹션 8개가 이어지면 스크롤이 과하게 길어지고, 사용자 피드백도 "너무 넓다"였다.

- 이력 섹션(1~8)은 `section-spacing`을 쓰지 않고 섹션 자체 패딩을 다음으로 한다.

| 뷰포트 | 섹션 상하 패딩(각각) | 섹션 사이 실제 간격 |
|--------|----------------------|---------------------|
| 기본(모바일) | `py-40` = 40px | 80px |
| `md` | `md:py-48` = 48px | 96px |
| `lg` | `lg:py-64` = 64px | 128px |

- 근거: 섹션 사이 간격이 섹션 내부 간격(라벨-본문 24~32px, 항목 사이 32~40px)보다 2~3배 커야 그룹이 구분된다. 80/96/128이면 이 비율이 유지되면서 기존 최소값(160)의 절반 이하다. 8개 섹션 기준 데스크톱에서 약 1,900px 정도 짧아진다(360 -> 128, 7구간).
- 섹션 내부 간격:
  - 라벨 행과 본문 사이: `space-y-24 md:space-y-32` (기존 48/64에서 축소).
  - 항목 사이(`ul`): `space-y-32 md:space-y-40` (기존 40/48에서 축소).
  - 항목 내부(제목/부제/세부): `space-y-8` (기존 12에서 축소), 세부 `li` 사이 `space-y-4` 유지.
  - 태그 목록: `gap-12` 유지.
- `PageHeader`는 다른 페이지와 공유하므로 변경하지 않는다. 헤더 아래 첫 섹션 사이에는 헤더의 하단 패딩(80~180px)이 남는다. 이는 의도된 "헤더와 본문 분리"로 둔다.
- CTA 섹션은 기존 `section-spacing` + `py-64 md:py-96 lg:py-128` 그대로 둔다. 이력 영역과 끝 호출을 구분하기 위함이다.
- 가로 패딩은 기존 `container-padding`, 폭은 `w-full max-w-content mx-auto` 유지.

### 2.3 항목 목록 레이아웃 (경력/학력/활동/수상/자격/어학 공통)

한 컴포넌트로 6개 kind를 모두 그린다(kind별 분기 없음).

- 항목 구조: 기간 | 제목(h3) / 부제 / 세부 목록.
- 데스크톱(`md` 이상): 2열 그리드 `md:grid-cols-[200px_1fr]`, `md:gap-32`. 왼쪽이 기간(`text-small text-white/50`), 오른쪽이 내용. 기간 열은 가장 긴 예시("2024.07 - 2026.07", `text-small` 14px)가 한 줄에 들어가는 200px로 정한다(현 정적 버전의 240px에서 축소해 본문 폭 확보). `[200px]`은 1회성 값이라 허용 범위이며, 토큰화 여부는 개발자가 검토한다.
- 모바일: 1열. 기간이 위, 내용이 아래, 둘 사이 `gap-8`.
- 내용 영역: `break-keep`.
  - 제목: `h3.text-h3`. 현재 `.text-h3`은 `clamp(1.5rem, 3vw, 2rem)`(24~32px)이고 긴 활동명이 많으므로 활동/자격 등 한 줄짜리 항목도 같은 크기를 쓴다. 단 목록이 길어 위압적이면 T05에서 `text-body font-medium`으로 낮추는 대신 이 문서를 갱신한다(임의 판단 금지).
  - 부제: `p.text-body text-white/50` (회사 직함, 학과, 기관명).
  - 세부: `ul.list-disc pl-20 text-body`, 항목 사이 `space-y-4`.
- 구분선은 항목 사이에 두지 않는다(여백으로만 분리).

### 2.4 태그 목록 (.stack, .tools)

- `ul.flex.flex-wrap.gap-12`, 항목은 `px-20 py-10 border border-white/10 rounded-lg text-body`. 기존 카드 그리드(hover 테두리)는 쓰지 않는다. 클릭 대상이 아니므로 hover 효과도 없다.
- 모바일/데스크톱 동일(줄바꿈으로 흡수). 10개 skills 기준으로 모바일 4~5줄 내.

### 2.5 빈 값 처리

| 상황 | 처리 |
|------|------|
| 섹션 항목 0개(이력 kind) | 섹션 전체(라벨, 선, 여백) 렌더하지 않음 |
| `skills`/`tools` 배열이 비었음 | 위와 동일하게 섹션 숨김 |
| 모든 섹션이 비었음 | 헤더와 CTA만 보임, 오류/안내 문구 없음 |
| `period`가 빈 문자열 | 기간 요소를 렌더하지 않음. 데스크톱에서는 내용 영역을 **2열(오른쪽 열)에 그대로 둬 다른 항목과 좌측 정렬선을 유지**(`md:col-start-2`). 모바일은 기간 줄이 없어 제목이 바로 시작 |
| `subtitle` 없음 | 부제 요소 생략 |
| `details` 빈 배열 | 세부 목록 생략 |

- `period` 앞뒤 공백/빈 값 판단은 서버 입력 검증(trim)에서 처리하고, 표시 쪽은 문자열 그대로 비어 있으면 숨김만 한다. 표시 포맷 변환 없음.

## 3. admin 이력 관리

### 3.1 내비게이션과 라우트

- `AdminNav`의 `LINKS`에 `{ href: "/admin/resume", label: "이력" }`을 `발표`와 `프로필` 사이에 추가. 현재 탭 표시(`aria-current`)는 기존 로직(`startsWith`)이 `/admin/resume/*`도 처리한다.
- 화면 3개(기존 talks 구조와 동일):
  - `/admin/resume`: 목록(kind별 섹션)
  - `/admin/resume/new?kind={kind}`: 추가
  - `/admin/resume/[id]`: 편집(uuid)
- `kind` 쿼리가 허용 6개 값이 아니면 `not-found`. 모든 페이지 첫 줄 `requireAdminPage()`.

### 3.2 목록 화면 (`/admin/resume`)

- `AdminPageHeader title="이력"` (h1). 별도 상단 "새 항목" 버튼은 두지 않는다(kind가 필요하므로 섹션별 버튼을 쓴다).
- 헤더 아래 안내 한 줄(`text-small opacity-70`): "스킬과 툴은 프로필에서 편집합니다." + `프로필` 링크(`/admin/profile`, 밑줄 링크).
- 섹션은 공개 페이지와 같은 순서로 6개: 경력(work), 학력(education), 활동(activity), 수상(award), 자격(certification), 어학(language). 한국어 명사: "경력", "학력", "활동", "수상", "자격", "어학". UI 문구에 "경험"은 쓰지 않는다(요구사항 F1-4).
- 섹션 구조(세로로 쌓음, 섹션 사이 `space-y-48`):
  - 섹션 헤더 행: `h2.text-body`(예: "경력") + 오른쪽 `AdminButton href="/admin/resume/new?kind=work" variant="primary"` 라벨 "경력 추가". 버튼은 `aria-label` 없이 라벨 자체가 대상 포함(섹션마다 고유).
  - 그 아래 `SortableList` 한 개(해당 kind의 항목).
- 행 표시(기존 `SortableList` 행 그대로): `{순번}. {title}` 링크 + 보조줄 `{period} · {subtitle}`. period가 비면 subtitle만, 둘 다 없으면 보조줄 생략. slug는 없으므로 보조줄에서 slug 표시를 뺀다. 행 어디를 눌러도 `/admin/resume/{id}`로 이동하는 기존 동작 유지.
- 위/아래 이동: 기존 `↑` `↓` 아이콘 버튼(`aria-label` "{title} 위로 이동"/"아래로 이동"), 이동 후 "순서가 변경되었습니다. 저장해야 반영됩니다." + `저장` 버튼. **저장은 섹션(kind)별로 독립**이다(섹션마다 `SortableList`가 자기 순서만 저장, 정렬 API도 kind별 id 목록).
- 삭제: 행의 `삭제` 버튼 -> `ConfirmDialog`("{title}을 삭제할까요?" / "되돌릴 수 없습니다."), 기본 포커스는 취소.
- 빈 섹션: 보조 문구 "등록된 경력이 없습니다." 만 표시. 기존 `SortableList` 빈 상태의 "새 ... 만들기" 버튼은 섹션 헤더의 추가 버튼과 중복이므로 이력에서는 숨긴다(4.3 참고).
- 삭제 직후 상태 메시지는 기존 `aria-live="polite"` 영역, 서버 다시 진입 시 `?deleted=1`이면 "삭제했습니다." 초기 메시지.
- 충돌(`ORDER_MISMATCH`) 시 기존 문구 + `새로고침` 버튼 동작 그대로.

### 3.3 추가/편집 폼 (`ResumeEntryForm`)

`TalkForm`과 같은 구조/훅(`useAdminForm`, `validateWith`, `FormStatus`, `FormActionBar`)을 따른다. 필드는 위에서 아래 순서:

| 순서 | 필드 | 컴포넌트 | 필수 | 비고 |
|------|------|----------|------|------|
| 1 | 구분 | `TextField readOnly` (한국어 라벨 값, 예: "경력") | 자동 | 추가 화면에서는 `?kind=`로 확정, 편집에서는 변경 불가. 힌트: "구분은 변경할 수 없습니다." |
| 2 | 기간 | `TextField` | 아니오 | placeholder `2024.07 - 2026.07`. 힌트: "입력한 그대로 표시됩니다. 예: 2026.08 - 현재, 졸업 2024.08, 2024. 비우면 기간이 표시되지 않습니다." |
| 3 | 제목 | `TextField` | 예 | kind별 힌트: 경력=회사명, 학력=학교와 학위, 활동/수상/자격/어학=항목명 |
| 4 | 부제 | `TextField` | 아니오 | kind별 힌트: 경력=직함, 학력=학과, 수상=주최 기관 |
| 5 | 세부 항목 | `StringListEditor` (`path="details"`, `legend="세부 항목"`, `itemLabel="세부 항목"`) | 아니오 | 0개 허용. 위/아래/삭제 동작은 `ListEditor` 기본 |

- kind는 select 컴포넌트 없이 목록의 섹션별 "추가" 링크가 쿼리로 넘긴다. 따라서 선택 UI(Radix Select 등)가 필요 없다.
- 학점 필드, 링크 필드, 날짜 선택기는 없다.
- 하단 `FormActionBar`: `저장`(저장 중에는 "저장 중..." + 비활성, 더블 클릭 방지), `취소`(`/admin/resume`), 편집 화면에서만 `이력 삭제`(danger) -> `ConfirmDialog`.
- 저장 후 동작:
  - 추가: `/admin/resume/{newId}?saved=1`로 이동(TalkForm과 동일), 상단 `FormStatus`에 "완료: ..." 알림.
  - 편집: 같은 화면에 머물며 `FormStatus` 알림.
  - 삭제: `/admin/resume?deleted=1`.
- 새 항목은 해당 kind 마지막 순서에 붙는다(서버 규칙). 폼에 순서 입력은 없다.
- 오류: 필드별 `error` 표시는 `TextField` 기본, 서버 오류와 인증 실패는 `FormStatus`(`describeAuthFailure`).

### 3.4 프로필 폼: tools 편집 추가

- `ProfileForm`의 스킬 `StringListEditor` 바로 아래에 두 번째 `StringListEditor`를 추가한다.
  - `legend="툴 (공개 about의 .tools에 표시됩니다)"`, `itemLabel="툴"`, `path="tools"`.
- 기존 스킬 legend는 "스킬 (순서가 첫 화면 순환 단어 순서이며 about의 .stack에도 표시됩니다)"로 보강한다. "React / Vue.js"처럼 묶지 말고 한 항목씩 입력하도록 hint를 둔다: "한 항목에 기술 하나씩 입력하세요."
- 저장은 기존 `저장` 하나로 skills와 tools를 함께 보낸다. tools가 빈 목록이어도 저장 가능하다.

## 4. 컴포넌트 목록

### 4.1 재사용 (기존)

| 컴포넌트 | 위치 | 사용처 |
|----------|------|--------|
| `AdminPageHeader` | `src/components/admin/admin-page-header.tsx` | 목록/폼 화면 제목 |
| `AdminButton` | `src/components/admin/admin-button.tsx` | 섹션 추가, 이동, 삭제, 저장 |
| `SortableList` | `src/components/admin/sortable-list.tsx` | kind별 목록(확장 필요, 4.3) |
| `ConfirmDialog` | `src/components/admin/confirm-dialog.tsx` | 삭제 확인(네이티브 `dialog`) |
| `TextField` | `src/components/admin/text-fields.tsx` | 구분(readOnly), 기간, 제목, 부제 |
| `StringListEditor` | `src/components/admin/string-list-editor.tsx` | details, profile tools |
| `FormStatus`, `FormActionBar` | `src/components/admin/form-parts.tsx` | 폼 알림, 하단 바 |
| `useAdminForm`, `adminRequest`, `describeAuthFailure`, `validateWith` | `src/lib/admin-client/*` | 저장/삭제 흐름 |
| `AdminNav` | `src/components/admin/admin-nav.tsx` | `이력` 링크 한 줄 추가 |
| `PageHeader`, `Button` | `src/components/common/page-header.tsx`, `src/components/ui/button.tsx` | 공개 about 헤더, CTA |

- `src/components/common/`에는 모달/드롭다운/선택/체크박스/스위치/툴팁 같은 인터랙티브 공통 컴포넌트가 없다(`about-section`, `hero-section`, `project-card` 등 섹션/카드뿐). 이번 화면에서 새 인터랙티브 primitive는 필요 없다: 삭제 확인은 admin `ConfirmDialog`, 구분은 쿼리로 확정이라 select가 없다.

### 4.2 신규

| 컴포넌트 | 종류 | 책임 | 비고 |
|----------|------|------|------|
| `ResumeEntryForm` | admin 클라이언트 | 이력 항목 추가/편집 폼 | `TalkForm` 구조 복제, 필드는 3.3 |
| `ResumeSection` | 공개 서버(비인터랙티브) | 라벨 행 + 본문 슬롯 + 섹션 패딩 | 항목이 0개면 호출 측에서 렌더하지 않음 |
| `ResumeEntryList` | 공개 서버(비인터랙티브) | 항목 목록 | 2.3 |
| `TagList` | 공개 서버(비인터랙티브) | skills/tools 태그 | 2.4 |

- 공개 3개는 정적 버전(`about-page-static.tsx`)의 `ResumeSection`/`ResumeList`/`TagList`를 간격 값만 2.2대로 조정해 옮긴 것이다. 한 파일(`src/components/common/`)에 두거나 about 전용 파일로 두는 것은 개발자 재량(kebab-case, knip 통과).
- 새 페이지 파일: `admin/(console)/resume/page.tsx`, `resume/new/page.tsx`, `resume/[id]/page.tsx`.

### 4.3 `SortableList` 확장 요구 (재사용을 위한 최소 변경)

디자인상 필요한 동작만 명시한다(구현 방식은 개발자).

1. 행 식별/이동 링크가 slug가 아닌 id로 동작해야 한다. 보조줄에서 slug 표시를 끌 수 있어야 한다.
2. 사용 구분에 이력(kind별)이 추가되어야 한다: 명사("경력" 등), 정렬 API 대상, 빈 문구, 편집 경로.
3. 한 화면에 인스턴스 6개가 공존한다: 인스턴스마다 독립적으로 dirty/저장/충돌을 관리하고, 미저장 변경이 있을 때 이탈 경고(기존 `beforeunload`/링크 클릭 확인)는 그대로 동작해야 한다.
4. 접근성: 내부 `sr-only h2`("... 목록")가 화면의 가시 h2(섹션 제목)와 중복되지 않게 한다(가시 h2를 쓰고 sr-only는 제거하거나 라벨 지정). 삭제 후 포커스 이동 대상은 해당 섹션 제목.
5. 이력 사용 시 빈 상태의 "만들기" 버튼은 숨길 수 있어야 한다.

## 5. 접근성과 반응형

- 공개 heading 계층: h1(`about`) > h2(섹션 라벨, `.experience` 등) > h3(항목 제목). 점으로 시작하는 라벨은 시각 스타일을 위한 텍스트이며 그대로 읽혀도 무방(기존 `.stack` 관례). CTA는 기존 h2.
- 기간은 텍스트 그대로 노출(`text-white/50`, 요구 기준 이상). 시맨틱상 기간 요소는 `p`로 충분하며 `time`을 쓰지 않는다(자유 텍스트라 기계 판독 불가).
- 목록은 `ul/li`로 마크업. 장식 선(`h-px`)은 접근성 트리에서 빈 `div`로 두거나 `aria-hidden`.
- 긴 텍스트: 제목/부제/세부 `break-keep`, 영문 긴 단어(예: "Depromeet") 오버플로 방지로 컨테이너 `min-w-0` 유지. 모바일 가로 스크롤 없음(320px 기준 확인).
- 태그 줄바꿈은 `flex-wrap`이라 폭 제한 없음.
- admin: 목록은 `h1` 하나 + 섹션별 `h2`. 버튼 라벨은 모두 대상을 포함한다("경력 추가", "{title} 위로 이동", "{title} 삭제"). 폼 필드는 `label` 연결과 `aria-describedby`(힌트/오류)를 `TextField`가 이미 제공. 저장/이동 결과는 `aria-live`/`role=status|alert`.
- admin 터치 대상은 기존 `min-h-44` 유지. 모바일에서 섹션 헤더 행은 `flex-wrap`으로 버튼이 아래로 내려갈 수 있다.
- 브레이크포인트는 기존 `md`(768px) 사용. 별도 탭릿 분기 없음.

## 6. 개발자에게 넘기는 확인점

1. `PageHeader`는 변경하지 않는다. 헤더 아래 간격이 여전히 크다고 판단되면 사용자 확인 후 별도 조정(이번 범위 밖).
2. 활동 항목처럼 제목만 있는 7개 행에서 `text-h3`(24~32px)가 과하면 T07 리뷰에서 지적하고 이 문서에서 크기를 확정한다. 이번 명세 기본값은 모든 kind에 `text-h3`.
3. 홈 히어로 단어 10개 확장에 따른 레이아웃 확인은 요구사항 F6대로 T07/T09 몫이며 이번 디자인 범위 아님.
4. 새 색, 아이콘, 폰트는 도입하지 않는다. 구분선/테두리는 기존 `white/10`, `white/25`만 사용.
