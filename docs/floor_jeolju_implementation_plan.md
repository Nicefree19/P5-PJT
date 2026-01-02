# P5 대시보드 층-절주 입면계획 구현 계획

## 목표
업로드된 입면계획 이미지를 기반으로 P5 대시보드의 층-절주 구조를 완성합니다.

---

## 참조 데이터 (입면계획 분석 결과)

### 층별 기둥 규격
| 층 | 기둥 크기 | 절주 | 절주 길이 |
|----|----------|------|----------|
| 10F | 1200x1200 | 8절주 | 14.45m |
| 9F | 1300x1300 | 7절주 | 7.95m |
| 8F | 1300x1300 | 6절주 | 11.75m |
| 7F | 1300x1300 | 5절주 | 16.2m |
| 6F | 1300x1300 | 5절주 | 16.2m |
| 5F | 1500x1500 | 4절주 | 15.4m |
| 4F | 1500x1500 | 3절주 | 7.75m |
| 3F | 1600x1600 | 2절주 | 10.5m |
| 2F | 1600x1600 | 1절주 | 15.2m |
| 1F | 1600x1600 | 1절주 | 15.2m |

> [!NOTE]
> **층 구성 확정:** 1F~10F + **RF(지붕층)** = 총 **11개 층**

---

## Proposed Changes

### 1. Backend (DashboardAPI.gs)

#### [MODIFY] [DashboardAPI.gs](file:///d:/00.Work_AI_Tool/11.P5_PJT/src/dashboard/DashboardAPI.gs)

**1.1 Columns 스키마 확장**
```diff
  // getColumns() 반환 구조
  columns[uid] = {
    uid,
    location: {
      row: row[1],
      column: row[2],
      zoneId: zoneId,
+     floorId: row[18] || 'F01',   // 층 ID 추가
    },
    // ...
+   member: {
+     type: row[8],
+     section: row[9],           // "1600x1600" 등 입면계획 반영
+     material: row[10],
+   },
```

**1.2 getFloorData() 실제 필터링 구현**
```javascript
function getFloorData(floorId) {
  const columnsSheet = getSheet(DASHBOARD_CONFIG.SHEETS.COLUMNS);
  const data = columnsSheet.getDataRange().getValues();
  const floorColumns = {};
  
  // floorId 컬럼(19번째)으로 필터링
  for (let i = 1; i < data.length; i++) {
    const rowFloorId = data[i][18]; // Index 18 = Column S
    if (rowFloorId === floorId) {
      const uid = data[i][0];
      floorColumns[uid] = parseColumnRow_(data[i]);
    }
  }
  // ... 나머지 로직
}
```

**1.3 층별 기둥 크기 매핑 추가**
```javascript
function getFloorColumnSize_(floorId) {
  const sizeMap = {
    'F01': '1600x1600', 'F02': '1600x1600', 'F03': '1600x1600',
    'F04': '1500x1500', 'F05': '1500x1500',
    'F06': '1300x1300', 'F07': '1300x1300', 'F08': '1300x1300', 'F09': '1300x1300',
    'F10': '1200x1200'
  };
  return sizeMap[floorId] || '1300x1300';
}
```

---

### 2. Frontend (index.html)

#### [MODIFY] [index.html](file:///d:/00.Work_AI_Tool/11.P5_PJT/src/dashboard/index.html)

**2.1 층 선택 UI 개선 (입면뷰 추가)**
```html
<!-- 입면 뷰어 (절주별 진행률 표시) -->
<div class="elevation-viewer">
  <div class="elevation-grid">
    <template x-for="floor in floors" :key="floor.floorId">
      <div class="elevation-row">
        <span class="floor-label" x-text="floor.label"></span>
        <template x-for="jeolju in jeoljuList" :key="jeolju.jeoljuId">
          <div class="elevation-cell" 
               :class="getElevationCellClass(floor.floorId, jeolju.jeoljuId)"
               @click="selectFloorAndJeolju(floor.floorId, jeolju.jeoljuId)">
          </div>
        </template>
      </div>
    </template>
  </div>
</div>
```

**2.2 층 데이터 동적 로드**
```javascript
async loadFloorData(floorId) {
  this.loading = true;
  try {
    const response = await fetch(`${this.apiBase}?action=getFloorData&floorId=${floorId}`);
    const result = await response.json();
    if (result.success) {
      // 기존 columns를 교체 (덮어쓰기)
      this.columns = result.columns;
      this.floorStats = result.stats;
      this.showToast(`${result.floor.label} 데이터 로드 완료`, 'success');
    }
  } finally {
    this.loading = false;
  }
}
```

**2.3 절주 하이라이트 필터**
```javascript
filterByJeolju(jeoljuId) {
  if (this.selectedJeolju === jeoljuId) {
    this.selectedJeolju = null; // 토글 해제
  } else {
    this.selectedJeolju = jeoljuId;
  }
  // CSS를 통해 해당 열 범위만 강조
}
```

---

### 3. Data Migration

#### [NEW] initializeFloorColumns()
```javascript
// 10층 × 828개 = 8,280개 기둥 데이터 초기화 (1층씩 배치 처리)
function initializeFloorColumns(floorId) {
  const rowLabels = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const section = getFloorColumnSize_(floorId);
  const rows = [];
  
  for (const row of rowLabels) {
    for (let col = 1; col <= 69; col++) {
      const uid = `${floorId}-${row}-X${col}`;
      rows.push([
        uid, row, col, getZoneFromColumn_(col),
        'pending', 'system', false, new Date().toISOString(),
        'SRC Column', section, 'SM490',
        '', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
        floorId
      ]);
    }
  }
  
  // 시트에 추가 (배치 처리)
  const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.COLUMNS);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
       .setValues(rows);
  
  return { success: true, count: rows.length };
}
```

---

## Verification Plan

### Automated Tests
1. `getFloorData('F01')` 호출 시 828개 기둥 반환 확인
2. 층 전환 시 Grid 데이터 교체 확인 (브라우저 테스트)
3. UID 형식 `F01-A-X1` 정규식 검증

### Manual Verification
1. 입면 뷰어에서 10개 층 표시 확인
2. 절주 클릭 시 해당 열 강조 확인
3. 층별 기둥 크기(`member.section`) 입면계획과 일치 확인

---

## Constraints & Notes

> [!WARNING]
> **데이터 볼륨**: 전체 8,280개 기둥을 한번에 로드하면 성능 이슈 발생
> - **해결**: 층별 lazy loading (828개씩)

> [!CAUTION]
> **UID 마이그레이션**: 기존 "A-X1" → "F01-A-X1" 변경 시 호환성 확보 필요
> - **해결**: 레거시 UID fallback 지원 (파싱 시 floorId 없으면 기본값 사용)

> [!NOTE]
> **Sheet 초기화**: 10층 전체 초기화 시 6분 제한 초과 가능
> - **해결**: 층별 배치 초기화 (`initializeFloorColumns(floorId)` 개별 호출)
