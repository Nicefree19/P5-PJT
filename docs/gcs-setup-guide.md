# GCS 배포 설정 가이드

## 1. 사전 요구사항

- Google Cloud 프로젝트 생성
- gcloud CLI 설치: https://cloud.google.com/sdk/docs/install
- 프로젝트 인증: `gcloud auth login`

## 2. GCS 버킷 생성

```bash
# 버킷 생성 (서울 리전)
gcloud storage buckets create gs://p5-dashboard-prod \
  --location=asia-northeast3 \
  --uniform-bucket-level-access

# 공개 액세스 허용
gcloud storage buckets add-iam-policy-binding gs://p5-dashboard-prod \
  --member=allUsers \
  --role=roles/storage.objectViewer

# 정적 웹사이트 설정
gcloud storage buckets update gs://p5-dashboard-prod \
  --web-main-page=index.html \
  --web-error-page=index.html
```

## 3. CORS 설정

```bash
gsutil cors set gcs-cors.json gs://p5-dashboard-prod
```

## 4. 수동 배포

```bash
# 빌드
npm run build

# 배포
gsutil -m rsync -r -d dist/ gs://p5-dashboard-prod/
```

## 5. 접속 URL

```
https://storage.googleapis.com/p5-dashboard-prod/index.html
```

## 6. GitHub Actions 시크릿 설정

GitHub Repository > Settings > Secrets and variables > Actions:

| Secret Name | 설명 |
|-------------|------|
| `GCP_SA_KEY` | GCP 서비스 계정 JSON 키 |
| `CLASPRC_JSON` | clasp 인증 정보 (~/.clasprc.json 내용) |

### 서비스 계정 키 생성

```bash
# 서비스 계정 생성
gcloud iam service-accounts create p5-dashboard-deployer \
  --display-name="P5 Dashboard Deployer"

# 권한 부여
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:p5-dashboard-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# 키 생성
gcloud iam service-accounts keys create gcp-sa-key.json \
  --iam-account=p5-dashboard-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

`gcp-sa-key.json` 내용을 GitHub Secret `GCP_SA_KEY`에 등록합니다.
