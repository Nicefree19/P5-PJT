# P5 복합동 구조 통합 관리 시스템 - 구현 계획서

**Version**: 1.0  
**Date**: 2025-12-29  
**Author**: AI Coding Agent  
**Status**: 계획 수립 완료  
**Reference**: [techspec.md](./techspec.md)

---

## 📋 개요

본 계획서는 `techspec.md`에 정의된 요구사항을 기반으로, **Gmail-Gemini-Sheet 통합 시스템**을 단계별로 구현하기 위한 상세 로드맵입니다.

### 예상 일정
| 단계 | 기간 | 주요 산출물 |
|------|------|-------------|
| Phase 1: 기초 설정 | 1일 | 프로젝트 환경, Sheet 스키마 |
| Phase 2: Gmail 연동 | 2일 | 필터링 모듈, 중복 방지 |
| Phase 3: AI 분석 엔진 | 2일 | Gemini API 통합, 페르소나 |
| Phase 4: 데이터 파이프라인 | 2일 | 26컬럼 매핑, Sheet 쓰기 |
| Phase 5: 테스트 및 배포 | 2일 | 단위/통합 테스트, 트리거 |
| **총 예상 기간** | **9일** | |

---

## 🎯 Phase 1: Foundation (기초 설정)

### 목표
- Google Apps Script 프로젝트 환경 구축
- 설정 관리 체계 확립
- Google Sheet 데이터베이스 스키마 생성

### 서브태스크

#### 1.1 Google Apps Script 프로젝트 초기화
- [ ] **1.1.1** Google Apps Script 프로젝트 생성
  - 프로젝트명: `P5_복합동_메일분석_시스템`
  - URL: https://script.google.com
- [ ] **1.1.2** 파일 구조 생성
  ```
  src/
  ├── Code.gs           # 메인 진입점
  ├── Config.gs         # 설정 상수
  ├── GmailFilter.gs    # Gmail 필터링
  ├── GeminiAnalyzer.gs # AI 분석
  ├── SheetWriter.gs    # Sheet 쓰기
  └── Utils.gs          # 유틸리티
  ```
- [ ] **1.1.3** 각 `.gs` 파일에 기본 골격 코드 작성

#### 1.2 환경 변수 및 설정 관리
- [ ] **1.2.1** Script Properties 설정
  - `GEMINI_API_KEY`: Gemini API 키
  - `SHEET_ID`: Google Sheet ID
  - `DEBUG_MODE`: 디버그 모드 플래그
- [ ] **1.2.2** `Config.gs` 상수 정의
  ```javascript
  const CONFIG = {
    GEMINI_MODEL: 'gemini-flash-latest',
    GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/',
    DATE_RANGE_DAYS: 14,
    MAX_BATCH_SIZE: 50,
    RETRY_COUNT: 3,
    TIMEOUT_MS: 30000
  };
  ```
- [ ] **1.2.3** 키워드 화이트리스트 정의
  ```javascript
  CONFIG.KEYWORDS = ['복합동', 'P5', 'P56', 'PSRC', 'HMB', 'PC', '접합', 'Shop', '하중', '골조'];
  ```
- [ ] **1.2.4** 참여자 도메인 리스트 정의
  ```javascript
  CONFIG.PARTICIPANTS = [
    '@samsung.com',      // 삼성E&A
    '@samoo.com',        // 삼우종합건축
    'vickysong1@naver.com',  // 이앤디몰
    'dhkim2630@naver.com',   // 이앤디몰
    '@senkuzo.com',      // 센구조
    '@senvex.net'        // 센구조
  ];
  ```

#### 1.3 Google Sheet 데이터베이스 생성
- [ ] **1.3.1** 새 Google Sheet 생성
  - 시트명: `P5_메일_분석_DB`
