# 🔬 냉철한 심층 분석 보고서: P5 Dashboard Phase 5 & 6

**분석일**: 2025-12-30 16:16 KST
**검토자**: Claude (Strategic Agent)
**검토 대상**: DashboardAPI.gs, Config.gs, GeminiAnalyzer.gs, SheetWriter.gs, Code.gs, index.html

---

## 📊 Executive Summary

| 등급 | 항목 수 | 상태 |
|:---:|:---:|:---|
| 🔴 Critical | 2 | ✅ **모두 해결** |
| 🟠 High | 4 | ✅ **모두 해결** |
| 🟡 Medium | 4 | ✅ **모두 해결** |
| 🟢 Low | 3 | ✅ 문서화된 제약사항 |

**종합 점검 결과**: 구현 완성도 **100%** → **Production 배포 가능** 🚀

---

## 📋 해결 내역

### 커밋 1: Critical & High 이슈 (8349e34)
**일시**: 2025-12-30 17:20 KST

| 이슈 | 해결 내용 |
|------|----------|
| C-1 | `initializeDashboardSheets()`: 828번 `appendRow` → 1번 `setValues` |
| C-2 | Analyze 버튼 이미 존재 확인 (line 906-911) - 오탐 |
| H-1 | JSDoc 주석 `t_c` → `tc`로 통일 (Config.gs, DashboardAPI.gs) |
| H-2 | `updateColumnStage()`, `bulkUpdateColumnStages()`에 `validStatuses` 검증 추가 |
| H-3 | `bulkUpdateColumnStages()`에 재시도 로직 추가 (MAX_RETRIES=2, exponential backoff) |
| H-4 | `P5Store`에 `productionStages` 추가, `init()`에서 `stageConfigs` 동적 로드 |

### 커밋 2: Medium 이슈 (a9da372)
**일시**: 2025-12-30 17:52 KST

| 이슈 | 해결 내용 |
|------|----------|
| M-1 | `createIssue()`에 `MAX_AFFECTED_COLUMNS=100` 제한 추가 |
| M-2 | 모든 `new Date().toISOString()` → `getKSTTimestamp_()` 변경 (12곳) |
| M-3 | `createIssue`, `resolveIssue`, `deleteIssue`의 `logHistory`를 작업 완료 후로 이동 |
| M-4 | `cleanupOrphanIssueReferences(dryRun)` 유틸리티 함수 추가 |

---

## 🔴 Critical Issues ✅ 해결 완료

### C-1. Sheet 초기화 성능 문제 ✅
**상태**: 해결됨
**위치**: `DashboardAPI.gs` `initializeDashboardSheets()`

**문제점**:
- 12행 × 69열 = 828번의 개별 API 호출
- Google Apps Script 6분 실행 제한 초과 가능

**해결**:
```javascript
// C-1 Fix: 성능 최적화 - appendRow 828번 → setValues 1번
const rows = [];
for (let r = 0; r < 12; r++) {
  for (let c = 1; c <= 69; c++) {
    rows.push([uid, rowLabels[r], c, zoneId, ...]);
  }
}
columnsSheet.getRange(2, 1, rows.length, 18).setValues(rows);
```

---

### C-2. UI에 "Analyze" 버튼 누락 ✅
**상태**: 오탐 (이미 존재)
**위치**: `index.html` line 906-911

버튼이 이미 구현되어 있었음:
```html
<button class="btn" @click="triggerAnalysis()"
        :disabled="analysisJob.status === 'pending' || analysisJob.status === 'running'">
    <span x-show="analysisJob.status !== 'running'">🔍 Analyze</span>
    <span x-show="analysisJob.status === 'running'">⏳ Analyzing...</span>
</button>
```

---

## 🟠 High Priority Issues ✅ 해결 완료

### H-1. Issue Type 코드 불일치 ✅
**상태**: 해결됨

JSDoc 주석을 `tc`로 통일:
- `Config.gs`: `@returns` 주석 수정
- `DashboardAPI.gs`: Issues 시트 스키마 주석 수정

---

### H-2. Stage Status 유효성 검증 누락 ✅
**상태**: 해결됨
**위치**: `DashboardAPI.gs`

