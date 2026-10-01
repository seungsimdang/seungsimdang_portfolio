# 원인 확인 범위

2026-10-01 권한 확장 실행에서도 실패를 재현했다. panic 로그는 app/globals.css → PostCssTransformedAsset → evaluate_webpack_loader → 새 프로세스 생성 → 포트 바인딩 → Operation not permitted 순서다. 로그: /private/var/folders/n_/xbjq_xxn37bb9538lq7m12y80000gn/T/next-panic-79dfc09d91749d92ad308ff3ab6b153.log.

확인된 실패 지점은 내부 포트 생성이다. 정확히 어떤 운영체제·실행기 정책이 거부했는지는 확인하지 못했다. 이 로그만으로 Next.js 자체 결함이라고 단정하지 않는다. 기존 Webpack 빌드 성공 기록이 있어 지원되는 대안으로 검증한다.
