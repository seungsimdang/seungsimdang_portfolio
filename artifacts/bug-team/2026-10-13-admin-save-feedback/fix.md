# 수정 요약 2026-10-13-admin-save-feedback

## 변경 파일
- src/components/admin/form-parts.tsx: FormActionBar에 notice prop 추가, 저장/취소 옆에 짧은 결과 문구 표시 (성공 "저장됨", 실패 "저장 실패 (상세는 위 알림 참고)"), aria-hidden, saving 중 숨김
- src/components/admin/profile-form.tsx, talk-form.tsx, project-form.tsx: notice={form.notice} 전달 (FormActionBar 사용처는 이 3곳이 전부)

## 원인과의 연결
알림은 폼 상단, 저장 버튼은 하단 sticky라 긴 폼에서 알림이 시야 밖이었음. 하단 바에 요약 문구를 두어 저장 버튼 근처에서 결과 확인 가능. 상단 FormStatus는 유지.

## 검증
- pnpm type-check: 통과
- pnpm exec vitest run: 15 files, 188 tests 통과
- pnpm exec biome check --write src/components/admin: 포맷 적용 후 통과
- 신규 테스트 생략: __tests__는 api/lint/schemas/utils뿐, 컴포넌트 렌더 테스트 관례 없음

## 미검증
- 브라우저에서 실제 표시 확인 안 함
