# Phase 5-6 정밀 실행 계획

**버전**: 2.0
**작성일**: 2025-12-30
**상태**: 승인 대기

---

## 실행 요약

| 항목 | 값 |
|------|-----|
| 총 태스크 | 9개 (Phase 5: 5개, Phase 6: 4개) |
| 예상 시간 | 24시간 |
| 핵심 파일 | 5개 |
| 위험도 | Medium |

---

## Phase 5: AI-Dashboard 통합 (14시간)

### 권장 실행 순서

```
[Task 3] LockService ──┐
                       ├──▶ [Task 1] 프롬프트 ──▶ [Task 2] 스키마 ──▶ [Task 5] API
[Task 4] 매핑 ─────────┘
```

---

### Task 3: LockService 동시성 제어 (2시간)

**우선순위**: 🔴 Critical (첫 번째)

**변경 파일**:
| 파일 | 라인 | 변경 내용 |
|------|------|-----------|
| `src/dashboard/DashboardAPI.gs` | 348-410 | `updateColumn()` Lock 적용 |
| `src/dashboard/DashboardAPI.gs` | 418-439 | `bulkUpdateColumns()` Lock 적용 |
| `src/dashboard/DashboardAPI.gs` | 446-500 | `createIssue()` Lock 적용 |

**구현 패턴**:
```javascript
function updateColumn(uid, data, user) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) {
    return { success: false, error: "Cannot acquire lock. Try again." };
  }

  try {
    // 기존 로직
  } finally {
    lock.releaseLock();
  }
}
```

**테스트**:
- 동일 Column 동시 업데이트 시뮬레이션
- Lock 타임아웃 에러 응답 확인

---

### Task 4: Urgency→Severity 매핑 (1시간)

**우선순위**: 🔴 Critical (두 번째)

**변경 파일**:
| 파일 | 라인 | 변경 내용 |
|------|------|-----------|
| `src/Config.gs` | 117 이후 | `URGENCY_TO_SEVERITY` 매핑 추가 |

**구현 코드**:
```javascript
// URGENCY_LEVELS 다음에 추가 (라인 117 이후)
URGENCY_TO_SEVERITY: {
  'Showstopper': 'critical',
  'Critical': 'critical',
  'High': 'high',
  'Medium': 'medium',
  'Low': 'low'
},
```

**테스트**:
- 각 Urgency 레벨 변환 검증
- 알 수 없는 입력 시 기본값 확인

---

### Task 1: 시맨틱 프롬프트 강화 (3시간)

**우선순위**: 🟡 High (세 번째)

**변경 파일**:
| 파일 | 라인 | 변경 내용 |
|------|------|-----------|
| `src/GeminiAnalyzer.gs` | 20 (신규) | `ZONE_CONTEXT` 상수 추가 |
| `src/GeminiAnalyzer.gs` | 21-73 | `PERSONA_PROMPT` Zone 정보 추가 |
| `src/GeminiAnalyzer.gs` | 62-73 | JSON 스키마에 `affectedColumns`, `zoneId` 추가 |

**ZONE_CONTEXT 추가**:
```javascript
// 라인 20에 추가
const ZONE_CONTEXT = `
# 그리드 매핑 정보
| Zone | X축 범위 | 행 라벨 |
|------|---------|--------|
| ZONE A (FAB) | X1 ~ X23 | A, B, C, D, E, F, G, H, I, J, K, L |
| ZONE B (CUB) | X24 ~ X45 | A, B, C, D, E, F, G, H, I, J, K, L |
| ZONE C (COMPLEX) | X46 ~ X69 | A, B, C, D, E, F, G, H, I, J, K, L |

# UID 형식
- 형식: "{행라벨}-X{열번호}" (예: A-X23, B-X30)
- 메일에서 "X23~X30열" 언급 시 모든 행의 해당 열을 추출

# 추가 출력 필드
"zoneId": "zone_b",
"affectedColumns": ["A-X23", "B-X23", ..., "L-X30"]
`;
```

