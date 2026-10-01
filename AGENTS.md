<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 공용 에이전트 규칙

코드·문서·Git 작업 전 현재 작업과 관련된 `docs/agent-rules/README.md` 및 해당 규칙 문서를 읽는다.

## Claude-Codex 인계 계약

- Claude와 Codex는 각자의 기존 Skill·Agent 흐름으로 작업한다.
- 모델 또는 세션을 실제로 전환할 때만 `artifacts/work/<work-id>/STATUS.md`와 `HANDOFF.md`를 갱신한다. 대화만으로 다음 모델에 필수 정보를 전달하지 않는다.
- `task-team`·`bug-team`의 상세 산출물은 유지한다. `HANDOFF.md`에는 해당 파일 경로와 다음 모델이 알아야 할 핵심 결론만 적는다.
- 인계 문서 작성·검증이 필요하면 `cross-agent-handoff` Skill을 사용한다. 절차는 `docs/agent-contracts/handoff.md`, 경로·필수 항목·보관 규칙은 `artifacts/work/README.md`를 따른다.

## 하네스 변경 이력

공용 하네스 이력은 `docs/agent-harness/CHANGELOG.md` 참조.

## 사용자 지정 제약

- 기존 Framer 디자인·브레이크포인트·애니메이션과 README 참조 정보 보존. 파일 이동과 1px spacing 전환 시 기존 화면의 픽셀값 유지.
- 변경·추가·제외·삭제 제안은 대상·전후·이유·영향을 설명하고 User question으로 검토받은 뒤 승인 범위만 적용. 질문·설명 요청을 승인으로 해석하지 않음.
- 승인 전에는 제안으로 표현하고 확정된 작업처럼 보고하지 않음. 사용자가 일괄 적용 시점을 지정하면 해당 순서 준수.
- 담당 파일만 수정하고 타인의 변경을 되돌리지 않음. 사용자 지시와 실제 제공된 도구를 우선하고, 실행하지 못한 원본 프로토콜은 미검증으로 보고.
- 하네스 생성 원본은 `docs/agent-harness/templates/`. `manifest.json`의 도구별 경로 매핑에 따라 `pnpm harness:sync`로 생성하고 `pnpm harness:check`로 확인. 생성 결과를 독립 편집하지 않음.
- 테스트 제목의 설명은 한글. 경로 템플릿 허용, 영문 태그는 별도 metadata 사용. Biome 플러그인으로 검사.
