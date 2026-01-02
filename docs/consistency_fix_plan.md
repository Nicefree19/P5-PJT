# 층-절주 구현 정합성 수정 계획

**작성일**: 2025-12-31 11:40 KST
**작업자**: Antigravity (AI Agent)
**기반 문서**: `docs/floor_jeolju_implementation_plan.md`

---

## 1. 발견된 불일치 사항

### 🔴 Critical: UID 형식 충돌

| 항목 | 계획 | 실제 구현 | 영향 |
|------|------|----------|------|
| UID 형식 | `F01-A-X1` | `A-X1` | 선택/이슈/검색 로직 모두 깨짐 |
| 파싱 로직 | `uid.split('-')` (3파트) | `uid.split('-X')` (2파트) | line 6110 |

**결정 필요**: 
- **옵션 A**: 기존 UID 유지 (`A-X1`) + floorId를 별도 컬럼으로만 관리
- **옵션 B**: 새 UID 적용 (`F01-A-X1`) + 전체 UI/이슈/검색 리팩터링

> ⚠️ **권장**: 옵션 A (기존 UID 유지) - 리스크 최소화

---

### 🟠 High: 컬럼 스키마 불일치

| 항목 | 계획 | 실제 |
|------|------|------|
| Columns 컬럼 수 | 19개 (floorId 포함) | 18개 |
| floorId 인덱스 | 18 (0-based) | 없음 |

**수정 필요**:
```javascript
// DashboardAPI.gs:620
const FLOOR_ID_COL = 18; // Column S (19번째)
// → 실제 시트에 컬럼 추가 필요
```

---

### 🟠 High: loadFloorData 응답 구조 불일치

| Frontend 기대 | Backend 실제 반환 |
|--------------|------------------|
| `result.data` | `result` (직접) |
| `result.data.jeoljuStats` | `result.stats.byJeolju` |
| `floorData.floor.label` | `result.floor.label` |

**수정 위치**: `index.html:4255-4277`

---

### 🟡 Medium: 층 ID 체계 불일치

| 위치 | 형식 |
|------|------|
| 계획 문서 | 1F~10F + RF |
| Frontend UI | F01~F11 |
| Backend | F01~F10 + RF |

**통일 필요**: `F01~F10, RF` (Backend 기준)

---

### 🟡 Medium: 미구현 함수

| 함수 | 상태 | 사용처 |
|------|------|--------|
| `parseColumnRow_()` | ❌ 미구현 | 계획 문서 line 56 |
| `getZoneFromColumn_()` | ❌ 미구현 | 계획 문서 line 149 |

---

## 2. 수정 계획

### Phase 1: UID 전략 확정 (옵션 A 채택)

**결정**: 기존 UID (`A-X1`) 유지, floorId는 별도 컬럼으로만 관리

- UI/검색/이슈 로직 변경 없음
- 층별 필터링은 columns[uid].location.floorId로 처리
- API 호출 시 floorId 파라미터로 필터링

### Phase 2: Frontend loadFloorData 수정

```javascript
// 수정 전 (line 4255)
if (result.success && result.data) {
    const floorData = result.data;
    if (floorData.jeoljuStats) { ... }
}

// 수정 후
if (result.success) {
    // columns 데이터 교체
    if (result.columns && Object.keys(result.columns).length > 0) {
        this.columns = result.columns;
    }
    // 절주 통계 업데이트
    if (result.stats?.byJeolju) {
        this.updateJeoljuStats(result.stats.byJeolju);
    }
    // floor 정보 알림
    this.showToast(`${result.floor?.label || floorId} 로드됨`, 'success');
}
```

### Phase 3: Frontend 층 ID 통일 (F11 → RF)

```javascript
// index.html:4201 수정
{ floorId: 'RF', label: 'RF층', order: 11, hasVariation: true, variationNote: '지붕층' }
```

### Phase 4: 입면 뷰어 헬퍼 함수 추가

```javascript
// 신규 추가 함수들
getElevationCellClass(floorId, jeoljuId) { ... }
selectFloorAndJeolju(floorId, jeoljuId) { ... }
getFloorJeoljuProgress(floorId, jeoljuId) { ... }
```

---

## 3. 파일별 수정 범위

| 파일 | 수정 라인 | 내용 |
|------|----------|------|
| `index.html` | 4201 | F11 → RF 변경 |
| `index.html` | 4255-4277 | loadFloorData 응답 처리 수정 |
| `index.html` | 추가 | 입면 뷰어 헬퍼 함수 |
| `DashboardAPI.gs` | 이미 수정됨 | getDefaultFloors_() RF 포함 |

---

## 4. 검증 항목

- [ ] 층 선택 시 올바른 floorId 전달
- [ ] loadFloorData API 호출 및 응답 처리
- [ ] 입면 뷰어 그리드 렌더링
- [ ] 기존 A-X1 UID 기반 기능 정상 작동
