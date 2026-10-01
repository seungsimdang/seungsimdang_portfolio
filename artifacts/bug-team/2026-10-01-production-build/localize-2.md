# 포트 권한 재조사

2026-10-01 같은 Python socket.bind(('127.0.0.1', 0)) + listen 최소 작업을 비교했다. 기본 샌드박스에서는 PermissionError(1, Operation not permitted), require_escalated에서는 성공했다. 권한 확장 실행은 ::1·0.0.0.0·::에서도 성공했다.

Node로 Next CLI를 직접 실행한 Turbopack 빌드와 pnpm build:turbopack이 성공했다. 생성물 .next를 삭제한 후 재실행한 pnpm build:turbopack도 성공해 기존 CSS 캐시만으로 오류를 피한 것은 아님을 확인했다.

확인된 결론: 이번 실행 조건의 EPERM은 제한된 실행 환경의 로컬 TCP 포트 생성 권한에 따라 달라진다. pnpm 자체 결함이라는 가설은 지지되지 않는다. 이전에 require_escalated로 기록한 실행이 왜 실패했는지는 확인하지 못했다.

OS 전체나 Codex의 영구 샌드박스 설정은 변경하지 않았다. 명령 단위의 권한 확장으로 검증했다. 기본 샌드박스로 실행하면 포트 생성은 여전히 거부된다.
