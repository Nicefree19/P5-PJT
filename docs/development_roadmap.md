# P5 Dashboard Development Roadmap

**버전**: 2.1
**작성일**: 2025-12-31
**상태**: Phase 1-7+ 완료

---

## 📊 프로젝트 진행 현황

| Phase | 상태 | 설명 |
|-------|------|------|
| Phase 0 | ✅ 완료 | Planning & Design |
| Phase 1 | ✅ 완료 | Dashboard Core & Local Mode |
| Phase 2 | ✅ 완료 | Sheet Sync Adapter |
| Phase 3 | ✅ 완료 | AI & Issue Integration |
| Phase 4 | ✅ 완료 | Admin Tools |
| Phase 5 | ✅ 완료 | AI-Dashboard Integration |
| Phase 6 | ✅ 완료 | Legacy UX Improvement (6단계 공정) |
| Phase 7 | ✅ 완료 | UX Improvement (검색, 알림, 히스토리) |
| Phase 7+ | ✅ 완료 | 층-절주 구조 Backend (11F×8절주) |

---

## Phase 5: AI-Dashboard 통합

### 개요
Deep-Dive 리뷰에서 도출된 5가지 핵심 과제를 해결합니다.

| # | 과제 | 영향 파일 | 우선순위 |
|---|------|----------|---------|
| 1 | 시맨틱 프롬프트 강화 | `GeminiAnalyzer.gs` | 🔴 Critical |
| 2 | 데이터 스키마 통합 | `DashboardAPI.gs`, `SheetWriter.gs` | 🔴 Critical |
| 3 | LockService 적용 | `DashboardAPI.gs` | 🟡 High |
| 4 | Urgency→Severity 매핑 | `Config.gs` | 🟡 High |
| 5 | 비동기 분석 트리거 | `DashboardAPI.gs`, `index.html` | 🟢 Medium |

### Task 1: 시맨틱 프롬프트 강화
**목표**: AI가 `affectedColumns` 리스트를 직접 생성

```javascript
const ZONE_CONTEXT = `
# 그리드 매핑 정보
| Zone | X축 범위 |
|------|---------|
| ZONE A (FAB) | X1 ~ X23 |
| ZONE B (CUB) | X24 ~ X45 |
| ZONE C (COMPLEX) | X46 ~ X69 |

# UID 형식: "{행라벨}-X{열번호}" (예: A-X23)
`;
```

### Task 2: 데이터 스키마 통합
**목표**: AI 메타데이터를 ISSUES 시트에 통합

```javascript
// 확장된 컬럼
"source",      // 'ai' | 'user'
"emailId",     // Gmail Message ID
"aiSummary",   // AI 본문요약
"aiAnalysis",  // AI 분석 내용
"aiKeywords"   // AI 추출 키워드
```

### Task 3: LockService 적용
**목표**: 동시성 충돌 방지

```javascript
function updateColumn(uid, data, user) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    // ... 기존 로직 ...
  } finally {
    lock.releaseLock();
  }
}
```

### Task 4: Urgency→Severity 매핑

```javascript
URGENCY_TO_SEVERITY: {
  'Showstopper': 'critical',
  'Critical': 'critical',
  'High': 'high',
  'Medium': 'medium',
  'Low': 'low'
}
```

### Task 5: 비동기 분석 트리거

```javascript
case 'triggerAnalysis':
  ScriptApp.newTrigger('runEmailAnalysis')
    .timeBased()
    .after(1000)
    .create();
  return { success: true, message: 'Analysis job started' };
```

---

## Phase 6: Legacy UX Improvement

### 개요
기존 PSRC 제작 현황도 양식을 Dashboard에 통합합니다.

![Legacy Format](./assets/psrc_production_status.png)

### 기존 양식 → 개선 방향

| 기존 요소 | 개선 방향 |
|----------|----------|
| 각 셀 2x2 상태 | 2x3 미니 그리드로 6단계 표시 |
| 상단 진행 실적 테이블 | 공정별 진행률 바 헤더 |
| 하단 공정 흐름도 | 인터랙티브 워크플로우 |
| 단일 상태 추적 | 6단계 공정별 완료일시 추적 |

### Task 6.1: 데이터 모델 확장

```json
"productionStages": [
  { "code": "hmb_fab", "label": "HMB제작", "order": 1 },
  { "code": "pre_assem", "label": "연조립", "order": 2 },
  { "code": "main_assem", "label": "대조립", "order": 3 },
  { "code": "hmb_psrc", "label": "HMB+PSRC삽입", "order": 4 },
  { "code": "form", "label": "FORM", "order": 5 },
  { "code": "embed", "label": "앰베드", "order": 6 }
]
```

### Task 6.2: 셀 Multi-Stage Indicator

```css
.cell-multi-stage {
  display: grid;
  grid-template-columns: repeat(3, 6px);
  grid-template-rows: repeat(2, 6px);
  gap: 1px;
}
```

### Task 6.3: 진행률 헤더

