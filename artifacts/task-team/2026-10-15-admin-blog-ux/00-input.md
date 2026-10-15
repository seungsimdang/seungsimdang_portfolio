# 00-input: admin·블로그 UX 개선

- work-id: `2026-10-15-admin-blog-ux`
- 브랜치: `feature/admin-blog-ux` (기준 `develop` 8bd8030)
- 작성: orchestrator (T01 intake, 분석·해석 없음)
- 선행 사이클: `artifacts/task-team/2026-10-14-blog/` (블로그 DB 이관과 블로그 기능, main 병합·운영 이관 완료)

## 사용자 요청 원문 (운영 화면 스크린샷 9장과 함께)

1. "모바일에서 헤더와 탭간 간격이 너무 좁지 않니?" (공개 Navbar의 이름과 링크 줄)
2. "모바일에서 탭 그룹의 행간 간격이 너무 좁지 않니?" (공개 `/blog` 카테고리 탭이 두 줄로 줄바꿈된 화면)
3. "블로그 목록으로 버튼이 페이지 최 하단에 있는게 적절하니?" (공개 `/blog/[slug]` 본문 아래 "blog 목록으로")
4. "비admin 페이지는 탭 이름이 영어인데 왜 admin 페이지는 한글이야? 영어로 통일하고, 각 탭 진입 시 제목도 통일해." (admin 탭: 프로젝트, 발표, 블로그, 이력, 프로필, 로그아웃)
5. "왜 어드민 블로그 탭에는 카테고리 분류를 담당하는 탭 그룹이 없니?"
6. "공개 여부 선택 기능이 왜 필요해?" (admin 블로그 폼 "공개" 체크박스와 "해제하면 공개 목록에서 즉시 사라집니다.")
7. "작성과 미리보기 버튼은 토글 버튼인거 같은데 ui가 이게 맞아?"
8. "그냥 현재 글자 수 / 300,000자 이렇게 하면 깔끔하지 않을까?" (현재 hint "마크다운. 최대 300,000자." 아래 counter "3700자")
9. "메세지를 footer에 출력하는게 맞아? toast와 같은 방식이어야하지 않을까?" (스크린샷: "완료: 이미지를 본문에 넣었습니다. alt 텍스트를 확인하세요.")
10. "왜 글 삭제 버튼 클릭 시 커스텀 모달이 뜨는데, 취소 버튼 클릭 시에는 일반 alert가 떠? 커스텀 모달이 뜨도록 하고 프로젝트 내 유사 로직 파악 후 모두 통일해."
11. "왜 저장 이후 블로그 탭으로 이동하지 않고 [완료: 저장했습니다. 공개 페이지에 반영되었습니다.] 메세지만 띄우고 같은 페이지에 남아있는거야?"

## orchestrator 보고 후 사용자 결정

- 3: best practice 웹 서치 후 재보고 → 권장안 승인("ㄱㄱ"). 목록으로 돌아가는 링크는 상단 하나만 두고, 글 하단에는 이전/다음 글 링크를 둠. 근거: GOV.UK Design System Back link("Always place back links at the top of a page, before the `<main>` element"), NICE Design System Previous next("placed at the bottom of content, where users would logically finish reading the content"). 이전/다음 글은 선행 사이클 requirements에서 범위 밖이었던 기능을 새로 추가하는 것.
- 6: "지워". 근거 확인 결과 선행 requirements의 전제("원본에 `published: false` 글이 실제로 있음")가 틀림. 원본 `_posts`에서 `published:` 보유 195개 모두 `true`, `false` 0개. 운영 DB 297행 모두 공개.
- 8: "마크다운. 문구도 필요 없잖아. 같이 빼." 표시를 `현재 / 300,000자` 형식으로 하고 본문 hint 문구 제거.
- 11: best practice 웹 서치 후 재보고 → 권장안 승인("ㄱㄱ"). 편집 중 저장은 현재처럼 같은 화면에 남고 결과는 토스트로 알림. 생성은 현재처럼 만든 항목의 편집 화면으로 이동. 근거: Mirakl Form edition mode("The user stays on the form page", 성공은 snackbar), Grafana Save pattern(저장 결과 "should be shown to the user through a toast", 생성 시 "redirect the user to the content they just created"). 화면 이동 동작 변경 없음.
- 나머지(1, 2, 4, 5, 7, 9, 10): "나머지는 지시대로 진행". orchestrator 보고 내용 기준은 아래와 같음.
  - 1: 공개 Navbar 모바일 이름-링크 간격 확대(현재 `gap-8`), 본문 시작 여백(`--spacing-header` 92px)도 함께 조정.
  - 2: 공개 `/blog` 카테고리 탭 행 간격 확대 또는 링크 터치 높이 확보(현재 `gap-y-8`).
  - 4: admin 탭을 `projects` `talks` `blog` `resume` `profile` `logout`으로, 각 목록 화면 제목을 탭 이름과 동일하게.
  - 5: admin 블로그 목록에 카테고리 탭 그룹 추가. 비공개 글이 없어지므로(6) 공개 카테고리와 같은 집합이나, admin 목록 기준으로 집계.
  - 7: 작성/미리보기를 탭(`role="tablist"`) UI로. 선행 design-spec은 "작성/미리보기 탭"이었으나 구현이 `aria-pressed` 버튼 두 개로 다르게 됨.
  - 9: admin 결과 메시지를 토스트로. 성공은 자동 사라짐, 행동 링크·버튼이 붙은 오류는 직접 닫을 때까지 유지, 필드별 오류는 입력란 아래 유지, 의존성 추가 없이 작은 컴포넌트.
  - 10: `window.confirm` 사용처를 `ConfirmDialog`(커스텀 모달)로 통일. 사용처: `use-admin-form.ts` 미저장 이탈 경고(링크 클릭), `sortable-list.tsx` 순서 변경 이탈 경고(링크 클릭, 뒤로가기), `project-form.tsx`·`talk-form.tsx` slug 변경 확인, `blog-form.tsx` .md 가져오기 덮어쓰기 확인. 새로고침·탭 닫기(`beforeunload`)는 브라우저가 커스텀 UI를 허용하지 않아 기본 창 유지.
