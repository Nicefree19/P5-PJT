/**
 * P5 Dashboard - Column Data Migration Script
 *
 * 11층 (F01-F11) x 8절주 (J1-J8) x 3 Zone 전체 기둥 데이터 생성
 *
 * 데이터 구조:
 * - 11층: F01-F11
 * - 8절주: J1-J8 (컬럼 범위로 매핑)
 * - Zone 3개:
 *   - Zone A (FAB): X1-X23 (23개 컬럼)
 *   - Zone B (CUB): X24-X45 (22개 컬럼)
 *   - Zone C (COMPLEX): X46-X69 (24개 컬럼)
 * - 행: A-L (12행)
 * - 총 기둥 수: 12행 x 69컬럼 x 11층 = 9,108개
 *
 * UID 형식: {층}-{행}-X{컬럼}
 * 예: F01-A-X1, F11-L-X69
 *
 * @version 1.0
 * @author P5 Dashboard Team
 * @date 2026-01-02
 */

// ===== Configuration =====

const MIGRATION_CONFIG = {
  // 층 정의 (F01-F11)
  floors: {
    count: 11,
    prefix: 'F',
    padLength: 2, // F01, F02, ... F11
  },

  // 행 정의 (A-L)
  rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],

  // 컬럼 정의 (X1-X69)
  columns: {
    start: 1,
    end: 69,
  },

  // Zone 정의
  zones: {
    zone_a: {
      id: 'zone_a',
      name: 'ZONE A',
      displayName: 'FAB',
      description: 'Utility Support - 유틸리티 지원 시설',
      startColumn: 1,
      endColumn: 23,
      color: '#238636'
    },
    zone_b: {
      id: 'zone_b',
      name: 'ZONE B',
      displayName: 'CUB',
      description: 'Main Link - CUB 연결 구간',
      startColumn: 24,
      endColumn: 45,
      color: '#1f6feb'
    },
    zone_c: {
      id: 'zone_c',
      name: 'ZONE C',
      displayName: 'COMPLEX',
      description: 'Office/Amenity - 복합동 사무/편의시설',
      startColumn: 46,
      endColumn: 69,
      color: '#d29922'
    },
  },

  // 절주(Jeolju) 매핑
  jeolju: {
    J1: { start: 1, end: 8 },
    J2: { start: 9, end: 16 },
    J3: { start: 17, end: 24 },
    J4: { start: 25, end: 32 },
    J5: { start: 33, end: 40 },
    J6: { start: 41, end: 48 },
    J7: { start: 49, end: 56 },
    J8: { start: 57, end: 69 },
  },

  // 기본 스테이지
  defaultStages: {
    hmb_fab: 'pending',    // HMB제작
    pre_assem: 'pending',  // 면조립
    main_assem: 'pending', // 대조립
    hmb_psrc: 'pending',   // HMB+PSRC
    form: 'pending',       // FORM
    embed: 'pending',      // 앰베드
  },

  // 스테이지 코드 매핑 (기존 스키마 호환)
  stageCodeMapping: {
    HMB: 'hmb_fab',
    ASSEMBLY_1: 'pre_assem',
    ASSEMBLY_2: 'main_assem',
    HMB_PSRC: 'hmb_psrc',
    FORM: 'form',
    EMBED: 'embed',
  },
};

// ===== Helper Functions =====

/**
 * 층 ID 생성 (F01, F02, ... F11)
 * @param {number} floorNum - 층 번호 (1-11)
 * @returns {string} 층 ID
 */
function generateFloorId(floorNum) {
  return `${MIGRATION_CONFIG.floors.prefix}${String(floorNum).padStart(MIGRATION_CONFIG.floors.padLength, '0')}`;
}

/**
 * 컬럼 번호로 Zone ID 결정
 * @param {number} colNum - 컬럼 번호 (1-69)
 * @returns {string} Zone ID (zone_a, zone_b, zone_c)
 */
