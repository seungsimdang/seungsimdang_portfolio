# orchestrator 웹 검색 기록 - /projects 카드 16:9 (D3)

- 작성: orchestrator (2026-10-16), designer 결과와 대조하기 위한 독립 검색
- designer 결과가 나오면 이 문서 아래 "대조" 절에 항목별 일치·불일치·누락을 기록한다.

## 사용한 검색어

designer도 같은 주제로 검색하되 검색어는 독립적으로 정한다. 대조할 때 검색어 차이를 함께 본다.

- 실행: `fluid typography clamp container query units card title size best practice`
- 실행: `text over image gradient overlay contrast WCAG 1.4.3 background image text accessibility`
- 실행: `web.dev aspect-ratio CSS property cumulative layout shift images`
- 실행: `two column layout image card with text sidebar alignment sticky best practice responsive`
- 직접 열람: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- 사용자 거부로 미실행: `text over image card gradient scrim contrast accessibility best practice`, `CSS aspect-ratio prevent layout shift images cards web.dev` (위 2·3번째 검색어는 이 둘을 의도 없이 바꿔 쓴 것)

## 1. 이미지 위 텍스트 대비

- WCAG 1.4.3: 일반 텍스트 4.5:1, 큰 텍스트 3:1. 큰 텍스트는 18pt(약 24px) 또는 14pt 굵게(약 18.5px). 계산값은 반올림하지 않는다(4.499:1은 실패). 출처: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- 대비가 부족한 배경 이미지 위 텍스트는 실패 사례 F83. 대비는 텍스트가 실제로 놓이는 배경 기준으로 잰다. 그라디언트에 대한 별도 지침은 없어 텍스트가 놓이는 구간의 색으로 확인해야 한다. 출처: 위 W3C 문서
- 이미지와 텍스트 사이에 반투명 단색 층(예: 검정 약 60%)을 두면 대비 계산이 단순해진다는 2차 출처 권고. 이미지 위 텍스트는 자동 도구가 잡지 못하므로 여러 뷰포트에서 수동 확인 필요. 출처: https://testparty.ai/blog/wcag-1-4-3-contrast-minimum-2025-guide, https://wcag.dock.codes/documentation/wcag-success-criteria/wcag143

## 2. aspect-ratio와 레이아웃 시프트

- `aspect-ratio`로 이미지 로드 전에 상자 모양을 예약해 CLS를 막는다. 크기를 미리 알면 width/height 지정이 best practice. 지원: Chrome 88, Edge 88, Firefox 89, Safari 15. 출처: https://web.dev/articles/aspect-ratio
- 잘못된 width/height 쌍은 그 자체로 시프트를 만든다. 출처: https://corewebvitals.io/core-web-vitals/cumulative-layout-shift/images-and-media

## 3. 카드 제목 크기 스케일

- 카드처럼 뷰포트와 독립적으로 폭이 바뀌는 요소는 뷰포트 단위보다 컨테이너 쿼리 단위(`cqi`)가 맞다. `clamp()`의 선호값에 rem 항을 남겨야 확대·글꼴 설정에 반응한다(순수 vw/cqi는 WCAG 문제). 상한을 둔다. 출처: https://moderncss.dev/container-query-units-and-fluid-typography/

## 4. 2열 레이아웃(카드 + 요약)

- sticky 열은 반대 열이 충분히 길 때만 효과가 있고, 짧은 고가치 텍스트에 적합하다. 출처: https://designsystem.umd.edu/components/sticky-columns
- 넓은 주 열에는 이미지, 좁은 보조 열에는 보조 문구. 작은 화면에서는 한 열로 쌓는다. 출처: https://design.mutualofomaha.com/digital/templates/multi-column/
- 위 두 항목은 디자인 시스템 문서(2차 출처)이며 표준 근거는 아니다.

## 대조

대조 대상: `design-spec.md` 11절(웹 검색 기록)과 6절(D3 명세). 작성 2026-10-16.

### 검색어 차이

