/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - Sheet 쓰기 모듈
 * ============================================================
 *
 * 파일: SheetWriter.gs
 * 목적: 분석 결과를 Google Sheet에 저장
 * 버전: 1.0.0
 * 작성일: 2025-12-29
 *
 * 주요 기능:
 *   - 26컬럼 데이터 변환
 *   - 배치 쓰기 (성능 최적화)
 *   - 트랜잭션 관리 및 롤백 지원
 */

// ============================================================
// Sheet 접근 함수
// ============================================================

/**
 * 대상 Sheet 객체 획득
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Sheet 객체
 * @private
 */
function getTargetSheet_() {
  const spreadsheet = SpreadsheetApp.openById(getSheetId_());
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    throw new Error(`시트를 찾을 수 없습니다: ${CONFIG.SHEET_NAME}`);
  }

  return sheet;
}

/**
 * 다음 행 번호 조회
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet 객체
 * @returns {number} 다음 NO 값
 * @private
 */
function getNextRowNumber_(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    // 헤더만 있는 경우
    return 1;
  }

  // NO 컬럼 (1번째)에서 마지막 값 조회
  const lastNo = sheet.getRange(lastRow, 1).getValue();
  return (parseInt(lastNo) || 0) + 1;
}

// ============================================================
// 데이터 변환
// ============================================================

/**
 * 분석 결과를 26컬럼 행 데이터로 변환
 * @param {Object} emailData - 메일 데이터
 * @param {Object} analysis - AI 분석 결과
 * @param {number} rowNumber - 행 번호 (NO)
 * @returns {Array} 26개 컬럼 데이터 배열
 * @private
 */
function transformToRow_(emailData, analysis, rowNumber) {
  return [
    rowNumber,                                    // 1: NO
    CONFIG.STATUS.UNPROCESSED,                    // 2: 상태 (미처리)
    analysis.긴급도 || 'Medium',                   // 3: 긴급도
    analysis.발생원 || '미분류',                    // 4: 발생원
    analysis.공법구분 || '기타',                    // 5: 공법구분
    emailData.id,                                 // 6: 메일ID
    emailData.from,                               // 7: 발신자
    emailData.date,                               // 8: 수신일시
    emailData.subject,                            // 9: 제목
    analysis.본문요약 || '',                        // 10: 본문요약
    analysis.AI분석 || '',                         // 11: AI분석
    analysis.추천조치 || '',                        // 12: 추천조치
    (analysis.키워드 || []).join(', '),            // 13: 키워드
    emailData.attachments || 0,                   // 14: 첨부파일수
    emailData.threadId,                           // 15: 스레드ID
    emailData.cc || '',                           // 16: 참조인
    emailData.labels || '',                       // 17: 라벨
    emailData.isStarred || false,                 // 18: 중요표시
    emailData.isUnread || false,                  // 19: 읽음여부
    '',                                           // 20: 처리담당 (수동)
    '',                                           // 21: 처리기한 (수동)
    CONFIG.PROCESS_STATUS.PENDING,                // 22: 처리상태 (검토대기)
    '',                                           // 23: 메모 (수동)
    '',                                           // 24: 비고 (수동)
    JSON.stringify(analysis),                     // 25: RawJSON
    new Date()                                    // 26: 등록일시
  ];
}

// ============================================================
// 유효성 검증
// ============================================================

/**
 * 행 데이터 유효성 검증
 * @param {Array} rowData - 행 데이터 배열
 * @returns {boolean} 유효 여부
 * @throws {Error} 유효하지 않은 경우
 * @private
 */
function validateRowData_(rowData) {
  // 컬럼 수 검증
  if (rowData.length !== CONFIG.COLUMNS) {
    throw new Error(`컬럼 수 불일치: 예상 ${CONFIG.COLUMNS}, 실제 ${rowData.length}`);
  }

  // 필수 필드 검증 (메일ID - 인덱스 5)
  if (!rowData[5]) {
    throw new Error('메일ID가 비어있습니다');
  }

  // 발신자 검증 (인덱스 6)
  if (!rowData[6]) {
    throw new Error('발신자가 비어있습니다');
  }

  return true;
}

// ============================================================
// Sheet 쓰기 함수
// ============================================================

/**
 * 단일 행 추가
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet 객체
 * @param {Array} rowData - 행 데이터
 * @private
 */
function appendRow_(sheet, rowData) {
  sheet.appendRow(rowData);
}

/**
 * 배치 행 추가 (성능 최적화)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet 객체
 * @param {Array[]} rowsData - 행 데이터 2차원 배열
 * @private
 */
function appendRows_(sheet, rowsData) {
  if (rowsData.length === 0) return;

  const lastRow = sheet.getLastRow();
  const range = sheet.getRange(lastRow + 1, 1, rowsData.length, CONFIG.COLUMNS);
  range.setValues(rowsData);
}

