# P5 Dashboard - 배포 가이드

**버전**: 2.1
**최종 업데이트**: 2026-01-02
**대상**: P5 복합동 메일 분석 시스템 + Dashboard API + Frontend

---

## 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [Frontend 배포 (GitHub Pages)](#frontend-배포-github-pages)
3. [Backend 배포 (Google Apps Script)](#backend-배포-google-apps-script)
4. [Script Properties 설정](#4-script-properties-설정)
5. [Dashboard 시트 초기화](#5-dashboard-시트-초기화)
6. [Web App 배포](#6-web-app-배포)
7. [트리거 설정](#7-트리거-설정)
8. [Frontend-Backend 연동](#8-frontend-backend-연동)
9. [테스트 및 검증](#9-테스트-및-검증)
10. [트러블슈팅](#10-트러블슈팅)
11. [보안 고려사항](#11-보안-고려사항)

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                    P5 Dashboard System v2.1                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   GitHub Pages                  Google Apps Script              │
│   ┌──────────────┐             ┌──────────────┐                 │
│   │   Frontend   │────REST────▶│   Backend    │                 │
│   │  (Vite SPA)  │◀────API─────│ DashboardAPI │                 │
│   └──────────────┘             └──────────────┘                 │
│         ▲                             │                          │
│         │                             ▼                          │
│   GitHub Actions              ┌──────────────┐                  │
│   ┌──────────────┐            │    Google    │                  │
│   │  gh-pages    │            │    Sheets    │                  │
│   │  Workflow    │            └──────────────┘                  │
│   └──────────────┘                    │                          │
│                                       ▼                          │
│                               ┌──────────────┐                  │
│                               │    Gmail     │                  │
│                               │   Gemini AI  │                  │
│                               └──────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

| 컴포넌트 | 호스팅 | URL 형식 |
|----------|--------|----------|
| Frontend | GitHub Pages | `https://<user>.github.io/<repo>/` |
| Backend API | Google Apps Script | `https://script.google.com/.../exec` |
| 데이터 | Google Sheets | N/A |

---

## Frontend 배포 (GitHub Pages)

### 자동 배포 (CI/CD)

`main` 브랜치에 푸시하면 자동으로 GitHub Pages에 배포됩니다.

**워크플로우**: `.github/workflows/gh-pages.yml`

```yaml
name: Deploy to GitHub Pages

on:
    push:
        branches: ["main"]

jobs:
    deploy-gh-pages:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: "20"
            - run: npm install
            - run: npm run build
            - uses: peaceiris/actions-gh-pages@v3
              with:
                  github_token: ${{ secrets.GITHUB_TOKEN }}
                  publish_dir: ./dist
```

### 수동 배포

```bash
# 빌드
npm run build

# dist/ 폴더 내용을 gh-pages 브랜치에 푸시
# (또는 peaceiris/actions-gh-pages가 자동 처리)
```

### GitHub Pages 설정

1. GitHub 저장소 → **Settings** → **Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `gh-pages` / `/ (root)`
4. **Save**

### 배포 URL

```
https://<username>.github.io/<repository-name>/
```

### Vite 설정

`vite.config.js`에서 상대 경로 설정:

```javascript
export default defineConfig({
  base: './',  // GitHub Pages 호환
  // ...
});
```

---

## Backend 배포 (Google Apps Script)

---

## 1. 사전 준비

### 1.1 필수 계정 및 권한

| 항목 | 설명 |
|------|------|
| Google 계정 | Gmail, Sheets, Apps Script 접근 필요 |
| Gemini API 키 | [Google AI Studio](https://aistudio.google.com/apikey)에서 발급 |
| Google Workspace | 조직 계정 사용 시 관리자 승인 필요할 수 있음 |

### 1.2 프로젝트 파일 구조

```
src/
├── Config.gs           # 전역 설정 상수
├── Code.gs             # 메인 진입점, 메일 분석 흐름
├── GmailFilter.gs      # Gmail 검색 및 필터링
├── GeminiAnalyzer.gs   # Gemini AI 분석
├── SheetWriter.gs      # 메일 분석 결과 기록
├── Utils.gs            # 유틸리티 함수
├── Tests.gs            # 테스트 함수
└── dashboard/
    └── DashboardAPI.gs # Dashboard REST API
```

### 1.3 Google Spreadsheet 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. 새 스프레드시트 생성: **"P5 Dashboard Data"**
3. URL에서 **Spreadsheet ID** 복사:
   ```
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```

---

## 2. 방법 A: 수동 배포

### 2.1 Apps Script Editor 열기

1. 생성한 스프레드시트에서 **확장 프로그램 > Apps Script** 클릭
2. Apps Script Editor 열림

### 2.2 파일 생성 및 복사

왼쪽 사이드바에서 **+** 버튼 → **스크립트** 선택:

| 로컬 파일 | Apps Script 파일명 |
|-----------|-------------------|
| `src/Config.gs` | Config |
| `src/Code.gs` | Code |
| `src/GmailFilter.gs` | GmailFilter |
| `src/GeminiAnalyzer.gs` | GeminiAnalyzer |
| `src/SheetWriter.gs` | SheetWriter |
| `src/Utils.gs` | Utils |
| `src/Tests.gs` | Tests |
| `src/dashboard/DashboardAPI.gs` | DashboardAPI |

각 파일의 내용을 복사하여 붙여넣기합니다.

### 2.3 appsscript.json 설정

**프로젝트 설정** (톱니바퀴) → **"appscript.json" 매니페스트 파일을 편집기에서 보기** 체크

```json
{
  "timeZone": "Asia/Seoul",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

---

## 3. 방법 B: clasp CLI 배포 (권장)

### 3.1 clasp 설치

```bash
npm install -g @google/clasp
```

### 3.2 Google 로그인

```bash
clasp login
```

브라우저에서 Google 계정 인증 진행

### 3.3 프로젝트 클론 또는 생성

**기존 프로젝트 연결:**
```bash
cd D:\00.Work_AI_Tool\11.P5_PJT\src
clasp clone {SCRIPT_ID}
```

**새 프로젝트 생성:**
```bash
clasp create --title "P5 Dashboard API" --type sheets --parentId {SPREADSHEET_ID}
```

### 3.4 .clasp.json 설정

```json
{
  "scriptId": "{YOUR_SCRIPT_ID}",
  "rootDir": "./src"
}
```

### 3.5 .claspignore 설정

```
**/**
!*.gs
!appsscript.json
```

### 3.6 푸시 및 배포

```bash
# 코드 업로드
clasp push

# 새 버전 배포
clasp deploy --description "v2.0 - Phase 6 완료"

# 배포 목록 확인
clasp deployments

# 실시간 로그 확인
clasp logs --watch
```

---

## 4. Script Properties 설정

### 4.1 필수 속성

Apps Script Editor → **프로젝트 설정** → **스크립트 속성**:

| 속성명 | 값 | 설명 |
|--------|-----|------|
| `GEMINI_API_KEY` | `AIza...` | Gemini API 키 |
| `SHEET_ID` | `1abc...xyz` | 메일 분석 결과 시트 ID |
| `DASHBOARD_SHEET_ID` | `1def...uvw` | Dashboard 데이터 시트 ID |
| `DEBUG_MODE` | `true` / `false` | 디버그 로그 활성화 |

### 4.2 설정 확인 함수

Apps Script Editor에서 실행:

```javascript
function checkScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  console.log('GEMINI_API_KEY:', props.getProperty('GEMINI_API_KEY') ? '✅ 설정됨' : '❌ 미설정');
  console.log('SHEET_ID:', props.getProperty('SHEET_ID') ? '✅ 설정됨' : '❌ 미설정');
  console.log('DASHBOARD_SHEET_ID:', props.getProperty('DASHBOARD_SHEET_ID') ? '✅ 설정됨' : '❌ 미설정');
  console.log('DEBUG_MODE:', props.getProperty('DEBUG_MODE'));
}
```

---

## 5. Dashboard 시트 초기화

### 5.1 초기화 함수 실행

Apps Script Editor에서:

1. **DashboardAPI.gs** 파일 선택
2. 함수 드롭다운에서 `initializeDashboardSheets` 선택
3. **실행** 클릭
4. 권한 승인 (최초 1회)

### 5.2 생성되는 시트 구조

| 시트명 | 용도 | 레코드 수 |
|--------|------|----------|
| `Zones` | 존 정의 (A/B/C/D) | 4개 |
| `Columns` | 기둥 데이터 (12행 × 69열) | 828개 |
| `Issues` | 이슈 트래킹 | 동적 |
| `History` | 변경 이력 | 동적 |
| `StatusCodes` | 상태 코드 정의 | 고정 |

### 5.3 초기화 검증

```javascript
function verifyInitialization() {
  const ss = SpreadsheetApp.openById(getDashboardSheetId_());
  const sheets = ['Zones', 'Columns', 'Issues', 'History', 'StatusCodes'];

  sheets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      console.log(`✅ ${name}: ${sheet.getLastRow()}행`);
    } else {
      console.log(`❌ ${name}: 시트 없음`);
    }
  });
}
```

---

## 6. Web App 배포

### 6.1 배포 설정

1. Apps Script Editor → **배포** → **새 배포**
2. **유형 선택** → **웹 앱**
3. 설정:
   - **설명**: `P5 Dashboard API v2.0`
   - **실행 계정**: `나`
   - **액세스 권한**: `모든 사용자` (또는 `Google 계정이 있는 모든 사용자`)
4. **배포** 클릭
5. **웹 앱 URL** 복사

### 6.2 URL 형식

```
https://script.google.com/macros/s/AKfycbx.../exec
```

### 6.3 버전 관리

```bash
# clasp으로 버전 배포
clasp deploy --description "v2.0.1 - 버그 수정"

# 이전 버전으로 롤백
clasp undeploy {DEPLOYMENT_ID}
clasp deploy --deploymentId {OLD_DEPLOYMENT_ID}
```

---

## 7. 트리거 설정

### 7.1 Gmail 자동 처리 트리거

Apps Script Editor → **트리거** (시계 아이콘):

| 설정 | 값 |
|------|-----|
| 실행할 함수 | `processLatestEmails` |
| 이벤트 소스 | 시간 기반 |
| 트리거 유형 | 분 타이머 |
| 간격 | 15분마다 |

### 7.2 Analysis Job 트리거

| 설정 | 값 |
|------|-----|
| 실행할 함수 | `checkAndRunAnalysisJob` |
| 이벤트 소스 | 시간 기반 |
| 트리거 유형 | 분 타이머 |
| 간격 | 5분마다 |

### 7.3 트리거 코드로 설정

```javascript
function createTriggers() {
  // 기존 트리거 삭제
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Gmail 처리 트리거 (15분)
  ScriptApp.newTrigger('processLatestEmails')
    .timeBased()
    .everyMinutes(15)
    .create();

  // Analysis Job 트리거 (5분)
  ScriptApp.newTrigger('checkAndRunAnalysisJob')
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log('✅ 트리거 설정 완료');
}
```

---

## 8. Frontend-Backend 연동

### 8.1 로컬 개발 서버

```bash
# Vite 개발 서버 (권장)
cd D:\00.Work_AI_Tool\11.P5_PJT
npm run dev

# 또는 프리뷰 서버
npm run preview
```

브라우저: `http://localhost:5173`

### 8.2 API 연결 설정

1. Dashboard 열기
2. 우측 상단 **설정** (톱니바퀴) 클릭
3. **Settings** 탭
4. **API URL** 입력: Web App URL
5. **Connect** 클릭

### 8.3 연결 테스트

브라우저에서 직접 테스트:

```
{WEB_APP_URL}?action=status
```

예상 응답:
```json
{
  "success": true,
  "message": "P5 Dashboard API v2.0",
  "timestamp": "2025-12-30T12:00:00+09:00"
}
```

---

## 9. 테스트 및 검증

### 9.1 API 엔드포인트 테스트

| 엔드포인트 | 메서드 | 테스트 URL |
|-----------|--------|-----------|
| 상태 확인 | GET | `?action=status` |
| 존 조회 | GET | `?action=getZones` |
| 기둥 조회 | GET | `?action=getColumns` |
| 이슈 조회 | GET | `?action=getIssues&status=open` |
| 전체 데이터 | GET | `?action=getFullData` |
| 분석 요청 | POST | `action=requestAnalysis` |

### 9.2 기능별 테스트 체크리스트

```
□ Dashboard 로드 및 존 표시
□ 기둥 상태 변경 (pending → active → installed)
□ 이슈 생성 및 기둥 연결
□ 이슈 해결 및 기둥 상태 복구
□ 일괄 업데이트 (단축키 또는 컨텍스트 메뉴)
□ 검색 및 필터링
□ 히스토리 로그 확인
□ 분석 요청 및 결과 확인
```

### 9.3 테스트 함수 실행

Apps Script Editor에서 `Tests.gs` 함수 실행:

```javascript
// 전체 테스트
function runAllTests() {
  testGetFullData();
  testUpdateColumn();
  testCreateAndResolveIssue();
  testBulkUpdate();
  console.log('✅ 모든 테스트 완료');
}
```

---

## 10. 트러블슈팅

### 10.1 CORS 오류

**증상**: `Access-Control-Allow-Origin` 오류

**해결**:
1. Web App 배포 시 "모든 사용자" 액세스 설정
2. Frontend는 HTTPS로 접속
3. 브라우저 캐시 삭제

### 10.2 권한 오류

**증상**: "Authorization required" 팝업

**해결**:
1. Apps Script Editor에서 아무 함수 수동 실행
2. "권한 검토" 클릭
3. 모든 권한 승인

### 10.3 6분 제한 오류

**증상**: "Exceeded maximum execution time"

**해결**:
- C-1 수정사항 확인 (batch `setValues` 사용)
- 대량 작업은 `bulkUpdate` 사용
- 작업 분할 (100개 이하)

### 10.4 LockService 타임아웃

**증상**: "Lock timeout" 오류

**해결**:
- H-3 수정사항 확인 (재시도 로직)
- 동시 요청 수 제한
- 요청 간 간격 확보 (500ms+)

### 10.5 타임스탬프 불일치

**증상**: UTC와 KST 혼용

**해결**:
- M-2 수정사항 확인 (모든 시간 KST)
- `getKSTTimestamp_()` 함수 사용

### 10.6 로그 확인

```bash
# clasp으로 실시간 로그
clasp logs --watch

# Apps Script Editor
실행 > 실행 로그 보기
```

---

## 11. 보안 고려사항

### 11.1 운영 환경 설정

| 항목 | 개발 | 운영 |
|------|------|------|
| DEBUG_MODE | `true` | `false` |
| 액세스 권한 | 모든 사용자 | Google 계정 필요 |
| API 키 | 테스트 키 | 프로덕션 키 |

### 11.2 API 키 보호

- Git에 API 키 커밋 금지 (`.gitignore` 활용)
- Script Properties에만 저장
- 주기적 키 교체

### 11.3 데이터 보호

- 민감 정보 로깅 금지
- History 시트 주기적 정리
- 접근 로그 모니터링

### 11.4 Rate Limiting

```javascript
// DashboardAPI.gs에 구현된 요청 제한
const MAX_AFFECTED_COLUMNS = 100;  // M-1 수정사항
```

---

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    P5 Dashboard System v2.1                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GitHub Pages                  Google Apps Script               │
│  ┌──────────────┐             ┌──────────────┐                  │
│  │   Frontend   │────REST────▶│   Backend    │◀──── Gmail      │
│  │  (Vite SPA)  │◀────API─────│ DashboardAPI │◀──── Gemini AI  │
│  └──────────────┘             └──────────────┘                  │
│         ▲                             │                          │
│         │                             ▼                          │
│   GitHub Actions              ┌──────────────┐                  │
│   ┌──────────────┐            │    Google    │                  │
│   │  gh-pages    │            │    Sheets    │                  │
│   └──────────────┘            └──────────────┘                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (GitHub Pages):                                        │
│  └── src/dashboard/index.html → Vite → dist/ → gh-pages         │
│                                                                  │
│  Backend (Google Apps Script):                                   │
│  ├── Config.gs         → 설정 상수                              │
│  ├── Code.gs           → 메인 진입점                            │
│  ├── GmailFilter.gs    → 메일 필터링                           │
│  ├── GeminiAnalyzer.gs → AI 분석                               │
│  ├── SheetWriter.gs    → 결과 기록                              │
│  ├── Utils.gs          → 유틸리티                               │
│  └── DashboardAPI.gs   → REST API                               │
├─────────────────────────────────────────────────────────────────┤
│  Data Flow:                                                      │
│  1. Gmail → GeminiAnalyzer → SheetWriter → Sheets (분석)        │
│  2. Dashboard → DashboardAPI → Sheets (CRUD)                    │
│  3. Sheets → Dashboard (동기화)                                  │
│  4. git push main → GitHub Actions → gh-pages (배포)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## API 레퍼런스

### GET 엔드포인트

| Action | 파라미터 | 설명 |
|--------|---------|------|
| `status` | - | API 상태 확인 |
| `getZones` | - | 모든 존 조회 |
| `getColumns` | `zone`, `row` | 기둥 조회 (필터 옵션) |
| `getIssues` | `status` | 이슈 조회 |
| `getHistory` | `limit` | 변경 이력 조회 |
| `getFullData` | - | 전체 데이터 조회 |
| `getStageStatus` | `uid` | 기둥 스테이지 상태 |
| `getAnalysisJob` | - | 분석 작업 상태 |

### POST 엔드포인트

| Action | 파라미터 | 설명 |
|--------|---------|------|
| `updateColumn` | `uid`, `status`, `user` | 기둥 상태 업데이트 |
| `bulkUpdateColumns` | `updates[]` | 일괄 업데이트 |
| `updateColumnStage` | `uid`, `stageCode`, `stageStatus` | 스테이지 업데이트 |
| `createIssue` | `issueData` | 이슈 생성 |
| `resolveIssue` | `issueId`, `resolution` | 이슈 해결 |
| `deleteIssue` | `issueId` | 이슈 삭제 |
| `requestAnalysis` | - | 분석 요청 |

---

*최종 업데이트: 2026-01-02*
