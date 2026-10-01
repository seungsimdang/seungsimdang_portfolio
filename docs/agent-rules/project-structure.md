# 프로젝트 구조

- 기존 `app/` App Router와 `components/` 구조를 유지한다. `@/*`는 저장소 루트를 가리킨다.
- 신규 일반 파일은 kebab-case, 컴포넌트와 타입 이름은 PascalCase로 작성한다. 기존 파일명은 임의로 바꾸지 않는다.
- 신규 페이지는 Server Component를 기본으로 하고 상태·이벤트 처리가 필요한 부분만 Client Component로 만든다.
- 기존 Framer 스타일은 `app/globals.css`, 애니메이션은 `components/WordCycler.tsx`, 참조 노드는 README에서 확인한다.
- 현재 선택 기능은 브라우저 스모크 테스트뿐이다. 인증, DB, HTTP 클라이언트, Provider와 공용 유틸은 실제 요구가 생길 때 추가한다.
- 서버 비밀값을 클라이언트나 공개 환경변수에 넣지 않는다. 서버 전용 모듈 추가 시 `server-only` 경계를 구성한다.
- 프레임워크 API를 변경하기 전에 설치 버전과 해당 버전 문서를 확인한다. 패키지에 로컬 문서가 없으면 공식 문서를 확인한다.