- [ ] **1.3.2** 26개 컬럼 헤더 작성
  | 순번 | 컬럼명 | 데이터 타입 | 설명 |
  |------|--------|-------------|------|
  | 1 | NO | Number | 자동 증가 번호 |
  | 2 | 상태 | Dropdown | 미처리/진행중/완료 |
  | 3 | 긴급도 | Dropdown | Critical/High/Medium/Low |
  | 4 | 발생원 | String | 삼우/ENA/이앤디몰/센코어 |
  | 5 | 공법구분 | String | PSRC-PC접합/PSRC-Steel접합 등 |
  | 6 | 메일ID | String | Gmail Message ID |
  | 7 | 발신자 | Email | From 주소 |
  | 8 | 수신일시 | DateTime | 메일 수신 시각 |
  | 9 | 제목 | String | 메일 제목 |
  | 10 | 본문요약 | Text | AI 생성 요약 |
  | 11 | AI분석 | Text | 공법적 분석 |
  | 12 | 추천조치 | Text | AI 제안 조치 |
  | 13 | 키워드 | Array | 추출된 키워드 |
  | 14 | 첨부파일수 | Number | 첨부 파일 개수 |
  | 15 | 스레드ID | String | Gmail Thread ID |
  | 16 | 참조인 | String | CC 리스트 |
  | 17 | 라벨 | String | Gmail 라벨 |
  | 18 | 중요표시 | Boolean | 별표 여부 |
  | 19 | 읽음여부 | Boolean | 읽음 상태 |
  | 20 | 처리담당 | String | 담당자 이름 |
  | 21 | 처리기한 | Date | 목표 완료일 |
  | 22 | 처리상태 | Dropdown | 세부 상태 |
  | 23 | 메모 | Text | 수동 메모 |
  | 24 | 비고 | Text | 기타 정보 |
  | 25 | RawJSON | JSON | 원본 AI 응답 |
  | 26 | 등록일시 | DateTime | 시스템 등록 시각 |
- [ ] **1.3.3** 드롭다운 데이터 유효성 검사 설정
  - `상태`: 미처리, 진행중, 완료
  - `긴급도`: Critical, High, Medium, Low
  - `처리상태`: 검토대기, 검토중, 조치완료, 보류
- [ ] **1.3.4** 조건부 서식 설정
  - `긴급도 = Critical` → 빨간색 배경
  - `긴급도 = High` → 주황색 배경
  - `상태 = 완료` → 회색 텍스트

#### 1.4 검증 (Phase 1 완료 조건)
- [ ] **1.4.1** Script 프로젝트 접근 확인
- [ ] **1.4.2** `Logger.log(CONFIG)` 실행하여 설정 값 확인
- [ ] **1.4.3** Sheet 26개 컬럼 헤더 존재 확인
- [ ] **1.4.4** 드롭다운 동작 확인

---

## 📧 Phase 2: Gmail Integration (Gmail 연동)

### 목표
- Gmail 검색 쿼리 로직 구현
- 키워드 + 참여자 기반 필터링
- 중복 메일 방지 메커니즘 구현

### 서브태스크

#### 2.1 Gmail 검색 쿼리 빌더
- [ ] **2.1.1** `GmailFilter.gs` 파일 생성
- [ ] **2.1.2** 키워드 쿼리 생성 함수
  ```javascript
  function buildKeywordQuery_() {
    return CONFIG.KEYWORDS.map(k => `"${k}"`).join(' OR ');
  }
  ```
- [ ] **2.1.3** 참여자 쿼리 생성 함수
  ```javascript
  function buildParticipantQuery_() {
    return CONFIG.PARTICIPANTS.map(p => `from:${p} OR to:${p}`).join(' OR ');
  }
  ```
- [ ] **2.1.4** 날짜 범위 쿼리 추가
  ```javascript
  function buildDateQuery_() {
    return `newer_than:${CONFIG.DATE_RANGE_DAYS}d`;
  }
  ```
- [ ] **2.1.5** 최종 복합 쿼리 조합 함수
  ```javascript
  function buildFullQuery_() {
    const keywords = buildKeywordQuery_();
    const participants = buildParticipantQuery_();
    const dateRange = buildDateQuery_();
    return `(${keywords}) AND (${participants}) AND ${dateRange}`;
  }
  ```

#### 2.2 Gmail 스레드 검색 및 파싱
- [ ] **2.2.1** 메인 필터링 함수 구현
  ```javascript
  function filterGmailThreads_() {
    const query = buildFullQuery_();
    Logger.log(`검색 쿼리: ${query}`);
    return GmailApp.search(query, 0, CONFIG.MAX_BATCH_SIZE);
  }
  ```
