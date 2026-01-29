# P5 Dashboard Task List

**최종 업데이트**: 2026-01-28
**현재 Phase**: Phase 8 정합성 통합 완료

---

## Phase 0: Planning & Design ✅
- [x] Create implementation_plan.md
- [x] Create docs/plan.md
- [x] Verify alignment with techspec.md
- [x] Analyze P5 Dashboard HTML code
- [x] Design Admin Configuration Module
- [x] Deep review & approve design changes

## Phase 1: Dashboard Core & Local Mode ✅
- [x] Update design docs with approved changes
- [x] Setup Alpine.js framework
- [x] Implement JSON data models
- [x] Build LocalStorage CRUD layer
- [x] Implement Bulk Edit (multi-select)

## Phase 2: Sheet Sync Adapter ✅
- [x] Build Apps Script API (doGet/doPost)
- [x] Implement Hybrid Sync (Optimistic UI)
- [x] Add conflict detection (timestamp check)

## Phase 3: AI & Issue Integration ✅
- [x] Overlay AI analysis results
- [x] Implement Master-Override (Lock) logic
- [x] Issue visualization (T/C, Design)

## Phase 4: Admin Tools ✅
- [x] Zone/Master Data settings UI
- [x] CSV/Excel bulk import
- [x] Mobile view optimization

---

## Phase 5: AI-Dashboard Integration ✅ (Completed)

**완료일**: 2025-12-30

### 권장 실행 순서 (의존성 기반)

| 순서 | Task | 우선순위 | 상태 | 파일 |
|------|------|---------|------|------|
| 1 | Task 3: LockService 동시성 제어 | 🔴 Critical | ✅ | DashboardAPI.gs |
| 2 | Task 4: Urgency→Severity 매핑 | 🔴 Critical | ✅ | Config.gs |
| 3 | Task 1: 시맨틱 프롬프트 강화 | 🟡 High | ✅ | GeminiAnalyzer.gs |
| 4 | Task 2: 데이터 스키마 통합 | 🟡 High | ✅ | DashboardAPI.gs, SheetWriter.gs |
| 5 | Task 5: 비동기 분석 트리거 | 🟢 Medium | ✅ | DashboardAPI.gs, index.html |

### 상세 체크리스트

#### Task 3: LockService 동시성 제어
- [x] `updateColumn()` 함수에 LockService 적용
- [x] `bulkUpdateColumns()` 함수에 LockService 적용 + 재시도 로직
- [x] `createIssue()` 함수에 LockService 적용 + 조기 해제 패턴
- [x] `resolveIssue()` 함수에 LockService 적용
- [x] 테스트 함수 작성 (test_LockService, verifyLockService)

#### Task 4: Urgency→Severity 매핑
- [x] Config.gs에 `URGENCY_TO_SEVERITY` 매핑 추가
- [x] `convertUrgencyToSeverity_()` 헬퍼 함수 추가 (fuzzy matching 포함)
- [x] `mapMethodToIssueType_()` 헬퍼 함수 추가
- [x] 테스트 함수 작성 (test_UrgencyToSeverityMapping)

#### Task 1: 시맨틱 프롬프트 강화
- [x] `ZONE_CONTEXT` 상수 추가 (Grid 매핑 정보)
- [x] `PERSONA_PROMPT`에 Zone 정보 주입
- [x] JSON 출력 스키마에 `affectedColumns`, `zoneId` 추가
- [x] `parseAnalysisResponse_()` 신규 필드 검증 추가
- [x] `inferZoneFromColumns_()` 헬퍼 함수 추가
- [x] 테스트 함수 작성 (test_SemanticPrompt)

#### Task 2: 데이터 스키마 통합
- [x] ISSUES 시트 스키마 확장 (13→18개 컬럼)
- [x] `getIssues()` 함수에 AI 메타데이터 필드 추가
- [x] `createIssue()` 함수 appendRow 확장 (18개 컬럼)
- [x] SheetWriter.gs에 `createDashboardIssue_()` 함수 추가
- [x] `shouldCreateIssue_()` 조건 검사 함수 추가
- [x] `syncAnalysisToDashboard_()` 배치 처리 함수 추가

