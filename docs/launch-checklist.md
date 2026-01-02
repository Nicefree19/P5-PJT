# 프로덕션 런칭 최종 체크리스트

## 1. 보안 (Security)
- [ ] `DASHBOARD_CONFIG` 내 `API_KEY`가 강력한 난수(32자 이상)로 설정되었는가?
- [ ] `Users` 시트에 초기 관리자(Admin) 계정이 1명 이상 등록되었는가?
- [ ] `ALLOWED_DOMAINS`가 회사 도메인(예: samsung.com)으로 제한되었는가?
- [ ] GCP OAuth Consent Screen이 'Internal' 또는 승인된 상태인가?

## 2. 인프라 (Infrastructure)
- [ ] GCS 버킷(`gs://p5-dashboard-prod`)이 생성되고 공개 액세스가 허용되었는가?
- [ ] GCS CORS 설정이 적용되었는가? (`gsutil cors set ...`)
- [ ] GitHub Repository Secrets (`GCP_SA_KEY`, `CLASPRC_JSON`)가 등록되었는가?

## 3. 기능 (Functionality)
- [ ] GIS 로그인 버튼이 정상적으로 표시되고 동작하는가?
- [ ] 로그인 후 데이터 로딩(API 호출)이 3초 이내에 완료되는가?
- [ ] 기둥 상태 변경 시 Toast 메시지가 뜨고 시트에도 반영되는가?

## 4. 운영 (Operations)
- [ ] 운영 담당자가 `docs/operations.md` 내용을 숙지했는가?
- [ ] 롤백 스크립트(`scripts/rollback.sh`) 실행 권한이 있는가?
- [ ] 비상 연락망이 확보되었는가?
