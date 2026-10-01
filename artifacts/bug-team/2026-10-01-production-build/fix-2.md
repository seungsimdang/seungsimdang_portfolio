# 기본 Turbopack 복구

내부 포트 생성 권한을 허용한 실행에서 실제 Turbopack 빌드가 통과했다. 이전 Webpack 전환은 이 실행 환경에서 필수 해결책이 아니었으므로 되돌렸다.

package.json의 build는 next build로 복구하고 이번에 임시 추가한 build:turbopack은 제거했다. README·검증 규칙에 실행기 권한 조건을 명시했다. 앱 코드·의존성·7일 정책·Git 훅은 이번 조사로 변경하지 않았다. verify와 실제 pre-push는 권한 확장 실행으로 검사한다.