function getZoneIdByColumn(colNum) {
  const { zones } = MIGRATION_CONFIG;
  if (colNum >= zones.zone_a.startColumn && colNum <= zones.zone_a.endColumn) {
    return 'zone_a';
  } else if (colNum >= zones.zone_b.startColumn && colNum <= zones.zone_b.endColumn) {
    return 'zone_b';
  } else if (colNum >= zones.zone_c.startColumn && colNum <= zones.zone_c.endColumn) {
    return 'zone_c';
  }
  return 'unknown';
}

/**
 * 컬럼 번호로 절주(Jeolju) ID 결정
 * @param {number} colNum - 컬럼 번호 (1-69)
 * @returns {string} 절주 ID (J1-J8)
 */
function getJeoljuIdByColumn(colNum) {
  const { jeolju } = MIGRATION_CONFIG;
  for (const [jeoljuId, range] of Object.entries(jeolju)) {
    if (colNum >= range.start && colNum <= range.end) {
      return jeoljuId;
    }
  }
  return 'unknown';
}

/**
 * 기둥 UID 생성
 * @param {string} floorId - 층 ID (F01-F11)
 * @param {string} row - 행 (A-L)
 * @param {number} col - 컬럼 번호 (1-69)
 * @returns {string} UID (예: F01-A-X1)
 */
function generateColumnUID(floorId, row, col) {
  return `${floorId}-${row}-X${col}`;
}

/**
 * 현재 시간을 ISO 형식으로 반환 (KST)
 * @returns {string} ISO 형식 타임스탬프
 */
function getCurrentTimestamp() {
  const now = new Date();
  // KST (UTC+9)
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);
  return kstDate.toISOString().replace('Z', '+09:00');
}

// ===== Main Generation Functions =====

/**
 * 단일 기둥 데이터 객체 생성
 * @param {string} floorId - 층 ID
 * @param {string} row - 행 문자
 * @param {number} col - 컬럼 번호
 * @returns {Object} 기둥 데이터 객체
 */
function createColumnData(floorId, row, col) {
  const uid = generateColumnUID(floorId, row, col);
  const zoneId = getZoneIdByColumn(col);
  const jeoljuId = getJeoljuIdByColumn(col);
  const timestamp = getCurrentTimestamp();

  return {
    uid: uid,
    floorId: floorId,
    row: row,
    col: col,
    zoneId: zoneId,
    jeoljuId: jeoljuId,
    status: {
      code: 'pending',
      updatedAt: timestamp,
      updatedBy: 'system'
    },
    stages: { ...MIGRATION_CONFIG.defaultStages },
    isLocked: false,
    linkedIssues: []
  };
}

/**
 * 전체 9,108개 기둥 데이터 생성
 * @returns {Object} { columns: {...}, stats: {...} }
 */
function generateAllColumnData() {
  const columns = {};
  const stats = {
    total: 0,
    byFloor: {},
    byZone: { zone_a: 0, zone_b: 0, zone_c: 0 },
    byJeolju: {},
  };

  const { floors, rows, columns: colConfig } = MIGRATION_CONFIG;

  // 11층 순회
  for (let floorNum = 1; floorNum <= floors.count; floorNum++) {
    const floorId = generateFloorId(floorNum);
    stats.byFloor[floorId] = 0;

    // 12행 순회 (A-L)
    for (const row of rows) {
      // 69컬럼 순회 (X1-X69)
      for (let col = colConfig.start; col <= colConfig.end; col++) {
        const columnData = createColumnData(floorId, row, col);
        const uid = columnData.uid;

        columns[uid] = columnData;

        // 통계 업데이트
        stats.total++;
        stats.byFloor[floorId]++;
        stats.byZone[columnData.zoneId]++;

        if (!stats.byJeolju[columnData.jeoljuId]) {
          stats.byJeolju[columnData.jeoljuId] = 0;
        }
        stats.byJeolju[columnData.jeoljuId]++;
      }
    }
  }

  return { columns, stats };
}

/**
 * 특정 층의 기둥 데이터만 생성
 * @param {string} floorId - 층 ID (F01-F11)
 * @returns {Object} { columns: {...}, stats: {...} }
 */
