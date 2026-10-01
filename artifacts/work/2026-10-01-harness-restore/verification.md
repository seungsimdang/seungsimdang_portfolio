# 검증 기록

## 기준

- 저장소 HEAD: 3b1c5e9e079a5009997064ddb1375702b45c95f6. 이번 변경은 미커밋 상태.
- 런타임: Node 26.5.1, pnpm 11.18.0, Vitest 5.0.1.
- 로컬 빌드·브라우저 검증은 내부 TCP 포트 생성이 가능한 권한 확장 환경에서 실행.

## 실행 결과

| 검사 | 결과 | 범위·제한 |
| --- | --- | --- |
| pnpm install --frozen-lockfile | 통과 | semver@6.3.1 신뢰 예외만 적용. 7일 정책 유지 |
| 원본 비교 | 56/56 내용 일치 | 추가 목차·끝 공백 제외, TOML 설정은 파싱 후 비교 |
| pnpm harness:check | 통과 | 생성 원본·출력 56개 정확 일치 |
| pnpm harness:test | 통과 | 파일 5개, 테스트 15개. 실제 스크립트·Biome·Tailwind 컴파일 호출 |
| pnpm check | 통과 | 한글 제목 플러그인 포함 |
| pnpm peers check | 통과 | No peer dependency issues found |
| pnpm knip | 통과 | 현재 앱·테스트·스크립트 |
| pnpm type-check | 통과 | Next route 타입 생성 포함 |
| pnpm build | 통과 | Turbopack. src 탐색 적용 후 CSS 경고 없음 |
| pnpm test:e2e | 통과 | 데스크톱·모바일 Chromium 16개 |
| pnpm verify | 통과 | 통합 명령 실제 실행 |
| sh .husky/pre-push | 통과 | 실제 훅의 전체 명령 실행 |
| 독립 Git 저장소 pre-commit | 통과 | 신원·lint-staged·staged 동기화·Knip·Doctor·Vitest. 실제 저장소 인덱스·refs 변경 없음 |
| git diff --check | 통과 | 원본의 끝 공백을 생성 원본에서 정리한 후 재실행 |
| 훅 sh -n | 통과 | 양쪽 쉘 스크립트 구문 |
| Claude 실제 런타임 | 미검증 | 읽기 전용 Git status는 실행됐으나 신뢰 미승인 경고. 프로젝트 훅 debug 항목 없음 |
| Codex 실제 런타임·팀 실행 | 미검증 | 신뢰 승인·도구별 실제 호출 형태 확인 필요. 입력 fixture 통과를 실제 실행으로 대체 보고하지 않음 |

## 화면 비교

`/`, `/projects`, `/about`, `/blog`, `/contact`, `/missing-page`를 1440px·390px 너비, 높이 900px의 Chromium에서 수집했다. CSS 애니메이션·transition은 양쪽 수집에서 동일하게 정지했다. JavaScript 애니메이션의 장시간 전체 프레임을 비교한 결과는 아니다.

- full-page PNG 12쌍: SHA-256과 파일 바이트 동일.
- 수집한 모든 요소의 위치·크기·padding·margin·gap·font-size·border-radius: 차이 0개.
- 기존 픽셀값 보존 비교이며 Framer 원본과의 시각적 일치 검증은 아님.
- Git 제외 로컬 근거: artifacts/archive/2026-10-01-harness-restore/의 전후 PNG, geometry JSON, 클래스 환산 목록, 원본 비교 자료, capture 스크립트와 최종 검증 로그.

## 중간 실패와 조치

- Babel의 semver 6 복원에서 신뢰 정책 실패: 사용자 결정 위임·공식 근거 조사 후 정확한 버전 예외로 해결.
- TypeScript 전환에서 ProcessEnv·readdir 타입 오류: 부분 환경 변수 타입과 UTF-8 인코딩 명시로 해결.
- 하네스 문서의 예시 클래스가 CSS로 생성됨: 사용자 승인 후 Tailwind src 탐색으로 해결.
- Vite의 CommonJS 모듈 형식 경고: 사용자 승인 후 package.json type=module로 해결.
- 통합 검증과 pre-push를 동시에 시작해 포트·Playwright 결과 폴더 충돌: 두 실행을 순차 재실행해 각각 통과. 앱 설정을 완화하지 않음.
- 독립 Git 검증 저장소의 node_modules 심볼릭 링크가 pnpm 설치 상태 검사에서 실패: 독립 저장소에 frozen lockfile 설치 후 pre-commit 통과.

## 최종 재실행

Vite 내장 별칭 전환 후 `pnpm test` 15개, peer·타입·Knip 검사가 통과했다. 이후 `pnpm verify`, 실제 `.husky/pre-push`, 최신 파일을 복사한 독립 Git 저장소 `.husky/pre-commit`을 각각 실행해 종료 코드 0을 확인했다. 통합·pre-push의 E2E는 각각 16개 통과했다. 끝 공백 정리 후 원본 56개 내용 비교와 생성 출력 정확 비교도 통과했다.

최종 Git 인덱스에는 이번 작업을 staging하지 않았고 HEAD도 변경하지 않았다. 코드 복구와 로컬 검증은 완료했으며, 신뢰 승인 환경에서 프로젝트 런타임 훅 실행 확인은 남아 있다.