#### Task 5: 비동기 분석 트리거 API
- [x] doPost에 `triggerAnalysis`, `getAnalysisStatus` 액션 추가
- [x] `triggerEmailAnalysis()` 함수 구현 (비동기 트리거)
- [x] `getAnalysisJobStatus()` 함수 구현
- [x] `runAnalysisJob_()` 트리거 핸들러 구현
- [x] Dashboard UI에 "Analyze" 버튼 추가
- [x] Alpine.js `analysisJob` 상태 및 메서드 추가
- [x] 폴링 기반 상태 확인 구현

---

## Phase 6: Legacy UX Improvement ✅ (Completed)

**완료일**: 2025-12-30

| 순서 | Task | 상태 | 파일 |
|------|------|------|------|
| 1 | Task 6.1: 6단계 공정 데이터 모델 | ✅ | master_config.json, DashboardAPI.gs |
| 2 | Task 6.2: 셀 Multi-Stage Indicator | ✅ | index.html (CSS + Template) |
| 3 | Task 6.3: 진행률 헤더 대시보드 | ✅ | index.html |
| 4 | Task 6.4: 워크플로우 다이어그램 | ✅ | index.html |

### 상세 체크리스트

#### Task 6.1: 6단계 공정 데이터 모델
- [x] master_config.json에 `productionStages` 배열 추가
- [x] Columns 시트 스키마 확장 (공정별 상태 컬럼 18개)
- [x] DashboardAPI.gs에 updateColumnStage(), bulkUpdateColumnStages() 함수 추가
- [x] test_ProductionStages() 테스트 함수 작성

#### Task 6.2: 셀 Multi-Stage Indicator
- [x] 2x3 미니 그리드 CSS 추가 (.stage-grid, .stage-cell)
- [x] Alpine.js 렌더링 템플릿 수정 (6개 stage-cell 그리드)
- [x] getStageStatus(), getStageTooltip() 헬퍼 함수 구현

#### Task 6.3: 진행률 헤더 대시보드
- [x] Header에 progress-summary 컴포넌트 추가
- [x] getStageProgress() 함수 구현
- [x] getTotalProgress() 전체 진행률 함수 구현
- [x] stageConfigs 배열로 공정 정보 관리

#### Task 6.4: 워크플로우 다이어그램
- [x] Footer에 SVG 워크플로우 추가 (6단계 시각화)
- [x] toggleWorkflowFilter(), clearWorkflowFilter() 인터랙티브 기능
- [x] getStageCount(), getStageLabel() 헬퍼 함수
- [x] isCellFilteredByWorkflow() 그리드 필터 연동

---

## Phase 7: UX Improvement ✅ (Completed)

**완료일**: 2025-12-31

| 순서 | Task | 상태 | 파일 |
|------|------|------|------|
| 1 | Task 7.1: Smart Search | ✅ | index.html |
| 2 | Task 7.2: Notification System | ✅ | index.html |
| 3 | Task 7.3: History Viewer | ✅ | index.html |
| 4 | Task 7.4: 층 선택기 컴포넌트 | ✅ | index.html |
| 5 | Task 7.5: 절주 입면 뷰어 | ✅ | index.html |
| 6 | Task 7.6: Grid 층별 로딩 (Frontend) | ✅ | index.html |

### 상세 체크리스트

#### Task 7.1: Smart Search
- [x] 검색바 컴포넌트 추가 (Ctrl+K 단축키)
- [x] 기둥 UID, Zone, 상태 검색 기능
- [x] 실시간 검색 결과 하이라이트
- [x] 키보드 네비게이션 (↑↓ Enter Esc)

#### Task 7.2: Notification System
- [x] 알림 패널 UI 구현
- [x] 실시간 알림 표시 기능
- [x] 알림 읽음/삭제 관리
- [x] 알림 카운터 배지