- [ ] **2.2.2** 스레드 → 메시지 변환 함수
  ```javascript
  function extractMessagesFromThreads_(threads) {
    const messages = [];
    threads.forEach(thread => {
      thread.getMessages().forEach(msg => {
        messages.push({
          id: msg.getId(),
          threadId: thread.getId(),
          from: msg.getFrom(),
          to: msg.getTo(),
          cc: msg.getCc(),
          subject: msg.getSubject(),
          body: msg.getPlainBody(),
          date: msg.getDate(),
          attachments: msg.getAttachments().length,
          isStarred: msg.isStarred(),
          isUnread: msg.isUnread(),
          labels: thread.getLabels().map(l => l.getName()).join(', ')
        });
      });
    });
    return messages;
  }
  ```
- [ ] **2.2.3** 메일 본문 정제 함수 (서명 제거, 인용 제거)
  ```javascript
  function sanitizeEmailBody_(body) {
    // 서명 패턴 제거
    let cleaned = body.replace(/--\s*\n[\s\S]*$/m, '');
    // 인용 메시지 제거
    cleaned = cleaned.replace(/^>.*$/gm, '');
    // 연속 공백 정리
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
  }
  ```

#### 2.3 중복 방지 메커니즘
- [ ] **2.3.1** Sheet에서 기존 메일ID 목록 조회 함수
  ```javascript
  function getExistingMessageIds_() {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                               .getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const idColumn = 5; // 메일ID 컬럼 (0-indexed)
    return new Set(data.slice(1).map(row => row[idColumn]));
  }
  ```
- [ ] **2.3.2** 중복 필터링 함수
  ```javascript
  function filterDuplicates_(messages) {
    const existingIds = getExistingMessageIds_();
    return messages.filter(msg => !existingIds.has(msg.id));
  }
  ```
- [ ] **2.3.3** 중복 로깅 (스킵 건수 출력)

#### 2.4 에러 핸들링
- [ ] **2.4.1** Gmail API 예외 처리
  ```javascript
  function safeGmailSearch_(query) {
    try {
      return GmailApp.search(query, 0, CONFIG.MAX_BATCH_SIZE);
    } catch (e) {
      Logger.log(`Gmail 검색 오류: ${e.message}`);
      return [];
    }
  }
  ```
- [ ] **2.4.2** 빈 검색 결과 처리 로직

#### 2.5 검증 (Phase 2 완료 조건)
- [ ] **2.5.1** 단위 테스트: `buildFullQuery_()` 결과 확인
- [ ] **2.5.2** 단위 테스트: 샘플 메일 10건 이상 검색 확인
- [ ] **2.5.3** 단위 테스트: 중복 필터링 동작 확인
- [ ] **2.5.4** 로그 출력: 총 검색 건수, 중복 제외 건수

---

## 🤖 Phase 3: AI Analysis Engine (AI 분석 엔진)

### 목표
- Gemini 2.0 Flash API 연동
- PSRC/HMB 공법 전문가 페르소나 구현
- JSON 응답 파싱 및 검증

### 서브태스크

#### 3.1 Gemini API 호출 기능
- [ ] **3.1.1** `GeminiAnalyzer.gs` 파일 생성
- [ ] **3.1.2** API 호출 기본 함수
  ```javascript
  function callGeminiAPI_(prompt) {
    const apiKey = PropertiesService.getScriptProperties()
                                    .getProperty('GEMINI_API_KEY');
    const url = `${CONFIG.GEMINI_ENDPOINT}${CONFIG.GEMINI_MODEL}:generateContent`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText());
  }
  ```
- [ ] **3.1.3** 응답 텍스트 추출 함수
  ```javascript
  function extractResponseText_(response) {
    try {
      return response.candidates[0].content.parts[0].text;
    } catch (e) {
      Logger.log(`API 응답 파싱 오류: ${e.message}`);
      return null;
    }
  }
  ```

