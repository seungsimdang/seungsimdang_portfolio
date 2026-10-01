# Candanta 하네스 명세 복구 결과

## 적용 범위

사용자가 1~7 항목을 하나씩 검토하고 전체 승인한 후 일괄 반영했다. CLAUDE 진입 문서는 일괄 적용 지시 이전 승인으로 먼저 반영됐다. 이후 발견한 Tailwind 탐색 범위, 검사기 테스트의 대시 제외, 잘못된 문서 참조, ES 모듈 설정, 별칭 플러그인 복구 및 Vite 내장 기능 전환도 각각 승인받았다. 커밋·푸시·병합·배포는 수행하지 않았다.

## 완료 내용

| 항목 | 결과 |
| --- | --- |
| 진입 문서 | CLAUDE의 공용 규칙 import와 도구별 라우팅 복구. 이력은 실제 공용 문서 참조 |
| 역할 | Claude 12개·Codex 12개. 원본 모델·effort·Claude tools와 전체 본문 보존 |
| 스킬 | 도구별 6종·전체 부속 파일 복구. 총 생성 대상 56개 파일 |
| 생성 구조 | 공용 manifest 유지. 축약 본문 대신 전체 도구별 템플릿을 원본으로 관리. 생성 원본과 출력 정확 비교 |
| 서식 | 목차 추가·끝 공백 정리. 원본 대비 실질적인 절차·설정·조건 생략 없음 |
| 앱 구조 | src/app, src/components/{common,layout,ui}로 이동. kebab-case와 @/* → src/* 적용 |
| spacing | --spacing: 1px 적용. 숫자 클래스 175개 환산. 변경 전후 화면 비교 완료 |
| 룰·계약 | 원본 8개 룰·공용 인계 계약 복구. project-structure의 프로젝트 소개와 앱·컴포넌트 경로는 실제 구성으로 조정. 기존 Framer 전용·verification 룰 삭제 |
| 테스트 | Node 내장 테스트 4개 파일을 Vitest·TypeScript로 전환. 추가 런타임 훅 검증 포함 5개 파일·15개 테스트 |
| 제목 검사 | Biome에 __tests__ 경로 포함. test·it·describe와 별칭·네임스페이스 호출 검증 |
| 런타임 훅 | Candanta 도구별 훅·등록 구조 복구. 생성 구조에 맞춘 동기화 안내, 검사기 테스트 경로 제외 적용 |
| Husky | 작성자 기준 유지. staged·전체 검사 연결. 독립 Git 저장소 pre-commit과 실제 pre-push 검증 |
| README | 실제 구조·명령 갱신. Framer 참조 유지. 세션 이력·ignore 변경 경과·EPERM 복구 기록은 사용 안내에서 분리 |
| 의존성 | Context7 문서와 배포 날짜 확인 후 Vitest 5.0.1 적용. 5.0.3은 7일 미충족. Babel semver 7 override 제거 |
| 사용자 설정 | artifacts/work ignore 재추가 없음. archive·scaffolding·worktrees ignore 및 Framer MCP 파일 변경 없음 |

## 원본 대비 차이와 이유

- 원본 본문을 공통 최소 형식으로 축약하지 않았다. 역할·스킬·부속 파일은 목차와 공백만 정리했다. 공용 생성 원본과 출력은 바이트 단위로 같다.
- 실제 프로젝트 소개·앱 경로만 project-structure에서 조정했다. 원본의 다른 기술·도메인 규칙은 보존했으며, 해당 규칙 복구를 인증·DB·외부 API 기능 구현으로 보고하지 않는다.
- 원본의 양쪽 수정 안내 대신 현재 생성 원본·결과 비교를 호출한다. 안내는 차단이 아니며 커밋 차단은 staged snapshot 검사 담당이다.
- pre-push는 이 앱의 타입·Biome·Vitest·빌드·E2E를 단일 실행으로 검사한다. 원본 인증 테스트, watch, 테스트 없음도 성공 옵션은 제외했다.
- Vitest 설정은 원본 Node 환경·include·globals 구조를 따르며 worktree 제외를 추가했다. 원본의 vite-tsconfig-paths 누락을 발견해 추가 승인 후 복구했다. 설치 검증에서 tsconfck와 TypeScript 7 peer 충돌 및 Vite 내장 기능 안내가 나와, 다시 승인받고 resolve.tsconfigPaths: true로 전환했다. 별칭으로 실제 앱 모듈을 import해 호출하는 테스트를 추가했다.
- 대시 훅은 승인한 __tests__/lint만 제외한다. 다른 테스트·앱 소스는 차단 대상이다. Tailwind 클래스 탐색도 승인 후 src로 한정했다.
- ES 모듈 설정, CLAUDE 이력 포인터·인계 다이어그램 수정은 추가 승인 항목이다.

## semver 신뢰 예외의 결정

semver 6 복원 시 pnpm이 6.3.1을 ERR_PNPM_TRUST_DOWNGRADE로 차단했다. 사용자는 이에 대해 “best practice 웹 서치 후 결정해”라고 결정 권한을 위임했다. 조사 결과 Babel의 호환 범위를 유지하고 정확한 semver@6.3.1만 trustPolicyExclude로 두는 방법을 선택했다. 7일 정책과 다른 버전·패키지의 no-downgrade는 유지한다. 해당 버전의 provenance 하락 검사는 생략되는 제한이 있다.

- [pnpm 공식 설정](https://pnpm.io/settings/dependency-resolution#trustpolicyexclude): 정확한 버전 예외 지원.
- [pnpm 공식 저장소 이슈](https://github.com/pnpm/pnpm/issues/10202): semver 6·7 교차 배포 날짜·provenance 비교 충돌.
- [semver 보안 공지](https://github.com/advisories/GHSA-c2qf-rxjj-qqgw): 6.3.1은 ReDoS 수정 버전. 더 낮은 6 계열로 되돌리는 대안 제외.

## 검증 결과와 한계

명령·화면·원본 비교의 상세 결과는 verification.md에 기록한다. 실제 앱 변경 전후 12개 화면의 PNG와 수집한 계산 스타일·위치는 동일했다. Framer 원본과의 비교를 수행한 결과는 아니다.

훅은 실제 스크립트에 입력을 전달해 통과·차단을 검증했다. Claude CLI의 읽기 전용 실행에서는 프로젝트 신뢰 미승인 경고가 나왔고 프로젝트 훅 파일 실행을 확인하지 못했다. 신뢰 설정을 임의 변경하지 않았다. Codex 실제 런타임 훅과 전체 Agent Team 흐름은 미검증이다. 원본 복구·입력 검증과 실제 런타임 활성화를 구분한다.

Vitest 플러그인은 확인한 직접 호출·별칭·네임스페이스 형태에 한해 검증했다. test.each 같은 고차 호출, 외부 재수출·래퍼의 모든 형태를 지원한다고 보장하지 않는다. 사용자 승인·판단·발언 전체를 훅으로 강제할 수 있다고 보고하지 않는다.
