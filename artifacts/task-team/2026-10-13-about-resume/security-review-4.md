# 보안 재리뷰 4차 (T08)

## 1. 검토 범위

- security-review-3.md의 L-5 해결 여부
- 커밋 `c13ebde`의 신규 코드: `src/services/admin/rate-limit-service.ts`의 `secondsUntilNextAllowed`(:55-71)와 호출부(:40-52)
- 그 외 코드는 보지 않았다. 코드 수정 없음, 읽기만 수행.

## 2. 이전 finding 해결 여부

| finding | 판단 |
| --- | --- |
| L-5 Retry-After가 실제 허용 시점보다 이름 | 해결. 다음 요청의 +1 반영(`MAX - count - 1`), count 상한 초과 시 다음 버킷 분기로 전환하여 경계 재거부도 해소됨. |

## 3. 신규 finding

없음. 아래 Info 2건은 조치 불필요한 관찰이다.

- Info A: `Math.ceil` 직전 값이 부동소수점 오차로 정수 경계에서 미세하게 부족하면 재요청이 한 번 더 거부되고, 그때 최소 1초가 보장되어 수렴한다. 영향 없음.
- Info B: I-9(경계 수 ms 동시 요청으로 windowStart가 어긋남)가 발생하면 `elapsed`가 W를 넘거나 음수가 될 수 있다. 이 경우에도 결과가 `Math.max(1, ...)`로 보정되고 NaN은 생기지 않는다. 이미 triage-3에서 수용된 사항이다.

## 4. 결함 없음 확인 항목

1. 현재 버킷 분기 수식. 다음 요청은 count+1이고 시점 t에서 허용 조건은 `prev*(1 - t/W) + count + 1 <= MAX`이다. 정리하면 `t >= W*(1 - (MAX - count - 1)/prev)`이고, 대기는 `t - elapsed`이다(:67). 수식이 맞다.
2. 현재 버킷 분기 진입 조건 `count + 1 <= MAX && prevCount > 0`(:66). 분자 `MAX - count - 1`이 0 이상이 보장되어 t가 W를 넘지 않는다. `prevCount > 0` 조건이 0으로 나누기를 막는다.
3. 현재 버킷 분기 결과의 부호. 거부 상태에서는 `prev*(1 - elapsed/W) > MAX - count`이므로 `t > elapsed`가 성립한다. 즉 withinBucket은 양수다.
4. 분기 선택 `withinBucket < remainingInBucket`(:68). `count + 1 == MAX`이면 t가 W와 같아져 다음 버킷 분기로 넘어가고 결과가 동일하게 수렴한다. 정상이다.
5. 다음 버킷 분기 수식. 버킷이 넘어가면 prev=count, 새 count=1이다. 허용 조건은 `count*(1 - u/W) + 1 <= MAX`, 즉 `u >= W*(1 - (MAX - 1)/count)`이고 버킷 잔여를 더한다(:70). 수식이 맞다. `max(0, ...)`로 count <= MAX-1일 때의 음수 항을 막는다.
6. count=0 불가. upsert는 insert 시 1, 현재 버킷이면 +1, 그 외 1로만 설정한다(:26, :31). 거부 경로에 들어온 row.count는 항상 1 이상이어서 :70의 나눗셈은 0으로 나누지 않는다. count가 상한을 크게 넘는 경우도 값이 W 이내로 수렴한다.
7. NaN 가능성 없음. 입력이 모두 유한 수치이고(`elapsed`는 DB float8) 분모는 prevCount>0 또는 count>=1이다.
8. 최소 1초 보장. `Math.max(1, Math.ceil(...))`(:48-51)로 음수, 0, 소수 모두 1 이상 정수가 된다.
9. `Math.ceil`로 올림하여 이른 재시도가 없다. 현재 버킷 분기에서 올림 결과가 버킷 경계를 넘어도 그 시점에는 prev=count(<=59), count=1이라 추정치가 `count*(1 - u/W) + 1 <= 60`으로 허용된다.
10. 허용 판정(:42-45)과 Retry-After 계산이 같은 모델(prev*(rem/W) + count)을 쓴다. 두 식이 일치한다.

## 5. 최종 판정

통과. L-5는 해결되었고 신규 취약점이나 수식 결함은 없다. Critical/High/Medium/Low 모두 0건이며 배포 승인에 장애가 없다.