function generateFloorColumnData(floorId) {
  const columns = {};
  const stats = {
    total: 0,
    floorId: floorId,
    byZone: { zone_a: 0, zone_b: 0, zone_c: 0 },
    byJeolju: {},
  };

  const { rows, columns: colConfig } = MIGRATION_CONFIG;

  // 12행 순회 (A-L)
  for (const row of rows) {
    // 69컬럼 순회 (X1-X69)
    for (let col = colConfig.start; col <= colConfig.end; col++) {
      const columnData = createColumnData(floorId, row, col);
      const uid = columnData.uid;

      columns[uid] = columnData;

      // 통계 업데이트
      stats.total++;
      stats.byZone[columnData.zoneId]++;

      if (!stats.byJeolju[columnData.jeoljuId]) {
        stats.byJeolju[columnData.jeoljuId] = 0;
      }
      stats.byJeolju[columnData.jeoljuId]++;
    }
  }

  return { columns, stats };
}

// ===== Export Functions =====

/**
 * JSON 형식으로 내보내기 (LocalStorage 초기화용)
 * @param {Object} options - 옵션 { pretty: boolean, floorId: string }
 * @returns {string} JSON 문자열
 */
function exportToJSON(options = {}) {
  const { pretty = true, floorId = null } = options;

  let data;
  if (floorId) {
    data = generateFloorColumnData(floorId);
  } else {
    data = generateAllColumnData();
  }

  const exportData = {
    metadata: {
      version: '1.0',
      generatedAt: getCurrentTimestamp(),
      description: 'P5 Dashboard Column Migration Data',
      scope: floorId || 'ALL_FLOORS',
    },
    config: MIGRATION_CONFIG,
    ...data,
  };

  return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * CSV 형식으로 내보내기 (Google Sheet Import용)
 * @param {Object} options - 옵션 { floorId: string }
 * @returns {string} CSV 문자열
 */
function exportToCSV(options = {}) {
  const { floorId = null } = options;

  let data;
  if (floorId) {
    data = generateFloorColumnData(floorId);
  } else {
    data = generateAllColumnData();
  }

  // CSV 헤더 (DashboardAPI.gs의 COLUMN_SCHEMA 호환)
  const headers = [
    'uid',
    'row',
    'column',
    'zone_id',
    'jeolju_id',
    'floor_id',
    'status_code',
    'status_updated_at',
    'status_updated_by',
    'is_locked',
    'linked_issues',
    'stage_hmb_fab',
    'stage_pre_assem',
    'stage_main_assem',
    'stage_hmb_psrc',
    'stage_form',
    'stage_embed'
  ];

  const rows = [headers.join(',')];

  for (const uid in data.columns) {
    const col = data.columns[uid];
    const row = [
      col.uid,
      col.row,
      col.col,
      col.zoneId,
      col.jeoljuId,
      col.floorId,
      col.status.code,
      col.status.updatedAt,
      col.status.updatedBy,
      col.isLocked ? 'true' : 'false',
      JSON.stringify(col.linkedIssues || []),
      col.stages.hmb_fab,
      col.stages.pre_assem,
      col.stages.main_assem,
      col.stages.hmb_psrc,
      col.stages.form,
      col.stages.embed
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Google Sheets 배열 형식으로 내보내기
 * @param {Object} options - 옵션 { floorId: string }
 * @returns {Array[]} 2D 배열
 */
function exportToSheetArray(options = {}) {
  const { floorId = null } = options;

  let data;
  if (floorId) {
    data = generateFloorColumnData(floorId);
  } else {
    data = generateAllColumnData();
  }

  // 헤더 행
  const headers = [
    'uid', 'row', 'column', 'zone_id', 'jeolju_id', 'floor_id',
    'status_code', 'status_updated_at', 'status_updated_by',
    'is_locked', 'linked_issues',
    'stage_hmb_fab', 'stage_pre_assem', 'stage_main_assem',
    'stage_hmb_psrc', 'stage_form', 'stage_embed'
  ];

  const rows = [headers];

  for (const uid in data.columns) {
    const col = data.columns[uid];
    rows.push([
      col.uid,
      col.row,
      col.col,
      col.zoneId,
      col.jeoljuId,
      col.floorId,
      col.status.code,
      col.status.updatedAt,
      col.status.updatedBy,
      col.isLocked,
      JSON.stringify(col.linkedIssues || []),
      col.stages.hmb_fab,
      col.stages.pre_assem,
      col.stages.main_assem,
      col.stages.hmb_psrc,
      col.stages.form,
      col.stages.embed
    ]);
  }

  return rows;
}

// ===== Validation Functions =====

/**
 * 데이터 무결성 검증
 * @param {Object} data - generateAllColumnData() 결과
 * @returns {Object} 검증 결과
 */
function validateDataIntegrity(data = null) {
  if (!data) {
    data = generateAllColumnData();
  }

  const validation = {
    success: true,
    errors: [],
    warnings: [],
    summary: {},
  };

  const { columns, stats } = data;

  // 1. 총 기둥 수 검증
  const expectedTotal = 12 * 69 * 11; // 9,108
  if (stats.total !== expectedTotal) {
    validation.success = false;
    validation.errors.push({
      type: 'TOTAL_COUNT_MISMATCH',
      expected: expectedTotal,
      actual: stats.total,
      message: `총 기둥 수 불일치: 예상 ${expectedTotal}, 실제 ${stats.total}`
    });
  }
  validation.summary.totalColumns = stats.total;
  validation.summary.expectedTotal = expectedTotal;

  // 2. Zone별 기둥 수 검증
  const expectedZoneCounts = {
    zone_a: 12 * 23 * 11, // 3,036
    zone_b: 12 * 22 * 11, // 2,904
    zone_c: 12 * 24 * 11, // 3,168
  };

  for (const [zoneId, expected] of Object.entries(expectedZoneCounts)) {
    const actual = stats.byZone[zoneId];
    if (actual !== expected) {
      validation.success = false;
      validation.errors.push({
        type: 'ZONE_COUNT_MISMATCH',
        zoneId: zoneId,
        expected: expected,
        actual: actual,
        message: `${zoneId} 기둥 수 불일치: 예상 ${expected}, 실제 ${actual}`
      });
    }
  }
  validation.summary.byZone = stats.byZone;
  validation.summary.expectedByZone = expectedZoneCounts;

  // 3. 층별 기둥 수 검증
  const expectedPerFloor = 12 * 69; // 828
  for (const [floorId, count] of Object.entries(stats.byFloor)) {
    if (count !== expectedPerFloor) {
      validation.success = false;
      validation.errors.push({
        type: 'FLOOR_COUNT_MISMATCH',
        floorId: floorId,
        expected: expectedPerFloor,
        actual: count,
        message: `${floorId} 기둥 수 불일치: 예상 ${expectedPerFloor}, 실제 ${count}`
      });
    }
  }
  validation.summary.byFloor = stats.byFloor;
  validation.summary.expectedPerFloor = expectedPerFloor;

  // 4. 절주별 기둥 수 검증
  const expectedJeoljuCounts = {
    J1: 12 * 8 * 11,  // 1,056 (X1-X8)
    J2: 12 * 8 * 11,  // 1,056 (X9-X16)
    J3: 12 * 8 * 11,  // 1,056 (X17-X24)
    J4: 12 * 8 * 11,  // 1,056 (X25-X32)
    J5: 12 * 8 * 11,  // 1,056 (X33-X40)
    J6: 12 * 8 * 11,  // 1,056 (X41-X48)
    J7: 12 * 8 * 11,  // 1,056 (X49-X56)
    J8: 12 * 13 * 11, // 1,716 (X57-X69)
  };

  for (const [jeoljuId, expected] of Object.entries(expectedJeoljuCounts)) {
    const actual = stats.byJeolju[jeoljuId];
    if (actual !== expected) {
      validation.success = false;
      validation.errors.push({
        type: 'JEOLJU_COUNT_MISMATCH',
        jeoljuId: jeoljuId,
        expected: expected,
        actual: actual,
        message: `${jeoljuId} 기둥 수 불일치: 예상 ${expected}, 실제 ${actual}`
      });
    }
  }
  validation.summary.byJeolju = stats.byJeolju;
  validation.summary.expectedByJeolju = expectedJeoljuCounts;

  // 5. UID 형식 검증 (샘플링)
  const uidPattern = /^F\d{2}-[A-L]-X\d{1,2}$/;
  const sampleUIDs = Object.keys(columns).slice(0, 100);
  for (const uid of sampleUIDs) {
    if (!uidPattern.test(uid)) {
      validation.warnings.push({
        type: 'INVALID_UID_FORMAT',
        uid: uid,
        message: `UID 형식 불일치: ${uid}`
      });
    }
  }

  // 6. 필수 필드 검증 (샘플링)
  const requiredFields = ['uid', 'floorId', 'row', 'col', 'zoneId', 'jeoljuId', 'status', 'stages'];
  const sampleColumns = Object.values(columns).slice(0, 10);
  for (const col of sampleColumns) {
    for (const field of requiredFields) {
      if (col[field] === undefined) {
        validation.warnings.push({
          type: 'MISSING_FIELD',
          uid: col.uid,
          field: field,
          message: `필수 필드 누락: ${col.uid}의 ${field}`
        });
      }
    }
  }

  return validation;
}

/**
 * 검증 결과 출력
 * @param {Object} validation - validateDataIntegrity() 결과
 */
function printValidationReport(validation) {
  console.log('\n========================================');
  console.log('P5 Dashboard Migration Data Validation');
  console.log('========================================\n');

  console.log(`Status: ${validation.success ? 'PASS' : 'FAIL'}`);
  console.log(`Errors: ${validation.errors.length}`);
  console.log(`Warnings: ${validation.warnings.length}`);

  console.log('\n--- Summary ---');
  console.log(`Total Columns: ${validation.summary.totalColumns} / ${validation.summary.expectedTotal}`);

  console.log('\nBy Zone:');
  for (const [zoneId, count] of Object.entries(validation.summary.byZone)) {
    const expected = validation.summary.expectedByZone[zoneId];
    const status = count === expected ? 'OK' : 'MISMATCH';
    console.log(`  ${zoneId}: ${count} / ${expected} [${status}]`);
  }

  console.log('\nBy Floor (sample):');
  const floorSample = Object.entries(validation.summary.byFloor).slice(0, 3);
  for (const [floorId, count] of floorSample) {
    const expected = validation.summary.expectedPerFloor;
    const status = count === expected ? 'OK' : 'MISMATCH';
    console.log(`  ${floorId}: ${count} / ${expected} [${status}]`);
  }
  console.log('  ...');

  console.log('\nBy Jeolju:');
  for (const [jeoljuId, count] of Object.entries(validation.summary.byJeolju)) {
    const expected = validation.summary.expectedByJeolju[jeoljuId];
    const status = count === expected ? 'OK' : 'MISMATCH';
    console.log(`  ${jeoljuId}: ${count} / ${expected} [${status}]`);
  }

  if (validation.errors.length > 0) {
    console.log('\n--- Errors ---');
    for (const error of validation.errors) {
      console.log(`  [${error.type}] ${error.message}`);
    }
  }

  if (validation.warnings.length > 0) {
    console.log('\n--- Warnings ---');
    for (const warning of validation.warnings.slice(0, 5)) {
      console.log(`  [${warning.type}] ${warning.message}`);
    }
    if (validation.warnings.length > 5) {
      console.log(`  ... and ${validation.warnings.length - 5} more`);
    }
  }

  console.log('\n========================================\n');
}

// ===== Apps Script Integration Functions =====

/**
 * Google Apps Script용 - Columns 시트에 데이터 쓰기
 * Apps Script에서 직접 호출 가능
 * @param {string} floorId - 층 ID (선택, null이면 전체)
 */
function writeColumnsToSheet(floorId = null) {
  // Apps Script 환경 체크
  if (typeof SpreadsheetApp === 'undefined') {
    console.log('[Migration] This function requires Google Apps Script environment');
    return { success: false, error: 'Not in Apps Script environment' };
  }

  const startTime = Date.now();
  console.log(`[Migration] Starting column data migration... (floor: ${floorId || 'ALL'})`);

  try {
    // 데이터 생성
    const data = floorId
      ? generateFloorColumnData(floorId)
      : generateAllColumnData();

    // 시트 배열로 변환
    const sheetData = exportToSheetArray({ floorId });

    // 스프레드시트 접근
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Columns');

    if (!sheet) {
      sheet = ss.insertSheet('Columns');
      console.log('[Migration] Created new Columns sheet');
    }

    // 기존 데이터 삭제 (헤더 포함)
    sheet.clear();

    // 데이터 쓰기 (배치)
    const batchSize = 1000;
    for (let i = 0; i < sheetData.length; i += batchSize) {
      const batch = sheetData.slice(i, Math.min(i + batchSize, sheetData.length));
      sheet.getRange(i + 1, 1, batch.length, batch[0].length).setValues(batch);

      if (i % 5000 === 0 && i > 0) {
        console.log(`[Migration] Progress: ${i} / ${sheetData.length} rows`);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Migration] Complete! ${data.stats.total} columns written in ${elapsed}ms`);

    return {
      success: true,
      total: data.stats.total,
      elapsed: elapsed,
      validation: validateDataIntegrity(data)
    };

  } catch (error) {
    console.error(`[Migration] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Google Apps Script용 - LocalStorage 초기화 데이터 생성
 * Dashboard에서 사용할 JSON 데이터 생성
 */
function generateLocalStorageData() {
  const data = generateAllColumnData();
  const validation = validateDataIntegrity(data);

  if (!validation.success) {
    console.error('[Migration] Validation failed!');
    printValidationReport(validation);
    return null;
  }

  // LocalStorage에 적합한 형식으로 변환
  const localStorageData = {
    p5_columns: data.columns,
    p5_migration_metadata: {
      version: '1.0',
      generatedAt: getCurrentTimestamp(),
      total: data.stats.total,
      byZone: data.stats.byZone,
      byFloor: data.stats.byFloor,
    }
  };

  return localStorageData;
}

// ===== CLI / Test Functions =====

/**
 * 전체 마이그레이션 실행 및 검증
 */
function runMigration() {
  console.log('P5 Dashboard Column Migration Script');
  console.log('====================================\n');

  console.log('Generating 9,108 column records...');
  const data = generateAllColumnData();

  console.log('\nValidating data integrity...');
  const validation = validateDataIntegrity(data);
  printValidationReport(validation);

  if (validation.success) {
    console.log('Migration data generated successfully!');
    console.log(`Total: ${data.stats.total} columns`);

    // 샘플 데이터 출력
    console.log('\nSample records:');
    const samples = ['F01-A-X1', 'F05-F-X35', 'F11-L-X69'];
    for (const uid of samples) {
      if (data.columns[uid]) {
        console.log(`\n${uid}:`);
        console.log(JSON.stringify(data.columns[uid], null, 2));
      }
    }
  } else {
    console.error('Migration validation failed!');
  }

  return { data, validation };
}

// ===== Export for Module System =====

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Configuration
    MIGRATION_CONFIG,

    // Helper functions
    generateFloorId,
    getZoneIdByColumn,
    getJeoljuIdByColumn,
    generateColumnUID,
    getCurrentTimestamp,

    // Main generators
    createColumnData,
    generateAllColumnData,
    generateFloorColumnData,

    // Export functions
    exportToJSON,
    exportToCSV,
    exportToSheetArray,

    // Validation
    validateDataIntegrity,
    printValidationReport,

    // Apps Script integration
    writeColumnsToSheet,
    generateLocalStorageData,

    // CLI
    runMigration,
  };
}

// ===== Auto-run in browser context =====
if (typeof window !== 'undefined') {
  window.P5Migration = {
    config: MIGRATION_CONFIG,
    generateAll: generateAllColumnData,
    generateFloor: generateFloorColumnData,
    exportJSON: exportToJSON,
    exportCSV: exportToCSV,
    validate: validateDataIntegrity,
    run: runMigration,
  };
  console.log('[P5 Migration] Available as window.P5Migration');
}