#### Task 7.3: History Viewer
- [x] 변경 이력 패널 구현
- [x] 셀 클릭 시 히스토리 조회
- [x] 시간순 변경 내역 표시
- [x] 패널 토글 기능

#### Task 7.4: 층 선택기 컴포넌트
- [x] 층 선택 드롭다운 UI
- [x] F1~F10, RF (11개 층) 지원 — floorId 표준: `F{n}` (프론트), `F0{n}` (백엔드 API)
- [x] 선택된 층 표시
- [x] 키보드 단축키 (F)

#### Task 7.5: 절주 입면 뷰어
- [x] 8개 절주 바 차트 UI
- [x] 절주별 이슈 카운트 표시
- [x] 절주 클릭 필터 기능
- [x] 진행률 퍼센트 표시

#### Task 7.6: Grid 층별 로딩
- [x] 층 전환 시 데이터 로딩 (Frontend stub)
- [x] 절주 필터 CSS 클래스
- [x] navigateFloor() 함수
- [x] 키보드 단축키 (PgUp, PgDn, J)

---

## Phase 7+: 층-절주 구조 Backend ✅ (Completed)

**완료일**: 2025-12-31

| 순서 | Task | 상태 | 파일 |
|------|------|------|------|
| A | Backend Schema Extension | ✅ | DashboardAPI.gs |
| B | Data Migration Functions | ✅ | DashboardAPI.gs |
| C | API Integration | ✅ | DashboardAPI.gs |
| D | Testing & Validation | ✅ | Tests.gs |

### 완료된 작업

#### Phase A: Backend Schema Extension ✅
- [x] Columns 시트에 `floorId` 컬럼 추가 (Column 19)
- [x] `getColumns()` API에 층 필터 파라미터 추가 (`floorFilter`)
- [x] `getFloorData()` 백엔드 구현 (이미 존재)
- [x] `getAllFloorStats()` 전체 층 통계 API 추가

#### Phase B: Data Migration Functions ✅
- [x] `migrateAddFloorIdColumn()` - 기존 데이터 마이그레이션
- [x] `generateAllFloorData()` - 11층 전체 데이터 생성
- [x] `getFloorColumnCount()` - 층별 기둥 수 조회

#### Phase C: API Integration ✅
- [x] `getFloorStats` endpoint 추가
- [x] `getColumns&floorId=F01` 필터 지원 (API는 F01 포맷, 프론트에서 `toApiFloorId()` 변환)
- [x] API 문서 업데이트 (v2.1)
- [x] Frontend `loadFloorData()` → Backend API 연결
- [x] `updateGridData()` 그리드 변환 함수 추가
- [x] 절주별 통계 업데이트 로직

#### Phase D: Testing & Validation ✅
- [x] 층 전환 테스트 (`test_FloorAPI()`, `test_FloorStats()`)
- [x] 절주 필터 테스트 (`test_JeoljuAPI()`, `test_ColumnsFloorFilter()`)
- [x] 마이그레이션 함수 테스트 (`test_MigrationFunctions()`)
- [x] 통합 테스트 러너 (`runPhase7PlusTests()`)
- [x] 빠른 상태 확인 (`quickPhase7PlusCheck()`)

---

## Phase 8: 정합성 통합 및 골조 연동 ✅ (Completed)

**완료일**: 2026-01-28

| 순서 | Task | 상태 | 파일 |
|------|------|------|------|
| 1 | 층 ID 포맷 통일 (F1 표준) | ✅ | index.html, pdf-generator.js |
| 2 | 그리드 SSOT 통합 (69×11, A-K) | ✅ | index.html, mgt-parser.js, mgt_parsed_config.json |
| 3 | Alpine.store('grid') dead watcher 제거 | ✅ | structure-store.js |
| 4 | 층-골조 오버레이 동기화 | ✅ | index.html, structure-store.js |
| 5 | 문서 정합성 업데이트 | ✅ | techspec.md, task_list.md |
| 6 | E2E 콘솔 에러 필터 강화 | ✅ | smoke.spec.ts |

