# 보안 리뷰 2차 (T08) - 사이클 전체 최종 리뷰

사이클 전체 최종 리뷰. 대상은 사이클 전체 변경 최종본이다.

## 판정: 배포 승인

## 범위
- `src/lib/blog/post-template.ts` (신규, 정적 템플릿 생성)
- `src/components/admin/blog-form.tsx` (`downloadTemplate`, 새 글 ".md 가져오기" 블록, `importFile`/`applyImport`)
- 참고: `src/lib/blog/frontmatter.ts`, `next.config.ts`, `src/proxy.ts`, 1차 `security-review-1.md`/`triage-1.md`
- 서버/API 변경 없음

## L-1 해결 여부: 해결
- `downloadTemplate`이 `setTimeout(() => URL.revokeObjectURL(url), 0)`으로 해제를 다음 작업으로 미룸.
- 해제가 유지되므로 메모리 누수 없음. 새 취약점이나 부작용 없음.
- 선택 수정안 중 anchor body append는 적용되지 않았으나 보안 이슈가 아닌 호환성 사항이라 비차단.

## 취약점 목록
- Critical: 없음
- High: 없음
- Medium: 없음
- Low: 없음

## 확인 항목
1. 다운로드 경로: Blob(고정 템플릿 문자열), 상수 파일명, `text/markdown` MIME. 외부 입력이 URL/파일명/내용에 들어가지 않음. 동일 출처 blob 다운로드 내비게이션이라 CSP 변경 불필요, 완화 없음.
2. 템플릿 내용: 동적 값은 `todayInSeoul()`의 YYYY-MM-DD뿐. YAML 주입 불가. 주석에 하이픈 3개 연속이 없어 펜스 조기 종료 없음. 안내가 `#` 주석이라 본문에 유입되지 않음.
3. 가져오기 경로(사이클 변경 포함): `.md/.markdown` 확장자 검사, 1MB 제한, UTF-8 fatal 디코딩, `yaml` core 스키마(임의 태그 비활성), 값 타입 검증, 알 수 없는 키 제외, 파싱 실패 시 본문 전체로 폴백. 가져온 값은 폼 필드에 채워질 뿐 자동 저장되지 않으며 저장은 사용자 동작과 기존 서버 검증/인증을 거침. 비공개 글 가져오기 시 공개 전환 경고를 표시함. 파일 내용은 React 폼 값으로만 쓰이고 `dangerouslySetInnerHTML`/HTML 삽입 없음.
4. 인증/인가: 라우트, API, `proxy.ts` 매처, 권한 로직 변경 없음. 새 UI는 기존 인증된 admin 콘솔 내부(클라이언트 전용).
5. 시크릿/의존성: 노출 없음, 신규 의존성 없음(`yaml` 기존).

## 결론
공격 표면 증가 없음. Critical/High/Medium/Low 모두 없고 L-1 해결됨. 배포 승인.
