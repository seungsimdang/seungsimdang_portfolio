# code-review-2: 사이클 전체 최종 리뷰 (T07 2차)

사이클 전체 최종 리뷰이다. 1차 finding 해결 확인과 `git diff 6fb558e..HEAD` 전체(앱 코드, 스크립트, 설정) 재검토를 겸한다.

- 재작업 커밋: `eb0da8e` (이전 수정 `6545268` 포함)
- 기준: `requirements.md`, `design-spec.md`, `api-spec.md`, `triage-1.md`
- 판정: **통과**. Critical/High/Medium 없음. Low 2건은 후속 처리 가능.

## 1차 finding 해결 확인

| ID | 결과 | 근거 |
| --- | --- | --- |
| M1 뒤로 가기 취소 시 확인창 재노출 | 해결 | `sortable-list.tsx:114-130`, `ignoreNextPopRef`가 `forward()`로 생긴 popstate 1회를 건너뜀 |
| M2 `leavingRef` 고정 | 해결 | `sortable-list.tsx:76-81`, `allowLeaving`이 다음 tick에 복원 |
| M3 본문 위쪽 여백 소실 | 해결 | `admin-console-shell.tsx:61-63`, `paddingTop: headerHeight + 48` + `pb-48` |
| L1 주석의 `F11` | 해결 | `portfolio-service.ts:15`, 사유 문장으로 교체 |
| L2 `aria-describedby` | 해결 | `thumbnail-field.tsx:123-127`, 오류가 있을 때만 error id 포함 |
| L3 종료 코드 | 해결 | `migrate-thumbnails.mjs:84`, 실패 행이면 `exitCode = 1` |
| L4 / 보안 M-1 대상 DB 표시 | 해결 | 두 스크립트가 호스트만 출력, `run-e2e-local.sh`가 `DATABASE_URL`과 같으면 중단 |
| 보안 L-5 `thumbnails/` 접두 | 해결 | `portfolio.schema.ts:24`. 업로드 route(`route.ts:113`)와 이전 스크립트(`migrate-thumbnails.mjs:105`)의 키가 모두 `thumbnails/`로 시작해 정상 업로드 URL이 거부되지 않음 |

triage-1의 "수정 안 함" 판정(보안 M-2, L-1~L-4)은 근거가 타당하다(플랫폼 4.5MB 상한, 인증 뒤 접근, 변경 범위 밖, 명세의 범위 밖 결정).

## `allowLeaving` / `ignoreNextPopRef` 신규 버그 점검

흐름 자체는 맞다. 클릭 확인 통과 시 `leavingRef`가 true가 되고 같은 tick의 `beforeunload`만 건너뛴다. 클라이언트 내비게이션이면 언마운트되거나, 같은 URL이면 다음 tick에 경고가 복원된다. 취소 경로는 `forward()`의 popstate를 1회 무시한다. 아래 두 건만 남는다.

### L1 (Low) `ignoreNextPopRef`가 소비되지 않은 채 남을 수 있음

- 위치: `src/components/admin/sortable-list.tsx:125-126`
- 시나리오: 확인창 취소 후 `forward()`를 호출했는데 popstate가 오기 전에 effect 정리(`dirty`와 `busy`가 모두 false로 바뀌는 경우)가 일어나면 플래그가 true로 남는다. 같은 컴포넌트 인스턴스에서 다시 draft를 만든 뒤 처음 뒤로 가기를 하면 확인창 없이 이탈한다. 취소 직후 사용자가 저장을 끝내야 하므로 발생 가능성은 매우 낮다.
- 수정 제안: effect 정리 함수 또는 effect 시작부에서 `ignoreNextPopRef.current = false`로 초기화.

### L2 (Low) 외부 링크 확인 후 `beforeunload` 경고가 한 번 더 뜰 가능성

- 위치: `src/components/admin/sortable-list.tsx:76-81, 111`
- 시나리오: 같은 탭에서 열리는 외부 도메인 링크(`ExternalLink`가 `_blank`가 아닌 경우)는 클릭 확인 후 전체 페이지 이동이다. 브라우저가 `beforeunload`를 `setTimeout(0)`보다 늦게 발생시키면 `leavingRef`가 이미 false라 브라우저 기본 경고가 한 번 더 뜬다. 데이터 손상은 없고 중복 확인 UX 문제뿐이며, 관리자 화면의 링크는 대부분 `_blank` 또는 내부 경로라 실사용 영향은 작다.
- 수정 제안: 실제 외부 이동이 확인되면 그때만 복원하지 않는 방식(`anchor.origin !== location.origin`이면 `leavingRef`를 유지)을 검토. 재현되지 않으면 그대로 둬도 된다.

## 사이클 전체 최종 점검

- F1-F11 요구사항 대조: 1차 리뷰의 통과 항목에서 변경된 코드가 없고, 재작업 diff(`6545268..HEAD`, 앱 코드 9개 파일)는 위 해결 확인 범위 안에 있다. 새 로직 회귀는 발견하지 못했다.
- 보조 검증은 triage-1 기록(biome, type-check, vitest 130개 통과)을 신뢰했고 코드 재실행은 하지 않았다(읽기 전용).
- 가짜 테스트 점검: `__tests__/schemas/portfolio-schema.test.ts`는 `@/schemas/portfolio.schema`의 `isValidThumbnail`을 실제 import해 검증한다(복사본 아님).
- 서버 HTTP 함수, CSRF, 통화 환산, 캐시 무효화 항목: 이번 diff에서 해당 신규 문제 없음.
- 주석의 사이클 한정 식별자: `src/`, `scripts/`, `tests/`, `__tests__/`, `next.config.ts`, `.github/` 추가 주석에서 F/Q/M/L/AC/BUG/T번호/단계명 인용을 grep으로 찾지 못했다. `portfolio-service.ts:15`의 `F11`도 제거됐다.
- 신규 주석의 종결어미와 em-dash: 재작업에서 추가된 주석은 모두 명사형 종결이고 em-dash가 없다.

## 후속 항목 (이번 사이클 밖)

- triage-1의 기록대로 `migrate-thumbnails.mjs` dry-run 결과 `/images` 썸네일 행이 1개뿐이다. 요구사항의 "5개"와 달라, F11 실제 실행 전에 dry-run 결과를 사용자에게 보고해 재확인한다.

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --base 6fb558e --committed`, 상태 완료(무료 CLI 한도), finding 1건

### 타당 판정 (0건)

해당 없음.

### 기각 (1건)

| 요약 | 기각 사유 |
| --- | --- |
| `artifacts/.../summary.md`에 Vercel 프로젝트·Blob 스토어·Neon 브랜치·엔드포인트 ID가 적혀 있으므로 placeholder로 교체 | 앱 코드가 아닌 사이클 산출물 문서이고, 지적 자체가 "비밀이 아니다"라고 인정하는 식별자다. 이번 코드 리뷰 대상(앱 코드, 스크립트, 설정) 밖이며, 보안상 영향은 보안 리뷰 소관이다. 필요하면 사용자가 문서 공개 범위를 별도로 판단한다. |

CodeRabbit 1건 중 0건 타당.

## 판정

**통과**. Critical/High/Medium 없음. 1차 finding(M1, M2, M3, L1-L3, L4)과 보안 연동 항목(M-1, L-5, I-3)은 모두 해결됐다. 남은 Low 2건(L1, L2)은 선택 후속이다.
