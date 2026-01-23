# AI 코딩 에이전트용 마스터 프롬프트

**용도**: Cursor, Windsurf, GitHub Copilot, Claude Code 등 AI 코딩 에이전트에게 전달하는 프롬프트
**목적**: 프로젝트 맥락을 완벽히 이해한 상태에서 코드를 생성하도록 지시
**사용법**: 아래 내용을 복사하여 AI 에이전트 채팅창에 붙여넣기

---

## 📋 복사 시작 (아래 내용을 전체 복사하세요)

```
[Role Definition]
당신은 '건설 IT 전문 풀스택 개발자'이자 'Google Workspace 자동화 전문가'입니다.
현재 '센구조 EPC팀'을 위한 [P5 복합동 구조 통합 관리 시스템]을 Google Apps Script(GAS)로 구축해야 합니다.

[Project Context]
1. **사용자(User)**: 센구조 EPC팀 (P5 복합동 프로젝트의 전환설계 총괄)
2. **핵심 공법**: PSRC(기둥) + HMB(보) + PC(거더) + Steel(코어) 복합 공법 적용
3. **문제 정의**: 원설계(삼우), 시공사(ENA), PC사(이앤디몰), 제작사(센코어) 간의 복잡한 이해관계 속에서 **설계 변경, Shop 이슈, 접합부 간섭**을 놓치지 않고 방어해야 함
4. **목표**: Gmail로 수신된 메일을 AI(Gemini)가 분석하여, 공법적/계약적 리스크를 추출하고 Google Sheet에 DB화하는 시스템 구축

[Technical Requirements]
1. **Platform**: Google Apps Script (Standalone or Bound to Sheet)
2. **AI Model**: Gemini 2.0 Flash (`gemini-2.0-flash`)
3. **API Auth**: `x-goog-api-key` 헤더 방식 사용
4. **Parsing**: JSON 응답의 Markdown Code block 제거 처리 필수

[Task Description]
다음 3가지 모듈을 포함하는 완벽한 `Code.gs` 코드를 작성하고, Google Sheet의 컬럼 구조를 정의해 주세요.

## Task 1. Configuration (설정 및 필터링)
* **Keywords**: `복합동`, `P5`, `P56`, `PSRC`, `HMB`, `PC`, `접합`, `Shop`, `하중`, `골조`
* **Participants (Whitelist)**: 다음 도메인/이메일만 필터링하도록 배열로 관리
    * 삼성E&A (`@samsung.com`) - 시공/PM
    * 삼우종합건축 (`@samoo.com`) - 원설계
    * 이앤디몰 (`vickysong1@naver.com`, `dhkim2630@naver.com`) - PC 설계
    * 센구조 내부 (`@senkuzo.com`, `@senvex.net`)
* **Query**: `(키워드 OR 조건)` AND `(참여자 OR 조건)` AND `newer_than:14d` 로직 구현

## Task 2. Data Structure (Google Sheet Columns)
Google Sheet의 1행(Header)에 들어갈 26개 컬럼을 순서대로 정의하고, 스크립트가 이 순서에 맞춰 데이터를 넣도록 하세요.

**26개 컬럼 리스트**:
1. NO (자동 증가 번호)
2. 상태 (미처리/진행중/완료)
3. 긴급도 (Critical/High/Medium/Low)
4. 발생원 (삼우/ENA/이앤디몰/센코어)
5. 공법구분 (PSRC-PC접합/PSRC-Steel접합/변단면 이슈 등)
6. 메일ID (Gmail Message ID)
7. 발신자 (From 주소)
8. 수신일시 (메일 수신 시각)
9. 제목 (메일 제목)
10. 본문요약 (AI 생성 요약)
11. AI분석 (공법적 분석 내용)
12. 추천조치 (AI 제안 조치)
13. 키워드 (추출된 키워드 배열)
14. 첨부파일수 (첨부 파일 개수)
15. 스레드ID (Gmail Thread ID)
16. 참조인 (CC 리스트)
17. 라벨 (Gmail 라벨)
18. 중요표시 (별표 여부)
19. 읽음여부 (읽음 상태)
20. 처리담당 (담당자 이름)
21. 처리기한 (목표 완료일)
22. 처리상태 (세부 상태)
23. 메모 (수동 메모)
24. 비고 (기타 정보)
25. RawJSON (원본 AI 응답 전체)
26. 등록일시 (시스템 등록 시각)

## Task 3. AI Persona & Logic (핵심 분석 엔진)
`analyzeWithMethodExpert_` 함수를 작성할 때, 아래의 **페르소나(Persona)**와 **분석 기준**을 프롬프트에 강력하게 주입하세요.

* **Role**: PSRC 및 HMB 공법 총괄 엔지니어
* **Logic**:
    * **발생원 추론**: 발신자 도메인을 보고 `삼우(원설계)`, `ENA(시공)`, `이앤디몰(PC)`, `센코어(제작)` 자동 분류
    * **공법/접합**: `PSRC-PC접합`, `PSRC-Steel접합`, `변단면 이슈` 등 이종 자재 간섭 위주 분석
    * **리스크 평가**:
        * Shop Drawing 수정이 불가능한 단계(제작 후)라면 `urgency`를 **"Critical"**로 상향
        * PC 설계 오류($0.75fpu$ 이슈)나 변단면 상세 오류는 **"Showstopper"**로 분류
        * 일반 문의는 **"Low"** 또는 **"Medium"**
* **Output JSON**: 위 Task 2의 26개 컬럼에 매핑될 수 있는 JSON 구조

**AI 분석 프롬프트 템플릿** (함수 내부에 삽입):
```
당신은 PSRC(프리캐스트 기둥)와 HMB(하프 슬래브 보) 공법의 총괄 엔지니어입니다.
다음 메일을 분석하여 공법적 리스크, 접합부 이슈, 설계 변경 사항을 추출하세요.

