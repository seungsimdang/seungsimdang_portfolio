# T08 사이클 최종 보안 리뷰 - 프로젝트 썸네일 확장

- 기준: `72f8aa0..8737d25` 및 현재 작업 트리의 썸네일 관련 `src/`, `drizzle/`, 테스트 미커밋 변경
- 현재 추가 변경: `src/lib/auth/admin-route.ts`, `src/db/schema/portfolio.ts`, `src/services/portfolio/portfolio-admin-service.ts`, `drizzle/0007_jazzy_thunderbird.sql` 및 관련 테스트
- 정책 입력: `requirements.md` 11·13·14절, `api-spec.md` 부록 및 추가 보완
- 판정: **보안 통과**. Critical/High 취약점은 확인되지 않았다. 최초 T08의 Low 두 항목은 코드상 해소됐다. 새로 확인한 Low 두 항목은 운영 영향과 복구 한계이며, 현재 계획상 비차단 잔여사항으로 기록한다.

## 이전 Low 항목 재검토

### SEC-T08-01 - Origin scheme 미비교: 해결

`src/lib/auth/admin-route.ts:45-65`가 허용된 scheme·host·port를 조합한 전체 origin과 요청 `Origin`을 비교한다. 프로토콜이 HTTP/HTTPS가 아니거나 Origin 문자열에 경로 등 origin 외 값이 섞이면 거부한다. 추가 테스트도 HTTP/HTTPS 불일치, 다른 port, 경로가 붙은 Origin을 확인하도록 작성되어 있다(`__tests__/api/admin-route.test.ts`).

### SEC-T08-02 - Blob 참조 확인과 삭제 사이 경합: 핵심 경합 해결

서비스는 삭제 후보 URL을 `READ COMMITTED` 트랜잭션에서 lock `7301004`로 직렬화하고, 아직 프로젝트 목록에서 참조되지 않는 경우에만 `retired_thumbnail_blobs`에 기록한다(`src/services/portfolio/portfolio-admin-service.ts:328-363`). 프로젝트 INSERT와 썸네일 배열 UPDATE trigger도 같은 lock을 얻은 뒤 퇴역 기록을 확인한다(`drizzle/0007_jazzy_thunderbird.sql:5-47`). 따라서 참조 저장이 먼저 커밋되면 삭제 후보 기록이 생기지 않고, 퇴역 기록이 먼저 커밋되면 이후 참조 쓰기가 P1001/P1002로 거부된다.

