# 검증

- 원래 증상: 긴 admin 폼 하단에서 저장하면 결과 알림이 폼 상단에만 떠서 시야 밖에 있음.
- 수정 확인: `FormActionBar`가 `notice`를 받아 저장 버튼 옆에 결과 문구를 표시함. 사용처 3곳(profile·project·talk 폼) 모두 `notice` 전달.
- 회귀: 성공 문구는 `use-admin-form.ts`의 dirty 숨김 조건을 그대로 따름. 저장 중에는 문구를 숨김.

| 명령 | 결과 |
| --- | --- |
| `pnpm type-check` | 통과 |
| `pnpm exec vitest run` | 15개 파일, 188개 테스트 통과 |
| `pnpm exec biome check src/components/admin` | 통과 |

## 미검증

- 브라우저 확인 미실시. admin은 GitHub OAuth 로그인이 필요해 headless로 접근하지 못함. 사용자가 직접 확인 필요.
- 문구 전환 컴포넌트 테스트는 저장소에 컴포넌트 렌더 테스트 관례가 없어 추가하지 않음.