- 진행 방식: "task team 위임하여 나머지 작업들과 한 사이클에 포함시켜 작업해"

## 현재 코드 사실 (조사 결과)

- 공개 Navbar `src/components/layout/navbar.tsx`: 모바일 `flex-col gap-8 py-16`, 주석상 높이 89px로 본문 시작 92px 안에 맞춤. 본문 시작은 `public-shell.tsx`의 `pt-header`(`globals.css` `--spacing-header: 92px`, `@theme inline`).
- 공개 `/blog` 카테고리 nav: `flex flex-wrap gap-x-16 gap-y-8 text-small`.
- 공개 `/blog/[slug]`: 상단과 하단(`mt-64`)에 "blog 목록으로" 링크.
- admin 탭 `src/components/admin/admin-nav.tsx` 한글 라벨, 로그아웃은 `sign-out-button.tsx`. 화면 제목은 `AdminPageHeader title`(목록: 프로젝트, 발표, 블로그, 이력, 프로필 / 하위: 새 프로젝트, 프로젝트 편집, 새 발표, 발표 편집, 새 글, 글 편집, 새 이력, 이력 편집). metadata title도 한글(예: "블로그 - admin").
- admin 블로그 목록 `src/app/admin/(console)/blog/page.tsx`: 페이지네이션만, 행에 "공개/비공개" 표시.
- 블로그 폼 `src/components/admin/blog-form.tsx`: 공개 체크박스, `ConfirmDialog` 삭제, .md 가져오기 `window.confirm`.
- 마크다운 에디터 `src/components/admin/markdown-editor.tsx`: 작성/미리보기 `AdminButton` 두 개(`aria-pressed`), counter `${value.length}자`, 업로드 결과는 `onNotice`.
- 알림 구조: `form-parts.tsx`의 `FormStatus`(폼 상단, profile·project·talk 폼 사용)와 `FormActionBar`(sticky 하단, `detailed`면 알림 전문, 아니면 "저장됨"/"저장 실패" 요약). 블로그 폼은 `detailed`. `SortableList`는 자체 message 영역. 목록 화면의 "삭제했습니다." `role="status"` 문단.
- `ConfirmDialog`(`confirm-dialog.tsx`)는 버튼 문구가 "취소"/"삭제"로 고정된 삭제 전용.
- `posts.published` 컬럼과 공개 쿼리 조건(`published=true`), API 스키마의 `published` 필드가 존재.

## Bug Team 피드백 반영 필수

출처: `artifacts/bug-team/2026-10-13-admin-save-feedback/postmortem.md`

- 원인: 결과 피드백 위치와 사용자 행동(하단 sticky 저장 버튼) 위치의 분리. 기준: "행동 버튼이 고정 영역에 있으면 결과 피드백도 같은 영역에 둔다. 다른 위치에 두는 설계는 설계 산출물에 그 이유를 적는다."
- 이번 9번(토스트)은 결과 표시 위치를 바꾸므로, design-spec에 "결과 피드백 위치" 항목을 두고 토스트가 뷰포트 고정이라 이 기준을 충족하는 근거를 적어야 함. code-review에서 확인 결과를 남김.
- 같은 포스트모텀의 미반영 항목(designer.md·code-reviewer.md 하네스 변경, `FormStatus` 사용 파일은 `FormActionBar`에 `notice` 전달 lint 테스트)은 `feature/admin-form-feedback-guard` 대상이라 이번 범위 밖. 단, 토스트로 바뀌면 lint 테스트의 불변식 자체가 달라지므로 summary에 기록. 포스트모텀 파일은 미반영 항목이 남아 있어 삭제하지 않음.

## 모호한 항목 (T02에서 확정 필요)

- 9번 토스트 적용 범위: 블로그 폼만인지, admin 전체(프로필·프로젝트·발표·이력 폼, 목록 순서 저장, 목록 "삭제했습니다.")인지. `FormStatus`와 `FormActionBar` 요약 문구 존치 여부.
- 4번 하위 화면 제목(새 글, 글 편집 등)과 metadata title, admin 화면의 다른 한글 문구(버튼, 안내)의 영어화 범위.
- 5번 admin 카테고리 필터의 쿼리 방식(공개 `?category=`와 동일 여부), 페이지네이션과의 조합.
- 6번 삭제 범위: admin UI만인지, API 스키마·DB 컬럼·공개 쿼리 조건·.md import의 `published` frontmatter 처리까지인지(DB 컬럼 제거는 마이그레이션 필요).
- 3번 이전/다음 글의 순서 기준(발행일, 동일 날짜 처리), 카테고리 필터와의 관계, 첫 글·마지막 글 처리.
- 10번 뒤로가기(popstate) 경로의 커스텀 모달 처리 방식, `ConfirmDialog` 일반화(버튼 문구) 방식.

## 승인 지점

- T02 완료 후 요구사항 사용자 확인 게이트.
- DB 마이그레이션이 필요하면 운영 적용 전 사용자 확인.
- 커밋·병합은 사용자 지시 후 git-commit Skill로 진행.
