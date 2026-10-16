# T01 입력 정리 - 프로젝트 썸네일 확장

- 작업 브랜치: `feature/project-thumbnails` (develop `72f8aa0`에서 분기)
- 작성: orchestrator (2026-10-16)

## 사용자 요청 원문

> 모바일 뷰에서의 썸네일/pc 뷰에서의 썸네일 이미지를 다르게 적용하고싶어. 또한, 하나의 프로젝트에 대해 복수 개의 썸네일 적용 가능하도록 하고 싶어. 이 경우 일정 시간마다 썸네일이 자동 전환되도록 해줘. 작업 후, SEMT 프로젝트의 pc 뷰 썸네일을 [Image #1]로, 모바일 뷰 썸네일을 [Image #2] [Image #3] [Image #4] 로 변경해줘. 이때, 모바일 뷰/pc 뷰 썸네일이 별도로 구분되어있지 않을 경우 지금처럼 양쪽 뷰에 동일한 썸네일을 띄우도록 해.

## 구조화

1. 프로젝트 썸네일을 PC 뷰용과 모바일 뷰용으로 따로 지정할 수 있어야 함.
2. 한 프로젝트에 썸네일을 여러 장 지정할 수 있어야 함.
3. 썸네일이 여러 장이면 일정 시간마다 자동 전환.
4. PC/모바일 구분이 없는 프로젝트는 현재처럼 양쪽 뷰에 같은 썸네일 표시.
5. 구현 후 SEMT 프로젝트(slug `semt`, 현재 thumbnail null) 데이터 변경:
   - PC 뷰: Image #1 `/Users/leeseunghyun/Downloads/SEMT.png` (3840×2160, 2.07MB)
   - 모바일 뷰(순서대로): Image #2 `/Users/leeseunghyun/Desktop/SEMT-6.9-inch-Screens/03-03.png`, Image #3 `.../02-02.png`, Image #4 `.../04-04-Know-each-hospital.png` (각 1290×2796, 약 1.1MB)

## 현재 상태 (사실 확인)

- DB `projects.thumbnail`은 단일 `text` 컬럼 (`src/db/schema/portfolio.ts`).
- 썸네일 사용처: `src/components/common/project-card.tsx`(홈·projects 목록 카드, `next/image` fill + object-cover), `src/app/(public)/work/[id]/page.tsx`(OG images), admin `project-form.tsx` + `thumbnail-field.tsx`, 업로드 `src/app/api/admin/uploads/thumbnail/route.ts`(Vercel Blob `thumbnails/`).
- 기존 썸네일 저장 위치가 섞여 있음: Globber는 `public/images/projects/globber/thumbnail.png`, Candanta는 Vercel Blob URL.
- 카드 높이는 `h-card`/`md:h-card-stuck` 고정, 모바일 이미지는 세로형(약 9:19.5)이라 카드 비율과 다름.

## 모호한 항목

- A1. 모바일/PC 뷰를 가르는 기준 브레이크포인트 (기존 `md`/`lg` 중 무엇인지).
- A2. 자동 전환 간격(초)과 전환 효과(페이드/슬라이드), hover·포커스 시 일시정지 여부, `prefers-reduced-motion` 처리.
- A3. 세로형 모바일 이미지를 가로로 넓은 카드에 어떻게 맞출지 (object-cover 크롭 / contain 등).
- A4. 데이터 모델: "기본 썸네일 목록 + 모바일 전용 목록(없으면 기본 사용)" 방식 vs PC/모바일 두 목록을 각각 독립 지정하는 방식.
- A5. SEMT 이미지 저장 위치: Vercel Blob 업로드 vs `public/images/projects/semt/` 정적 파일. 원본 크기(최대 3840px, 2MB) 축소 여부.
- A6. 상세 페이지(`work/[id]`) OG 이미지는 어떤 썸네일(첫 번째 PC 썸네일 등)을 쓸지.
- A7. admin 프로젝트 편집 폼에서 PC/모바일 복수 썸네일을 추가·삭제·순서 변경할 수 있어야 하는지.

## 승인 지점

- T02 요구사항 완료 후 사용자 확인 게이트 (A1~A7 결정 포함).
- DB 스키마 변경(마이그레이션)과 운영 DB 데이터(SEMT) 변경은 실행 전 사용자 승인.
- 커밋·병합은 사용자 지시 후 `git-commit` Skill.

## Bug Team 피드백 반영 필수

- 없음. `artifacts/bug-team/postmortem-*.md` 2건에 "Task Team 피드백 초안" 섹션 없음.
