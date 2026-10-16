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

(designer 결과 수령 후 작성)
