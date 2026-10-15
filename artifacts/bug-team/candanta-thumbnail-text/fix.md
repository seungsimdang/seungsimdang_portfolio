# 수정 및 검증

- 공용 카드에 `preserveThumbnailText` 추가. Candanta 호출부 2곳에서만 활성화.
- 썸네일 컨테이너의 높이를 기준으로 이미지 래퍼 폭을 `min(100%, 100cqh)`로 제한하고 중앙 배치. 이미지는 top 정렬.
- 기존 카드 높이·오버레이·다른 프로젝트의 이미지 정렬은 유지. 넓은 홈 카드에는 이미지 양옆 여백 발생.
- 격리 worktree `/private/tmp/portfolio-candanta-thumbnail`에서 준비 후 지정 소스 3개 파일의 변경만 메인 작업 폴더에 적용. 다른 worktree와 파일은 변경하지 않음.
- 사용 가능한 도구에 TeamCreate·TaskCreate·관리형 Agent isolation 옵션이 없어 실제 git worktree와 collaboration agent로 역할을 실행함. 커밋·병합은 실행하지 않음.
- 격리본: Next typegen, TypeScript, Biome 변경 파일 3개 검사, Vitest 32개 파일·423개 테스트 통과. pnpm 의존성 재설치 확인 때문에 직접 바이너리로 검사함.
- 로컬 서버 3102에서 홈·프로젝트 목록을 390×844, 768×1024, 1440×900으로 검증. 6개 조합 모두 상단 카피 영역이 카드 안에 있고 프로젝트 제목과 겹치지 않는 자동 assertion 통과.
- 다른 프로젝트 Globber의 이미지 위치가 중앙(`50% 50%`)인 것도 6개 조합에서 확인.
- 모바일 프로젝트 목록, 태블릿 프로젝트 목록, 데스크톱 프로젝트 목록·홈 스크린샷을 직접 열어 상단 제목과 설명 전체 표시 확인.
- 스크린샷: `/private/tmp/candanta-fixed-{390,768,1440}-{home,projects}.png`.
- 메인 작업 폴더에서도 `pnpm type-check`, `pnpm exec vitest run`(32개 파일·423개 테스트), 변경 파일 Biome, `git diff --check` 통과. 운영 배포는 실행하지 않음.