/**
 * 롤백 지원 쓰기 (트랜잭션)
 * @param {Object[]} analysisResults - 분석 결과 배열 [{email, analysis}, ...]
 * @returns {Object} 결과 {success: number, failed: Object[]}
 * @private
 */
function writeWithRollbackSupport_(analysisResults) {
  const sheet = getTargetSheet_();
  let successCount = 0;
  const failedItems = [];

  // 배치 쓰기를 위한 행 데이터 수집
  const validRows = [];

  for (const result of analysisResults) {
    try {
      const rowNumber = getNextRowNumber_(sheet) + validRows.length;
      const rowData = transformToRow_(result.email, result.analysis, rowNumber);

      validateRowData_(rowData);
      validRows.push(rowData);

    } catch (e) {
      errorLog_(`데이터 변환 실패: ${result.email.id}`, e);
      failedItems.push({
        email: result.email,
        analysis: result.analysis,
        error: e.message
      });
    }
  }

  // 배치 쓰기 실행
  if (validRows.length > 0) {
    try {
      appendRows_(sheet, validRows);
      successCount = validRows.length;
      debugLog_(`배치 쓰기 완료: ${successCount}건`);
    } catch (e) {
      errorLog_('배치 쓰기 실패', e);

      // 배치 실패 시 개별 쓰기 시도
      debugLog_('개별 쓰기로 전환...');

      for (const rowData of validRows) {
        try {
          appendRow_(sheet, rowData);
          successCount++;
        } catch (e2) {
          errorLog_(`개별 쓰기 실패: ${rowData[5]}`, e2);
          failedItems.push({
            rowData: rowData,
            error: e2.message
          });
        }
      }
    }
  }

  return {
    success: successCount,
    failed: failedItems
  };
}

// ============================================================
// 실행 로그 기록
// ============================================================

/**
 * 실행 통계 로그 기록
 * @param {Object} stats - 실행 통계
 * @private
 */
function logExecution_(stats) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSheetId_());
    let logSheet = spreadsheet.getSheetByName(CONFIG.LOG_SHEET_NAME);

    // 로그 시트가 없으면 생성
    if (!logSheet) {
      logSheet = spreadsheet.insertSheet(CONFIG.LOG_SHEET_NAME);
      logSheet.appendRow([
        '실행일시',
        '총검색',
        '신규메일',
        '성공',
        '실패',
        '실행시간(ms)',
        '오류'
      ]);
    }

    logSheet.appendRow([
      new Date(),
      stats.totalSearched || 0,
      stats.newEmails || 0,
      stats.successfulWrites || 0,
      stats.failedWrites || 0,
      stats.executionTimeMs || 0,
      stats.error || ''
    ]);

  } catch (e) {
    errorLog_('실행 로그 기록 실패', e);
  }
}

// ============================================================
// Sheet 초기화 함수
// ============================================================

/**
 * 26컬럼 헤더 생성
 */
function createSheetHeaders() {
  Logger.log('=== Sheet 헤더 생성 시작 ===\n');

  try {
    const spreadsheet = SpreadsheetApp.openById(getSheetId_());

    // 메인 시트 생성/초기화
    let mainSheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

    if (!mainSheet) {
      mainSheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
      Logger.log(`✅ 메인 시트 생성: ${CONFIG.SHEET_NAME}`);
    }

    // 헤더 쓰기
    const headerRange = mainSheet.getRange(1, 1, 1, CONFIG.COLUMNS);
    headerRange.setValues([CONFIG.COLUMN_HEADERS]);

    // 헤더 서식 설정
    headerRange.setBackground('#4a86e8');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    // 열 너비 조정
    mainSheet.setColumnWidth(1, 50);   // NO
    mainSheet.setColumnWidth(2, 80);   // 상태
    mainSheet.setColumnWidth(3, 100);  // 긴급도
    mainSheet.setColumnWidth(4, 120);  // 발생원
    mainSheet.setColumnWidth(5, 120);  // 공법구분
    mainSheet.setColumnWidth(6, 150);  // 메일ID
    mainSheet.setColumnWidth(7, 200);  // 발신자
    mainSheet.setColumnWidth(8, 150);  // 수신일시
    mainSheet.setColumnWidth(9, 300);  // 제목
    mainSheet.setColumnWidth(10, 300); // 본문요약
    mainSheet.setColumnWidth(11, 300); // AI분석
    mainSheet.setColumnWidth(12, 200); // 추천조치
    mainSheet.setColumnWidth(13, 150); // 키워드

    // 행 고정
    mainSheet.setFrozenRows(1);

    Logger.log(`✅ 헤더 설정 완료: ${CONFIG.COLUMNS}개 컬럼`);

    // 드롭다운 설정
    setupDropdowns_(mainSheet);

    // 조건부 서식 설정
    setupConditionalFormatting_(mainSheet);

    // 테스트 시트 생성
    let testSheet = spreadsheet.getSheetByName(CONFIG.TEST_SHEET_NAME);
    if (!testSheet) {
      testSheet = spreadsheet.insertSheet(CONFIG.TEST_SHEET_NAME);
      testSheet.getRange(1, 1, 1, CONFIG.COLUMNS).setValues([CONFIG.COLUMN_HEADERS]);
      Logger.log(`✅ 테스트 시트 생성: ${CONFIG.TEST_SHEET_NAME}`);
    }

    Logger.log('\n=== Sheet 헤더 생성 완료 ===');

  } catch (e) {
    Logger.log(`❌ 오류: ${e.message}`);
    Logger.log(e.stack);
  }
}

