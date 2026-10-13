# 코드 재리뷰 5차 (범위: git diff 24e9fb0 23e900f, portfolio-admin-service.ts)

재작업 재리뷰이므로 CodeRabbit 교차검토는 생략함(CodeRabbit 미실행: 재작업 diff 한정 리뷰 지시).

## (a) 이전 finding 해결 여부

- CR4-01: 해결. 테이블별 `pg_advisory_xact_lock`을 같은 batch 트랜잭션 안에서 먼저 잡고 count 검사와 insert를 이어서 실행하므로 동시 생성이 직렬화됨. READ COMMITTED에서 문장마다 새 스냅샷을 쓰므로 락 획득 후 count가 선행 트랜잭션의 커밋을 반영함. 상한 초과 시 batch 전체가 롤백됨.
- 확인 근거: `node_modules/drizzle-orm/neon-http/session.js` batch는 각 문장을 `client.transaction`으로 한 요청에 묶어 실행(단일 트랜잭션). `db.execute()`가 반환하는 `PgRaw`는 `_prepare/getQuery/isResponseInArrayMode/mapResult`를 구현해 batch에 포함 가능. `tsc --noEmit` 오류 없음.

## (b) 신규 검토 결과

- 락/가드 정확성: 통과. 락 키는 파라미터 바인딩(`$1`)이며 단일 인자 `pg_advisory_xact_lock`은 bigint 오버로드로 해석됨. 다른 곳에서 advisory lock 사용 없음(키 충돌 없음). 프로젝트와 발표는 별도 키라 서로 막지 않음.
- SQL 인젝션: 없음. `lockKey`, `ORDER_SLUGS_MAX`는 `sql` 템플릿 파라미터로 바인딩되고 `${table}`은 drizzle 테이블 객체(식별자 인용)로 렌더링됨. 사용자 입력이 가드 SQL에 들어가지 않음.
- `1/(c-c)` 가드: `where c >= 100`을 통과한 행에서만 select list가 평가되므로 상한 미만이면 오류 없음. `c`는 컬럼 참조라 상수 폴딩되지 않음.
- createTalk: `results.at(-1)`은 insert returning의 mapResult 결과(행 배열)이며 마지막 문장이 insert라 인덱스가 맞음. 가드 문장 개수가 바뀌어도 `at(-1)`이라 안전. "insert returned no row" 오류도 catch에서 `mapCreateError`로 그대로 재던져짐.
- experiences 0개 프로젝트: 가드 2개 + projects insert만 batch에 들어가고 experiences insert는 `length > 0`일 때만 추가되어 정상.
- 주석 규칙: 명사형 종결(`둠`, `함`), em-dash 없음, 사이클 식별자 인용 없음. 줄 끝 조사/연결어미 위반 없음.

## 신규 finding

### CR5-01 (Info) 22012를 상한 초과로 일괄 매핑

- 파일: `src/services/portfolio/portfolio-admin-service.ts:136-141`
- 근거: `mapCreateError`가 SQLSTATE 22012만 보고 `LimitExceededError`로 변환함. 현재 batch 안에서 0으로 나눌 수 있는 문장은 가드뿐(insert 값은 문자열/배열/순번 서브쿼리)이라 오매핑 경로는 없음. 다만 향후 같은 batch에 나눗셈이 있는 문장이 추가되면 오매핑 가능.
- 제안: 조치 불필요. 필요해지면 가드를 `raise exception`(별도 SQLSTATE)이나 전용 메시지 매칭으로 교체.

### CR5-02 (Info) 상한 검사 동작에 대한 자동 테스트 없음

- 근거: 가드 롤백/에러 매핑을 검증하는 테스트가 저장소에 없음(`LimitExceeded` 참조는 route/admin-route/service뿐). DB 의존이라 단위 테스트가 어려워 수동 확인 대상.
- 제안: 선택 사항.

## 판정

통과. Critical/High/Medium 없음, 신규는 Info 2건(조치 선택).
