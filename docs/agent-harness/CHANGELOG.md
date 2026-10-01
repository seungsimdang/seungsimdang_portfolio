# 하네스 변경 이력

## 2026-10-01 — Candanta 구조를 참고한 재구축

기존 하네스는 규칙 문서와 단일 실행 안내만 제공했다. 기능·버그·부분 재실행의 실제 절차, 역할별 책임·입출력, 도구별 발견 경로와 인계 계약을 추가했다.

- 공용 원본에서 Claude/Codex의 12개 역할·4개 스킬을 생성한다.
- 기능·버그·일반 인계 산출물을 work-id별로 보존한다.
- 원본과 생성 파일의 정확한 일치를 검사하며 CI·verify에 연결했다. 선택 pre-commit은 staged snapshot을 검사한다.
- Framer 보존 규칙과 현재 Next.js·Tailwind·Playwright 명령에 맞춰 도메인·경로·검사를 조정했다.
- 기존 앱, 디자인 자산·Framer 연결 설정, 사용자 scaffold-web-project 스킬은 보존했다.

실제 실행 결과와 미검증 범위는 artifacts/work/2026-10-01-harness-rebuild/summary.md를 참조한다.

## 2026-10-01 — 역할 설정·Husky 후속 반영

사용자 지적으로 임의 상속을 제거하고 Candanta의 24개 역할 모델·effort를 명시했다. Husky pre-commit/pre-push와 lint-staged·Knip·React Doctor를 연결했다. 신원 기준은 사용자 선택으로 Candanta와 동일하게 적용했다. 기존 em dash는 수정하고 임시 예외를 제거했다. 이름 있는 canonical 클래스 검사는 유지하되 이 앱의 픽셀값과 일반 토큰 이름을 사용했다. 출시 대기 정책의 예외 추가는 자동 승인 검토에서 거부됐으며, 사용자가 7일 정책을 충족한 버전 재조정을 선택했다. 실제 결과는 artifacts/work/2026-10-01-role-models-husky/summary.md에 기록한다.

## 2026-10-01 - 사용자 검토 후 원본 명세 복구

- 1~7 항목을 개별 검토받고 전체 승인 이후 일괄 적용. CLAUDE 진입 문서는 일괄 적용 지시 이전 승인으로 먼저 반영.
- 축약된 공용 역할·스킬 원본을 도구별 전체 템플릿으로 교체. 역할 24개, 스킬 6종의 양쪽 부속 파일 포함 총 56개 생성. 목차·끝 공백만 정리하고 모델·effort·tools·책임·절차·금지사항·산출물 계약 보존.
- src 구조·kebab-case·1px spacing 전환. 이전 화면의 픽셀값 유지를 위해 숫자 spacing 클래스 175개 환산.
- 공용 룰·인계 계약 복구, 앱 전용 framer-design·verification 룰 제거. 디자인 보존·한글 제목·사용자 검토 원칙은 AGENTS.md에 유지.
- Node 테스트를 Vitest 5.0.1·TypeScript로 전환하고 Biome 경로·호출 검출 확대. 런타임 훅의 통과·차단 입력 검증 추가.
- Candanta 도구별 런타임 훅 복구. 동기화 안내는 공용 생성 원본·결과 검사로 연결. 검사기 테스트 경로의 대시 제외는 추가 승인 후 반영.
- README에서 세션 이력을 분리. Tailwind src 탐색, CLAUDE 이력 포인터·인계 다이어그램, ES 모듈 설정은 추가 검토 승인 후 수정.
- semver major 7 강제 override 제거. 사용자가 웹 조사 후 결정을 위임한 충돌에 대해 semver@6.3.1만 trustPolicyExclude로 지정. 7일 정책과 다른 버전·패키지의 신뢰 검사 유지.

결과와 한계는 `artifacts/work/2026-10-01-harness-restore/summary.md` 및 `verification.md` 참조.

경로 별칭 플러그인의 누락을 최종 원본 비교에서 발견해 추가 승인 후 복구했다. 설치 검증에서 TypeScript 7 peer 충돌이 확인되어 별도 승인 후 Vite 내장 `resolve.tsconfigPaths`로 전환했다. 별칭으로 실제 Button 모듈을 import·호출하는 검증을 유지한다.

## 2026-10-01 - 여러 줄 주석 줄바꿈 기준 강제

- SemBr·Google 스타일 가이드 조사 후 "한 줄 한 문장, 문장 중간 줄바꿈 금지, 길이 상한 없음, 블록 주석 `*` 정렬" 기준을 `docs/agent-rules/project-structure.md`에 추가.
- 공용 검사기 `scripts/check-comment-line-breaks.mjs`를 Claude·Codex PreToolUse(Edit|Write) 훅과 lint-staged에 연결. 훅은 편집 범위만 검사해 기존 위반이 무관한 편집을 막지 않음.
- `__tests__/lint/runtime-hooks.test.ts`에 통과·차단 입력 검증 추가. 존재하지 않던 `comment-style.test.ts` 참조를 실제 검사 위치로 정정.
- 사용자 요청으로 검사 범위를 하네스 스크립트(`scripts/`, `.claude/hooks/`, `.codex/hooks/`)와 셸 `#` 주석까지 확대. 기존 훅·스크립트 주석은 문구 유지, 줄바꿈만 한 줄 한 문장으로 일괄 정리.
- 사용자 요청으로 주석 종결어미 규칙을 같은 검사기에 추가해 하네스 스크립트까지 확대. 기존 훅·스크립트 주석의 `~다` 종결을 명사형으로 정리하고, 문장이 중간에 끊겨 있던 `enforce-commit-msg-style.sh`의 "- 커밋 메시지" 조각 제거.

## 2026-10-01 - pre-push에서 빌드·E2E 제외

- 로컬 훅은 빠른 검사만 두고 무거운 검사는 CI에서 최종 판정하는 일반 권장에 맞춰 `.husky/pre-push`에서 `pnpm build`·`pnpm test:e2e` 제거.
- CI가 모든 push에서 같은 빌드·E2E를 이미 실행해 로컬 실행은 중복이었음. 전체 로컬 확인이 필요하면 `pnpm verify` 사용.
