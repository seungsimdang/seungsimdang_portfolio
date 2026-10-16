# 썸네일 운영 데이터 반영 계획

- 상태: 준비, 미실행. PC·모바일 목록 구현 및 검증과 운영 반영을 구분함.
- 운영 DB 직접 확인(2026-10-16): 아직 단일 `thumbnail` 컬럼만 존재하며 `thumbnails`·`mobile_thumbnails`는 없음. SEMT·DPM Core의 현재 단일 썸네일은 null임.
- 운영 코드가 구 컬럼을 사용하므로, 0005~0008 적용과 배포 순서를 승인받기 전에 운영 스키마를 변경하지 않음. 0006 컬럼 제거가 구 운영 코드 요청을 실패시킬 수 있다는 기존 D1 재확인 게이트 유지.

| 프로젝트 | 현재 기본 이미지 | 변경 후 기본(PC) | 변경 후 모바일(순서) |
| --- | --- | --- | --- |
| SEMT | 없음 | `~/Downloads/SEMT 썸네일 1920×1080@1x.png` | `~/Desktop/SEMT-6.9-inch-Screens/03-03.png`, `02-02.png`, `04-04-Know-each-hospital.png` |
| Candanta | 기존 Blob 1장 | `~/Downloads/Candanta 썸네일 1920×1080@1x.png` | 기존 Blob 1장 유지 |
| Globber | 기존 Blob 1장 | 기존 Blob 1장 유지 | `~/Downloads/Globber 모바일 1290×2796@1x.png` |
| DPM Core | 없음 | `~/Downloads/DPM Core 썸네일 1920×1080@1x.png` | `~/Desktop/DPM/1.webp`, `2.webp`, `3.webp`, `4.webp`, `5.webp`, `6.webp` |

## 확인한 원본

- SEMT·Candanta PC 파일은 1920×1080. SEMT 모바일 및 DPM Core 모바일은 모두 1290×2796.
- DPM Core 모바일 파일은 각각 약 439~594KB이며, 나머지 지정 파일까지 모두 4MB 업로드 제한 이내로 존재 확인함.
- 원본을 Vercel Blob의 `thumbnails/`에 업로드하고 반환 URL 순서대로 저장함. 임의 크롭·재인코딩 없이 PNG/WebP 원본을 사용함.
- Candanta 모바일로 보존할 URL: `https://mrum5ebtffuytyov.public.blob.vercel-storage.com/thumbnails/candanta-portfolio-pulse-QC7xyCwQllFG9WK31qHzNmesjRK3Ue.png`.
- Globber 기본으로 보존할 URL: `https://mrum5ebtffuytyov.public.blob.vercel-storage.com/thumbnails/globber-JKaiE94xrSJKvR9gD37vdkdVbrEp0d.png`.

## 실행 조건과 검증

1. 코드·보안 최종 리뷰 및 QA 결과 확정.
2. DPM Core PC 원본 수신 완료(2026-10-16 16:45, 1920×1080, 약 383KB). 사용자가 대화에 첨부한 이미지와 파일명·수신 시각으로 대응시킨 것이며 첨부 원본 경로는 직접 확인하지 못함.
3. 운영 배포·스키마 변경 및 기존 SEMT·Candanta·Globber 데이터 반영 승인. DPM Core 모바일 변경 자체는 이번 대화에서 사용자 지시를 받음.
4. 실행 직전 slug별 기존 값 재조회, 원본 업로드 후 실제 URL·이미지 크기 기록, 대상 네 프로젝트의 썸네일 목록만 변경.
5. 저장 결과 재조회 및 PC/모바일 공개 화면 확인. 이번 브랜치의 E2E mock 이미지 결과를 운영 원본 검증으로 대체하지 않음.