이 순서는 서비스가 쓰는 `db.batch`가 Neon HTTP의 여러 쿼리를 하나의 트랜잭션으로 제출하는 구현과 일치한다(설치된 `drizzle-orm@0.45.3`의 `neon-http/session.js:117-132`, Neon serverless API 정의). Trigger는 `VOLATILE`이며, PostgreSQL 문서는 이러한 함수 내부 쿼리가 각각 시작 시점의 새 snapshot을 얻는다고 설명한다([PostgreSQL 함수 변동성 문서](https://www.postgresql.org/docs/current/xfunc-volatility.html)). lock 대기 뒤 확인하는 퇴역 기록이 이전 statement snapshot에 고정되지 않으므로 경합 방어가 성립한다.

## 신규 Low 잔여사항

### SEC-T08-03 - Low: 썸네일 retirement lock이 이력서 생성 lock과 같은 키를 사용함

- 위치: `src/services/portfolio/portfolio-admin-service.ts:76-78, 338-341, 451-477`
- 근거: 썸네일 retirement와 trigger는 advisory lock `7_301_004`를 사용하고, 같은 파일의 `RESUME_LOCK_KEY`도 `7_301_004`다. 이력서 생성은 `limitGuard`에서 이 lock을 획득한다.
- 영향: 프로젝트 생성은 `7301001 → 7301004`, 이력서 생성과 썸네일 정리는 각각 `7301004`를 획득한다. 프로젝트 썸네일 쓰기/정리와 이력서 생성이 서로 다른 데이터 영역인데도 같은 배타 트랜잭션 lock으로 직렬화된다. 현재 경로에는 반대 순서의 다중 lock 획득이 없어 deadlock은 확인하지 못했다. 경합 시 admin 쓰기 지연이 늘어날 수 있고, 향후 새 lock 조합이 추가되면 예기치 않은 lock 결합이 생길 수 있다.
- 수정 권고: `7301004`는 기존 이력서 락으로 유지하고, 썸네일 retirement에 미사용 고유 키를 배정한다. 새 키의 사용처와 lock 취득 순서를 저장소에서 함께 확인한다.
- 심각도/판정: Low, 가용성·유지보수 권고. 기존 데이터 손실이나 lock bypass는 발생하지 않는다.

### SEC-T08-04 - Low: Blob 삭제 실패 후 자동 재시도 경로가 보장되지 않음

- 위치: `src/services/portfolio/portfolio-admin-service.ts:301-306, 310-320, 328-363`
- 근거: 퇴역 기록 뒤 `del(url)` 실패는 catch에서 로그만 남기고 저장 성공을 유지한다. 삭제 함수는 업데이트에서 제거된 현재 요청의 이전 목록 또는 삭제된 프로젝트의 목록에서만 호출된다. 첫 요청이 DB 변경과 퇴역 기록을 끝내고 `del`에서 실패하면, 이후 일반 수정은 해당 URL을 이미 DB에서 잃었고 프로젝트 삭제 재시도는 NotFound가 되어 같은 정리 함수에 그 URL을 다시 전달하지 않는다. 별도 worker나 관리용 재시도 호출자도 확인되지 않았다. 같은 helper가 다시 불리면 재시도되는 것은 맞지만, 일반 API 흐름에서 이를 보장하지 않는다.
- 영향: 일시적인 Blob 서비스 오류 또는 응답이 모호한 실패가 나면 삭제 대상 파일이 public Blob에 남을 수 있다. 퇴역 tombstone은 URL 재사용을 막으므로 프로젝트 참조는 되살아나지 않지만, 고아 객체의 실제 제거는 자동 회복되지 않는다. 현재 썸네일이 공개 자료이므로 기밀 누출로 보지는 않으며, 오래된 공개 파일 잔류와 저장 비용 문제다.
- 수정 권고: 자동 재시도가 요구되면 퇴역 기록을 내구성 있는 재시도 큐로 취급하는 worker/운영 재시도 경로를 추가한다. 이번 사이클에서 worker를 제외하는 결정을 유지한다면 API 명세의 “같은 정리 경로 재호출은 재시도”를 보장 문구로 해석하지 않도록 한계를 분명히 한다.
- 심각도/판정: Low, 현재 `api-spec.md`의 best-effort 삭제와 worker 제외 결정에 따른 비차단 잔여사항. 기존 정책도 Blob 삭제 실패를 반환 오류로 승격하지 않았다.

## 확인한 통제와 오류 경로

- **인증·CSRF:** 프로젝트 쓰기와 업로드 라우트는 `adminRoute`로 감싸져 있고, 세션 GitHub ID allowlist·Origin·관리자별 rate limit을 통과해야 한다. Origin 검사는 이제 정확한 전체 origin을 비교한다.
- **URL allowlist·입력:** `src/schemas/portfolio.schema.ts:19-43, 109-139`는 정확한 HTTPS Blob hostname/authority와 `/thumbnails/` 경로를 요구하고 credentials, port, query, hash 및 허용 밖 URL을 거부한다. 각 목록 최대 10개, 빈 URL·중복 URL도 서버에서 검증한다. strict 입력 스키마는 미지 필드를 거부한다. 편집 폼의 기존값 보존 경로는 변경하지 않은 목록을 API 본문에서 생략하며, 서버가 새로 전달된 목록에는 같은 URL 검증을 적용한다.
- **업로드·Blob 보호:** 서버는 단일 multipart 파일, 4MB 한도, signature·확장자·MIME 일치를 확인하고 임의 사용자 파일명을 저장 키에 쓰지 않는다. 생성한 URL을 allowlist로 재검증한다. 삭제 전에 허용 URL만 대상으로 삼고 두 배열 전체의 참조를 검사한다. public Blob 접근은 포트폴리오 공개 이미지 요구에 따른 것이다.
- **SQL 주입:** 동적 URL은 Drizzle tagged SQL interpolation 또는 query builder 바인딩으로 전달된다. migration trigger 쿼리에는 사용자 입력이 없다. SQL 문자열 연결형 입력 경로를 찾지 못했다.
- **오류 매핑:** P1001/P1002는 프로젝트 생성·수정 경로에서 각각 `thumbnails`/`mobileThumbnails`의 400 `VALIDATION_FAILED` 필드 오류로 바뀐다. P1003은 트리거가 READ COMMITTED 외 쓰기를 거부할 때 발생하며, 서비스에서 필드 오류로 바꾸지 않아 공통 내부 오류(500)로 실패한다. 잘못된 격리 수준에서 쓰기를 통과시키지 않는 fail-closed 동작이다. 삭제 정리 자체의 DB/Blob 실패는 요청 저장을 실패시키지 않고 로그만 남기는 best-effort 동작이다.
- **데이터·의존성·시크릿:** 0007은 tombstone 테이블과 trigger만 추가하며 기존 프로젝트 썸네일 행을 삭제하거나 변경하지 않는다. 검토한 변경에 하드코딩된 secret 또는 새 의존성은 없다. 운영 DB는 기존 단일 `thumbnail` 상태이며 운영 변경은 없다는 orchestration 제공 상태를 전제로 했다. 이전 0006 컬럼 제거와 빌드 우선 적용의 알려진 가용성 위험은 사용자 승인 게이트이며 별도 배포 전 재확인이 필요하다.

## 검증 경계

코드·migration·테스트 구현을 정적으로 검토했다. Drizzle/Neon 설치 코드로 `db.batch` 트랜잭션 사용을 확인했고, PostgreSQL 공식 문서에서 `VOLATILE` 내부 쿼리의 fresh snapshot 동작을 확인했다. 요청에 공유된 E2E DB의 0007 적용 상태는 이 리뷰에서 DB 접속으로 재검증하지 않았다. 회귀·동시성 테스트는 준비 중으로 전달받았으며 직접 실행하지 않았고, 운영 DB/Blob에는 연결하거나 쓰지 않았다.
