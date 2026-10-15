# Candanta 프로젝트 등록 기록

작성일: 2026-10-15

## 반영 내용

- 공개 주소: https://seungsimdang.vercel.app/work/candanta
- 등록 데이터: `project.json`. 운영 DB에 신규 프로젝트 1개와 상세 경험 4개를 등록함.
- 기존 프로젝트의 순서를 유지하고 마지막 순번 5에 추가함.
- 기간 `2026.06 ~ 현재`의 시작 월은 저장소 최초 커밋 `e64820bc6d68682be542facbdfa26a96fbcdb30b`의 2026-06-11 기록을 기준으로 작성함. 실제 착수일을 별도로 확인한 것은 아님.
- 역할은 구현 범위를 설명하는 `웹 개발`로 작성함. 팀 규모와 개인 기여율은 확인하지 않아 기재하지 않음.
- 서비스 운영 주소는 소스에서 확인하지 못해 Git remote에서 확인한 GitHub 저장소를 링크로 사용함.
- 성능 개선 수치, 실제 투자 성과, 사용자 수는 기재하지 않음. 상세 경험의 결과는 코드에서 확인한 동작을 설명하며, learning은 구현에 대한 기술적 해석임.

## 소스 근거

분석 저장소: `/Users/leeseunghyun/Documents/GitHub/candanta`

| 항목 | 근거 |
| --- | --- |
| 기술 구성 | `package.json` |
| 대시보드 쿼리 하이드레이션 | `src/app/dashboard/page.tsx` |
| 프로필·제안의 로딩, 오류, 승인 상태 표시 | `src/app/dashboard/dashboard-content.tsx` |
| 계좌 데이터 집계·동시 계산 공유 | `src/services/portfolio/portfolio-service.ts:100` |
| AI 구조화 응답, 후보 검증, 규칙 기반 대체 | `src/services/strategy/strategy-recommendation-service.ts:343`, `:527` |
| 제안 실행 선점·접수 스냅샷·불확실한 실행 상태 유지 | `src/app/api/allocation/proposal/[id]/execute/route.ts:482`, `:533`, `:918` |
| 보유 자산 스냅샷과 가격 대체 | `src/services/strategy/holdings-backtest-service.ts:112` |
| 전략 시뮬레이션·수수료·슬리피지·통화 모델 한계 | `src/services/strategy/backtest-engine.ts` |

## 실행 및 검증

- `projectCreateInputSchema`로 등록 데이터를 검증함.
- 기존 `createProject` 서비스의 트랜잭션·중복 slug·생성 개수 제한을 사용함. 앱 코드와 스키마는 수정하지 않음.
- 첨부 원본 `03-Portfolio-Pulse.png`를 변형 없이 기존 Blob 스토어의 `thumbnails/`에 업로드함. 크기 1,111,203바이트, PNG 시그니처와 4MB 제한을 확인함.
- 업로드 후 파일을 다시 받아 SHA-256을 비교했으며 원본과 일치함.
- Neon MCP로 운영 main 브랜치에서 프로젝트와 상세 경험 4개를 재조회함.
- Vercel CDN 태그 무효화는 `CDN Cache Namespace not found`로 실패함. 이후 기존 관리자 화면에서 GitHub 로그인 후 Candanta 저장을 실행했고, `저장했습니다. 공개 페이지에 반영되었습니다.` 알림을 확인함.
- 등록 초기 홈·목록에는 이전 캐시가 남아 있었고 상세 페이지는 HTTP 200으로 확인됨. 관리자 저장 후 공개 페이지의 최종 응답을 별도로 확인함.
- 최종 확인: `/`, `/projects`, `/work/candanta` 모두 HTTP 200, `x-vercel-cache: REVALIDATED`이며 Candanta 제목과 지정 썸네일 URL이 HTML에 포함됨.
- 이 작업은 기존 CMS의 콘텐츠 입력으로 처리함. Task Team 스킬의 기능 구현 사이클은 실행하지 않음. TeamCreate·TaskCreate·관리형 격리 Agent 프로토콜 역시 실행하지 않음.
- 앱 코드를 바꾸지 않아 전체 빌드·단위 테스트는 실행하지 않음. artifacts 경로는 Biome 검사 대상에서 제외되어 데이터 스키마 검증으로 확인함.
- 실제 투자 주문·AI 호출·백테스트를 실행해 검증하지 않음. 모바일·데스크톱에서 썸네일의 시각적 잘림은 별도 검증하지 않음.
