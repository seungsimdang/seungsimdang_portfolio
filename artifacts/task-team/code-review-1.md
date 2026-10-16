# T07 코드 리뷰 - 프로젝트 썸네일 확장

- 기준 커밋: 사이클 기준 `72f8aa0`, 리뷰 대상 `8737d25` (썸네일 구현 `a436da6`, 후속 `f8c36a4`, `8737d25` 중심)
- 판정: **재작업 필요**
- 자체 리뷰: High 1건
- 검토 범위: `src/`, `drizzle/`, `package.json`, 삭제된 `scripts/migrate-thumbnails.mjs`, `scripts/run-e2e-local.sh`, 변경된 `__tests__/`, `tests/e2e/`

## 자체 발견

### High - 다음 이미지가 늦게 로드되면 카드가 빈 배경으로 노출됨

- 위치: `src/components/common/project-card-thumbnails.tsx:114`, `src/components/common/project-card-thumbnails.tsx:129`
- 재현 경로: 복수 썸네일 카드를 화면에 두고 네트워크를 느리게 제한한다. 다음 이미지가 4초 안에 로드되지 않아도 `advance`가 즉시 인덱스를 바꾸고, 600ms 뒤 `prev`를 지워 이전 이미지를 내린다. 새 이미지가 계속 로드 중이면 그 사이 카드 배경만 보인다.
- 요구사항 위반: `requirements.md` E-h는 느린 네트워크에서 다음 이미지가 미로드 상태로 전환되어도 빈 화면이 나오지 않도록 선로딩 또는 이전 이미지 유지를 요구한다. 현재 코드는 다음 프레임이 로드되었는지 확인하지 않고 이전 프레임 유지 시간도 고정 600ms다.
- 수정 방향: 전환 대상 이미지의 로드 완료를 확인한 뒤 전환을 시작하거나, 로드 완료 전까지 이전 프레임을 유지한다. 실패한 프레임은 노출하지 않고 다음 정상 프레임으로 넘기는 처리도 함께 확인한다.
- 영향: 복수 이미지 세트만 해당하며, 느린 네트워크에서 썸네일 대신 빈 카드가 보일 수 있다.

## 요구사항 및 범위 점검

- 두 `ProjectCard` 호출부가 `thumbnails`와 `mobileThumbnails`를 모두 전달하고, 상세 페이지 OG는 기본 목록 첫 장을 사용한다.
- 폼의 목록 추가·삭제·순서 이동, 업로드 중 구조 변경/저장 잠금, 서버 배열 검증, 프로젝트 생성·수정·삭제의 목록 처리와 Blob 참조 보호를 확인했다.
- 수정 대상 Route Handler 성공 경로에 생성·수정·삭제 모두 `revalidatePath("/", "layout")`가 있다.
- 변경된 스키마·서비스 테스트는 실제 소스 모듈을 import한다. 썸네일 전환 컴포넌트의 직접 단위 테스트는 이번 diff에 없다. E-h는 위 실제 실행 경로에서 코드상 재현 가능하다.
- 요구사항 D1은 `thumbnail` 제거를 이번 브랜치에 넣는 것으로 확정됐으므로 `0005` 데이터 이전과 `0006` 컬럼 제거는 결정에 부합한다. 다만 이 배포 위험은 확정 결정에도 main 배포 직전 재확인 항목으로 남아 있다.
- 이번 변경에서 확인한 기존 동작 중 별도 finding으로 올릴 범위 외 문제는 없다.
- 검증 명령은 직접 실행하지 않았다. 오케스트레이터가 `pnpm type-check`, `pnpm check .`, `pnpm knip`, 전체 Vitest 478개 통과를 보고했다.

## CodeRabbit 교차검토

- 실행 명령: `coderabbit review --agent --base main`
- 상태: 미실행. CLI가 현재 환경에서 저장된 CodeRabbit 인증 정보를 사용할 수 없어 `credentials_unavailable`로 종료했다. `coderabbit auth status --agent`도 같은 사유로 확인에 실패했다.
- 타당 판정 항목: 없음 (리뷰 미실행)
- 기각 항목: 없음

최종 판정은 자체 리뷰 High 1건으로 재작업 필요다. CodeRabbit 미실행(현재 실행 환경에서 인증 정보를 사용할 수 없음).