#### 3.2 페르소나 프롬프트 설계
- [ ] **3.2.1** PSRC/HMB 공법 전문가 페르소나 정의
  ```javascript
  const PERSONA_PROMPT = `
  # 역할 설정
  당신은 **PSRC(프리캐스트 철근 콘크리트 기둥)** 및 **HMB(하프 슬래브 보)** 공법의 
  총괄 엔지니어이자, 대형 반도체 FAB 프로젝트 구조 설계를 검토하는 전문가입니다.
  
  # 분석 목표
  다음 메일을 분석하여:
  1. 공법적 리스크를 식별
  2. 접합부 간섭 이슈를 추출
  3. 설계 변경 사항을 파악
  4. 이해관계자 간 책임 경계를 명확히
  
  # 발생원 추론 규칙
  - @samoo.com → 삼우(원설계)
  - @samsung.com → ENA(시공/PM)
  - vickysong1@naver.com, dhkim2630@naver.com → 이앤디몰(PC설계)
  - @senkuzo.com, @senvex.net → 센코어(전환설계)
  
  # 긴급도 평가 기준
  | 조건 | 긴급도 |
  |------|--------|
  | Shop Drawing 제작 완료 후 변경 요청 | **Showstopper** |
  | 0.75fpu 인장 강도 오류 발견 | **Showstopper** |
  | 변단면 상세 설계 오류 | **Critical** |
  | 접합부 간섭 우려 | **High** |
  | 설계 문의/질의 | **Medium** |
  | 일반 행정 연락 | **Low** |
  
  # 공법 구분 카테고리
  - PSRC-PC접합
  - PSRC-Steel접합
  - HMB-PC접합
  - 변단면 이슈
  - 하중 검토
  - 접합부 간섭
  - 기타
  
  # 출력 형식 (JSON)
  반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드 블록 없이 순수 JSON만 출력:
  {
    "발생원": "삼우(원설계)",
    "공법구분": "PSRC-PC접합",
    "긴급도": "Critical",
    "본문요약": "메일 내용을 2-3문장으로 요약",
    "AI분석": "공법적 관점에서 분석한 내용",
    "추천조치": "권장 후속 조치 사항",
    "키워드": ["PSRC", "접합부", "Shop Drawing"]
  }
  `;
  ```
- [ ] **3.2.2** 메일 분석 프롬프트 조합 함수
  ```javascript
  function buildAnalysisPrompt_(emailData) {
    return `${PERSONA_PROMPT}
  
  ---
  ## 분석 대상 메일
  
  **발신자**: ${emailData.from}
  **수신자**: ${emailData.to}
  **참조**: ${emailData.cc || '없음'}
  **일시**: ${emailData.date}
  **제목**: ${emailData.subject}
  
  **본문**:
  ${emailData.body}
  `;
  }
  ```

#### 3.3 JSON 응답 파싱
- [ ] **3.3.1** Markdown 코드 블록 제거 함수
  ```javascript
  function cleanJsonResponse_(text) {
    // ```json ... ``` 패턴 제거
    let cleaned = text.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
    // 앞뒤 공백 제거
    return cleaned.trim();
  }
  ```
- [ ] **3.3.2** JSON 파싱 및 검증 함수
  ```javascript
  function parseAnalysisResponse_(responseText) {
    const cleaned = cleanJsonResponse_(responseText);
    try {
      const parsed = JSON.parse(cleaned);
      // 필수 필드 검증
      const requiredFields = ['발생원', '공법구분', '긴급도', '본문요약', 'AI분석', '추천조치', '키워드'];
      for (const field of requiredFields) {
        if (!(field in parsed)) {
          throw new Error(`필수 필드 누락: ${field}`);
        }
      }
      return parsed;
    } catch (e) {
      Logger.log(`JSON 파싱 오류: ${e.message}`);
      Logger.log(`원본 응답: ${responseText}`);
      return null;
    }
  }
  ```
- [ ] **3.3.3** 파싱 실패 시 기본값 반환 로직
  ```javascript
  function getDefaultAnalysis_(emailData) {
    return {
      발생원: '분류 실패',
      공법구분: '기타',
      긴급도: 'Medium',
      본문요약: emailData.subject,
      AI분석: 'AI 분석 실패 - 수동 검토 필요',
      추천조치: '담당자 수동 확인',
      키워드: []
    };
  }
  ```

