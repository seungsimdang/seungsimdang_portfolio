# 00-input: admin UI 개선 및 썸네일 업로드

- 작성일: 2026-10-12
- 작성자: Claude orchestrator (T01, intake만)
- 기준 커밋: `6fb558e` (develop)
- 직전 사이클: `artifacts/task-team/2026-10-12-admin-portfolio-cms/`

## 사용자 요청 원문

> 위 내용들 모두 task team 사이클에 포함시켜서 작업해

"위 내용"은 직전 대화에서 사용자가 지적하고 orchestrator가 답한 7개 항목이다.

1. 왜 어드민 페이지에 비어드민 페이지의 레이아웃이 동일하게 적용되는거임?
2. 헤더 ui 구성은 일부러 다르게 한거임?
3. 대시보드 탭은 왜 필요함?
4. 새 프로젝트/발표 버튼이 너무 뚱뚱하지 않냐?
5. 위로, 아래로, 편집, 삭제 버튼이 모두 같은 버튼을 사용하는 것이 best practice임? 다른 곳도 마찬가지.
6. 위로/아래로 버튼을 누르자마자 요청이 가는게 맞아? 순서 설정 후 별도의 저장 버튼을 눌러야 요청이 가야하지 않음?
7. 여전히 이미지 업로드 안되는데?

## 구조화 (orchestrator 답변 기준)

1. admin 화면에서 공개 Navbar/Footer 제거. 현재 `src/app/layout.tsx`가 모든 경로에 Navbar/Footer를 렌더하고 `src/app/admin/layout.tsx`는 이를 덮을 수 없음. 직전 design-spec 2절은 admin에서 공개 Navbar/Footer를 쓰지 않는다고 정했으나 구현 누락.
2. admin 헤더를 직전 design-spec 3절대로 맞춤: 810px 이상 한 줄(제목, 내비게이션, 우측 액션), `sticky top-0`, 공개 Navbar의 `bg-black/50 backdrop-blur-md` 톤. 현재는 내비게이션이 항상 둘째 줄이고 sticky 아님.
3. 대시보드(`/admin`) 제거. 내비게이션과 같은 링크만 반복함. `/admin` 진입 시 프로젝트 목록(`/admin/projects`)으로 이동.
4. admin 화면의 공개 `ui/Button`(px-32 py-16 text-base) 사용처를 admin 버튼 크기(`AdminButton`, min-h-44 px-20 text-small)로 통일. 목록 헤더의 "새 프로젝트"/"새 발표", 빈 목록의 생성 버튼 등.
5. 버튼 위계 분리. 순서 이동은 작은 아이콘 버튼(↑↓), 편집은 행 제목 링크, 삭제는 빨간 텍스트 버튼. 적용 범위는 프로젝트/발표 목록, 프로젝트 편집의 경험 카드, `list-editor` 계열(기술 스택, 링크, 스킬) 전부.
6. 프로젝트/발표 목록의 순서 변경을 즉시 저장에서 로컬 draft + 별도 저장 버튼 일괄 저장으로 변경. 현재 `sortable-list.tsx`는 이동마다 PUT 요청과 사이트 전체 revalidate가 발생함.
7. 썸네일을 admin에서 파일 업로드(Vercel Blob). 직전 사이클 종료 후 사용자 결정 "admin에서 파일 업로드"를 후속 사이클로 미뤄 둔 항목.

## 추가 사용자 결정 (intake 이후)

- 2번 범위 확정: admin 헤더의 틀을 공개 Navbar와 동일하게 맞춤. 대상은 `fixed top-0`, `bg-black/50 backdrop-blur-md`, `py-24`, `max-w-content`, 한 줄 배치, 하단 1px 구분선, 링크 `text-sm`과 현재 페이지 불투명도 100%/나머지 50%. 내용(admin 링크, 사이트 보기, 로그아웃)만 다름.
- 헤더 이름 통일: 공개 헤더와 admin 헤더 모두 "SeungHyun Lee"로 표시. 사용자 원문: "통일해", 이후 "됐고, SeungHyun Lee로 통일해".
  - admin 헤더 좌측도 공개 헤더와 같은 DB 프로필 이름(`profile.name`)을 읽어 출처를 하나로 둠. GitHub 표시 이름(`session.user.name`)은 쓰지 않음.
  - DB 프로필 이름을 "이승현"에서 "SeungHyun Lee"로 변경. 이 값은 공개 헤더 외에 히어로, 푸터, 페이지 제목 메타데이터에도 쓰임.

## 현재 상태 사실 (orchestrator 확인)

- 썸네일은 `projects.thumbnail` text 컬럼에 경로 문자열만 저장. 폼은 `/images/...` 경로만 허용하는 텍스트 입력(`src/components/admin/project-form.tsx:198`).
- 기존 썸네일 이미지는 `public/images/projects/...`에 있음.
- Vercel Blob 의존성(`@vercel/blob`)과 Blob 스토어는 아직 없음.
- Preview 배포에서는 admin 로그인 미지원(사용자 결정). 업로드 실동작 확인은 로컬과 Production에서만 가능.
- 데이터 쓰기마다 사이트 전체 revalidate(직전 requirements 6절).

## 모호한 항목

- Blob 공개 범위: 공개 포트폴리오 이미지라 public Blob이 자연스러운지
- 업로드 제한: 허용 형식(png/jpg/webp 등)과 최대 크기
- 썸네일 교체/삭제 시 이전 Blob 파일 삭제 여부
- 기존 `public/images/...` 경로 썸네일 유지 여부(마이그레이션 없이 두 형식 공존인지)
- 로컬 개발과 e2e에서 Blob 토큰이 없을 때의 동작
- 직전 사이클 후속 항목 중 "slug 변경 허용(리다이렉트 없음)"과 "Vercel 빌드 시 마이그레이션 자동 적용"은 이번 요청 7개에 없음. 이번 사이클 포함 여부 미정

## 승인 지점

- T02 완료 후 요구사항 보고 및 사용자 승인 (Task Team 게이트)
- Vercel Blob 스토어 생성과 `BLOB_READ_WRITE_TOKEN` 환경변수 등록은 사용자 작업
