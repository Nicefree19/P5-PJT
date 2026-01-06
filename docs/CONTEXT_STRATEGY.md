# P5 PJT Context Intelligence Strategy: "The Reasoning Dashboard"

## 1. 🎯 Core Philosophy: "From What to Why"
기존 대시보드는 **"무엇(Status)"**을 보여주지만, PM은 **"왜(Context)"**를 알아야 의사결정을 할 수 있습니다. 이 시스템의 목표는 분산된 커뮤니케이션(메일, 카톡, 회의록)을 대시보드의 특정 상태 변화와 **직접 연결(Hyper-linking)**하는 것입니다.

---

## 2. 🧩 The 4-Step Pipeline Architecture

### Step 1: Ingest (수집) - "The Context Inbox"
대시보드 우측에 **[Context Inbox]** 패널을 신설합니다.
- **Paste & Go**: 카톡 대화 내용, 이메일 본문을 복사/붙여넣기.
- **File Drop**: 회의록 PDF, Excel 일정표 드래그 & 드롭.
- **Voice Memo**: 현장 음성 메모(Speech-to-Text).

### Step 2: Digest (해석) - "AI Semantic Parsing"
입력된 비정형 텍스트를 구조화된 데이터로 변환합니다.
- **Entity Extraction**: 
  - "C존 3열" → `Column ID: C-X3` ~ `C-X10`
  - "김부장님" → `Stakeholder: Manager Kim`
  - "내일" → `Date: 2026-01-07`
- **Intent Detection**:
  - "입고 지연될듯" → `Status: Delay`, `Action: Create Issue`
  - "설치 완료했습니다" → `Status: Installed`, `Action: Update Stage`

### Step 3: Suggest (제안) - "Human-in-the-loop"
**AI는 절대 멋대로 데이터를 수정하지 않습니다.** 대신 "제안 카드(Action Card)"를 생성합니다.
- **UI**: "김부장님 카톡에 따르면 C-X1~5가 설치 완료된 것 같습니다. 상태를 변경할까요?"
- **Action**: [승인] / [수정] / [거절]

### Step 4: Link (연결) - "Data Provenance"
승인된 변경사항은 단순 로그가 아닌 **"Source-Linked History"**가 됩니다.
- 6개월 뒤 C-X1을 클릭했을 때 히스토리:
  - `2026-01-06 [설치완료] by PM (Source: 📄 1/6 공정회의록.pdf)`
  - 클릭 시 원본 회의록의 해당 문단을 하이라이트.

---

## 3. 🛠️ Implementation Feature Specs

### A. Context Inbox Panel (UI)
- **위치**: 우측 사이드바 (History 위)
- **기능**:
  - 텍스트 입력창 (Auto-expanding textarea)
  - 파일 첨부 영역
  - "분석하기(Analyze)" 버튼

### B. The "Smart Parser" (Logic)
- **Regex + Fuzzy Matching**:
  - `/[A-Z]-[X][0-9]+/` 패턴으로 기둥 ID 자동 식별
  - "3층", "F3", "3FL" 등 층수 매핑
- **Keyword Trigger**:
  - "보류", "Stop", "중단" → `Action: Lock Column` or `Create Severity Issue`
  - "완료", "끝", "Done" → `Action: Next Stage`

### C. Source Traceability System (Data Structure)
```javascript
// Column Data Model Extension
column.history = [{
    timestamp: "2026-01-06T14:00:00Z",
    action: "status_change",
    from: "active",
    to: "installed",
    reason: "현장 카톡",
    sourceId: "ctx_12345", // Links to stored context text
    sourceSnippet: "C구역 오늘 타설 끝났습니다." // The specific evidence
}];
```

---

## 4. 📅 Phase Roadmap (Proposed)

### Phase 12-1: The "Smart Paste" (MVP)
- **기능**: 특정 텍스트 포맷("C-X1 완료")을 인식해 상태 변경 제안.
- **대상**: 정해진 규격의 카톡 보고 메시지 파싱.

### Phase 12-2: Context Storage
- **기능**: 입력된 텍스트/파일을 저장하고, 이슈/기둥과 ID로 연결.
- **UI**: 히스토리에서 "근거 보기" 클릭 시 원본 팝업.

### Phase 12-3: Advanced NLP Integration
- **기능**: LLM을 이용한 자연어 이해 ("거기 아까 말한 3개 기둥 처리해" 같은 모호한 지시 해석).

---

## 5. 💡 Value Proposition
이 시스템이 구축되면:
1. **분쟁 해결**: "그때 왜 공사 중단했어?" → "1/6일 감리단 이메일 요청 때문입니다(증거 링크)."
2. **자동화**: 일일보고 작성 시간을 50% 단축 (카톡 긁어넣으면 보고서 초안 완성).
3. **지식 자산화**: 개인의 메일함에 묻혀있던 정보가 프로젝트의 자산이 됨.
