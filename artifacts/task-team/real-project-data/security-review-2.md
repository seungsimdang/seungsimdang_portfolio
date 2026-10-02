# 보안 리뷰 2: real-project-data (T08 2차 재리뷰)

- 범위: (a) security-review-1의 SEC-I2, SEC-F2, SEC-I3 해결 여부 (b) 재작업이 새로 만든 코드의 보안 결함. CSP는 범위 밖(결정됨).
- 대상: next.config.ts, src/app/layout.tsx, src/app/work/[id]/page.tsx, src/components/common/word-cycler.tsx, src/components/common/talk-preview.tsx, src/app/blog/page.tsx, src/app/page.tsx
- 판정: **배포 승인** (Critical 0, High 0, Medium 0, Low 1, Info 3)

## 1. 이전 finding 해결 여부

| ID | 상태 | 근거 |
|----|------|------|
| SEC-I2 dynamicParams | 해결 | `work/[id]/page.tsx:17` `dynamicParams = false`, `:19-21` `generateStaticParams`가 `projects`에서 id 생성. 목록 외 id는 빌드 시점 라우트가 없어 즉시 404. `:114` `notFound()`와 `:28` `{}` 반환은 방어 이중화로 유지됨 |
| SEC-F2 보안 헤더 | 해결(CSP 제외) | `next.config.ts:9-11` X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin. `source: "/:path*"`로 전 경로 적용. 값 오타 없음 |
| SEC-I3 metadata | 해결 | `layout.tsx:12,15-21` metadataBase, canonical, openGraph 추가. `work/[id]/page.tsx:32-39` 상대 canonical/url/images는 metadataBase로 절대화됨. 값은 전부 정적 상수(`profileData`, `projects`)와 allowlist 검증된 id뿐이라 사용자 입력 반영 없음 |

## 2. 신규 코드 점검

- XSS: 대상 7개 파일에 `dangerouslySetInnerHTML`, `innerHTML` 없음. `word-cycler.tsx:53`은 `textContent` 사용(안전). 나머지는 JSX 텍스트 노드.
- 외부 링크: `talk-preview.tsx:45`는 `ExternalLink` 사용(`target=_blank` + `rel="noopener noreferrer"`). href는 `portfolio-data.ts` 상수.
- 시크릿: `layout.tsx:7`이 읽는 `VERCEL_PROJECT_PRODUCTION_URL`은 비밀값이 아닌 공개 도메인이며 `NEXT_PUBLIC_` 없이 서버 모듈에서만 사용. 클라이언트 번들 유출 경로 없음.
- 입력 표면: 신규 입력 처리, API, 쿼리 파라미터 사용 없음.
- 의존성: 신규 패키지 import 없음.

## 3. Findings

### L1. Low: 프로덕션에서 env 누락 시 canonical/OG가 localhost를 가리킴
- 위치: `src/app/layout.tsx:7-9`
- 근거: Vercel 외 환경(자체 호스팅, 로컬 `next build` 배포)이나 env 미제공 시 `http://localhost:3000`이 metadataBase가 되어 canonical, og:image 절대 URL이 localhost로 출력됨. 보안 침해가 아닌 SEO/공유 미리보기 오류이며 정보 노출은 없음(로컬 주소 문자열뿐).
- 수정 제안: 배포 대상이 Vercel임을 확인하면 조치 불필요. 필요 시 `process.env.NODE_ENV === "production"`에서 폴백 대신 빌드 실패(throw)로 처리. 직접 수정하지 않음.

### I1. Info: X-Frame-Options만 설정, `frame-ancestors` 없음
- 위치: `next.config.ts:9`
- 근거: 최신 브라우저는 XFO도 지원하므로 실효상 문제 없음. CSP는 범위 밖 결정에 따라 미검토.

### I2. Info: `mountedIds` 모듈 전역 Set이 다중 인스턴스에서 서로 해제
- 위치: `src/components/common/word-cycler.tsx:12,36-37`
- 근거: effect마다 `mountedIds.clear()` 후 자기 id만 추가하므로 WordCycler가 둘 이상이면 앞선 인스턴스의 순환 타이머가 멈출 수 있음. 보안 영향 없음, 기능 결함 가능성. 타이머 effect(`:81`)가 마운트 시점에 id 존재 여부를 확인하는 구조라 effect 선언 순서에 의존함. 보안 범위 밖이므로 code-reviewer 참고용.

### I3. Info: metadataBase 값이 잘못된 URL이면 빌드 실패
- 위치: `src/app/layout.tsx:7-12`
- 근거: Next.js가 문자열을 `new URL()`로 처리하므로 형식이 잘못된 env는 빌드 시점에 실패(안전하게 실패). 런타임 노출 없음. Vercel 시스템 변수는 호스트명만 제공하므로 `https://` 접두 방식이 정확함.

## 4. 판정
Critical/High/Medium 없음, 인증 로직 없음(정적 공개 사이트). SEC-I2, F2, I3 모두 해결, 재작업이 도입한 신규 보안 결함 없음. **배포 승인.** L1은 비차단(orchestrator 9-1 게이트에서 재작업 여부 별도 판단).