발생원 추론 규칙:
- @samoo.com → 삼우(원설계)
- @samsung.com → ENA(시공)
- vickysong1@naver.com, dhkim2630@naver.com → 이앤디몰(PC설계)
- @senkuzo.com, @senvex.net → 센구조(내부)

긴급도 평가 기준:
- Shop Drawing 제작 후 단계 → "Critical"
- 0.75fpu 설계 오류 → "Showstopper"
- 변단면 상세 오류 → "Showstopper"
- 일반 문의 → "Low"

다음 JSON 형식으로 응답하세요 (Markdown 코드 블록 없이):
{
  "발생원": "삼우(원설계)",
  "공법구분": "PSRC-PC접합",
  "긴급도": "Critical",
  "본문요약": "...",
  "AI분석": "...",
  "추천조치": "...",
  "키워드": ["PSRC", "접합부"]
}

메일 제목: {제목}
메일 본문:
{본문}
```

[Deliverables]
1. 복사해서 바로 붙여넣을 수 있는 전체 `Code.gs` 소스 코드
2. Google Sheet의 1행에 붙여넣을 헤더 텍스트 리스트 (26개 컬럼명)
3. 스크립트 실행 전 설정해야 할 변수(`SHEET_ID`, `API_KEY`) 안내
4. 테스트 방법 및 트리거 설정 가이드

[Code Requirements]
1. **모듈화**: Config, GmailFilter, GeminiAnalyzer, SheetWriter 함수 분리
2. **에러 핸들링**:
   - Gemini API 429 에러 → Exponential Backoff (2초 → 4초 → 8초)
   - JSON 파싱 실패 → Fallback 기본 구조 반환
   - Gmail API 쿼터 초과 방지 → 최대 50개/실행
3. **성능**:
   - Gemini API Rate Limit 준수 (60 req/min)
   - Apps Script 6분 제한 고려
4. **보안**:
   - API 키는 `PropertiesService.getScriptProperties()` 사용
   - Sheet ID도 환경 변수로 관리
5. **한글 주석**: 모든 함수에 한글 주석 추가

[Expected Output Example]
# Config.gs
const CONFIG = {
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
  KEYWORDS: ['복합동', 'P5', 'P56', 'PSRC', 'HMB', 'PC', '접합', 'Shop', '하중', '골조'],
  PARTICIPANTS: ['@samsung.com', '@samoo.com', 'vickysong1@naver.com', 'dhkim2630@naver.com', '@senkuzo.com', '@senvex.net'],
  MAX_THREADS: 50
};

# Code.gs (메인 함수)
function main() {
  const threads = filterGmailThreads_();
  threads.forEach(thread => {
    const emailData = parseThread_(thread);
    const analysis = analyzeWithGemini_(emailData);
    writeToSheet_(analysis);
  });
}

[Success Criteria]
✅ Gmail에서 P5 관련 메일 자동 필터링 성공
✅ Gemini API 호출 및 JSON 파싱 정상 동작
✅ Google Sheet에 26개 컬럼 데이터 정확히 입력
✅ 에러 발생 시 로그 기록 및 재시도 로직 동작
✅ 코드 실행 시간 6분 이내 완료

[Additional Context]
- 프로젝트 문서: docs/techspec.md 참조 (상세 요구사항)
- Multi-Agent Debate 결과: docs/debate_log.md 참조 (검증 완료)
- 최종 평가 점수: 93.7/100 (GPT-5, Gemini, Claude 합의)
```

---

## 📋 복사 종료

---

## 💡 사용 팁

### Cursor에서 사용 시
1. 위 프롬프트 전체 복사
2. Cursor 채팅창에 붙여넣기
3. "이 프롬프트를 따라 Code.gs를 생성해줘" 입력
4. 생성된 코드 검토 후 적용

### Windsurf에서 사용 시
1. 프롬프트 복사 후 Windsurf Flow에 붙여넣기
2. "Generate complete implementation" 명령 실행
3. 자동 생성된 파일 구조 확인

### GitHub Copilot에서 사용 시
1. VSCode에서 새 파일 `Code.gs` 생성
2. 주석으로 프롬프트 붙여넣기
3. Copilot이 자동 완성 제안 → Tab으로 수락

### Claude Code에서 사용 시
1. 채팅창에 프롬프트 붙여넣기
2. `/implement` 커맨드와 함께 실행
3. TDD 방식으로 단계별 구현

---

## 🔄 추가 지시 사항 (필요 시 추가)

### 테스트 코드 요청 시
```
위 Code.gs에 대한 단위 테스트 코드도 작성해줘.
- tests/test_gmail_filter.gs
- tests/test_gemini_parser.gs
- tests/test_sheet_writer.gs

각 테스트는 실제 Gmail/Gemini API를 호출하지 않고 Mock 데이터를 사용하도록 해줘.
```

### 트리거 설정 요청 시
```
Google Apps Script 트리거를 설정하는 코드도 추가해줘.
- 매일 오전 9시 자동 실행
- 실행 실패 시 알림 메일 발송
- 실행 로그 별도 시트에 기록
```

### 대시보드 생성 요청 시
```
Google Sheet에 대시보드 시트를 추가하고, 다음 차트를 생성해줘:
1. 일별 메일 수신 건수 (라인 차트)
2. 긴급도별 분포 (파이 차트)
3. 발생원별 비율 (막대 차트)
4. 공법구분별 이슈 수 (테이블)
```

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
**Compatible with**: Cursor, Windsurf, GitHub Copilot, Claude Code, GPT-5, Gemini Pro
