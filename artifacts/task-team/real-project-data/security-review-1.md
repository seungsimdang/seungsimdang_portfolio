# 보안 리뷰 1: real-project-data (T08-security)

- 브랜치: `feature/real-project-data`
- 기준: `artifacts/task-team/real-project-data/requirements.md` (7절 보안, 4절 외부 링크, 10절 U3/U6)
- 범위: 정적 사이트. 백엔드, API, 인증, 사용자 입력 처리 없음 (api-spec 없음)
- 판정: **배포 승인** (Critical 0, High 0, Medium 0, Low 3, Info 3)

## 1. 점검 결과 요약

| 항목 | 결과 | 근거 |
|------|------|------|
| 외부 링크 target=_blank + rel | 통과 | `external-link.tsx:17-18`, `button.tsx:34`(external일 때만 둘 다 부여), `contact/page.tsx:43-44`, `footer.tsx:56-59` 모두 `noopener noreferrer`. `mailto:`는 새 탭 미사용(정상) |
| 동적 라우트 파라미터 | 통과 | `work/[id]/page.tsx:102-103` `projects.find`로 화이트리스트 조회 후 없으면 `notFound()`. `generateMetadata`(25-26행)도 미존재 id에서 `{}` 반환. id는 파일시스템, URL, HTML 어디에도 보간되지 않음 |
| XSS 경로 | 통과 | `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `<img>`, `document.write` 0건(src 전체 grep). 모든 텍스트는 JSX 텍스트 노드로 이스케이프 렌더링. `whitespace-pre-line`은 CSS 줄바꿈만 처리 |
| URL 출처 | 통과 | 외부 href는 전부 `portfolio-data.ts` 상수(`project.link`, `experience.links`, `techTalks.link`, `github`). 사용자 입력, 쿼리스트링, 로컬스토리지에서 URL을 만들지 않음. `javascript:` 스킴 주입 경로 없음 |
| 입력 표면 | 없음 | 연락 폼 삭제(U6). `console.log` 목 제출 잔존 없음. CSRF 해당 없음 |
| 시크릿 | 통과 | `process.env`, `NEXT_PUBLIC_*` 실제 사용 0건. `portfolio-data.ts:176`의 문자열은 포트폴리오 설명 텍스트일 뿐 코드 참조 아님. API 키, 토큰 패턴 없음 |
| 개인정보 | 범위 내 | 공개되는 개인정보는 `profileData.email`, `github`, `name` 뿐이며 요구사항 2절 이식 대상(원본 `profileData` 필드)과 일치. 전화번호, 주소, 생년, 프로필 사진 없음. 가짜 SNS 핸들 삭제 확인 |
| 이미지 원격 소스 | 통과 | `next.config.ts` 비어 있음(`images.remotePatterns` 없음). `ProjectCard`의 `<Image src>`는 로컬 `/images/projects/globber/thumbnail.png`만 사용. `public/`에는 해당 파일 1개뿐(미참조 기본 svg 삭제됨). 원격 호스트 허용이 없어 이미지 최적화 SSRF/남용 표면 없음 |
| 메타데이터 | 통과(개선 여지 Info) | `layout.tsx:7-10`, `work/[id]/page.tsx:27-30` 모두 정적 상수 기반. 사용자 입력 반영 없음 |

## 2. Findings

### F1. Low: 이메일 주소 평문 공개로 스팸 수집 가능
- 위치: `src/app/contact/page.tsx:28,32`, `src/components/layout/footer.tsx:11`, `src/constants/portfolio-data.ts:10`
- 근거: `oak20005@naver.com`이 `mailto:` 링크와 텍스트로 정적 HTML에 그대로 포함됨.
- 영향: 크롤러 수집으로 스팸 유입 가능. 단, 값은 원본 데이터 `profileData.email`이고 사용자가 contact 용도로 공개를 의도했으므로 범위 초과 아님.
- 수정 제안: 조치 불필요(의도된 공개). 스팸이 문제되면 별도 연락용 주소 사용 또는 난독화를 사용자가 판단.

### F2. Low: 보안 응답 헤더 미설정
- 위치: `next.config.ts:3-5`
- 근거: `headers()` 설정이 없어 CSP, X-Frame-Options(또는 `frame-ancestors`), `Referrer-Policy`, `X-Content-Type-Options`가 없음. 호스팅(Vercel 등) 기본값에만 의존.
- 영향: 클릭재킹 가능(정적 포트폴리오라 피해는 제한적). 현재 XSS 싱크가 없어 CSP 부재의 실질 위험은 낮음.
- 수정 제안: 이번 변경 범위 밖. 후속에서 `next.config.ts`의 `headers()`로 `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` 추가 검토.

### F3. Low: 클라이언트 프로젝트 내부 구현 정보가 콘텐츠로 공개
- 위치: `src/constants/portfolio-data.ts:140-142`(토큰 저장 방식 localStorage에서 Cookie로, set-cookie Route Handler), `:176-178`(`/api/config` 런타임 설정 엔드포인트, `NEXT_PUBLIC_IMAGE_BASE_URL`), `:303`(KBHC Web Console 프로젝트명, QA 절감 수치), `:140` 등 의료기기 제품 관리 시스템 설명
- 근거: 재직 중 프로젝트의 아키텍처 세부가 상세 페이지와 `/blog`에 노출됨. 비밀값(키, URL, 도메인)은 없으며 일반적 설계 설명 수준.
- 영향: 고용주/고객사 NDA 위반 가능성, 해당 시스템 공격자에게 정찰 힌트. 코드 취약점이 아니라 콘텐츠 거버넌스 문제.
- 수정 제안: 원본 데이터 이식이 요구사항이므로 차단 사유 아님. 사용자가 공개 허용 범위(특히 SEMT 인증/설정 엔드포인트 서술, KBHC 명칭)를 소속 회사 기준으로 한 번 확인할 것을 권고.

### I1. Info: Google Drive 공유 링크 2건
- 위치: `src/constants/portfolio-data.ts:295,306` (techTalks.link)
- 근거: `usp=sharing` 링크는 "링크가 있는 모든 사용자" 권한일 가능성이 있고 사내 세미나 자료로 보임. 외부 링크 속성은 `ExternalLink`로 적정.
- 수정 제안: 슬라이드 내용에 사내 기밀이 없는지, 공개 권한이 의도된 것인지 사용자 확인.

### I2. Info: `generateStaticParams` 외 id도 on-demand 렌더 후 404
- 위치: `src/app/work/[id]/page.tsx:17-19,103`
- 근거: `dynamicParams` 기본값 true라 미등록 id 요청이 서버 렌더를 거쳐 `notFound()` 처리됨. 동작은 안전(404 반환, 입력 반영 없음).
- 수정 제안: 선택 사항. `export const dynamicParams = false;`로 빌드 시 5개 외 경로를 즉시 404 처리하면 서버 작업을 줄일 수 있음.

### I3. Info: 메타데이터에 canonical, OpenGraph, `metadataBase` 없음
- 위치: `src/app/layout.tsx:7-10`
- 근거: 보안 이슈 아님. 링크 공유 시 미리보기와 정규 URL이 비어 있음.
- 수정 제안: 필요 시 후속에서 추가.

## 3. 의존성
- 이번 변경에서 신규 의존성 추가 없음(검토 파일에 신규 import 패키지 없음, `next/image`, `next/link`, `next/navigation`만 사용). 취약점 스캔(`npm audit`)은 실행 권한 범위 밖이라 수행하지 않았음.

## 4. 판정
- Critical/High 없음. 인증 로직은 존재하지 않으며(정적 공개 사이트) 차단 조건에 해당하지 않음.
- **배포 승인.** Low 3건과 Info 3건은 비차단이며, orchestrator의 9-1 게이트 재검토에서 재작업 여부를 별도 판단하도록 모두 기록함.
- 권고 확인(사용자): F3(재직 프로젝트 공개 범위), I1(Drive 공유 권한).
