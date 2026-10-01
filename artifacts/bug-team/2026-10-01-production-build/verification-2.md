# Turbopack 재검증 결과

2026-10-01 실제 실행 결과다. 이전 verification.md는 Webpack 전환 당시의 이력으로 보존한다.

| 검사 | 결과 |
| --- | --- |
| 기본 샌드박스의 Python 최소 TCP bind/listen | EPERM 재현 |
| 권한 확장 실행의 같은 최소 작업 | IPv4·IPv6 loopback 및 wildcard 주소 성공 |
| Node 직접 Next CLI Turbopack 실행 | 종료 코드 0 |
| pnpm Turbopack 실행 | 종료 코드 0 |
| .next 삭제 후 Turbopack 빌드 | 종료 코드 0, CSS 처리와 정적 페이지 생성 성공 |
| 기본 next build 복구 후 pnpm verify, 권한 확장 | 종료 코드 0 |
| 실제 sh .husky/pre-push, 권한 확장 | 종료 코드 0, 푸시는 하지 않음 |
| 두 전체 검증의 하네스·E2E | 각각 하네스 5건·E2E 16건 통과 |
| git diff --check | 통과 |

이번 해결은 빌드 명령의 실행 권한 조건을 바로잡은 것이다. 앱·의존성·훅 예외나 Webpack 대체 없이 기본 Turbopack으로 검증했다. 기본 샌드박스의 포트 제한은 여전히 존재하며 영구 설정을 바꾸지 않았다. 앞서 권한 확장으로 기록한 실패의 정확한 차이는 확인하지 못했다. 원격 CI와 Framer 시각적 비교는 미검증이다. 후속 변경은 미커밋이고 푸시하지 않았다.
