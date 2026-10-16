# T08 보안 리뷰 - 프로젝트 썸네일 확장

- 검토 기준: `feature/project-thumbnails` HEAD `8737d25` (구현 `a436da6`, 후속 `f8c36a4`, `8737d25` 포함)
- 검토 범위: 썸네일 URL 스키마, 프로젝트 API·서비스, 업로드, 인증·인가, 읽기/렌더 경로, 마이그레이션, 의존성
- 요구사항 우선순위: `requirements.md` 11·13절과 `api-spec.md` 부록 결정 적용
- 판정: **보안 통과**. Critical/High 취약점은 확인되지 않았다. 아래 Low 항목 두 건은 비차단 개선 권고이며, 공통 가드 및 기존 정리 동작의 한계로 T08 변경 범위 밖이거나 기존 패턴을 이어받는다.

## 발견 사항

### SEC-T08-01 - Low: Origin 검사가 scheme을 비교하지 않음

- 위치: `src/lib/auth/admin-route.ts:45-51`
- 근거: `isSameOrigin`은 `new URL(origin).host`만 허용 목록과 비교한다. 따라서 설정된 HTTPS 호스트와 hostname/port가 같은 HTTP Origin도 통과할 수 있다.
- 영향: same-host의 HTTP 문서가 브라우저에서 실행되고 인증 쿠키가 요청에 포함되는 조건에서는 프로젝트 생성·수정·삭제 또는 업로드 요청의 CSRF 방어가 약해진다. `next.config.ts:47-53`의 HSTS(`includeSubDomains`)가 이미 HTTPS를 방문한 브라우저의 위험을 줄이지만, host 비교 자체는 scheme을 포함한 동일 출처 검사가 아니다.
- 수정 권고: 허용 설정을 전체 origin으로 관리하고 `new URL(origin).origin`과 정확히 비교한다. `ADMIN_ALLOWED_HOSTS`를 유지해야 한다면 허용 scheme과 port를 명시하는 형식으로 바꾼다.
- 범위: T08에서 변경하지 않은 공통 `adminRoute`의 기존 구현이다. 이번 썸네일 확장으로 새로 추가된 결함은 아니다.

### SEC-T08-02 - Low: 공유 Blob 참조 확인과 삭제 사이에 동시성 창이 있음

- 위치: `src/services/portfolio/portfolio-admin-service.ts:303-325` (호출: 276-281, 285-295)
- 근거: 코드가 DB에서 두 썸네일 목록의 참조 여부를 조회한 다음 별도 호출로 `del(url)`을 실행한다. 조회와 삭제가 원자적이지 않다.
- 영향: 참조 조회가 끝난 직후 다른 프로젝트 생성/수정 요청이 같은 URL을 저장하면, 새 참조가 생긴 Blob이 삭제되어 그 프로젝트 이미지도 깨질 수 있다. 데이터베이스 URL 값은 남지만 객체를 다시 올려야 한다. 정상적인 단일 편집 흐름에서는 드문 경합이다.
- 수정 권고: 썸네일 목록 변경과 삭제 확인을 같은 직렬화 규칙으로 보호하거나, 삭제를 지연 큐로 옮겨 충분한 유예 후 참조를 재확인한다. 생성·수정·삭제 경로가 모두 같은 규칙을 따라야 한다.
- 범위: 기존 단일 `thumbnail` 구현에도 조회 후 삭제 패턴이 있었다. T08에서 두 목록의 참조 집합으로 확장됐으며, `api-spec.md`의 기존 best-effort 정책과 같은 종류의 경합 한계를 가진다.

## 확인한 보안 통제

- 인증·인가: 프로젝트 생성·수정·삭제와 썸네일 업로드 라우트가 `adminRoute`로 감싸져 있다. `requireAdmin`은 세션의 GitHub ID를 요청마다 allowlist와 다시 비교한다. API 쓰기는 Origin 검사와 관리자별 rate limit 뒤에 실행된다. 관리자 편집 페이지도 `requireAdminPage`를 호출한다.
- URL allowlist 및 기존 값 보존: `src/schemas/portfolio.schema.ts:19-43, 109-139`에서 HTTPS, 정확한 Blob hostname/authority, `/thumbnails/` prefix를 확인하고 userinfo, port, query, hash를 거부한다. 목록은 10개 이하이며 같은 목록의 중복과 빈 URL을 거부한다. `z.strictObject` 기반 프로젝트 입력 스키마는 알 수 없는 필드를 거부한다. 변경되지 않은 목록을 클라이언트가 생략하는 것은 기존 값을 보존하는 경로이며, 서버 API의 새 URL 검증을 우회하지 않는다.
- 업로드: `src/lib/api/image-upload.ts:38-109`에서 multipart 단일 파일, 빈 파일, 4MB 한도, 이미지 signature·확장자·MIME 일치를 서버에서 확인한다. 사용자가 보낸 파일명은 저장 경로에 쓰지 않고 랜덤 suffix를 사용한다. 업로드 URL도 다시 allowlist 검사하며 실패 시 반환 전에 삭제를 시도한다. Blob은 의도대로 `public` 접근이다.
- 공유 URL·정리: 제거 대상은 두 목록의 합집합 차이로 계산한다. 정리 전 썸네일 hostname/path allowlist를 다시 통과시키고, 같은 프로젝트의 다른 목록 및 다른 프로젝트의 현재 참조를 검사한다. 다만 SEC-T08-02의 비원자 경합은 남는다.
- SQL·XSS: 변경된 DB 쓰기와 slug 조회는 Drizzle 쿼리 빌더를 사용한다. 삭제 참조 쿼리의 동적 URL은 `sql` 템플릿 변수로 바인딩되어 SQL 문자열에 직접 연결되지 않는다. 공개 읽기는 `safeThumbnails`로 허용 Blob URL만 전달하며, 제목과 alt는 React 텍스트/속성 렌더링을 거친다. 이번 범위에서 SQL injection 또는 저장형 XSS 경로를 찾지 못했다.
- 데이터 마이그레이션: `0005`가 기존의 비어 있지 않은 단일 URL을 기본 목록 첫 장으로 옮기고, `0006`은 비어 있는 새 목록에 한해 재동기화한 뒤 구 컬럼을 제거한다. 목록 상한 및 모바일 목록의 기본 목록 의존성은 DB check로도 강제된다.
- 시크릿·의존성: 검토한 변경 코드에 하드코딩된 비밀값이나 새 의존성은 없다. `NEXT_PUBLIC_BLOB_HOSTNAME`은 URL 검증/이미지 설정용 공개 호스트 이름이며 비밀값으로 쓰이지 않는다.

## 승인된 운영 위험과 검증 경계

`requirements.md` 13절 D1에 따라 `0006` 컬럼 제거가 이번 브랜치에 포함되어 있다. 빌드 마이그레이션이 새 애플리케이션 코드 배포보다 먼저 실행되어 운영 중 구 코드 요청이 실패할 수 있다는 점은 사용자가 알고 선택한 위험이다. 보안 취약점으로 분류하지 않으며, 명시된 main 배포 직전 재확인 게이트를 유지해야 한다. 운영 DB나 Blob에 연결해 마이그레이션·삭제 동작을 실행하지 않았다.

소스와 관련 테스트 케이스를 읽고 경로를 정적으로 검토했다. 테스트 스위트와 라이브 서비스 검증은 실행하지 않았다.
