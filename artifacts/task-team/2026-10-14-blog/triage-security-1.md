# triage-security-1: security-review-1 orchestrator 재검토 (9-1 게이트)

- 대상: `security-review-1.md` (기준 커밋 eb4a223, 범위 `ac2e26b..eb4a223`)
- 판정자: orchestrator. 각 finding은 해당 코드를 직접 열어 확인함.
- reviewer 판정: 배포 승인 (Critical 0, High 0). 상태: 재작업 대상 확정, 사용자 지시로 재작업 전 hold.

## 판정

| ID | 심각도 | 판정 | 근거 | 조치 |
| --- | --- | --- | --- | --- |
| SEC-01 | Medium | 타당, 사이클 diff 밖 | `next.config.ts:25-45`는 공개 경로에 CSP가 없고 admin CSP에 `script-src`가 없음. `next.config.ts`는 이번 사이클에서 변경되지 않음. 현재 렌더러(`render-markdown.tsx:17-23` sanitize 스키마, `:73` https 재검사)에서 악용 경로는 확인되지 않음 | 사용자 결정: 이번 사이클 포함. 재작업 대상 (nonce 기반 `script-src` CSP를 공개·admin 경로에 적용) |
| SEC-02 | Low | 타당 | `blog.schema.ts:12-18`의 `postSlugSchema`에 `new` 금지가 없음. `portfolio.schema.ts:97`은 `.refine((v) => v !== "new")`로 막음. `/admin/blog/new` 정적 라우트가 `[slug]`를 가려 slug `new` 글은 admin에서 편집·삭제 불가 | 재작업: 같은 refine 추가 |
| SEC-03 | Low | 기각 | 본문 이미지의 임의 https 호스트 허용은 사용자가 정상 외부 이미지 6개의 URL 유지를 결정한 결과(`requirements.md` F3-6). 호스트를 제한하면 그 결정과 충돌 | 조치 없음 |
| SEC-04 | Low | 기각 | 업로드 후 미저장·글 삭제 시 고아 Blob은 `requirements.md`가 허용하고 정리를 범위 밖으로 명시함 | 조치 없음 |
| SEC-05 | Low | 기각 | `image-upload.ts:52-63`, `parse-body.ts:23-27`은 Content-Length 없는 요청을 다 읽은 뒤 검사하나, `adminRoute`의 인증·Origin·쓰기 쿼터 이후이고 Vercel 함수 요청 본문은 플랫폼에서 4.5MB로 제한됨. 실제 영향 없음 | 조치 없음 |
| SEC-06 | Low | 기각 | `?category=`는 파라미터 바인딩이고 F-5 재작업으로 50자 상한이 적용됨. 글 약 300건이라 인덱스 없는 배열 조건의 비용이 무시 가능 | 조치 없음 |
| SEC-07~10 | Info | 기록만 | 이관 스크립트 다운로드는 하드코딩 3건으로 SSRF 불가, git 호출은 인자 배열과 `--` 사용, 정규식 이차 시간은 이관 스크립트 전용, 업로드 검증 구성 확인 | 조치 없음 |
