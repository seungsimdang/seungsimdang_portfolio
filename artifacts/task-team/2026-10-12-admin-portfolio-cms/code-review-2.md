# code-review-2: 2차 재리뷰 (재작업 diff `6cb0d0c..9c4f584` 한정)

CodeRabbit: 재작업 재리뷰 지시에 따라 생략 (미실행, 사유: 재작업 재리뷰는 자체 리뷰만 수행).

## 판정: 통과 (Critical/High 없음, 신규 Low 2건은 후속 처리 가능)

## 이전 finding 해결 여부

| ID | 결과 | 근거 |
| --- | --- | --- |
| CR1-02 | 해결 | `work/[id]/page.tsx` generateStaticParams의 try/catch와 주석 제거, 루트 layout의 DB 필수 정책과 일치 |
| CR1-03 | 해결 | `PortfolioNotSeededError` -> `apiErrors.notSeeded()` (409 `NOT_SEEDED`), `ApiErrorCode` 유니온과 `describeFailure` 분기까지 3곳 모두 갱신 |
| CR1-04 | 해결 | reorderProjects/reorderTalks 위에 경합 한계와 운영 전제 주석 명시 |
| CR1-05 | 해결 | 수정키/비주 버튼, download, `#` 앵커 제외 및 뒤로가기/router.push 한계 주석 추가 |
| CR1-06 | 해결 | projects/talks 모두 `?deleted=1` + 고정 문구로 교체, 폼의 push 경로도 일치 |
| SEC-002 | 해결(아래 CR2-01 참고) | x-forwarded-host 제거 |
| SEC-004 | 해결(아래 CR2-02 참고) | 읽기 매핑에서 http/https만 통과 |
| SEC-001 | 해결 | `next.config.ts`에 HSTS와 admin CSP(frame-ancestors 등) 추가 |

## 신규 finding

### CR2-01 Low - isSameOrigin이 NEXTAUTH_URL 호스트에 고정되어 Preview/별칭 호스트에서 admin 변경 요청이 모두 403이 될 수 있음
- 파일: `src/lib/auth/admin-route.ts:26-28`
- 근거: `NEXTAUTH_URL`이 설정되면 요청의 실제 호스트 대신 그 값과만 비교함. develop Preview 배포(Vercel 임시 URL)나 www/apex 별칭 접속 시 브라우저 Origin이 설정값과 달라져 쓰기가 거부됨. 보안상 fail-closed라 취약점은 아니며 운영 편의 문제.
- 제안: Preview에서 admin을 쓰지 않는 전제라면 현행 유지하고 그 전제를 주석/문서에 한 줄 명시. 쓴다면 `host` 헤더와 비교하는 기존 폴백을 우선하고 NEXTAUTH_URL은 보조로 둠.

### CR2-02 Low - 읽기 시점 safeHttpUrl이 관리 폼의 로드 값에도 적용되어 비http 링크가 저장 시 조용히 삭제됨
- 파일: `src/services/portfolio/portfolio-service.ts:26-36,64,79`, `portfolio-admin-service.ts:209,228`(toTalk 재사용), `talk-form.tsx:36`, `project-form.tsx:47`
- 근거: 관리 화면도 `toProject`/`toTalk`/`toExperience`를 거쳐 값을 읽으므로 DB에 과거 비http 링크(쓰기 검증 도입 전 seed 등)가 있으면 폼에 빈 값으로 보이고, 다른 필드만 수정해 저장하면 해당 링크가 null로 덮임. 쓰기 스키마가 http/https만 허용하므로 현재 신규 데이터 경로에서는 발생하지 않고 seed 데이터도 https 가정이라 실영향은 낮음. 참고로 `TechTalk.link` optional 전환 영향은 `TalkPreview`(조건부 렌더), 관리 폼(`?? ""`)에서 모두 안전하게 처리됨. `link` DB 컬럼은 NOT NULL이므로 비http일 때만 undefined가 됨.
- 제안: 허용 가능하면 현행 유지(방어적 읽기가 목적). 엄밀히 하려면 safeHttpUrl 적용을 공개 매핑에만 두고 관리 조회는 원본을 반환.

## 확인 항목 (문제 없음)
- NOT_SEEDED: 409 선택은 SLUG_CONFLICT/ORDER_MISMATCH와 같은 상태이나 코드로 구분되어 클라이언트 분기 정상.
- 이탈 가드 조건: `event.button !== 0`로 중클릭/우클릭 제외, 수정키 제외, `#` 시작 href 제외. `/path#hash` 같은 동일 페이지 해시 이동은 여전히 확인창이 뜨나 허용 범위.
- 주석: 명사형 종결(`~함`) 준수, 변경 파일 내 em-dash 없음, 사이클 한정 식별자(CR/SEC/BUG ID 등) 인용 없음. 주석 한 줄이 한 문장 규칙도 준수.
- Tailwind 위반 없음(해당 diff에 스타일 변경 없음).