#### 3.4 통합 분석 함수
- [ ] **3.4.1** 메일 1건 분석 함수
  ```javascript
  function analyzeEmail_(emailData) {
    const prompt = buildAnalysisPrompt_(emailData);
    const response = callGeminiAPI_(prompt);
    const text = extractResponseText_(response);
    
    if (!text) {
      return getDefaultAnalysis_(emailData);
    }
    
    const analysis = parseAnalysisResponse_(text);
    return analysis || getDefaultAnalysis_(emailData);
  }
  ```
- [ ] **3.4.2** 배치 분석 함수 (여러 메일)
  ```javascript
  function analyzeEmails_(emails) {
    const results = [];
    for (const email of emails) {
      const analysis = analyzeEmail_(email);
      results.push({
        email: email,
        analysis: analysis
      });
      // API Rate Limit 대응 (1초 대기)
      Utilities.sleep(1000);
    }
    return results;
  }
  ```

#### 3.5 재시도 로직
- [ ] **3.5.1** 지수 백오프 재시도 함수
  ```javascript
  function callGeminiWithRetry_(prompt, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = callGeminiAPI_(prompt);
        if (response.candidates && response.candidates.length > 0) {
          return response;
        }
      } catch (e) {
        Logger.log(`API 호출 실패 (시도 ${attempt}/${maxRetries}): ${e.message}`);
        if (attempt < maxRetries) {
          Utilities.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }
    return null;
  }
  ```

#### 3.6 검증 (Phase 3 완료 조건)
- [ ] **3.6.1** 단위 테스트: 샘플 프롬프트로 Gemini API 호출 성공
- [ ] **3.6.2** 단위 테스트: JSON 응답 파싱 성공
- [ ] **3.6.3** 단위 테스트: 잘못된 JSON 응답 시 기본값 반환 확인
- [ ] **3.6.4** 통합 테스트: 실제 메일 1건 분석 및 결과 확인

---

## 📊 Phase 4: Data Pipeline (데이터 파이프라인)

### 목표
- 분석 결과를 26개 컬럼으로 매핑
- Google Sheet에 자동 기록
- 트랜잭션 안정성 확보

### 서브태스크

#### 4.1 데이터 변환 로직
- [ ] **4.1.1** `SheetWriter.gs` 파일 생성
- [ ] **4.1.2** 분석 결과 → 행 데이터 변환 함수
  ```javascript
  function transformToRow_(emailData, analysis, rowNumber) {
    return [
      rowNumber,                              // NO
      '미처리',                                // 상태
      analysis.긴급도,                         // 긴급도
      analysis.발생원,                         // 발생원
      analysis.공법구분,                       // 공법구분
      emailData.id,                           // 메일ID
      emailData.from,                         // 발신자
      emailData.date,                         // 수신일시
      emailData.subject,                      // 제목
      analysis.본문요약,                       // 본문요약
      analysis.AI분석,                         // AI분석
      analysis.추천조치,                       // 추천조치
      analysis.키워드.join(', '),              // 키워드
      emailData.attachments,                  // 첨부파일수
      emailData.threadId,                     // 스레드ID
      emailData.cc || '',                     // 참조인
      emailData.labels,                       // 라벨
      emailData.isStarred,                    // 중요표시
      emailData.isUnread,                     // 읽음여부
      '',                                     // 처리담당
      '',                                     // 처리기한
      '검토대기',                              // 처리상태
      '',                                     // 메모
      '',                                     // 비고
      JSON.stringify(analysis),               // RawJSON
      new Date()                              // 등록일시
    ];
  }
  ```

#### 4.2 Google Sheet 쓰기
- [ ] **4.2.1** Sheet 객체 획득 함수
  ```javascript
  function getTargetSheet_() {
    const spreadsheet = SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty('SHEET_ID')
    );
    return spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  }
  ```
- [ ] **4.2.2** 단일 행 추가 함수
  ```javascript
  function appendRow_(sheet, rowData) {
    sheet.appendRow(rowData);
  }
  ```