**JSON 스키마 확장**:
```json
{
  "발생원": "삼우(원설계)",
  "공법구분": "PSRC-PC접합",
  "긴급도": "Critical",
  "zoneId": "zone_b",
  "affectedColumns": ["C-X30", "D-X30"],
  "본문요약": "...",
  "AI분석": "...",
  "추천조치": "...",
  "키워드": ["PSRC", "접합부"]
}
```

**테스트**:
- "X23~X30열" 포함 메일 분석 시 affectedColumns 정확성
- zoneId 자동 추론 검증

---

### Task 2: 데이터 스키마 통합 (4시간)

**우선순위**: 🟡 High (네 번째)

**변경 파일**:
| 파일 | 라인 | 변경 내용 |
|------|------|-----------|
| `src/dashboard/DashboardAPI.gs` | 773-787 | ISSUES 시트 스키마 확장 |
| `src/dashboard/DashboardAPI.gs` | 261-275 | `getIssues()` 신규 필드 추가 |
| `src/dashboard/DashboardAPI.gs` | 461-475 | `createIssue()` appendRow 확장 |
| `src/SheetWriter.gs` | 432 이후 | `createDashboardIssue_()` 함수 추가 |

**ISSUES 스키마 확장** (13→18개 컬럼):
```javascript
issuesSheet.appendRow([
  "id", "type", "title", "affectedColumns", "zoneId", "severity",
  "description", "expectedResolution", "actualResolution", "status",
  "reportedBy", "reportedAt", "assignedTo",
  // 신규 AI 메타데이터 컬럼
  "source",        // 'ai' | 'user'
  "emailId",       // Gmail Message ID
  "aiSummary",     // AI 본문요약
  "aiAnalysis",    // AI 분석 내용
  "aiKeywords"     // AI 추출 키워드
]);
```

**SheetWriter.gs 신규 함수**:
```javascript
function createDashboardIssue_(analysis, emailData) {
  const issueData = {
    type: mapMethodToIssueType_(analysis.공법구분),
    title: analysis.본문요약,
    affectedColumns: analysis.affectedColumns || [],
    zoneId: analysis.zoneId || '',
    severity: CONFIG.URGENCY_TO_SEVERITY[analysis.긴급도] || 'medium',
    description: analysis.AI분석,
    source: 'ai',
    emailId: emailData.id,
    aiSummary: analysis.본문요약,
    aiAnalysis: analysis.AI분석,
    aiKeywords: (analysis.키워드 || []).join(',')
  };
  return createIssue(issueData, 'gemini_ai');
}
```

**테스트**:
- 메일 분석 후 ISSUES 시트 자동 등록
- Dashboard에서 AI 이슈 표시 확인

---

### Task 5: 비동기 분석 트리거 API (4시간)

**우선순위**: 🟢 Medium (다섯 번째)

**변경 파일**:
| 파일 | 라인 | 변경 내용 |
|------|------|-----------|
| `src/dashboard/DashboardAPI.gs` | 42-86 | doGet에 `triggerAnalysis` 추가 |
| `src/dashboard/DashboardAPI.gs` | 93-137 | doPost에 `analyzeNow` 추가 |
| `src/dashboard/index.html` | 693-695 | "Analyze" 버튼 추가 |
| `src/dashboard/index.html` | 1276-1350 | Alpine.js 분석 메서드 추가 |

**API 엔드포인트**:
```javascript
// doPost에 케이스 추가
case 'triggerAnalysis':
  ScriptApp.newTrigger('main')
    .timeBased()
    .after(1000)
    .create();
  return { success: true, message: 'Analysis job started' };
```

**Dashboard UI**:
```html
<button @click="triggerAnalysis()" class="btn-primary">
  🔍 새 메일 분석
</button>
```

**테스트**:
- Dashboard 버튼 클릭 시 API 호출
- 분석 완료 후 Grid 자동 갱신

---

## Phase 6: Legacy UX 개선 (10시간)

### 실행 순서

```
[Task 6.1] 데이터 모델 ──▶ [Task 6.2] Multi-Stage UI ──▶ [Task 6.3] 헤더 ──▶ [Task 6.4] 워크플로우
```

---

### Task 6.1: 6단계 공정 데이터 모델 (2시간)