```javascript
const validStatuses = ['pending', 'active', 'installed', 'hold'];
if (!validStatuses.includes(stageStatus)) {
  return { success: false, error: `Invalid stage status: ${stageStatus}` };
}
```

---

### H-3. bulkUpdateColumnStages 재시도 로직 없음 ✅
**상태**: 해결됨
**위치**: `DashboardAPI.gs`

`bulkUpdateColumns()`와 동일한 패턴 적용:
- MAX_RETRIES = 2
- Exponential backoff (500ms × retries)
- `locked`, `retried` 카운트 추가

---

### H-4. Frontend stageConfigs 중복 정의 ✅
**상태**: 해결됨
**위치**: `index.html`

- `P5Store.getDefaultData()`에 `productionStages` 추가
- `init()`에서 `stageConfigs`를 `P5Store`에서 동적 로드
- 한글 라벨 적용: HMB제작, 면조립, 대조립, HMB+PSRC, FORM, 앰베드

---

## 🟡 Medium Priority Issues ✅ 해결 완료

### M-1. affectedColumns 크기 제한 없음 ✅
**상태**: 해결됨
**위치**: `DashboardAPI.gs` `createIssue()`

```javascript
const MAX_AFFECTED_COLUMNS = 100;
if (affectedCols.length > MAX_AFFECTED_COLUMNS) {
  console.warn(`⚠️ affectedColumns 제한: ${affectedCols.length}개 → ${MAX_AFFECTED_COLUMNS}개`);
  affectedCols = affectedCols.slice(0, MAX_AFFECTED_COLUMNS);
}
```

---

### M-2. Timestamp 타임존 혼용 ✅
**상태**: 해결됨
**위치**: `DashboardAPI.gs`

- 모든 `new Date().toISOString()` → `getKSTTimestamp_()` 변경
- 12곳 일괄 수정
- 출력 형식: `2025-12-30T21:00:00+09:00`

---

### M-3. History 로깅 시점 불일치 ✅
**상태**: 해결됨
**위치**: `DashboardAPI.gs`

`logHistory()` 호출을 모든 작업 완료 후로 이동:
- `createIssue`: 컬럼 업데이트 결과 포함
- `resolveIssue`: 컬럼 복구 결과 포함
- `deleteIssue`: 컬럼 정리 결과 포함

---

### M-4. Orphan Issue Reference 정리 없음 ✅
**상태**: 해결됨
**위치**: `DashboardAPI.gs`

새 함수 추가:
```javascript
function cleanupOrphanIssueReferences(dryRun = true) {
  // 존재하지 않는 이슈를 참조하는 기둥들을 스캔하고 정리
  // dryRun=true: 스캔만 수행
  // dryRun=false: 실제 정리 수행
}
```

`deleteIssue()` 개선:
- 삭제 시 연관 기둥의 status를 'active'로 복구
- issueId 참조 자동 정리

---

## 🟢 Low Priority / Documented Constraints

### L-1. main() 함수 존재 확인 ✅
- `Code.gs`에 `main()` 정의 확인됨 (line 23-105)
- `runAnalysisJob_()`에서 정상 호출 가능

### L-2. Zone 다중 매핑 시 첫 번째 선택
- `inferZoneFromColumns_()`: 동률 시 zone_a 우선 (정렬 안정성)
- 문서화된 동작으로 수용 가능

### L-3. LockService 중첩 호출
- `createIssue()`가 lock 해제 후 `updateColumn()` 호출
- `updateColumn()`이 자체 lock 획득 → 의도된 설계

---

## 📝 결론

**모든 Critical, High, Medium 이슈가 해결되었습니다.**

| 카테고리 | 상태 | 커밋 |
|---------|------|------|
| Critical (2건) | ✅ 완료 | 8349e34 |
| High (4건) | ✅ 완료 | 8349e34 |
| Medium (4건) | ✅ 완료 | a9da372 |
| Low (3건) | ✅ 문서화 | N/A |

**Production 배포 준비 완료** 🚀

---

*최종 업데이트: 2025-12-30 21:10 KST*
