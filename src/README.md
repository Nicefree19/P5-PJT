# P5 복합동 메일 분석 시스템 - Google Apps Script

## 📁 파일 구조

```
src/
├── Code.gs           # 메인 진입점, 트리거 관리
├── Config.gs         # 설정 상수, 환경 변수
├── GmailFilter.gs    # Gmail 검색, 필터링, 중복 방지
├── GeminiAnalyzer.gs # Gemini AI 분석, 페르소나 프롬프트
├── SheetWriter.gs    # Sheet 쓰기, 26컬럼 변환
└── Utils.gs          # 유틸리티 함수
```

## 🚀 배포 방법

### 1. Google Apps Script 프로젝트 생성

1. https://script.google.com 접속
2. **새 프로젝트** 생성
3. 프로젝트 이름: `P5_복합동_메일분석_시스템`

### 2. 파일 복사

각 `.gs` 파일의 내용을 Apps Script 에디터에 복사:

1. 기존 `Code.gs` 내용 삭제 후 `src/Code.gs` 붙여넣기
2. **파일 > 새 스크립트** → `Config.gs` 생성 후 붙여넣기
3. 같은 방식으로 나머지 4개 파일 생성

### 3. Script Properties 설정

1. **프로젝트 설정** (톱니바퀴 아이콘)
2. **스크립트 속성** 섹션에서 **스크립트 속성 추가**:

| 속성 | 값 |
|------|-----|
| `GEMINI_API_KEY` | Gemini API 키 |
| `SHEET_ID` | Google Sheet ID |
| `DEBUG_MODE` | `true` |

### 4. Google Sheet ID 찾기

Sheet URL에서 추출:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
```

### 5. 권한 부여

1. `checkSystemStatus` 함수 실행
2. **권한 검토** 클릭
3. Google 계정 선택 후 **허용**

## ⚙️ 초기 설정

### Sheet 헤더 생성

```javascript
// Apps Script 에디터에서 실행
createSheetHeaders()
```

26개 컬럼 헤더 + 드롭다운 + 조건부 서식 자동 설정

### 시스템 상태 확인

```javascript
checkSystemStatus()
```

API 키, Sheet 연결, 트리거 상태 확인

## 🔧 주요 함수

### 실행 함수

| 함수 | 설명 |
|------|------|
| `main()` | 전체 파이프라인 실행 |
| `testRun()` | 테스트 실행 (3건) |
| `manualRun(n)` | 수동 실행 (n건) |

### 트리거 관리

| 함수 | 설명 |
|------|------|
| `setupDailyTrigger()` | 일일 트리거 (09:00) |
| `setupHourlyTrigger(h)` | 시간별 트리거 |
| `removeAllTriggers()` | 모든 트리거 제거 |
| `listTriggers()` | 트리거 목록 조회 |

### 테스트 함수

| 함수 | 설명 |
|------|------|
| `testGmailSearch()` | Gmail 검색 테스트 |
| `testGeminiConnection()` | API 연결 테스트 |
| `testTransformToRow()` | 데이터 변환 테스트 |
| `testUtils()` | 유틸리티 테스트 |

## 📊 26컬럼 스키마

| # | 컬럼명 | 자동화 | 설명 |
|---|--------|:------:|------|
| 1 | NO | ✅ | 자동 증가 |
| 2 | 상태 | - | 미처리/진행중/완료 |
| 3 | 긴급도 | ✅ | AI 분석 |
| 4 | 발생원 | ✅ | 삼우/ENA/이앤디몰/센코어 |
| 5 | 공법구분 | ✅ | PSRC-PC접합 등 |
| 6 | 메일ID | ✅ | 중복 방지용 |
| 7 | 발신자 | ✅ | - |
| 8 | 수신일시 | ✅ | - |
| 9 | 제목 | ✅ | - |
| 10 | 본문요약 | ✅ | AI 생성 |
| 11 | AI분석 | ✅ | 공법적 분석 |
| 12 | 추천조치 | ✅ | AI 제안 |
| 13-26 | ... | - | 기타 메타/수동 필드 |

## 🔐 보안 참고

- API 키는 반드시 **Script Properties**에 저장
- 코드에 API 키 하드코딩 금지
- Sheet 공유 시 편집 권한 제한

## 📝 버전 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|-----------|
| 1.0.0 | 2025-12-29 | 초기 버전 |
