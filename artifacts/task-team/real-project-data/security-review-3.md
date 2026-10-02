# security-review-3: 사이클 전체 최종 보안 리뷰

- 범위: next.config.ts, src/app 전 페이지, layout, common/layout/ui 컴포넌트, constants, types
- 제외(결정 완료): CSP, 이메일·사내 프로젝트 내용 공개, 배포 도메인 seungsimdang.vercel.app

## 판정: 배포 승인 (Critical 0, High 0, Medium 0, Low 0, Info 2)

## 점검 결과

| 항목 | 결과 |
| --- | --- |
| XSS | `dangerouslySetInnerHTML`, `innerHTML`, `eval` 사용 없음. 모든 데이터는 JSX 텍스트로 렌더링되어 자동 이스케이프. word-cycler 측정 span은 `textContent`만 사용 |
| 외부 링크 | external-link.tsx:17-18, button.tsx:34, footer.tsx:56-59, contact/page.tsx:49-50 모두 `target="_blank"`에 `rel="noopener noreferrer"` 적용 |
| 링크 URL 출처 | href는 모두 `portfolio-data.ts` 정적 상수. 사용자 입력·쿼리스트링 유래 URL 없음, `javascript:` 스킴 유입 경로 없음 |
| 동적 라우트 | work/[id]/page.tsx:17 `dynamicParams = false` + `generateStaticParams`로 허용 id를 정적 목록에 한정. 미일치는 `notFound()` |
| 입력·인증 | 폼, API Route, 쿠키, 인증 로직 없음(정적 사이트). SQLi·CSRF 해당 없음 |
| 시크릿 | `process.env`는 layout.tsx:7-8의 `VERCEL_PROJECT_PRODUCTION_URL`(Vercel 공개 시스템 변수)뿐. 키·토큰 하드코딩 없음. portfolio-data.ts:176의 `NEXT_PUBLIC_IMAGE_BASE_URL`은 서술 텍스트이며 값 아님. Google Drive 링크 2건은 공유용 공개 링크로 의도된 노출 |
| 보안 헤더 | next.config.ts:9-11 X-Frame-Options DENY, nosniff, Referrer-Policy 적용. HSTS는 Vercel이 기본 제공 |
| 이미지 | `next/image`는 로컬 `/images/projects/globber/thumbnail.png`만 사용(파일 존재 확인). `remotePatterns` 미설정이라 외부 이미지 최적화 오남용 경로 없음 |
| 메타데이터 | metadataBase는 환경변수 또는 확정 도메인 폴백. 페이지별 canonical은 상대 경로 |
| 의존성 | 신규 런타임 의존성 추가 없음(import는 next, react, 내부 모듈뿐) |
| WordCycler | 전역 `mountedIds` 제거 확인(3262fcb). 모든 effect가 cleanup으로 interval, timeout, observer, 리스너 해제 |

## Findings

### SEC3-I1 (Info) Permissions-Policy 미설정
- 위치: next.config.ts:9-11
- 근거: 카메라·마이크·위치 등 브라우저 기능을 쓰지 않는 정적 사이트이며 서드파티 임베드도 없어 실제 위험 없음.
- 제안: 선택 사항. 추가한다면 `{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }`. 조치 불필요.

### SEC3-I2 (Info) 외부 링크 mailto 앵커의 rel 부재
- 위치: footer.tsx:54-61, contact/page.tsx:34
- 근거: mailto는 새 탭을 열지 않아 `rel` 불필요. 문제 아님을 확인한 기록.
- 제안: 조치 불필요.

## 결론

Critical/High 없음. 인증·입력 경로가 존재하지 않는 정적 사이트이고 외부 링크 처리와 라우트 제한이 적절하다. 배포 승인.