- [ ] **4.2.3** 배치 쓰기 함수 (성능 최적화)
  ```javascript
  function appendRows_(sheet, rowsData) {
    if (rowsData.length === 0) return;
    
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(lastRow + 1, 1, rowsData.length, CONFIG.COLUMNS);
    range.setValues(rowsData);
  }
  ```
- [ ] **4.2.4** 자동 번호 부여 로직
  ```javascript
  function getNextRowNumber_(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return 1; // 헤더만 있는 경우
    
    const lastNo = sheet.getRange(lastRow, 1).getValue();
    return (parseInt(lastNo) || 0) + 1;
  }
  ```

#### 4.3 트랜잭션 관리
- [ ] **4.3.1** 쓰기 전 유효성 검증
  ```javascript
  function validateRowData_(rowData) {
    if (rowData.length !== CONFIG.COLUMNS) {
      throw new Error(`컬럼 수 불일치: 예상 ${CONFIG.COLUMNS}, 실제 ${rowData.length}`);
    }
    // 필수 필드 검증
    if (!rowData[5]) { // 메일ID
      throw new Error('메일ID가 비어있습니다');
    }
    return true;
  }
  ```
- [ ] **4.3.2** 롤백 지원 (실패 시 마지막 성공 위치 기록)
  ```javascript
  function writeWithRollbackSupport_(analysisResults) {
    const sheet = getTargetSheet_();
    const successCount = 0;
    const failedItems = [];
    
    for (const result of analysisResults) {
      try {
        const rowNumber = getNextRowNumber_(sheet);
        const rowData = transformToRow_(result.email, result.analysis, rowNumber);
        validateRowData_(rowData);
        appendRow_(sheet, rowData);
        successCount++;
      } catch (e) {
        Logger.log(`쓰기 실패: ${result.email.id} - ${e.message}`);
        failedItems.push(result);
      }
    }
    
    return { success: successCount, failed: failedItems };
  }
  ```

#### 4.4 로깅 및 모니터링
- [ ] **4.4.1** 실행 로그 기록 함수
  ```javascript
  function logExecution_(stats) {
    const logSheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                                   .getSheetByName('실행로그');
    logSheet.appendRow([
      new Date(),
      stats.totalSearched,
      stats.newEmails,
      stats.successfulWrites,
      stats.failedWrites,
      stats.executionTimeMs
    ]);
  }
  ```
- [ ] **4.4.2** 에러 알림 (선택적: 이메일 알림)

#### 4.5 검증 (Phase 4 완료 조건)
- [ ] **4.5.1** 단위 테스트: 26개 컬럼 변환 함수 동작 확인
- [ ] **4.5.2** 단위 테스트: Sheet 쓰기 성공 (테스트 시트)
- [ ] **4.5.3** 통합 테스트: 5건 이상 배치 쓰기 성공
- [ ] **4.5.4** 자동 번호 증가 확인

---

## 🧪 Phase 5: Testing & Deployment (테스트 및 배포)

### 목표
- 단위 테스트 및 통합 테스트 완료
- 일일 배치 트리거 설정
- 운영 모니터링 체계 구축

### 서브태스크

#### 5.1 단위 테스트 작성
- [ ] **5.1.1** `tests/test_gmail_filter.gs` 작성
  ```javascript
  function test_buildFullQuery() {
    const query = buildFullQuery_();
    Logger.log(`쿼리: ${query}`);
    
    // 키워드 포함 확인
    if (!query.includes('복합동')) {
      throw new Error('키워드 누락: 복합동');
    }
    
    // 참여자 도메인 포함 확인
    if (!query.includes('@samsung.com')) {
      throw new Error('참여자 누락: @samsung.com');
    }
    
    Logger.log('✅ test_buildFullQuery 통과');
  }
  ```
