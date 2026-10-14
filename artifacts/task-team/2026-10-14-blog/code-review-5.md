# 코드 리뷰 5 (T07 범위 한정 재리뷰, 커밋 f1bc8d7)

CodeRabbit 교차검토는 재작업 재리뷰 지시이므로 생략하고 자체 리뷰만 수행했다. pnpm 명령은 실행하지 않았고, 순회 로직은 node 스크립트로 동작만 확인했다(저장소 변경 없음).

## 판정: 통과

이전 finding과 QA 결함이 모두 해결됐고 신규 finding은 Low 3건(선택)이다.

## 이전 finding 해결 여부

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| N-1 식별자 훼손 | 해결 | `use_state`, `a*b`가 mdast text 노드 값 그대로 유지됨. 테스트 추가됨 |
| N-2 닫히지 않은 코드 펜스 | 해결 | 파서가 `code` 노드로 만들고 SKIP에서 제외 |
| N-2 부등호 문장 | 해결 | `a < b` 가 html 노드로 오인되지 않고 text로 남음 |
| N-2 참조형 링크 | 해결 | `linkReference`는 자식 텍스트만, `definition`은 SKIP |
| N-3 이모지 절단 | 해결 | `Array.from`으로 코드 포인트 단위 절단 (`src/lib/blog/excerpt.ts` 41-47행) |
| QA 결함 1 이미지 URL 괄호 | 해결 | `src/lib/admin-client/post-editing.ts` 11-18행 `%28`/`%29`, 공백 `%20`. 테스트 추가됨 |
| QA 결함 2 꺾쇠 표기 | 해결 | `src/lib/blog/migration/replace-image-urls.ts` 105-107행, 꺾쇠로 시작하면 새 URL도 감쌈. 테스트 추가됨 |

## 신규 finding

### F-1 (Low): 하드 줄바꿈(break)과 인라인 html 때문에 단어가 붙음

- 위치: `src/lib/blog/excerpt.ts` 19-30행
- 근거: `break` 노드는 value와 children이 없어 빈 문자열이 된다. 부모가 paragraph(INLINE)라 구분자도 없다. 실측 결과 `"line  \nbreak"`가 `"linebreak"`, `"a<br>b"`가 `"ab"`가 된다. 한국어는 영향이 작지만 영어 단어가 붙는다.
- 제안: `toText` 맨 앞에 `if (node.type === "break") return " ";`를 추가한다. 인라인 `html`도 공백으로 바꾸려면 SKIP 대신 `" "`를 반환한다. 필수 아님.

### F-2 (Low): 각주 정의 본문이 요약에 들어감

- 위치: `src/lib/blog/excerpt.ts` 8행 SKIP
- 근거: remark-gfm의 `footnoteDefinition`은 SKIP·INLINE에 없어 자식이 블록으로 순회된다. 실측 `"a[^1] b\n\n[^1]: 각주내용"`이 `"a b 각주내용"`이 된다. 본문 앞부분이 아니라 문서 말미 각주가 160자 안에 들어오는 짧은 글에서만 보인다. `footnoteReference`는 value가 없고 자식도 없어 빈 문자열이라 문제없다.
- 제안: SKIP에 `"footnoteDefinition"`을 추가한다.

### F-3 (Info/Low): 표·목록·인용·frontmatter 처리와 렌더 비용

- 표와 목록과 인용은 INLINE에 없는 블록 노드가 공백으로 이어져 `a b 1 2`, `하나 둘 인용`으로 정상 추출된다. 체크리스트(`- [ ]`)도 마커 없이 텍스트만 남는다. `strong` 등 분류 누락은 없다. 목록의 `listItem`은 자식이 paragraph 하나라 공백 구분만 추가돼 무해하다.
- frontmatter: remark-gfm은 YAML을 파싱하지 않아 `---\ntitle: x\n---`가 `title: x 본문`이 된다. DB 본문은 이관 시 frontmatter가 분리되므로(이전 사이클 산출물 기준) 실제 영향은 없고, 렌더러도 동일하게 다룬다. 조치 불필요.
- 서버 비용: 상세 페이지 `generateMetadata`에서 파싱이 1회 추가된다. 본문 렌더 파싱과 합쳐 요청당 2회지만 `loadPost`는 `getPublicPost` 호출이 두 번이고 이는 이 diff 이전부터 있던 구조다. 블로그 글 길이에서 mdast 파싱은 수 ms 수준이라 수용 가능하다. 최적화는 불필요하다.
- `MdNode` 구조 타입: `@types/mdast`가 직접 의존성이 아니고 필요한 필드가 3개뿐이라 구조 타입이 타당하다. `tree as MdNode` 캐스트는 Root가 구조적으로 호환돼 안전하다.
- `unified()` 프로세서를 호출마다 새로 만든다. `render-markdown.tsx`, `replace-image-urls.ts`는 모듈 상단에 상수로 둔다. 일관성을 위해 `excerpt.ts`도 모듈 상수 `parser`로 올리면 좋지만 필수 아님.

## 규칙 점검

- 주석: 명사형·비종결 구절로 끝나고(`~않음`, `~변환`, `~자름`, `~유지`), 한 줄 한 문장이며 em-dash 없음. 사이클 한정 식별자(BUG/finding ID) 없음. `// 요약에서 뺄 노드, 코드 블록과 HTML과 이미지는 본문 문장이 아님`은 쉼표로 이은 한 문장이라 허용 범위다.
- 기존 `ponytail:` 근사 주석은 제거돼 실제 구현과 일치한다.
- 테스트: `__tests__/utils/blog-excerpt-page.test.ts`, `blog-post-editing.test.ts`, `blog-image-migration.test.ts` 모두 `@/lib/...` 실제 소스를 import한다. 로직 복제 없음. 신규 케이스가 N-1~N-3와 QA 결함 2건을 각각 직접 검증한다.
- 다른 정의의 동시 수정 확인: URL 이스케이프 유사 로직은 `post-editing.ts`의 `escapeUrl` 한 곳이다.

## 수정 필요 항목

없음(필수). F-1, F-2는 선택적 개선.
