# improvement-log: Jekyll 블로그 DB 이관과 블로그 기능

- 작성: orchestrator, 2026-10-14

## 이번 사이클에서 드러난 점

- 리뷰어가 코드 읽기만으로 "이번 변경과 무관"이라 판단한 서버 로그(`The destination stream closed early`)가 develop 기준 e2e 대조에서 이번 변경 원인으로 드러남. 로그·런타임 이상의 원인 판정은 기준 브랜치 실행 결과와 대조한 뒤에만 확정해야 함.
- 이미지 링크 확인을 순차 `curl -L`로 짜서 5분 넘게 걸림. 원본이 로컬에 있는 자기 저장소 링크는 파일 대조로, 외부 링크만 병렬 확인하면 수십 초로 끝남.
- T05/T06이 서로의 심볼에 의존해 각 worktree 단독으로는 type-check·knip이 실패함. 각 worktree에 따로 커밋하지 않고 diff를 메인 체크아웃에 적용해 합친 상태로 검증·커밋함.
- pre-commit react-doctor가 warning도 차단(`--blocking warning`)하는데 구현자 검증 명령에 react-doctor가 없어 커밋 시점에 처음 걸림. 구현자 스폰 지시문에 `react-doctor --staged --blocking warning`을 넣은 뒤로는 재발하지 않음.
- 구현자 worktree에 `node_modules` 심볼릭 링크가 생겨 `git add -A`로 diff를 뽑으면 함께 들어갈 위험이 있었음. 변경 파일 경로를 지정해 diff를 추출함.
- nonce CSP처럼 렌더링 방식 전체를 바꾸는 조치는 finding 포함 결정만으로 진행하지 않고, 문서로 영향(정적 생성·ISR·CDN 캐시 상실)을 확인해 방식을 다시 결정받음.
- summary에 orchestrator 검증 기록을 남기지 않아 최종 리뷰가 이미 수행한 e2e·CSP 확인을 공백으로 지적함(R-1). 병합·재작업 검증 결과는 즉시 summary에 기록해야 함.
- 리뷰어 지시문에 "구현 단계는 새 테스트를 작성하지 않음, 신규 테스트는 T09"를 넣지 않아 1차 리뷰가 단위 테스트 부재를 High로 올림(F-1 기각). 리뷰어 지시문에 Task 계약의 테스트 담당을 명시해야 함.
