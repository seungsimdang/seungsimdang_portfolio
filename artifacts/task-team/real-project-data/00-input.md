# 00-input: 실제 포트폴리오 데이터 반영

- 작업 브랜치: `feature/real-project-data` (`develop`에서 분기, `develop`은 이번 사이클 시작 시 `main` 7c6beb9에서 로컬 생성)
- 데이터 원본: `/Users/leeseunghyun/Documents/GitHub/seungsimdang_portfolio_temp/lib/portfolio-data.ts`
- 썸네일 원본: `/Users/leeseunghyun/Documents/GitHub/seungsimdang_portfolio_temp/public/images/projects/`

## 사용자 요청 원문

> 기존 포트폴리오 내용 참고하여서 현재 존재하는 5개 프로젝트 더미 데이터를 실제 프로젝트 내용으로 변경해줘.

이후 대화에서 한 사이클 범위를 아래 4개로 확정했다.

1. 프로젝트 데이터를 공용 모듈로 추출하고 실제 5개 프로젝트(Globber, DPM Core, SEMT, Endo Admin, Endo Report)로 교체. `src/app/page.tsx`, `src/app/projects/page.tsx`의 더미 배열을 대체한다.
2. projects 페이지의 가짜 clients 섹션(Google, Meta 등)과 영어 소개 문구 정리
3. `/work/[id]` 프로젝트 상세 페이지 구현 (원본의 `experiences` 데이터 활용)
4. about, hero, contact 더미 문구를 원본 `profileData` 기준으로 교체
5. 사이클 진행 중 추가 요청 원문: "그리고 기존 목데이터 관련 내용들은 모두 삭제해". 실제 데이터로 대체되지 않는 목데이터(가짜 고객사·경력·도구·블로그 글 등)는 사이트 전체에서 남기지 않는다.

## Bug Team 피드백 반영 필수

없음 (`artifacts/bug-team/postmortem-*.md` 없음)

## 모호한 항목

- 5개 선정: 원본 9개 중 최신순 상위 5개로 사용자가 확인함. 나머지 4개(KBHC, Waymed Cough, 기억해봄, Yanabada)는 제외.
- 썸네일: 5개 중 원본 썸네일이 있는 건 Globber뿐이다. 카드 표현 방식(색 배경 유지 vs 이미지)을 정해야 한다.
- 카드의 `category` 필드: 원본에 대응 필드가 없다.
- about 페이지 경력(experience) 섹션: 원본에는 회사 경력 목록이 없다. 프로젝트 기간으로 대체할지, 섹션을 뺄지 정해야 한다.
- about 페이지 tools 섹션: 원본 `profileData.skills`로 대체 가능.
- 사이트 언어: 현재 UI 문구는 영어, 원본 데이터는 한국어다.
- blog 페이지·blog-preview: 5번 요청으로 목데이터 삭제 대상이 됨. 원본 `techTalks` 데이터로 대체할지, 섹션 자체를 없앨지 정해야 한다.
- "목데이터 관련 내용"의 범위: 데이터 배열뿐 아니라 그 데이터를 위해서만 존재하는 섹션·컴포넌트·이미지(예: `public/*.svg` 기본 에셋)까지 포함하는지 확인 필요.

## 승인 지점

- T02 요구사항 완료 후 사용자 승인 게이트
- `develop`/`feature` 브랜치 병합은 사용자 지시 시에만
