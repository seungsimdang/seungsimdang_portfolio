# 역할 설정·Husky 후속 작업

- 작성일: 2026-10-01
- 작성자: Codex, 단일 실행
- 레퍼런스: /Users/leeseunghyun/Documents/GitHub/candanta
- 범위: 사용자 요청에 따른 역할 모델·effort, Git 검사, 기존 소스 위반 수정, 일반 토큰 이름, 의존성 출시 대기 정책
- 최초 구성 기록은 로컬 artifacts/scaffolding/summary.md에 당시 상태로 보존한다. 사용자 요청에 따라 Git 추적에서 제외했다.

## 반영 내용

Candanta의 Codex 12개 TOML과 Claude 12개 역할 frontmatter를 읽고 model·effort의 값을 비교했다. Codex는 모두 gpt-6-luna이며 bug-localizer·security-reviewer는 xhigh, bug-reporter·postmortem-agent는 medium, 나머지는 high다. Claude는 bug-reporter·devops-engineer·postmortem-agent가 haiku이며 effort는 레퍼런스처럼 미명시다. 나머지는 sonnet/medium이다. 원본 manifest와 32개 생성 파일은 일치한다. 생성기가 Codex 필수 model·effort 및 Claude model 누락을 실패 처리한다.

Husky prepare가 .husky/_를 활성화한다. pre-commit은 작성자, lint-staged, staged snapshot 동기화, Knip, React Doctor staged, 소스·하네스 회귀 검사를 순서대로 수행한다. pre-push는 타입·정적·하네스·빌드·E2E를 수행한다. 레퍼런스의 인증·거래 규칙은 이 앱에 없어 추가하지 않았다. Vitest 호출은 실제 Node test runner와 Playwright 명령으로 대체했다. 런타임 Stop 승인·보고 훅은 설치하지 않았다.

사용자가 선택한 신원은 SeungHyun Lee <oak20005@naver.com>이다. 로컬 Git 설정과 재작성한 커밋의 author·committer에 반영했다. 훅은 설정과 실제 author ident를 모두 검사한다. 기존 커밋의 메타데이터 수정은 관리 하네스 도입 이전 HEAD/index에 관리 파일이 없을 때만 snapshot 검사의 대상에서 제외한다. 도입 후 전체 삭제·생성기 누락은 실패한다. React Doctor는 staged JS·TS·CSS·JSON·YAML 변경이 없으면 적용 대상 없음으로 종료한다. 검사를 비활성화하는 환경변수를 사용하지 않았다.

제품 소스의 기존 em dash 6개를 하이픈으로 바꾸고 baseline 예외를 제거했다. 반복 페이지 헤더를 PageHeader로 추출하고 transition-all을 실제 변경 속성으로 한정했다. WordCycler의 2초 주기 타이머와 0.3초 애니메이션 타이머는 각 effect에서 해제한다. 재귀 timeout이 주기를 늘리지 않도록 원래 interval 방식을 유지했다.

Framer 이름이 들어간 스타일 토큰은 content·heading·header·project-info로 바꾸었다. 1920px·1200px·92px·200px 값은 유지한다. canonical 클래스 검사는 실제 Tailwind 컴파일 결과, 대응 arbitrary 클래스의 사용 금지와 기본 radius 토큰을 검사한다. README의 Framer 연동 섹션과 디자인 자산은 보존했다.

## 의존성 정책

36개 출시 대기 예외 추가 요청은 자동 승인 검토에서 거부되어 실행되지 않았다. 사용자가 선택한 해결책은 7일 정책 유지와 충족 버전 재조정이다. minimumReleaseAge는 10080, trustPolicy는 no-downgrade이며 minimumReleaseAgeExclude는 모두 제거했다. 기존 lockfile을 임시 백업한 뒤 새로 해석했다. 직접 의존성은 정확한 버전으로 고정했다.

