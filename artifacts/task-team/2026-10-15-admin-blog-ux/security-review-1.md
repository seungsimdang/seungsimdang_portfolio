# Security Review 1 (T08) - admin-blog-ux

판정: 배포 승인 (Critical 0, High 0, Medium 0, Low 2, Info 2)

범위: diff 6aee747..754a208 중 보안 관련 핵심 파일을 직접 읽어 검토함 (blog-service, blog.schema, frontmatter, blog-form, toast-provider, use-leave-confirm, use-admin-form, category-tabs, 공개 blog/page). 나머지 스타일·레이아웃 위주 컴포넌트는 정밀 검토하지 않았고, 이 판정은 중점 항목 기준임.

## 중점 항목 결과

1. published 제거와 비공개 글 노출: 통과 조건부.
   - src 전역에 `published` 컬럼 참조 없음(`publishedAt`만 존재). 모든 조회가 필터 없이 전체 글을 반환하므로, 이후 비공개 글이 DB에 생기면 즉시 노출되는 구조임. 운영 DB published=false 0건이 확인되었으므로 현재 노출 없음.
   - 컬럼은 `boolean DEFAULT true NOT NULL`이라 ORM이 컬럼을 모르는 상태에서도 INSERT가 성공하고 항상 true로 들어감. 비공개 데이터가 새로 생길 경로 없음.
   - .md import의 `published: false`는 경고 토스트 후 공개 글로 저장된다고 명시 안내함. 의도된 동작이며 사용자가 저장을 눌러야 반영됨.
2. category 쿼리: 통과. `normalizeCategoryParam`이 배열 첫 값, trim, NFC, 길이 상한을 처리. 쿼리는 drizzle `sql` 템플릿의 `${category}`가 바인드 파라미터로 전달되어 SQL injection 불가. 페이지 파라미터는 정규식으로 제한. React가 출력 이스케이프하며 링크는 `encodeURIComponent`.
3. 이전/다음 글 쿼리: 통과. 입력은 DB에서 읽은 post의 slug/publishedAt이고 drizzle 연산자(lt/gt/eq)로 바인딩됨. 사용자 입력 직접 사용 없음.
4. 토스트: 통과. 메시지는 JSX 텍스트로 렌더(dangerouslySetInnerHTML 없음). link.href는 호출부 상수(`/admin/login?...from=encodeURIComponent(pathname)`, `listHref`)뿐이며 서버 응답이나 사용자 입력에서 온 값이 href가 되는 경로 없음. `dismissWithFocus`의 selector는 상수 라벨.
5. 이탈 확인 훅: 통과. 클릭 가로채기는 같은 문서의 `a[href]` 요소를 보관했다가 확인 후 `anchor.click()`으로 재실행할 뿐 새 URL을 조합하지 않아 오픈 리다이렉트 없음. 이벤트는 `isTrusted` 검사가 없으나 같은 오리진 스크립트만 합성 가능하므로 XSS가 전제되는 경우로 추가 위험 아님. popstate는 `history.forward()/back()`만 호출하며 URL 조작 없음. 우회 플래그는 타이머로 해제됨.
6. .md import: 통과. YAML은 `schema: "core"`(커스텀 태그 차단), 클라이언트에서 1MB 제한과 UTF-8 fatal 디코딩, 확장자 검사. 서버는 `postCreateInputSchema`(strictObject, 길이·slug 정규식)로 재검증하므로 클라이언트 우회 시에도 방어됨. 본문은 저장만 하고 렌더는 기존 공개 렌더러 책임(이번 변경 범위 밖).

## 취약점 목록

### Low-1: frontmatter 파서의 YAML alias 확장
`yaml` 라이브러리는 기본 maxAliasCount(100)로 billion-laughs를 제한하며 입력도 1MB, 관리자 본인 파일 한정 + 클라이언트 실행이라 영향은 본인 브라우저 탭에 한정. 조치 불필요(필요 시 `maxAliasCount` 명시).

### Low-2: 컬럼 제거 전 애플리케이션과 DB 불일치
`published` 컬럼이 DB에 남아 있어 스키마(코드)와 드리프트 상태. 이후 컬럼 제거 마이그레이션 단계에서 `posts_list_idx`(published 포함 인덱스)도 함께 재구성해야 하며, 그 전에 누군가 수동으로 published=false를 넣으면 노출됨. 수정 방안: 제거 마이그레이션을 일정에 두고 그 사이 수동 DB 수정 금지.

### Info-1: 비공개 글 기능 부재
운영상 임시저장/비공개가 필요해지면 필터를 다시 도입해야 함. 현재 요구사항에는 없음.

### Info-2: 미변경 파일(admin posts API, auth, CSP)
`published` 제거 후 posts API는 `postUpdateInputSchema`/`postCreateInputSchema`가 strictObject라 `published` 같은 알 수 없는 키를 400으로 거부함. proxy/adminRoute 인증 구조는 선행 리뷰(2026-10-14-blog/security-review-3) 이후 변경 없음.

## 결론
Critical/High/Medium 없음. 배포 승인. 후속 권고는 Low-2(컬럼·인덱스 제거 마이그레이션 일정화).