- 겹친 출처는 W3C 1.4.3 Understanding 문서 하나다. 나머지는 같은 주제를 서로 다른 출처로 찾았다.
- designer는 검색 9건(1차 출처 6건)과 실패 3건을 남겼다. orchestrator는 4건이며, 2건은 사용자 거부 뒤 검색어를 바꿔 실행했다.
- designer만 검색한 주제: MDN `aspect-ratio`의 auto 조건(4), 확대 대응 2.5배 규칙(5), tailwind-merge 임의 값 판정(8), Tailwind `@container`(9).

### 항목별 대조

| 주제 | 일치 | 불일치 | 누락 |
| --- | --- | --- | --- |
| 1. 이미지 위 텍스트 대비 | 4.5:1·3:1 기준, 큰 글자 정의, 실제 배경 기준 측정, 배경 이미지 실패 사례 | 없음 | designer 쪽: "계산값을 반올림하지 않는다"와 "자동 도구로 못 잡아 여러 뷰포트에서 수동 확인". 6.3의 임계값이 "약 0.535", "약 61.8%" 같은 근사값이므로 T09 실측은 반올림 없이 판정해야 한다 |
| 2. aspect-ratio와 CLS | `aspect-ratio`로 공간을 미리 확보하면 CLS가 없다(web.dev, 서로 다른 글) | 없음 | orchestrator 쪽: 폭·높이 중 하나가 auto여야 비율이 적용된다(MDN). 6.2(a)의 `lg:h-auto`가 이 조건 때문에 필요하다 |
| 3. 카드 제목 크기 | `cqi` 사용, `clamp` 선호값에 rem 항 유지, 상한 설정 | 없음 | orchestrator 쪽: 최대/최소 2.5배 이하 규칙(2차 출처). 6.2 값은 1.75rem~3rem(약 1.7배)이라 두 기록의 조건을 모두 만족한다 |
| 4. 2열 레이아웃 | 1차 표준 근거가 없다는 결론 | 없음 | designer 쪽: "sticky는 반대 열이 길 때만 효과"(UMD, 2차). 6.6의 "요약이 카드보다 길면 카드가 행 안에서 따라온다"는 이 조건과 맞는다 |

### designer 미확인 항목 실측 (tailwind-merge 3.7.0, 저장소 `node_modules`)

`cn`과 같은 `twMerge`로 확인했다.

- `twMerge("text-4xl md:text-5xl lg:text-6xl", "lg:text-[length:clamp(...)]")` → `lg:text-6xl`이 지워짐. 타입 힌트 없는 `lg:text-[clamp(...)]`도 글자 크기로 판정해 `lg:text-6xl`을 지운다.
- `twMerge("p-32 md:p-48 lg:p-64", "lg:p-[clamp(...)]")` → `lg:p-64`가 지워짐.
- 따라서 11.1의 8번 우려(색으로 오판)는 이 버전에서는 생기지 않는다. 6.2(b)의 조건 분기 방식은 그대로 써도 결과가 같다.
- `twMerge("h-card", "h-card-tall")` → 둘 다 남음. `@theme`의 `--spacing-card*` 같은 사용자 정의 토큰은 높이 그룹으로 인식되지 않는다.
  - 6.2(a) 표의 "`h-card` 하나만 남음"은 사실과 다르다. 같은 클래스가 두 번 들어갈 뿐이라 화면 영향은 없다.
  - `lg:h-card-tall`을 남기면 `lg:h-auto`와 함께 남는다. 이때 어느 쪽이 이기는지는 CSS 순서로 정해지며 "75vh가 이김"은 확인하지 않았다. 명세가 `lg:h-card-tall` 삭제를 지시하므로 결론은 바뀌지 않는다.
- `lg:@container`의 CSS 생성 여부와 sticky 영향은 이번 대조에서 확인하지 않았다. 6.2(a)에 T05 확인 항목으로 남아 있다.

### 결론

- 두 기록 사이에 결정을 바꿀 불일치는 없다.
- T05·T09 전달 사항:
  - T05는 tailwind-merge 오판을 피하려는 별도 처리가 필요 없다. `lg:h-card-tall`은 반드시 삭제한다(사용자 정의 토큰은 병합으로 지워지지 않음).
  - T09는 대비를 반올림 없이 판정하고, 이미지 위 텍스트를 375·1024·1440에서 수동으로 확인한다.
