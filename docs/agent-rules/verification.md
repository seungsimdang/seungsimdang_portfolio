# 검증 기준

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm type-check
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm verify`는 정적 검사 → 타입 검사 → 빌드 → 브라우저 테스트를 실행한다. E2E는 빌드된 앱을 `127.0.0.1:3100`에서 시작하므로 먼저 빌드한다. Chromium은 최초 한 번 설치한다. 테스트 서버 포트는 다른 서버와 공유하지 않는다.

검사는 기존 페이지 렌더링, 내부 탐색, 404와 WordCycler 텍스트 순환을 데스크톱과 모바일 크기에서 확인한다. Framer 원본과 시각적 일치, 외부 링크, 상세 페이지와 문의 전송을 보장하지 않는다. 문의 폼은 현재 콘솔 출력만 수행한다.

실제 실행한 명령과 결과를 기록한다. 실패는 코드 오류와 네트워크·권한 등 환경 오류로 구분한다. 미실행·차단을 통과로 기록하거나 훅·검사를 우회하지 않는다. 디자인 변경 시 원본과 같은 대상·배율의 화면을 비교하고 미검증 범위를 명시한다.
