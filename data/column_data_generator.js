/**
 * P5 Dashboard - Column Data Generator
 * 
 * 목적: 8,280개 기둥 UID를 일괄 생성하여 마스터 데이터를 구축합니다.
 * 
 * 데이터 구조:
 * - 층: F1~F10, RF (11개)
 * - 행: A~ZZ (55개, MGT rowLabels 기준)
 * - 열: 3~329 (327개, 1-2열 제외)
 * 
 * 총 기둥 수: 11 floors * (327 cols - 2 excluded) * 1 = ~8,280 per floor typical
 * 실제: 각 층마다 유효한 기둥 위치가 다르므로, Zone 기반으로 필터링
 */

const COLUMN_CONFIG = {
  floors: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'RF'],
  
  // 절주 매핑 (층 → 절주)
  jeoljuMap: {
    'F1': '1절주', 'F2': '1절주',
    'F3': '2절주',
    'F4': '3절주',
    'F5': '4절주',
    'F6': '5절주', 'F7': '5절주',
    'F8': '6절주',
    'F9': '7절주',
    'F10': '8절주', 'RF': '8절주'
  },
  
  // 행 라벨 (A~ZZ, 55개)
  rowLabels: [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z',
    'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ',
    'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT',
    'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BB', 'BC'
  ],
  
  // 열 범위 (1-2 제외)
  columnRange: { start: 3, end: 329 },
  excludedColumns: [1, 2],
  
  // Zone 정의
  zones: [
    { id: 'zone_a', name: 'ZONE A', startCol: 3, endCol: 111 },
    { id: 'zone_b', name: 'ZONE B', startCol: 112, endCol: 220 },
    { id: 'zone_c', name: 'ZONE C', startCol: 221, endCol: 329 }
  ]
};

/**
 * Zone을 열 번호로 결정
 */
function getZoneByColumn(colNum) {
  for (const zone of COLUMN_CONFIG.zones) {
    if (colNum >= zone.startCol && colNum <= zone.endCol) {
      return zone.id;
    }
  }
  return null;
}

/**
 * 전수 기둥 데이터 생성
 * @returns {Array} columnData 배열
 */
function generateAllColumns() {
  const columns = [];
  
  for (const floor of COLUMN_CONFIG.floors) {
    const jeolju = COLUMN_CONFIG.jeoljuMap[floor];
    
    for (const row of COLUMN_CONFIG.rowLabels) {
      for (let col = COLUMN_CONFIG.columnRange.start; col <= COLUMN_CONFIG.columnRange.end; col++) {
        // 제외 열 스킵
        if (COLUMN_CONFIG.excludedColumns.includes(col)) continue;
        
        const zone = getZoneByColumn(col);
        if (!zone) continue; // Zone 매핑 실패 시 스킵
        
        const uid = `${floor}-${row}-X${col}`;
        
        columns.push({
          uid,
          floorId: floor,
          row,
          column: col,
          jeolju,
          zone,
          status: 'pending', // 초기 상태
          isLocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: null
        });
      }
    }
  }
  
  return columns;
}

/**
 * 요약 통계 생성
 */
function generateStats(columns) {
  const stats = {
    total: columns.length,
    byFloor: {},
    byZone: {},
    byJeolju: {},
    byStatus: {}
  };
  
  for (const col of columns) {
    stats.byFloor[col.floorId] = (stats.byFloor[col.floorId] || 0) + 1;
    stats.byZone[col.zone] = (stats.byZone[col.zone] || 0) + 1;
    stats.byJeolju[col.jeolju] = (stats.byJeolju[col.jeolju] || 0) + 1;
    stats.byStatus[col.status] = (stats.byStatus[col.status] || 0) + 1;
  }
  
  return stats;
}

/**
 * 마스터 데이터 JSON 생성
 */
function generateMasterData() {
  console.log('🚀 P5 Column Data Generator 시작...');
  
  const columns = generateAllColumns();
  const stats = generateStats(columns);
  
  console.log(`✅ 총 ${stats.total}개 기둥 UID 생성 완료`);
  console.log('📊 층별 분포:', stats.byFloor);
  console.log('🗂️ Zone별 분포:', stats.byZone);
  console.log('📏 절주별 분포:', stats.byJeolju);
  
  const masterData = {
    generatedAt: new Date().toISOString(),
    generator: 'column_data_generator.js',
    version: '1.0.0',
    stats,
    columnData: columns
  };
  
  return masterData;
}

/**
 * 경량 데이터 생성 (브라우저 최적화)
 * 상태만 관리하고, UID는 런타임에 계산
 * @returns {Object} 경량 상태 맵
 */
function generateLightweightData() {
  console.log('🚀 P5 Lightweight Data Generator 시작...');
  
  // 상태 인덱스: 층별로 그룹화하여 sparse array 사용
  const stateIndex = {};
  
  for (const floor of COLUMN_CONFIG.floors) {
    stateIndex[floor] = {
      // 기본값: 모두 pending (0)
      // 변경된 값만 저장하여 공간 절약
      modified: {} // { "A-3": 1, "B-5": 2 } 형식
    };
  }
  
  const lightData = {
    generatedAt: new Date().toISOString(),
    version: '2.0.0-lightweight',
    config: COLUMN_CONFIG,
    stateIndex
  };
  
  console.log('✅ 경량 데이터 생성 완료');
  
  return lightData;
}

// Node.js 환경에서 실행 시
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateMasterData, generateAllColumns, COLUMN_CONFIG };
}

// 브라우저 환경에서 전역 노출
if (typeof window !== 'undefined') {
  window.ColumnDataGenerator = { generateMasterData, generateAllColumns, COLUMN_CONFIG };
}
