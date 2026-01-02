# P5 Dashboard 운영 매뉴얼

## 1. 시스템 개요
본 시스템은 Google Sheets를 데이터베이스로 사용하고, Google Apps Script(GAS)를 백엔드로, GCS(Google Cloud Storage)를 프론트엔드 호스팅으로 사용하는 하이브리드 웹 애플리케이션입니다.

## 2. 일일 운영 체크리스트
- [ ] **GCP Error Reporting 확인**: 지난 24시간 동안 발생한 신규 에러가 있는지 확인.
- [ ] **History 시트 데이터 확인**: 데이터가 정상적으로 쌓이고 있는지 확인.
- [ ] **API Quota 확인**: GAS 할당량(URLFetch, Email 등) 초과 여부 확인 (Google Cloud Console).

## 3. 정기 유지보수 (월간)
1. **데이터 아카이빙**
   - `History` 시트의 데이터 중 3개월 이전 데이터는 `Archive_yyyy` 시트로 이동.
   - 데이터가 50만 행을 초과할 경우 별도 스프레드시트로 백업.

2. **사용자 권한 검토**
   - `Users` 시트의 `lastLogin` 컬럼을 확인하여 3개월 이상 미접속 계정 비활성화 검토.
   - 퇴사자 계정 즉시 제거.

## 4. 장애 대응 가이드

### 상황 A: "서비스 접속 불가" (Frontend)
1. GCS 버킷 상태 확인: `gsutil ls gs://p5-dashboard-prod`
2. 이전 버전으로 롤백: `scripts/rollback.sh <GenerationID>`

### 상황 B: "API 오류 발생" (Backend)
1. Stackdriver Logging에서 에러 로그 검색 (`resource.type="project"`).
2. 최근 24시간 내 배포 내역 확인: `clasp deployments`
3. 롤백: `clasp deploy -i <ID> -V <Version>`

### 상황 C: "데이터가 저장되지 않음"
1. Google Sheets 락 걸림 여부 확인.
2. Apps Script 동시 실행 제한 확인 (최대 30명).
3. 긴급 시 `DEBUG_MODE`를 `true`로 변경하여 상세 로그 수집.

## 5. 배포 절차
1. `main` 브랜치에 코드 병합 (GitHub Flow).
2. GitHub Actions 자동 빌드 및 배포 모니터링.
3. 배포 후 스테이징 URL에서 핵심 기능(조회, 수정) 테스트.