- [ ] **5.1.2** `tests/test_ai_parser.gs` 작성
  ```javascript
  function test_parseAnalysisResponse() {
    const validJson = '{"발생원": "삼우(원설계)", "공법구분": "PSRC-PC접합", "긴급도": "High", "본문요약": "테스트", "AI분석": "분석내용", "추천조치": "조치사항", "키워드": ["PSRC"]}';
    
    const result = parseAnalysisResponse_(validJson);
    
    if (!result) {
      throw new Error('유효한 JSON 파싱 실패');
    }
    if (result.발생원 !== '삼우(원설계)') {
      throw new Error('발생원 파싱 오류');
    }
    
    Logger.log('✅ test_parseAnalysisResponse 통과');
  }
  
  function test_cleanJsonResponse() {
    const withCodeBlock = '```json\n{"test": true}\n```';
    const cleaned = cleanJsonResponse_(withCodeBlock);
    
    if (cleaned !== '{"test": true}') {
      throw new Error(`코드 블록 제거 실패: ${cleaned}`);
    }
    
    Logger.log('✅ test_cleanJsonResponse 통과');
  }
  ```
- [ ] **5.1.3** `tests/test_sheet_writer.gs` 작성
  ```javascript
  function test_transformToRow() {
    const mockEmail = {
      id: 'msg_test_123',
      threadId: 'thread_test_456',
      from: 'test@samoo.com',
      to: 'receiver@senkuzo.com',
      cc: '',
      subject: '테스트 메일',
      date: new Date(),
      attachments: 0,
      isStarred: false,
      isUnread: true,
      labels: ''
    };
    
    const mockAnalysis = {
      발생원: '삼우(원설계)',
      공법구분: 'PSRC-PC접합',
      긴급도: 'Medium',
      본문요약: '테스트 요약',
      AI분석: '테스트 분석',
      추천조치: '테스트 조치',
      키워드: ['테스트']
    };
    
    const row = transformToRow_(mockEmail, mockAnalysis, 1);
    
    if (row.length !== 26) {
      throw new Error(`컬럼 수 불일치: ${row.length}`);
    }
    
    Logger.log('✅ test_transformToRow 통과');
  }
  ```

#### 5.2 통합 테스트
- [ ] **5.2.1** 전체 파이프라인 테스트 함수
  ```javascript
  function test_fullPipeline() {
    Logger.log('=== 통합 테스트 시작 ===');
    
    // 1. Gmail 검색
    const threads = filterGmailThreads_();
    Logger.log(`검색된 스레드: ${threads.length}개`);
    
    // 2. 메시지 추출 (최대 3건만 테스트)
    const messages = extractMessagesFromThreads_(threads).slice(0, 3);
    Logger.log(`추출된 메시지: ${messages.length}개`);
    
    // 3. 중복 필터링
    const newMessages = filterDuplicates_(messages);
    Logger.log(`신규 메시지: ${newMessages.length}개`);
    
    if (newMessages.length === 0) {
      Logger.log('⚠️ 신규 메시지 없음 - 테스트 종료');
      return;
    }
    
    // 4. AI 분석 (1건만)
    const testEmail = newMessages[0];
    const analysis = analyzeEmail_(testEmail);
    Logger.log(`분석 결과: ${JSON.stringify(analysis)}`);
    
    // 5. Sheet 쓰기 (테스트 시트)
    const testSheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                                    .getSheetByName('테스트');
    const rowNumber = getNextRowNumber_(testSheet);
    const rowData = transformToRow_(testEmail, analysis, rowNumber);
    appendRow_(testSheet, rowData);
    
    Logger.log('=== 통합 테스트 완료 ===');
  }
  ```
- [ ] **5.2.2** 실제 메일 샘플 10건 테스트
- [ ] **5.2.3** 에러 케이스 테스트 (API 실패, 파싱 실패)

