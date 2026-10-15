# 보안 리뷰 1차 (T08) - 블로그 .md 템플릿 다운로드

## 판정: 배포 승인 (Critical/High/Medium 없음, Low 1건 비차단)

## 범위
- `src/lib/blog/post-template.ts` (신규)
- `src/components/admin/blog-form.tsx` (`downloadTemplate`, 버튼, 안내 문구)
- 참고: `frontmatter.ts`, `next.config.ts` buildCsp, `proxy.ts`
- 서버/API 변경 없음 (클라이언트 Blob 다운로드)

## 취약점 목록
- Critical: 없음
- High: 없음
- Medium: 없음
- Low: 1건

### L-1 (Low, 비차단) revokeObjectURL 즉시 호출
- 위치: `blog-form.tsx` `downloadTemplate` (`anchor.click()` 직후 `URL.revokeObjectURL(url)`)
- 내용: 보안 위험은 아니고 일부 브라우저(구형 Firefox/Safari)에서 다운로드 시작 전 URL이 해제되거나, DOM에 붙이지 않은 anchor click이 무시되는 호환성 이슈 가능성이 있음. 해제 자체는 메모리 누수 방지 측면에서 올바름.
- 수정안(선택): `setTimeout(() => URL.revokeObjectURL(url), 0)` 또는 anchor를 body에 append 후 click, remove.

## 확인 항목별 결과
1. blob URL / `<a download>` 와 CSP
   - CSP는 `default-src 'self'`, `connect-src 'self'`, `img-src ... blob:`, `object-src 'none'`.
   - 사용자 클릭으로 anchor에 blob URL을 걸어 다운로드하는 것은 fetch/script/frame 로드가 아니라 다운로드 내비게이션이므로 `connect-src`/`default-src`에 걸리지 않음. CSP 변경 불필요, CSP 완화도 없음.
   - blob URL은 same-origin이며 같은 문서에서 생성된 Blob(고정 템플릿 문자열)만 가리킴. 외부 입력이 URL/파일명에 들어가지 않음.
   - 파일명은 상수 `blog-post-template.md`, MIME은 `text/markdown;charset=utf-8`. 실행 가능한 타입이 아니고 `text/html`이 아니므로 XSS 경로 없음.
   - 해제: `revokeObjectURL` 호출됨 (L-1 참고).
2. 템플릿 내용과 가져오기 경로의 YAML 위험
   - 템플릿은 정적 문자열이며 유일한 동적 값은 `date`(`todayInSeoul()`, 코드가 만든 YYYY-MM-DD). 사용자 입력 보간 없음, 주입 불가.
   - 파서는 `yaml` core 스키마(`!!js/*` 등 임의 태그 비활성), 1MB 제한, 값 타입 검증(문자열/숫자만) 유지됨. 템플릿은 태그, 앵커, 병합 키 등 위험 구문을 쓰지 않고 `#` 주석, 따옴표 문자열, 평문 날짜만 사용.
   - 주석에 `---` 연속이 없어 펜스 조기 종료 없음 (주석에 명시적 주의 문구 있음). 안내를 프론트매터 `#` 주석에 두어 본문 유입 없음.
   - 템플릿 본문은 마크다운 평문으로 스크립트/HTML 없음.
3. 인증/인가 경계
   - 변경은 `/admin` 하위 클라이언트 컴포넌트 내부이며 라우트, API, `proxy.ts` 매처, 권한 로직 변경 없음. 다운로드는 서버 요청을 만들지 않음. 새 글 폼은 기존대로 인증된 admin 콘솔 안에서만 노출됨.
4. 민감정보 노출
   - 템플릿에 시크릿, 토큰, 내부 경로, 사용자 정보 없음. 날짜와 예시 문구뿐.
5. 의존성
   - 신규 의존성 없음 (`yaml`은 기존 사용).

## 결론
공격 표면 증가 없음. Critical/High 없으므로 배포 승인. L-1은 선택 개선.
