# 00-input: about 페이지 이력서 기반 재구성 (DB + admin 편집)

- 작성일: 2026-10-13
- 작성자: Claude orchestrator (T01, intake만)
- 기준 커밋: `ceb7b70` (develop), 작업 브랜치 `feature/about-resume`

## 사용자 요청 원문

> about 페이지에서 [소개 문구 + .hello 소개글 스크린샷] 이런 내용들은 빼고 말그대로 나에 대한 이력을 보여주는게 낫지 않을까? [이력서.pdf 스크린샷] 이력서 기반으로 페이지 재구성해봐

후속 지시:

> 1. .stack은 ... 이력서와 통일해
> 2. 섹션 사이 간격 ... 조정해
> 3. develop에서 feature/about-resume 브랜치 ... ㅇㅇ
> 4. B. DB와 관리자 편집: 지금 변경은 되돌리고, Task Team에서 요구사항부터 시작합니다. 이력 스키마, 관리자 편집 화면, 공개 페이지를 한 사이클로 진행합니다. 로 진행해

## 구조화

1. about 페이지에서 소개 문구(`profile.tagline`)와 `.hello` 소개글(`profile.description`), 장식 원을 뺀다.
2. 이력서 내용을 about 페이지에 보여준다: Work Experiences, Education, Community Activities, Award, Certification, Language, Skills, Tools.
3. 이력 데이터는 DB에 저장하고 admin 화면에서 추가/수정/삭제한다.
4. `.stack`(`profile.skills`)을 이력서 Skills 목록과 통일한다.
5. about 섹션 사이 간격을 지금보다 촘촘하게 조정한다.

## 이력서 원문 데이터 (사용자 제공 스크린샷 기준)

- Work Experiences
  - Frontend Developer · 빅웨이브로보틱스, 2026.08 - 현재: 휴머노이드 로봇 공정 현황 모니터링 대시보드 개발 / 물류 운반 로봇 관제 시스템 및 리포트 기능 개발
  - Frontend Developer · 웨이센, 2024.07 - 2026.07: 테스트 자동화 도입으로 배포 프로세스 개선 / 렌더링 성능 최적화로 초기 로딩 시간 42% 단축 / AI 내시경 리포트 생성 시스템 구축 / MCP 기술 동향 분석 및 발표
  - Frontend Developer (Intern) · 웨이센, 2024.02 - 2024.06: AI 호흡기건강 확인서비스 WAYMED Cough 단독 개발
- Education: 동국대학교 학사, 컴퓨터정보통신공학부 컴퓨터공학전공, 졸업 2024.08, 학점 3.73/4.5
- Community Activities: 디프만 코어 (Depromeet Core) 2기 (2025.12 - 현재) / 디프만 (Depromeet) 17기 (2025.08 - 현재) / 9oormthon Univ. 2기 (2024.02 - 2024.08) / 패스트캠퍼스 X 야놀자 프론트엔드 부트캠프 1기 (2023.07 - 2024.01) / 동국대학교 SW코딩역량강화캠프 (2023.07 - 2023.08) / 42 Seoul (2023.01 - 2023.02) / DoDream 학습동아리 (2022.09 - 2022.12)
- Skills: React / Vue.js, TypeScript, Next.js, Vite, Tanstack Query, Emotion / TailwindCSS, Zustand, Playwright
- Tools: Git/Github, Jira, Slack, Notion, Figma
- Certification: 정보처리기사, 2024
- Language: TOEIC SPEAKING, IH(150), 2024
- Award: 국민행복 서비스 발굴 · 창업 경진대회 (사회보장정보원) - 장려상 (한국노인개발원장상)
- 연락처(전화번호, 이메일)는 이력서에 있으나 공개 페이지 노출 여부 미정

참고: 정적 상수로 먼저 구현했다가 되돌린 버전이 orchestrator scratchpad(`about-page-static.tsx`)에 있다. 데이터 전사 참고용.

## 현재 상태 사실 (orchestrator 확인)

- `src/app/(public)/about/page.tsx`는 `getProfile()`의 `tagline`, `description`, `skills`를 렌더한다.
- `profile` 테이블(`src/db/schema/portfolio.ts`)에 `tagline`, `description`, `skills text[]`가 있다. `tagline`·`description`은 홈(`src/components/common/about-section.tsx`) 등 다른 화면에서도 쓰인다.
- 현재 DB의 `profile.skills`: React, Vue 3, TypeScript, Next.js, TanStack Query, Zustand, Pinia, Tailwind CSS, Playwright. 이력서와 비교하면 Pinia가 더 있고 Vite·Emotion이 없다.
- DB에 이미 `experiences` 테이블이 있는데, 이는 **프로젝트 상세의 경험(problem/solution/result)** 용이다. 이력서의 "경력"과 이름이 겹친다.
- admin 콘솔: `src/app/admin/(console)/{profile,projects,talks}`, API: `src/app/api/admin/{profile,projects,talks,project-order,talk-order,uploads}`.
- 프로젝트/토크는 정렬 API(`*-order`)가 있다.

## 모호한 항목

- 이력 데이터 모델: 섹션(경력·학력·활동·수상·자격·어학)마다 테이블을 둘지, 하나의 범용 테이블에 `kind`로 구분할지
- Tools, Certification, Language를 `profile`의 배열 컬럼으로 둘지, 이력 항목으로 둘지
- 기간 표기: 문자열("2024.07 - 2026.07")로 둘지, 시작/종료 날짜 컬럼 + "현재" 처리로 둘지
- 항목 정렬: 수동 정렬(드래그/order API)인지, 기간 기준 자동 정렬인지
- 경력 회사명/직함 표기 순서와 학점 등 세부 항목 노출 여부
- 이력 기술 목록 통일 방식: DB `profile.skills` 값을 이력서 목록으로 갱신(데이터 변경)하는 것으로 충분한지
- `tagline`·`description`은 about에서만 빼고 다른 화면에서는 유지하는지(현재 이해: 유지)
- 전화번호·이메일 노출 여부(현재 이해: 비노출)
- 운영 DB(Neon)에 이력서 데이터를 시드하는 방법과 주체

## 승인 지점

- T02 완료 후 요구사항 보고 및 사용자 승인 (Task Team 게이트)
- DB 마이그레이션 적용과 운영 데이터 시드·`profile.skills` 갱신은 사용자 승인 후
- 커밋·푸시·병합은 사용자 지시 후

## 동시 작업 메모

- 다른 세션(seungsimdang-portfolio-b5)이 `.claude/worktrees/agent-ac122e3580426e161`과 `.claude/worktrees/merge-develop`(임시)을 사용 중이며, develop에 `--no-ff` 병합을 진행 중이다. 병합 중에는 develop을 체크아웃하지 않는다. 완료 후 develop 새 HEAD를 이 브랜치에 병합한다.

## Bug Team 피드백 반영 필수

- 해당 없음 (`artifacts/bug-team/postmortem-*.md` 없음)
