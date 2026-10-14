# 코드 리뷰 6 (T07 범위 한정 재리뷰, 커밋 93921de)

재작업 재리뷰 지시이므로 CodeRabbit 교차검토는 생략하고 자체 리뷰만 수행했다. pnpm 명령은 실행하지 않았다.

## 판정: 통과

필수 수정 항목은 없다. 신규 finding은 Low 2건(선택)이다.

## 이전 finding 해결 여부

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| code-review-5 F-1 break·인라인 html로 단어가 붙음 | 해결 | `src/lib/blog/excerpt.ts` 36행에서 `break`와 `html` 노드를 `" "`로 반환하고, 최종 `replace(/\s+/g, " ")`가 연속 공백을 접는다. `line  \nbreak`가 `line break`, `a<br>b`가 `a b`가 된다. 테스트 추가됨 |
| code-review-5 F-2 각주 본문 포함 | 해결 | SKIP에 `footnoteDefinition` 추가(8-15행). `footnoteReference`는 값이 없어 빈 문자열이라 `본문[^1]`이 `본문`이 된다. 테스트 추가됨 |

36행의 `html` 분기가 SKIP 검사보다 앞이라 SKIP의 `"html"` 항목은 도달 불가가 됐다. 동작에는 영향이 없다(F-A 참고).

## prefetch 변경 검토

### 적용 범위

`grep '/blog' src`로 블로그 공개 경로를 가리키는 Link 전수를 확인했다. 모두 `prefetch={false}`가 적용됐다.

| 위치 | 대상 | 적용 |
| --- | --- | --- |
| `src/components/layout/navbar.tsx` 47행 | `/blog` | `link.href === "/blog" ? false : undefined` |
| `src/components/layout/footer.tsx` 47행 | `/blog` | 동일 |
| `src/components/common/post-row.tsx` 10행 | `/blog/[slug]` | 적용 |
| `src/components/common/pagination.tsx` 47, 65, 82행 | `basePath` 쿼리 | 이전/번호/다음 3곳 모두 적용 |
| `src/app/(public)/blog/page.tsx` 63, 75, 101행 | `/blog`, `/blog?category=` | 적용 (전체 탭, 카테고리 탭, 빈 상태 전체 보기) |
| `src/app/(public)/blog/[slug]/page.tsx` 45, 69행 | `/blog` | 상단/하단 목록 링크 모두 적용 |

누락된 블로그 공개 Link는 없다. 홈 등 다른 페이지에는 `/blog`를 가리키는 링크가 없다.

### 정적 경로 링크 유지

navbar/footer는 `/blog`일 때만 false이고 나머지는 `undefined`라 Next 기본값(정적 경로 prefetch)이 유지된다. 다른 `Link`에는 `prefetch` 속성이 없다. 요구사항 충족.

### 대안 비교

- `loading.tsx` 추가: 동적 경로도 로딩 경계까지 부분 prefetch가 되지만, 이탈 시 중단되는 스트림이 그대로 남을 수 있고 로딩 UI 설계와 렌더 변경이 따른다. 이번 증상(중단 스트림 로그)의 직접 원인 제거가 아니다.
- `prefetch={false}`: 동적 경로는 prefetch 이득이 거의 없고, 변경이 속성 하나라 범위가 작다. e2e 로그 0건과 공개 정적 페이지 유지가 확인됐다는 보고와 일치한다. 타당한 선택이다.

## 신규 finding

### F-A (Low): `src/lib/blog/excerpt.ts` SKIP의 `"html"` 항목이 죽은 항목

- 위치: `src/lib/blog/excerpt.ts` 8-15행, 36행
- 근거: `html`은 36행에서 먼저 반환되어 `SKIP.has("html")` 분기에 도달하지 않는다. 블록 html(`<div>`)도 이제 공백이 되지만 최종 공백 접기로 무해하다. 하위 주석 `// 요약에서 뺄 노드, 코드 블록과 HTML과 이미지는 본문 문장이 아님`은 여전히 의도(HTML 내용은 요약 제외)를 설명하므로 오해 소지는 작다.
- 제안: SKIP에서 `"html"`을 빼거나 36행 주석에 "html은 SKIP보다 먼저 공백 처리"를 덧붙인다. 선택.

### F-B (Low): `/blog` 문자열 하드코딩 중복과 admin Pagination 부수 영향

- 위치: `src/components/layout/navbar.tsx` 47행, `src/components/layout/footer.tsx` 47행, `src/components/common/pagination.tsx`
- 근거: navbar와 footer가 `"/blog"` 리터럴 비교를 각각 가진다. 링크 목록이 늘어 동적 경로가 추가되면 같은 조건을 두 곳에서 고쳐야 한다. 또한 `Pagination`은 admin 블로그 목록(`src/app/admin/(console)/blog/page.tsx` 67행)에서도 쓰이므로 admin 페이지네이션 prefetch도 꺼진다. admin도 동적 렌더링이라 실해는 없다.
- 제안: 링크 항목 배열에 `prefetch: false` 필드를 두는 방식은 현 규모에서 과하다. 현 상태로 둬도 된다. 선택.

## 규칙 점검

- 주석: navbar/footer 주석과 `excerpt.ts` 주석 모두 명사형·비종결 구절(`~끔`, `~대체`)로 끝나고 한 줄 한 문장이며 em-dash가 없다. 사이클 한정 식별자(BUG/finding ID) 없음.
- 테스트: `__tests__/utils/blog-excerpt-page.test.ts`가 `@/lib/blog/excerpt`의 `postExcerpt`를 실제 import하고(7행) 로직 복제가 없다. 신규 2건이 F-1, F-2를 직접 검증한다. Link prefetch 변경은 단위 테스트가 없으나 속성 하나이고 e2e 로그로 검증됐으므로 허용.
- Tailwind·CSRF·race·props 항목: 이번 커밋 범위에 해당 변경 없음. 모든 호출부에 prefetch가 전달됨을 위에서 확인했다.

## 수정 필요 항목

없음(필수). F-A, F-B는 선택.
