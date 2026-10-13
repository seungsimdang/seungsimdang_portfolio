# 00-input: 포트폴리오 데이터 DB 이전 및 admin CRUD

- 작성일: 2026-10-12
- 작성자: Claude orchestrator (T01, intake만)
- 기준 커밋: `609d242` (develop)

## 사용자 요청 원문

> /Users/leeseunghyun/Documents/GitHub/seungsimdang_portfolio/src/constants/portfolio-data.ts를 현재처럼 하드코딩된 파일 형태가 아니라 db에 저장하고, 별도 admin 페이지에서 추가/수정/삭제 가능하도록 하고싶어. db 스택은 candanta 레퍼런스로 선정하고, admin 페이지는 task team에 위임 후 작업해. admin 페이지 기획 시, 한 프로젝트 내 라우트를 구분하여 구현할건지(그렇다면 인증/인가는 어떻게 할것인지), 아니면 별도 프로젝트로 분리 후 turborepo 등을 활용하여 모노레포 형태로 관리할 것인지 결정 후 보고해.

## 구조화

1. `src/constants/portfolio-data.ts`의 하드코딩 데이터(`profileData`, `projects`, `techTalks`)를 DB로 옮긴다.
2. admin 페이지에서 이 데이터를 추가/수정/삭제한다.
3. DB 스택은 candanta(`/Users/leeseunghyun/Documents/GitHub/candanta`)를 레퍼런스로 정한다.
4. admin 아키텍처를 결정하고 근거와 함께 보고한다.
   - A안: 같은 Next.js 프로젝트 안에서 라우트로 분리 (이 경우 인증/인가 방식 포함)
   - B안: 별도 프로젝트로 분리하고 turborepo 등 모노레포로 관리

## 현재 상태 사실 (orchestrator 확인)

- 앱 의존성은 `next`, `react`, `react-dom`, `pretendard`뿐이다. DB·인증·API 라우트·`src/proxy.ts`가 없다.
- `portfolio-data.ts` 사용처 11곳: `src/app/{page,layout,projects/page,about/page,contact/page,blog/page,work/[id]/page}.tsx`, `src/components/layout/{footer,navbar}.tsx`, `src/components/common/{about-section,hero-section}.tsx`.
- 타입은 `src/types/portfolio.ts`. `ProjectId`가 리터럴 유니언(5개)이라 DB에서 추가하려면 바뀌어야 한다.
- 프로젝트 썸네일은 `public/images/projects/...` 정적 경로다.
- candanta 스택: Neon Postgres(`@neondatabase/serverless`, `drizzle-orm/neon-http`) + Drizzle ORM/drizzle-kit 마이그레이션(`drizzle/`), next-auth v4 Credentials + bcryptjs, zod, `src/proxy.ts`의 `getToken` 기반 보호 경로.
- 배포는 Vercel (main=Production, develop=Preview).

## 모호한 항목

- admin 사용자 수: 본인 1명뿐인지, 여러 명인지
- admin 로그인 방식: 비밀번호(Credentials), GitHub OAuth, 기타
- 이미지(썸네일) 업로드를 admin 범위에 넣을지, URL 입력만 할지
- 공개 페이지 렌더링 방식: 정적 생성 + 수정 시 revalidate, 또는 매 요청 동적 조회
- DB 프로비저닝(Neon 프로젝트·`DATABASE_URL`·Vercel 환경변수)을 누가 하는지
- `profileData`도 편집 대상인지 (요청은 파일 전체로 읽힘)

## 승인 지점

- T02 완료 후 요구사항·아키텍처 결정 보고 및 사용자 승인 (Task Team 게이트)
- 외부 리소스 생성(Neon 프로젝트·브랜치, Vercel 환경변수 설정)은 사용자 승인 후
- 의존성 추가(drizzle, neon, next-auth 등)는 이 저장소의 7일 출시 대기 정책을 따른다
- 커밋·푸시·병합은 사용자 지시 후

## Bug Team 피드백 반영 필수

- 해당 없음 (`artifacts/bug-team/postmortem-*.md` 없음)