**변경 파일**:
| 파일 | 라인 | 변경 내용 |
|------|------|-----------|
| `src/dashboard/data/master_config.json` | 신규 | `productionStages` 배열 추가 |
| `src/dashboard/DashboardAPI.gs` | 709-726 | Columns 시트 스키마 확장 |

**공정 단계 정의**:
```json
"productionStages": [
  { "code": "hmb_fab", "label": "HMB제작", "order": 1, "color": "#1f6feb" },
  { "code": "pre_assem", "label": "연조립", "order": 2, "color": "#8957e5" },
  { "code": "main_assem", "label": "대조립", "order": 3, "color": "#d29922" },
  { "code": "hmb_psrc", "label": "HMB+PSRC삽입", "order": 4, "color": "#238636" },
  { "code": "form", "label": "FORM", "order": 5, "color": "#da3633" },
  { "code": "embed", "label": "앰베드", "order": 6, "color": "#f85149" }
]
```

---

### Task 6.2: 셀 Multi-Stage Indicator (3시간)

**변경 파일**:
| 파일 | 라인 | 변경 내용 |
|------|------|-----------|
| `src/dashboard/index.html` | 179-208 | 2x3 그리드 CSS 추가 |
| `src/dashboard/index.html` | 783-802 | Alpine.js 렌더링 템플릿 |

**CSS**:
```css
.cell-multi-stage {
  display: grid;
  grid-template-columns: repeat(3, 6px);
  grid-template-rows: repeat(2, 6px);
  gap: 1px;
  width: 20px;
  height: 13px;
}
.stage-dot.complete { background: #238636; }
.stage-dot.pending { background: #484f58; }
```

---

### Task 6.3: 진행률 헤더 대시보드 (2시간)

**변경 파일**:
| 파일 | 라인 | 변경 내용 |
|------|------|-----------|
| `src/dashboard/index.html` | 46-56 | Header에 progress-summary 추가 |
| `src/dashboard/index.html` | 1446-1465 | getStageProgress() 함수 확장 |

---

### Task 6.4: 워크플로우 다이어그램 (3시간)

**변경 파일**:
| 파일 | 라인 | 변경 내용 |
|------|------|-----------|
| `src/dashboard/index.html` | Footer 섹션 | SVG 워크플로우 다이어그램 |

---

## 위험 관리

| 위험 | 확률 | 영향 | 대응 |
|------|------|------|------|
| Gemini 토큰 초과 | Medium | High | maxOutputTokens 4096 상향 |
| LockService 타임아웃 | Low | Medium | tryLock + 재시도 로직 |
| 기존 데이터 호환성 | Medium | High | 마이그레이션 스크립트 |
| Apps Script 6분 제한 | High | Critical | 배치 10건 제한 |

---

## 통합 테스트 시나리오

### 시나리오 1: 전체 파이프라인
1. Gmail에 테스트 메일 전송 ("X30~X35열" 언급)
2. `main()` 함수 실행
3. **검증**:
   - ISSUES 시트에 신규 이슈 생성
   - `zoneId = zone_b`, `severity = high` 확인
   - Dashboard Grid에서 해당 컬럼 hold 상태

### 시나리오 2: 동시성 테스트
1. 두 브라우저에서 동일 Column 동시 업데이트
2. **검증**:
   - LockService로 하나만 성공
   - 적절한 에러 메시지 반환

### 시나리오 3: Dashboard 수동 분석
1. "Analyze" 버튼 클릭
2. **검증**:
   - Toast 알림 표시
   - 완료 후 Grid 자동 갱신

---

## 체크리스트

### Pre-Implementation
- [ ] Config.gs 백업
- [ ] DashboardAPI.gs 백업
- [ ] 테스트 Sheet 생성

### Implementation (순서대로)
- [ ] Task 3: LockService 적용
- [ ] Task 4: URGENCY_TO_SEVERITY 매핑
- [ ] Task 1: 시맨틱 프롬프트 강화
- [ ] Task 2: 데이터 스키마 통합
- [ ] Task 5: 비동기 분석 트리거
- [ ] Task 6.1-6.4: Legacy UX 개선

### Post-Implementation
- [ ] 단위 테스트 실행
- [ ] 통합 테스트 실행
- [ ] 프로덕션 배포