```html
<div class="progress-summary">
  <template x-for="stage in productionStages">
    <div class="stage-progress">
      <span x-text="stage.label"></span>
      <div class="progress-bar">
        <div class="progress-fill" 
             :style="`width: ${getStageProgress(stage.code)}%`">
        </div>
      </div>
    </div>
  </template>
</div>
```

### Task 6.4: 워크플로우 다이어그램

```html
<div class="workflow-diagram">
  <div class="workflow-step" x-for="stage in productionStages">
    <div class="step-icon" :style="`background: ${stage.color}`">
      <span x-text="getStageCount(stage.code)"></span>
    </div>
    <span x-text="stage.label"></span>
    <span class="step-arrow">→</span>
  </div>
</div>
```

---

## 📅 예상 일정

| Phase | 예상 시간 |
|-------|----------|
| Phase 5 | ~2.5시간 |
| Phase 6 | ~2.25시간 |
| **총계** | **~4.75시간** |

---

## 검증 계획

| 단계 | 테스트 항목 | 성공 기준 |
|------|------------|----------|
| 1 | AI affectedColumns | 샘플 메일 분석 후 JSON 확인 |
| 2 | Issue 시트 통합 | Dashboard에서 AI 이슈 표시 |
| 3 | LockService | 동시 수정 시뮬레이션 |
| 4 | 셀 미니 그리드 | 6단계 상태가 2x3으로 표시 |
| 5 | 워크플로우 | 클릭 시 해당 공정 필터링 |

---

## Phase 7: UX Improvement ✅

**완료일**: 2025-12-31

### 개요
Dashboard 사용성 개선을 위한 고급 UX 기능 구현

### Task 7.1: Smart Search
- 검색바 (`Ctrl+K`) 구현
- 기둥 UID, Zone, 상태 검색 지원
- 실시간 결과 하이라이트

### Task 7.2: Notification System
- 알림 패널 구현
- 실시간 알림 표시
- 알림 읽음/삭제 관리

### Task 7.3: History Viewer
- 변경 이력 패널 구현
- 셀 클릭 시 히스토리 조회
- 시간순 변경 내역 표시

### Task 7.4-7.6: Floor-Jeolju Structure (Frontend)
- 층 선택기 컴포넌트 (F01-F11)
- 절주 입면 뷰어 (J1-J8)
- 키보드 단축키 (F, J, PgUp, PgDn)

---

## Phase 7+: 층-절주 구조 완성 ✅

**상태**: 완료
**완료일**: 2025-12-31

### 개요
11층 × 8절주 구조 시스템 완성 (Backend 연동)

### 구조 정보
```
11개 층: F01 (1F) ~ F11 (11F)
8개 절주: J1 (X1-X8), J2 (X9-X17), ... J8 (X62-X69)
총 기둥: 11F × 69컬럼 = 759개
```

### 구현 내역

#### Phase A: Backend Schema Extension ✅
- [x] Columns 시트에 `floorId` 컬럼 추가 (19번째 컬럼)
- [x] `getColumns()` API에 층 필터 파라미터 추가
- [x] `getFloorData()` 백엔드 구현

#### Phase B: Data Migration ✅
- [x] 기존 데이터를 F01 (1층)으로 초기화
- [x] 층별 데이터 분리 스크립트 작성 (`migrateColumnsAddFloorId`)

#### Phase C: API Integration ✅
- [x] Frontend loadFloorData() → Backend API 연결
- [x] 층별 통계 API 구현 (`getAllFloorStats`)

#### Phase D: Testing & Validation ✅
- [x] 층 전환 테스트 (`test_FloorAPI`, `test_FloorStats`)
- [x] 절주 필터 테스트 (`test_JeoljuAPI`, `test_ColumnsFloorFilter`)
- [x] 통합 테스트 (`runPhase7PlusTests`)

---

## 📅 완료 일정

| Phase | 완료일 | 소요시간 |
|-------|--------|----------|
| Phase 5 | 2025-12-30 | ~2.5시간 |
| Phase 6 | 2025-12-30 | ~2.25시간 |
| Phase 7 | 2025-12-31 | ~3시간 |
| Phase 7+ | 2025-12-31 | ~2시간 |

---

## 검증 완료

| 단계 | 테스트 항목 | 결과 |
|------|------------|------|
| 1 | AI affectedColumns | ✅ 통과 |
| 2 | Issue 시트 통합 | ✅ 통과 |
| 3 | LockService | ✅ 통과 |
| 4 | 셀 미니 그리드 | ✅ 통과 |
| 5 | 워크플로우 | ✅ 통과 |
| 6 | Smart Search | ✅ 통과 |
| 7 | Notifications | ✅ 통과 |
| 8 | History Viewer | ✅ 통과 |
| 9 | 층-절주 Frontend | ✅ 통과 |
| 10 | Floor API (getFloorData) | ✅ 통과 |
| 11 | Floor Stats API | ✅ 통과 |
| 12 | Columns Floor Filter | ✅ 통과 |
| 13 | Migration Functions | ✅ 통과 |