| 패키지 | 이전 → 적용 |
| --- | --- |
| Next.js | 16.3.8 → 16.3.6 |
| Biome | 2.5.15 → 2.5.14 |
| @types/node | 26.6.3 → 26.6.2 |
| Knip | 6.39.0 → 6.38.0 |
| lint-staged | 17.6.0 → 17.5.1 |
| React·React DOM·React 타입 | 19.3.0 유지 |
| Tailwind·PostCSS | 4.3.3 유지 |
| Playwright | 1.63.0 유지 |
| TypeScript | 7.0.2 유지 |
| Husky·React Doctor | 9.1.7·0.9.14 유지 |

선택 근거는 npm registry의 배포 시각·engines·peerDependencies다. 조회 기준의 7일 cutoff는 2026-09-24T06:22:16.229137+00:00이다. lint-staged 17.5.1의 Node 조건에 맞춰 앱 engines도 >=22.22.1로 맞췄다. 로컬은 Node 26.5.1, CI 설정은 Node 24다.

기본 Babel 전이 의존성 semver 6.3.1은 no-downgrade 정책에 차단됐다. @babel/core와 @babel/helper-compilation-targets의 사용처만 semver 7.8.5로 override했다. 출처·대기 정책을 완화하거나 예외 처리하지 않았다. 설치와 Babel 기본 transform은 통과했지만 원래 semver 6 범위를 7로 바꾼 호환성 위험은 남는다. 모든 Babel 입력과 외부 플러그인의 호환성을 검증하지 않았다.

## 실제 검증

| 명령·대상 | 결과 |
| --- | --- |
| pnpm install / pnpm install --frozen-lockfile | 성공 |
| Candanta 역할 model·effort 직접 비교 | 24개 값 일치, 따옴표만 정규화 |
| pnpm harness:check | 32개 파일, 차이 0 |
| pnpm harness:test | 4건 통과: 필수 설정, drift, 부분 staging, 생성기 누락, 도입 후 삭제, 신원·소스 규칙 |
| pnpm knip / pnpm check / pnpm type-check | 통과 |
| 전체 React Doctor, --blocking warning | 25개 파일, 문제 0건 |
| Babel 기본 transform / semver 버전 확인 | 통과, 7.8.5 사용 |
| 기본 pnpm verify 및 직접 Turbopack 빌드 | 포트 생성 EPERM으로 빌드 단계 실패 |
| pnpm exec next build --webpack | 성공, 정적 페이지 생성 |
| pnpm test:e2e, Webpack 빌드 사용 | 데스크톱·모바일 16건 통과 |
| 커밋 재작성의 실제 pre-commit | 정상 실행, 통과 |

Turbopack 오류는 권한 요청 후에도 동일했다. 기본 build·verify·pre-push 명령을 Webpack으로 변경하지 않았다. pre-push 전체 체인은 통과로 보고하지 않는다. CI 원격 실행, Claude/Codex 역할 런타임 발견·실제 팀 실행, Framer 원본의 화면 비교는 미검증이다. 브라우저 테스트가 원본 디자인과의 시각적 일치를 증명하지 않는다.

## Git 범위

사용자 요청으로 최초 커밋 메시지를 chore: 프로젝트 스캐폴딩 및 작업 하네스 구성으로 수정하고 author·committer를 기준 신원으로 바꿨다. 첫 재작성 a19e384는 원본 7cf1ffb와 tree·parent가 동일했다. 후속 요청의 artifacts/archive, .claude/worktrees, .codex/worktrees ignore 규칙은 그 커밋에 별도로 반영했다. 세 경로에는 Git 추적 항목이 없어 제거할 index 캐시가 없었다. 이번 후속 하네스·의존성·소스 변경은 해당 재작성에 포함하지 않았고 미커밋 상태로 남긴다. 푸시하지 않았다.

추가 사용자 요청으로 artifacts/scaffolding도 ignore 처리했다. 추적 중인 summary.md 한 파일은 git rm --cached로 인덱스에서 제거하고 로컬 파일은 보존했다. 최종 재작성 커밋은 0e198afc2436a12209a6a0826c11ebc1d3bcfaaf다. 원본 7cf1ffb와의 tree 차이는 .gitignore 6줄 추가와 해당 summary.md 제외뿐이다. 네 경로 모두 ignore 적용 및 추적 항목 0건을 확인했다.

