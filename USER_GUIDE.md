# P5 복합동 메일 분석 시스템 사용자 가이드

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [초기 설정](#초기-설정)
3. [일상 사용법](#일상-사용법)
4. [Dashboard 사용법](#dashboard-사용법)
5. [문제 해결](#문제-해결)
6. [고급 기능](#고급-기능)

---

## 시스템 개요

### 🎯 목적
P5 복합동 프로젝트의 Gmail 메일을 자동으로 분석하여 구조적 리스크와 이슈를 추출하고, 실시간 Dashboard에서 시각화하는 시스템입니다.

### 🔄 작동 원리
```
Gmail 메일 → Gemini AI 분석 → Google Sheet 저장 → Dashboard 시각화
```

### 👥 대상 사용자
- **센구조 EPC팀**: 전환설계 담당자
- **프로젝트 관리자**: 진행 상황 모니터링
- **현장 담당자**: 이슈 추적 및 대응

---

## 초기 설정

### 1단계: Google Apps Script 설정

#### 1.1 프로젝트 생성
1. [Google Apps Script](https://script.google.com) 접속
2. "새 프로젝트" 클릭
3. 프로젝트명: "P5_복합동_메일분석_시스템"

#### 1.2 코드 배포
1. `deploy/P5_MailAnalyzer_Combined.gs` 파일 내용 복사
2. Apps Script 에디터에 붙여넣기
3. 저장 (Ctrl+S)

#### 1.3 API 키 설정
1. [Gemini API 키 발급](https://aistudio.google.com/app/apikey)
2. Apps Script에서 "프로젝트 설정" → "스크립트 속성"
3. 다음 속성 추가:
   ```
   GEMINI_API_KEY = your-api-key-here
   SHEET_ID = your-google-sheet-id-here
   DEBUG_MODE = true
   ```

### 2단계: Google Sheet 준비

#### 2.1 Sheet 생성
1. [Google Sheets](https://sheets.google.com) 접속
2. 새 스프레드시트 생성
3. 이름: "P5_복합동_메일분석_DB"

#### 2.2 시트 초기화
Apps Script에서 다음 함수 실행:
```javascript
initializeSystem()
```

### 3단계: Dashboard 배포

#### 3.1 빌드 및 배포
```bash
npm run build
```

#### 3.2 웹 서버 업로드
- `dist/` 폴더 내용을 웹 서버에 업로드
- 또는 GitHub Pages 사용

---

## 일상 사용법

### 자동 실행 설정

#### 트리거 생성
1. Apps Script에서 "트리거" 메뉴
2. "트리거 추가" 클릭
3. 설정:
   - 함수: `main`
   - 이벤트 소스: 시간 기반
   - 시간 간격: 매일 오전 9시

#### 수동 실행
긴급한 경우 Apps Script에서 `main()` 함수 직접 실행

### 결과 확인

#### Google Sheet에서
1. "P5_메일_분석_DB" 시트 열기
2. 새로 추가된 행 확인
3. 긴급도별 필터링 사용

#### Dashboard에서
1. Dashboard URL 접속
2. 실시간 그리드 뷰 확인
3. 이슈 오버레이 검토

---

## Dashboard 사용법

### 기본 화면 구성

#### 1. 그리드 뷰 (메인)
- **12행 × 69열** 기둥 배치
- **Zone 구분**: A(FAB), B(CUB), C(COMPLEX)
- **색상 코딩**: 상태별 시각화

#### 2. 제어 패널
- **검색**: 기둥 UID, Zone, 상태 검색
- **필터**: 층별, 상태별 필터링
- **동기화**: 실시간 데이터 동기화

#### 3. 이슈 패널
- **활성 이슈**: 현재 진행 중인 문제
- **해결된 이슈**: 완료된 항목
- **우선순위**: 긴급도별 정렬

### 주요 기능

#### 기둥 선택 및 정보 확인
1. 그리드에서 기둥 클릭
2. 우측 패널에서 상세 정보 확인
3. 관련 이슈 및 히스토리 검토

#### 이슈 생성 및 관리
1. 문제 발생 시 "이슈 생성" 버튼
2. 영향받는 기둥 선택
3. 우선순위 및 담당자 지정

#### 검색 및 필터링
- **빠른 검색**: 상단 검색창 사용
- **고급 필터**: 다중 조건 필터링
- **저장된 뷰**: 자주 사용하는 필터 저장

### 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Ctrl + F` | 검색창 포커스 |
| `Esc` | 선택 해제 |
| `Space` | 선택된 기둥 정보 토글 |
| `Ctrl + A` | 전체 선택 |
| `Delete` | 선택 해제 |

---

## 문제 해결

### 자주 발생하는 문제

#### 1. 메일이 분석되지 않음
**증상**: 새 메일이 있는데 시스템에 반영되지 않음

**해결 방법**:
1. Gmail 검색 쿼리 확인
2. 키워드 목록 업데이트
3. 참여자 이메일 주소 확인

**확인 코드**:
```javascript
// Apps Script에서 실행
testGmailSearch()
```

#### 2. Gemini API 오류
**증상**: "API 키 오류" 또는 "할당량 초과"

**해결 방법**:
1. API 키 유효성 확인
2. 할당량 사용량 체크
3. 재시도 간격 조정

**확인 코드**:
```javascript
testGeminiConnection()
```

#### 3. Dashboard 로딩 실패
**증상**: 빈 화면 또는 로딩 중 상태

**해결 방법**:
1. 브라우저 콘솔 에러 확인
2. API URL 설정 점검
3. 캐시 삭제 후 새로고침

#### 4. 데이터 동기화 문제
**증상**: Sheet와 Dashboard 데이터 불일치

**해결 방법**:
1. 수동 동기화 실행
2. Sheet 권한 확인
3. API 연결 상태 점검

### 로그 확인 방법

#### Apps Script 로그
1. Apps Script 에디터
2. "실행" → "실행 로그 보기"
3. 에러 메시지 및 처리 현황 확인

#### Dashboard 로그
1. 브라우저 개발자 도구 (F12)
2. Console 탭에서 에러 확인
3. Network 탭에서 API 호출 상태 확인

### 성능 최적화

#### Gmail 검색 최적화
- 날짜 범위 축소 (기본 14일)
- 키워드 정교화
- 배치 크기 조정 (기본 50건)

#### Gemini API 최적화
- 재시도 간격 조정
- 프롬프트 길이 최적화
- 배치 처리 활용

---

## 고급 기능

### 모니터링 및 알림

#### 시스템 상태 모니터링
```javascript
// 상태 확인
productionHealthCheck()

// 성능 테스트
performanceTest()

// 전체 시스템 테스트
fullSystemTest()
```

#### 알림 설정
1. Script Properties에 관리자 이메일 설정:
   ```
   ADMIN_EMAIL = admin@company.com
   ```
2. Slack 웹훅 설정 (선택):
   ```
   SLACK_WEBHOOK = https://hooks.slack.com/...
   ```

### 데이터 분석

#### 통계 리포트 생성
```javascript
// 7일간 리포트
generateMonitoringReport(7)

// 30일간 리포트
generateMonitoringReport(30)
```

#### 데이터 내보내기
1. Google Sheet에서 "파일" → "다운로드"
2. Excel, CSV 등 다양한 형식 지원
3. Dashboard에서 PDF 리포트 생성

### 커스터마이징

#### 키워드 추가
`Config.gs`에서 `KEYWORDS` 배열 수정:
```javascript
KEYWORDS: [
  "복합동", "P5", "PSRC", "HMB",
  "새로운키워드1", "새로운키워드2"
]
```

#### 참여자 추가
`PARTICIPANTS` 배열에 이메일 주소 추가:
```javascript
PARTICIPANTS: [
  "@samsung.com",
  "@samoo.com",
  "new-participant@company.com"
]
```

#### 긴급도 기준 조정
`URGENCY_LEVELS`에서 기준 수정

---

## 📞 지원 및 문의

### 기술 지원
- **시스템 관리자**: 센구조 EPC팀
- **개발 문의**: GitHub Issues
- **긴급 상황**: 관리자 직접 연락

### 교육 및 훈련
- **신규 사용자**: 1:1 교육 제공
- **정기 교육**: 월 1회 업데이트 교육
- **매뉴얼 업데이트**: 기능 추가 시 문서 갱신

### 시스템 업데이트
- **정기 업데이트**: 월 1회
- **긴급 패치**: 필요 시 즉시
- **기능 요청**: 사용자 피드백 반영

---

## 📚 참고 자료

### 관련 문서
- [기술 명세서](docs/techspec.md)
- [배포 가이드](docs/DEPLOYMENT.md)
- [API 문서](src/dashboard/DashboardAPI.gs)

### 외부 링크
- [Google Apps Script 문서](https://developers.google.com/apps-script)
- [Gemini API 문서](https://ai.google.dev/docs)
- [Alpine.js 문서](https://alpinejs.dev/)

---

**마지막 업데이트**: 2025-01-15  
**버전**: 2.1.0  
**작성자**: P5 개발팀