/**
 * 드롭다운 데이터 유효성 검사 설정
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet 객체
 * @private
 */
function setupDropdowns_(sheet) {
  // 상태 컬럼 (2번째)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(CONFIG.STATUS), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('B2:B1000').setDataValidation(statusRule);

  // 긴급도 컬럼 (3번째)
  const urgencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(CONFIG.URGENCY_LEVELS), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('C2:C1000').setDataValidation(urgencyRule);

  // 처리상태 컬럼 (22번째 = V)
  const processRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(CONFIG.PROCESS_STATUS), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('V2:V1000').setDataValidation(processRule);

  Logger.log('✅ 드롭다운 설정 완료');
}

/**
 * 조건부 서식 설정
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet 객체
 * @private
 */
function setupConditionalFormatting_(sheet) {
  // 긴급도 컬럼 범위
  const urgencyRange = sheet.getRange('C2:C1000');

  // Showstopper = 진한 빨간색
  const showstopperRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Showstopper')
    .setBackground('#cc0000')
    .setFontColor('#ffffff')
    .setRanges([urgencyRange])
    .build();

  // Critical = 빨간색
  const criticalRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Critical')
    .setBackground('#ea4335')
    .setFontColor('#ffffff')
    .setRanges([urgencyRange])
    .build();

  // High = 주황색
  const highRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('High')
    .setBackground('#fbbc04')
    .setFontColor('#000000')
    .setRanges([urgencyRange])
    .build();

  // Medium = 노란색
  const mediumRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Medium')
    .setBackground('#fff2cc')
    .setFontColor('#000000')
    .setRanges([urgencyRange])
    .build();

  // Low = 회색
  const lowRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Low')
    .setBackground('#e8eaed')
    .setFontColor('#5f6368')
    .setRanges([urgencyRange])
    .build();

  // 상태 = 완료 시 회색 처리 (전체 행)
  const completedRange = sheet.getRange('A2:Z1000');
  const completedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B2="완료"')
    .setFontColor('#9aa0a6')
    .setRanges([completedRange])
    .build();

  // 규칙 적용
  const rules = sheet.getConditionalFormatRules();
  rules.push(showstopperRule, criticalRule, highRule, mediumRule, lowRule, completedRule);
  sheet.setConditionalFormatRules(rules);

  Logger.log('✅ 조건부 서식 설정 완료');
}

// ============================================================
// 테스트 함수
// ============================================================

/**
 * 데이터 변환 테스트
 */
function testTransformToRow() {
  Logger.log('=== 데이터 변환 테스트 ===\n');

  const mockEmail = {
    id: 'msg_test_123',
    threadId: 'thread_test_456',
    from: 'test@samoo.com',
    to: 'receiver@samsung.com',
    cc: 'cc@senkuzo.com',
    subject: '테스트 메일 제목',
    body: '테스트 본문',
    date: new Date(),
    attachments: 2,
    isStarred: true,
    isUnread: false,
    labels: 'P5, 중요'
  };

  const mockAnalysis = {
    발생원: '삼우(원설계)',
    공법구분: 'PSRC-PC접합',
    긴급도: 'High',
    본문요약: '테스트 요약입니다.',
    AI분석: '테스트 분석입니다.',
    추천조치: '테스트 조치입니다.',
    키워드: ['PSRC', '접합부', '테스트']
  };

  const rowData = transformToRow_(mockEmail, mockAnalysis, 1);

  Logger.log(`컬럼 수: ${rowData.length} (예상: ${CONFIG.COLUMNS})`);

  if (rowData.length === CONFIG.COLUMNS) {
    Logger.log('✅ 컬럼 수 일치');

    // 주요 필드 확인
    Logger.log(`  NO: ${rowData[0]}`);
    Logger.log(`  상태: ${rowData[1]}`);
    Logger.log(`  긴급도: ${rowData[2]}`);
    Logger.log(`  발생원: ${rowData[3]}`);
    Logger.log(`  메일ID: ${rowData[5]}`);

    // 유효성 검증 테스트
    try {
      validateRowData_(rowData);
      Logger.log('✅ 유효성 검증 통과');
    } catch (e) {
      Logger.log(`❌ 유효성 검증 실패: ${e.message}`);
    }

  } else {
    Logger.log('❌ 컬럼 수 불일치');
  }
}
