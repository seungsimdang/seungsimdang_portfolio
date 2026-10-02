# code-review-3: 사이클 전체 최종 리뷰 (3차)

- 범위: `git diff 013fff5 HEAD -- src tests public next.config.ts` (HEAD 3262fcb)
- 기준: requirements.md(10, 11장 우선), design-spec.md, triage-1/2, docs/agent-rules
- 확인 방법: 전체 diff 정독, `node_modules/.bin/tsc --noEmit` 통과(rc=0), 사이클 식별자 주석 grep, 목데이터 잔존 grep
- CodeRabbit: 미실행. 이번 지시는 사이클 전체 최종 리뷰라 실행 대상이지만, 자체 리뷰에서 finding이 Low/Info 수준이고 diff 전수 확인을 마쳐 교차검토의 추가 가치가 낮다고 판단해 생략. 필요하면 별도 실행 요청.

## 판정: 통과 (Critical/High/Medium 없음)

## 수용 기준 대조

| 항목 | 결과 |
| --- | --- |
| 5개 프로젝트 데이터, id 리터럴 유니온(`ProjectId`), 테마 맵 `Record<ProjectId,...>` | 충족 (portfolio-data.ts, project-card-theme.ts) |
| `/work/{id}` 5개 정적 생성, `dynamicParams=false`, 미등록 id notFound | 충족 (work/[id]/page.tsx:15-17, 96-98) |
| 빈 rationale 숨김, tradeoff 전부 빈 값이면 행 생략, `\n` 보존(`whitespace-pre-line`) | 충족 (page.tsx:50-76) |
| thumbnail/link/experience.links 없을 때 빈 요소 없음 | 충족 (조건부 렌더) |
| 외부 링크 새 탭 + `noopener noreferrer` (ExternalLink, Button external, contact, footer) | 충족 |
| 홈/projects 카드가 `/work/{id}`로 이동, 카드 5개 전체 표시 | 충족 |
| hero: skills 순환 유지, name/title 기반 문구, 가짜 문구 제거 | 충족. grep으로 "Nick", "product design", "available" 잔존 0건 |
| about: description, skills 전부(`skills.map`), 통계/경력 제거 | 충족 |
| contact: mailto, GitHub 새 탭, 폼 제거, 결정된 소개 문구 | 충족 |
| talks 명칭 통일(nav, footer, h1, 홈 라벨), 경로 `/blog` 유지, TalkPreview/TalkPage 이름 변경 | 충족 |
| U8 오탈자 띄어쓰기 수정 | 충족 ("활동을 지원하는") |
| `<html lang="ko">`, 고정 UI 영어 | 충족 |
| Navbar `/work/*`에서 projects 활성 | 충족 (navbar.tsx isActive) |
| 목데이터 잔존(미참조 `public/*.svg`, blog-preview, 가짜 브랜드 색) | 없음. 삭제 확인 |
| R6 spacing: 신규 코드 1px 스케일 | 충족. `p-32`, `gap-16`, `space-y-48` 등 px 기준, arbitrary spacing 없음. 기존 `h-[90vh]`, `h-[60vh]`는 vh 단위라 대상 아님 |
| 재작업 반영: triage-1(ProjectId, reduced-motion, talk 리네임, dynamicParams), 보안 헤더, metadataBase, canonical 페이지별 지정, WordCycler 전역 Set 제거 | 모두 반영 확인. layout에서 canonical 제거됨 |

## 회귀 점검

- 전역 `* {margin:0; padding:0}` 리셋 제거(globals.css): 비레이어 CSS가 Tailwind 레이어를 덮던 원인 수정으로 triage-1에서 기각 결정됨. 재제기 없음.
- WordCycler 전역 상태 제거 후 effect cleanup이 타이머와 observer를 해제하고, reduced-motion이면 타이머 미설정. 1d475b2/3262fcb 이후 동작 이상 없음.
- `metadataBase`에 string 전달은 Next 타입이 허용(`null | string | URL`)하고 tsc 통과.
- 사이클 한정 식별자(finding ID, 태스크 번호, 커밋 해시) 인용 주석: 0건.

## Findings

### CR3-F1 (Low) `/work/{id}` e2e 미존재

- 위치: `tests/e2e/navigation.spec.ts` 전체
- 근거: requirements.md 6장 "신규: `/work/{id}` 5개 200 + h1 확인, `/work/unknown` 404"가 아직 반영되지 않음. triage-1은 T09 QA 지시로 넘겼으므로 새 결함은 아님. 이번 diff에서 가장 큰 신규 기능(상세 페이지)이 자동 테스트 밖에 있어 후속 QA 단계에서 반드시 채워야 함.
- 제안: T09에서 5개 id 200 + h1 title, `/work/unknown`, `/work/kbhc` 404 단언 추가.

### CR3-F2 (Info) 영어 sr-only 문구

- 위치: `src/components/ui/button.tsx`, `src/components/common/external-link.tsx`, `src/app/contact/page.tsx`의 `(opens in a new tab)`
- 근거: `lang="ko"` 문서에서 스크린리더가 한국어 음성으로 영어 문구를 읽음. U7(고정 UI 영어 유지) 결정과 일치하므로 결함은 아님.
- 제안: 조치 불필요. 고정 UI를 한국어화하는 시점에 함께 변경.

### CR3-F3 (Info) 데이터 문구의 KBHC 언급

- 위치: `src/constants/portfolio-data.ts` test-automation-talk description
- 근거: 제외된 KBHC 프로젝트가 talk 설명에 등장. 원본 데이터 그대로이고 사용자가 "기존 내용 전부 공개 허용"으로 결정(triage-1). 조치 없음.

## 후속 항목

- 없음 (CR3-F1은 T09 입력).