### 상세 체크리스트

#### Task 8.1: 층 ID 포맷 통일
- [x] `floors[].floorId`: `1F`→`F1`, `2F`→`F2` ... `10F`→`F10` 통일
- [x] `jeoljuConfig[].floors`: 동일 포맷 통일
- [x] 초기화 버튼 `F01`→`F1`, legacy wrapper 매핑 제거
- [x] `normalizeFloorId()` / `toApiFloorId()` 유틸 추가
- [x] API 호출 시 `toApiFloorId()` 적용 (백엔드 F01 호환)
- [x] `padStart(2,'0')` fallback 제거 (MGT applyConfig)
- [x] pdf-generator.js `F01` → `F1` 통일

#### Task 8.2: 그리드 SSOT 통합
- [x] `updateGridData()` 하드코딩 `['A'...'L']/69` → `this.rowLabels/this.gridConfig.cols` 참조
- [x] gridConfig SSOT 주석 명확화 (COLUMN_CONFIG 단일 소스)
- [x] `mgt-parser.js` 주석 수정 (67→69 cols)
- [x] `mgt_parsed_config.json` 메타에 테스트 산출물 표기

#### Task 8.3: 골조 연동 정비
- [x] `selectFloor()` → `Alpine.store('structure').setFloor()` 호출 추가
- [x] `selectFloorAndSegment()` → 동일 호출 추가
- [x] `Alpine.store('grid')` dead watcher 제거
- [x] E2E 콘솔 에러 필터 강화 (Script error, GlobalError, Failed to load resource)

---

## Phase 9: 아키텍처 리팩토링 및 데이터 검증 📋 (Backlog)

**목표**: 모놀리식 UI 분리, 데이터 무결성 확인, Event Bus 도입

| 순서 | Task | 상태 | 설명 |
|------|------|------|------|
| 1 | index.html 컴포넌트 분리 | 📋 | ~13,000줄 모놀리식 → `/js/components/` 모듈화 |
| 2 | F2 층 컬럼 데이터 누락 확인 | ✅ | 오탐 — F2 데이터 17,985건 정상 존재. F1+F2는 1절주 기초 구간(0.3m~7.8m) 설계 의도 확인 |
| 3 | Event Bus 도입 | 📋 | store-to-store 직접 호출 → 커스텀 Event Bus로 컴포넌트 디커플링 |

---

## 통계

| 상태 | 개수 |
|------|------|
| ✅ 완료 | 87 |
| 🔄 진행중 | 0 |
| 📋 대기 | 2 |
| **총계** | **89** |

> Phase 5 완료 (2025-12-30): LockService 동시성 제어, Urgency→Severity 매핑, 시맨틱 프롬프트 강화, 데이터 스키마 통합, 비동기 분석 트리거 API
> Phase 6 완료 (2025-12-30): 6단계 공정 데이터 모델, 2x3 셀 Multi-Stage Indicator, 진행률 헤더, SVG 워크플로우 다이어그램
> Phase 7 완료 (2025-12-31): Smart Search, Notification System, History Viewer, 층 선택기, 절주 입면 뷰어, Grid 층별 로딩 Frontend
> Phase 7+ Backend 완료 (2025-12-31): floorId 컬럼 추가, getFloorStats API, 마이그레이션 함수, Testing & Validation
> Phase 8 완료 (2026-01-28): 층 ID 포맷 통일(F1 표준), 그리드 SSOT 통합(69×11), 골조 연동 정비, 문서 정합성 업데이트

---

## 참조 문서

- [phase5_implementation_plan.md](./phase5_implementation_plan.md) - 상세 구현 계획
- [development_roadmap.md](./development_roadmap.md) - 개발 로드맵
- [deep_dive_review.md](./deep_dive_review.md) - 심층 리뷰
- [techspec.md](./techspec.md) - 기술 스펙 (SSOT)
