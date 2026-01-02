# P5 Dashboard 버전 관리 및 롤백 가이드

## 1. 버전 관리 전략

### Frontend (GCS)
GCS Object Versioning을 사용하여 `index.html` 및 정적 자산의 모든 수정 버전을 보존합니다.
- **배포 시**: 새 파일이 덮어씌워지면 이전 파일은 'Archived' 상태로 보존됨.
- **보존 기간**: 최근 7일 또는 30개 버전 (Lifecycle Policy로 관리 권장).

### Backend (GAS)
GAS 자체의 버전 관리 (`clasp version`)를 사용합니다.
- **버전 생성**: `clasp push` 후 `clasp version "Description"` 명령으로 불변 스냅샷 생성.
- **배포**: `clasp deploy -i <deploymentId> -V <versionNumber>` 로 특정 버전 서빙.

---

## 2. 롤백 절차 (Rollback)

### 시나리오 A: Frontend 롤백 (치명적 UI 버그)

1. **버전 조회**
   ```bash
   gsutil ls -a gs://p5-dashboard-prod/index.html
   ```
   출력 예:
   ```
   gs://p5-dashboard-prod/index.html#1704090000123456  (v1.0)
   gs://p5-dashboard-prod/index.html#1704100000654321  (v1.1 - Current)
   ```

2. **롤백 실행**
   ```bash
   ./scripts/rollback.sh 1704090000123456
   ```
   또는 수동 명령:
   ```bash
   gsutil cp gs://p5-dashboard-prod/index.html#1704090000123456 gs://p5-dashboard-prod/index.html
   ```

### 시나리오 B: Backend 롤백 (API 오류)

1. **버전 조회**
   ```bash
   clasp versions
   ```

2. **이전 버전 재배포**
   ```bash
   # Deployment ID 확인
   clasp deployments
   
   # 특정 버전(예: 5)으로 되돌리기
   clasp deploy -i <DeploymentID> -V 5
   ```

---

## 3. GitHub Actions 롤백
CI/CD 파이프라인을 통해 간접 롤백할 수도 있습니다.
1. GitHub에서 `Revert` PR 생성 및 머지.
2. `main` 브랜치에 푸시되면 자동으로 이전 코드로 빌드 및 배포됨.
**가장 권장되는 방식**입니다 (코드와 배포 상태 일치).
