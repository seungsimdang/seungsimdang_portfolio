# 적용 변경

package.json의 build를 next build --webpack으로 변경하고 build:turbopack을 별도로 보존했다. 개발 서버의 기본 설정은 유지했다. README와 검증 규칙에 빌더 차이와 권한 오류의 미해결 범위를 명시했다.

설치된 Next.js CLI 문서와 https://nextjs.org/docs/app/api-reference/cli/next 에서 --webpack 지원을 확인했다. verify·pre-push·CI가 pnpm build를 호출하므로 동일한 프로덕션 빌드를 검사한다. 이는 빌드 경로 변경이며 Turbopack 포트 권한 제한의 해결은 아니다. 의존성·7일 정책·훅 검사는 완화하지 않았다.
