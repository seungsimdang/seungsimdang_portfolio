# improvement-log: 2026-10-12 admin CMS 사이클

- `git-safety-guard.sh`의 새 브랜치 차단이 `git branch -a` 줄 수(원격 포함)로 판정해, worktree 1개·다른 세션 없음 상태에서도 차단. 로컬 브랜치·worktree 기준으로 좁히는 검토 필요
- T05가 T06의 타입·서비스 계약에 의존해 병렬 실행 시 단독 type-check 불가. api-spec이 공통 계약 파일을 T06 소유로 둘 때는 순차 실행을 기본으로 두는 편이 단순
- T06 단독 상태는 knip·type-check 실패로 pre-commit을 통과할 수 없어, 커밋 대신 패치 파일로 T05 worktree에 전달. 구현자 간 미커밋 변경 전달 절차를 SKILL.md에 명시하는 검토 필요
- `react-doctor:staged` 경고가 병합 후 첫 커밋에서야 드러남. 구현자 검증 목록에 `pnpm react-doctor:staged`를 기본 포함
- 구현자 다수가 존재하지 않는 `pnpm fix-all` 실행을 시도. 역할 카드나 스폰 프롬프트의 스크립트 이름 확인 필요
- 리뷰 지적 Low를 모두 포함하기로 하면서 재리뷰가 5차까지 진행. Low 일괄 결정 시점을 최종 리뷰 1회로 모으는 운영 검토
- 미푸시 상태에서 `ci.yml`의 DB 의존(빌드·e2e)이 api-spec 12절에 있었으나 구현 범위에서 누락. 소유 경계 표에 있는 파일의 실제 변경 여부를 병합 시 대조