## 후속 제목 규칙·기록 제외

테스트 설명을 모두 한글로 변경하고 Biome GritQL 플러그인에 연결했다. 별도 test:titles 스크립트와 추가했던 @babel/parser 직접 의존성은 제거했다. 18개 fixture로 한글·영문·혼합·경로 템플릿·동적 제목·describe·skip·별칭·기본·namespace import 및 일반 helper 호출의 결과를 확인했고 하네스 5건이 통과했다. 실제 에디터 화면은 확인하지 않았다. 사용자 정의 wrapper·재수출과 런타임 문자열의 의미는 완전히 판정하지 못한다.

사용자 요청으로 artifacts/work도 Git에서 제외했다. 최종 커밋은 23d1679이며 작업 경로에는 추적 파일이 없었다. Git에서 제외되는 README에 대한 필수 참조는 docs/agent-contracts/handoff.md로 옮겼다. 공용 계약을 보존하고 작업별 기록은 로컬에 둔다. README 디렉터리 구조를 실제 폴더별로 정렬했다. 후속 하네스·정책·소스 변경은 미커밋 상태다.

최신 사용자 정정: artifacts/work ignore 규칙은 사용자가 직접 제거했다. 이를 누락으로 판단해 재추가한 변경은 되돌리고 사용자 제거 상태를 유지한다. artifacts/work 기록의 Git 추적 상태는 실제 index 기준으로 판단한다.

최종 재작성 커밋은 573dbe9다. author·committer는 모두 SeungHyun Lee <oak20005@naver.com>이며 artifacts/work ignore 규칙이 없는 HEAD와 사용자 작업 파일 상태를 확인했다. archive·scaffolding·Claude/Codex worktrees의 ignore는 유지한다. 해당 네 경로의 Git 추적 항목은 0건이며 scaffolding 파일은 로컬에 보존했다. 마지막 커밋 훅과 하네스 5건, Biome·동기화·타입 검사 및 한글 제목으로 실행한 E2E 16건이 통과했다. 후속 하네스·README·제목 변경은 미커밋이며 푸시하지 않았다.

## 최신 후속 검증: 프로덕션 빌드 경로 변경

위 기본 빌드·pre-push 미완료 기록 이후 남은 검증을 재실행했다. 권한 확장으로도 Turbopack 포트 생성 EPERM이 재현되어 build를 next build --webpack으로 명시하고 build:turbopack을 별도로 보존했다. 개발 서버 설정과 검사·출시 대기 정책은 유지했다. 변경 이유를 사용자에게 먼저 보고하고 README와 검증 규칙에 반영했다.

pnpm verify 및 실제 sh .husky/pre-push가 각각 종료 코드 0으로 완료했다. 하네스 32파일 차이 0개, 회귀 5건·E2E 16건 통과, 전체 React Doctor 26파일 문제 0건이다. 빌더 변경은 Turbopack 권한 오류 자체의 해결이 아니다. 상세 기록은 artifacts/bug-team/2026-10-01-production-build/verification.md다. 이번 변경은 미커밋이며 푸시하지 않았다. 사용자 제거 상태의 artifacts/work ignore 규칙은 유지했다.

## 최신 정정: Turbopack 권한 재검증 완료

위 Webpack 전환은 철회했다. 기본 샌드박스의 Python 최소 TCP bind/listen도 EPERM으로 실패하지만 권한 확장 실행에서는 성공했다. Node 직접 실행·pnpm 실행·.next 제거 후 Turbopack 빌드가 통과했다. 기본 build를 next build로 복구하고 임시 build:turbopack을 제거했다.

권한 확장 실행의 pnpm verify와 실제 pre-push 전체는 각각 종료 코드 0, 하네스 5건·E2E 16건 통과다. 영구 샌드박스 설정은 바꾸지 않았으며 기본 제한 환경에서는 포트 거부가 계속된다. 이전 권한 확장 실패의 정확한 차이는 확인하지 못했다. 상세 근거는 artifacts/bug-team/2026-10-01-production-build/verification-2.md다. 변경은 미커밋이며 푸시하지 않았다.
