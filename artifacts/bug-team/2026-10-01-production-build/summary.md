# Turbopack 포트 권한 재검증 완료

최신 근거는 localize-2.md·fix-2.md·verification-2.md다. 기본 샌드박스의 최소 TCP bind도 EPERM으로 실패했고, 권한 확장 실행에서는 성공했다. 캐시 없는 Turbopack 빌드와 pnpm 경로의 빌드도 통과했다.

이전 Webpack 전환을 철회하고 기본 next build를 복구했다. 권한 확장 실행에서 pnpm verify와 실제 pre-push 전체가 각각 통과했고, 하네스 5건·E2E 16건을 확인했다. README·검증 규칙에 실행 권한 조건을 명시했다.

영구 샌드박스 설정은 변경하지 않았다. 기본 제한 환경의 포트 거부는 그대로 존재한다. 이전 권한 확장 실패의 정확한 차이는 확인하지 못했다. 커밋·푸시하지 않았고 사용자가 제거한 artifacts/work ignore 규칙을 유지했다. 이전 단계 문서는 이력으로 보존한다.
