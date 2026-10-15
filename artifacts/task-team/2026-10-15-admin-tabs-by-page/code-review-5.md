# code-review-5: 사이클 전체 최종 리뷰

사이클 전체 최종 리뷰 (c6c53b0부터 현재 메인 체크아웃 전체 변경, 미커밋 포함).

## 판정: 통과 (Low 2건, 배포 차단 없음)

검증: `pnpm exec vitest run` 30 파일 408 통과, `tsc --noEmit` 오류 없음, `knip` 출력 없음, `biome check src` 통과. 이전 리뷰 1~4와 triage 1·3·4에서 처리·기각된 항목은 다시 올리지 않음.

## 수용 기준 대조

| 항목 | 결과 |
|------|------|
| 탭 6개가 공개 Navbar와 1:1 (home, projects, about, blog, talks, contact) | 충족. `admin-nav.tsx` LINKS 순서 일치, home만 정확 일치 활성 |
| `/admin`이 home 탭 직접 렌더, 헤더 이름 링크와 로그인 기본 이동 `/admin` | 충족. `(console)/page.tsx`, `admin-console-shell.tsx`, `login/page.tsx` |
| `/admin/resume`, `/admin/profile` 404 | 충족. 해당 page.tsx 삭제, 테스트·소스에 남은 링크 없음. resume 하위는 `about/resume/new`, `about/resume/[id]`로 이동, `sortable-list.tsx`·`resume-entry-form.tsx`·`listHref` 모두 새 경로 |
| about 탭에 이력 + skills·tools, contact 탭에 email·github | 충족. 안내 문구와 profile 링크 삭제 확인 |
| 부분 저장 API, 빈 객체 400 | 충족. `profileUpdateInputSchema`가 `partial()` + 값 존재 refine, 서비스·라우트 갱신, `revalidatePath("/", "layout")` 유지 |
| 로그아웃 분리, 미저장 확인 후 `/` 이동 | 충족. nav 밖 구분선+버튼, `a[href="/"]`라서 `use-leave-confirm`의 클릭 가드가 가로채고, 확인 후 `proceed`가 앵커를 다시 클릭하면 `onClick`이 `signOut({redirect:false})` 후 `router.push("/")` 실행. 보조 키 클릭은 기본 동작에 맡김 |
| 홈 about 섹션 삭제 | 충족. `AboutSection` import·렌더·파일 삭제, `src`에 잔존 참조 없음 |
| 로그인 화면 리디자인 | 충족. 홈 링크, 전체 폭 버튼, alert 의미 유지, `safeCallbackUrl` 검증 로직 유지 |
| 모든 폼 RHF 전환 | 충족. blog, project, talk, resume-entry, profile 모두 `useAdminForm`, 구 `validate.ts` 삭제, 참조 없음 |
| 변경 취소 버튼 | 충족. 탭 폼은 `onDiscard`, 목록 폼은 `cancelHref` 분기 |

## 합쳐진 변경의 상호작용 점검 (결함 없음)

- 탭 폼의 `toValues`가 프로필 전체를 폼 값에 넣지만 `profileSectionFormSchema`가 섹션 키만 골라 `z.object`로 출력하므로 전송 본문에 다른 탭 항목이 섞이지 않음. 알 수 없는 키 거부(`strictObject`)와 충돌하지 않음.
- 저장 후 `onSaved: toValues`로 `reset`이 기준값을 갱신하므로 `dirty`·변경 취소가 마지막 저장값 기준으로 동작. 저장 직후 `isDirty`가 false라 로그아웃 가드가 풀림.
- 이력 생성 직후 `router.push`는 가드 밖 프로그램 이동이라 확인창이 뜨지 않음(기존 동작과 같음).
- about 탭에는 `ProfileForm` 하나만 있어 가드·변경 취소가 skills·tools에만 적용되고, 이력 목록(`SortableList`)은 별도 저장 경로라 간섭 없음.
- 이력 생성·수정·삭제·정렬 4개 경로 모두 `revalidatePath("/", "layout")`를 호출해 대칭.

## Findings

### Critical / High / Medium
없음.

### Low

**L1. README 컴포넌트 목록에 삭제된 `AboutSection`이 남음**
- `README.md:85` `- **AboutSection**: About 섹션 (그리드 레이아웃)`
- 이번 사이클이 컴포넌트 파일을 삭제했으므로 README가 존재하지 않는 컴포넌트를 안내함. 같은 사이클에서 README 기술 스택 줄은 갱신했으나 이 줄은 누락.
- 단 공통 제약에 "README 참조 정보 보존"이 있어 삭제는 사용자 승인 사안. 제안: 해당 줄 삭제 여부를 사용자에게 확인.

**L2. 구조 문서의 admin 화면 설명이 새 탭 구성과 어긋남**
- `docs/agent-rules/project-structure.md:17` `` `(console)/`(profile·projects·talks 편집) ``
- profile 경로는 삭제됐고 실제로는 home·projects·about·blog·talks·contact 편집. 같은 파일 22행의 `admin-client` 항목은 이번에 갱신했으므로 17행도 같이 고치는 것이 일관됨. 실패 시나리오는 없고 에이전트가 존재하지 않는 profile 화면을 가정할 수 있는 문서 부정확.

### Info (조치 불필요, 참고)
- `src/app/admin/not-found.tsx:8`, `src/app/admin/(console)/not-found.tsx:10`의 복귀 링크가 `/admin/projects`("프로젝트 목록"). 삭제된 `/admin/resume`·`/admin/profile` 404에서 projects로 안내되나 라벨과 목적지가 일치하고 동작상 문제 없음. home(`/admin`)으로 바꿀지는 선택 사항.

## 주석·문서 점검

- 이번 diff의 추가 주석에서 사이클 식별자(T0x, D1~D8, M/L 번호, 리뷰 차수) 인용 없음. 정규식 grep 결과 0건.
- 주석 종결어미·em-dash는 biome와 주석 검사 통과 상태. 신규 주석은 이유 중심 명사형으로 기준 부합.
- `docs/agent-rules/nextjs.md` 5번은 `useAdminForm`, `schemaResolver`, `useFieldArray`, `Controller` 서술이 실제 코드(`use-admin-form.ts`, `form-errors.ts`, `list-editor.tsx`)와 일치. README 기술 스택의 RHF 7.89.0, resolvers 5.9.1은 `package.json`과 일치(Zod 4.6.5는 기존 의존성 버전과 대조하지 않았으므로 확인 필요 시 `package.json` 참고).

## 죽은 코드·잔존 참조

- 삭제된 `validate.ts`, `about-section.tsx`, `resume/`·`profile/` 페이지를 가리키는 import·링크·revalidatePath·테스트 없음. `globals.css`의 `.admin-header-navigation`, `.admin-nav-links` 정의 삭제와 사용처 제거가 짝을 이룸(잔존 사용처 없음). `knip` 통과.

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --base main` (사이클 전체 변경이 모두 포함됨). 상태: 완료, findings 0건 (무료 CLI 허용량으로 실행).
- 타당 판정 항목: 없음.
- 기각 항목: 없음.
- 한 줄 요약: CodeRabbit 0건 중 0건 타당.
