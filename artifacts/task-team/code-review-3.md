# 사이클 전체 최종 리뷰 - 프로젝트 썸네일 확장

**사이클 전체 최종 리뷰**

- 비교 범위: `72f8aa0..HEAD`와 현재 미커밋 변경 (`src/`, `drizzle/`, 관련 `__tests__/`, `tests/e2e/`, `package.json`, `scripts/migrate-thumbnails.mjs` 삭제, `scripts/run-e2e-local.sh`)
- 판정: **검토 통과**
- 자체 리뷰: Medium 이상 신규 finding 없음
- 범위 제외: `.claude`/`.codex` 하네스 및 `__tests__/lint/runtime-hooks.test.ts`의 관련 없는 하네스 변경

## 자체 리뷰

### 이전 High 수정 확인

`src/components/common/project-card-thumbnails.tsx`는 다음 프레임 로드 성공을 `loaded`에 기록하고, 4초 간격이 지났더라도 다음 프레임이 준비될 때까지 현재 프레임을 유지한다. 로드 실패 프레임은 후보에서 건너뛴다. 이전 리뷰의 E-h High 문제는 해결됐다. 화면 비활성·호버·포커스 등 일시정지 조건이 풀린 뒤에는 간격을 새로 시작한다.

### T08 Low 2건 수정 확인

- Origin 검사는 허용 host 목록에 설정된 URL scheme을 적용하고 전체 origin을 정확히 비교한다. 설정된 다른 scheme 및 port, 경로를 거부하는 테스트가 추가됐다. unsafe method에만 Origin 검사를 적용하는 기존 범위는 바뀌지 않았다.
- Blob 정리는 READ COMMITTED batch transaction에서 advisory lock `7301004`를 얻고, 두 썸네일 배열 어디에도 참조가 없을 때만 URL을 `retired_thumbnail_blobs`에 기록한다. 프로젝트 INSERT 및 두 썸네일 필드 UPDATE trigger가 같은 lock 아래서 퇴역 URL 재등록을 막는다. DB 커밋 뒤 외부 Blob 삭제를 실행하므로 새 참조가 삭제된 Blob을 가리키는 경합 경로는 코드상 차단된다.
- 삭제 실패 시 tombstone은 남고 재업로드를 안내하는 동작은 명세된 선택과 일치한다. 자동 재시도 worker는 추가되지 않았다.

### 구현·테스트 범위 확인

- 프로젝트 읽기·쓰기·OG·admin 폼의 기본/모바일 목록 연결, 목록 상한·중복·모바일 단독 저장 방지, 두 목록을 고려한 Blob 제거를 기존 리뷰에서 확인했다. 해당 경로에 이번 변경이 만든 회귀는 발견하지 못했다.
- 새 컴포넌트 테스트는 실제 `ProjectCardThumbnails`를 import한다. E2E는 768px 분기, 불필요한 반대쪽 이미지 요청, 4초 순환, 느린 로드 대기, 이미지 실패 건너뛰기, 호버·포커스·reduced-motion·탭 비활성 동작을 대상으로 한다.
- DB 통합 테스트는 실제 portfolio service와 DB schema를 import하며, 공유 URL 보존, 퇴역 URL 거부, 외부 삭제 실패 뒤 재사용 방지, 동시 생성/삭제 경합을 대상으로 한다. `RUN_THUMBNAIL_DB_TESTS=1`과 분리 DB 호스트 확인을 통과할 때만 실행된다.
- DPM Core 모바일 6장은 요구사항에 기록됐고 PC 원본 수신 전까지 데이터 반영을 보류하는 상태다. 모바일 단독 저장 방지와 함께 현재 코드 범위에서 누락으로 판정하지 않았다.
- 요구사항 D1의 `0006` 컬럼 제거와 그 배포 위험은 사용자 확정 결정에 해당한다. main 배포 직전 재확인 게이트를 유지해야 한다.

## CodeRabbit 교차검토

- 실행 명령: `coderabbit review --agent --base main`
- 상태: 미실행. CLI가 현재 환경에서 저장된 인증 정보를 사용할 수 없어 `credentials_unavailable`로 종료했다. 지시에 따라 `coderabbit auth status --agent`로 인증 상태를 확인했으며 같은 사유로 실패했다.
- 타당 판정 항목: 없음 (리뷰 미실행)
- 기각 항목: 없음

## 검증 경계

오케스트레이터가 알려준 현재 상태는 0007 마이그레이션 적용과 최신 fixture DB 값 반영 완료, 브라우저 및 동시성 검증 대기다. 수정 이후 전체 E2E/브라우저·동시성 결과는 아직 전달되지 않아 본 리뷰에서 통과했다고 주장하지 않는다.

이번 diff에서 추가 수정할 코드 finding은 없다. CodeRabbit 인증 실패와 수정 후 QA 미완료는 최종 자동·브라우저 검증의 남은 경계다.