#### 5.3 메인 실행 함수
- [ ] **5.3.1** `Code.gs` 메인 함수 작성
  ```javascript
  /**
   * P5 복합동 메일 분석 시스템 - 메인 실행 함수
   * 일일 트리거로 자동 실행됨
   */
  function main() {
    const startTime = Date.now();
    Logger.log('=== P5 메일 분석 시작 ===');
    
    try {
      // 1. Gmail 검색
      const threads = filterGmailThreads_();
      Logger.log(`검색된 스레드: ${threads.length}개`);
      
      // 2. 메시지 추출
      const messages = extractMessagesFromThreads_(threads);
      Logger.log(`추출된 메시지: ${messages.length}개`);
      
      // 3. 중복 필터링
      const newMessages = filterDuplicates_(messages);
      Logger.log(`신규 메시지: ${newMessages.length}개`);
      
      if (newMessages.length === 0) {
        Logger.log('처리할 신규 메시지 없음');
        return;
      }
      
      // 4. AI 분석
      const analysisResults = analyzeEmails_(newMessages);
      Logger.log(`분석 완료: ${analysisResults.length}건`);
      
      // 5. Sheet 쓰기
      const writeResult = writeWithRollbackSupport_(analysisResults);
      Logger.log(`쓰기 성공: ${writeResult.success}건, 실패: ${writeResult.failed.length}건`);
      
      // 6. 실행 로그 기록
      const executionTime = Date.now() - startTime;
      logExecution_({
        totalSearched: messages.length,
        newEmails: newMessages.length,
        successfulWrites: writeResult.success,
        failedWrites: writeResult.failed.length,
        executionTimeMs: executionTime
      });
      
      Logger.log(`=== 완료 (${executionTime}ms) ===`);
      
    } catch (e) {
      Logger.log(`❌ 실행 오류: ${e.message}`);
      Logger.log(e.stack);
    }
  }
  ```

#### 5.4 트리거 설정
- [ ] **5.4.1** 일일 트리거 설정 함수
  ```javascript
  function setupDailyTrigger() {
    // 기존 트리거 삭제
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'main') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // 새 트리거 생성 (매일 오전 9시)
    ScriptApp.newTrigger('main')
             .timeBased()
             .everyDays(1)
             .atHour(9)
             .create();
    
    Logger.log('✅ 일일 트리거 설정 완료 (매일 09:00)');
  }
  ```
- [ ] **5.4.2** 트리거 제거 함수
  ```javascript
  function removeTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
    Logger.log('✅ 모든 트리거 제거 완료');
  }
  ```

#### 5.5 운영 문서 작성
- [ ] **5.5.1** 운영 매뉴얼 작성
  - 트리거 설정/해제 방법
  - 수동 실행 방법
  - 로그 확인 방법
  - 에러 대응 가이드
- [ ] **5.5.2** API 키 갱신 가이드
- [ ] **5.5.3** Sheet 아카이빙 절차

#### 5.6 최종 검증 (Phase 5 완료 조건)
- [ ] **5.6.1** 모든 단위 테스트 통과 확인
- [ ] **5.6.2** 통합 테스트 성공 (실제 메일 10건 이상)
- [ ] **5.6.3** 일일 트리거 설정 및 동작 확인
- [ ] **5.6.4** Sheet에 데이터 정상 기록 확인
- [ ] **5.6.5** 운영 문서 검토 완료

---

## 📝 부록: 유틸리티 함수

### Utils.gs
```javascript
/**
 * 날짜 포맷팅 함수
 */
function formatDate_(date) {
  return Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 문자열 자르기 (최대 길이 제한)
 */
function truncateString_(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

/**
 * 디버그 로그 (DEBUG_MODE일 때만 출력)
 */
function debugLog_(message) {
  const debugMode = PropertiesService.getScriptProperties()
                                     .getProperty('DEBUG_MODE');
  if (debugMode === 'true') {
    Logger.log(`[DEBUG] ${message}`);
  }
}

/**
 * 에러 로그 (항상 출력)
 */
function errorLog_(message, error) {
  Logger.log(`[ERROR] ${message}`);
  if (error && error.stack) {
    Logger.log(error.stack);
  }
}
```

---

## ✅ 체크리스트 요약

| Phase | 서브태스크 수 | 예상 소요 시간 |
|-------|---------------|----------------|
| Phase 1: 기초 설정 | 16개 | 1일 |
| Phase 2: Gmail 연동 | 17개 | 2일 |
| Phase 3: AI 분석 엔진 | 18개 | 2일 |
| Phase 4: 데이터 파이프라인 | 14개 | 2일 |
| Phase 5: 테스트 및 배포 | 17개 | 2일 |
| **총합** | **82개** | **9일** |

---

**Document Status**: ✅ 계획 수립 완료  
**Next Step**: Phase 1 - 기초 설정 시작  
**Last Updated**: 2025-12-29
