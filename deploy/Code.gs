/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - 메인 진입점
 * ============================================================
 *
 * 파일: Code.gs
 * 목적: 전체 파이프라인 조율 및 트리거 관리
 * 버전: 1.0.0
 * 작성일: 2025-12-29
 *
 * 실행 흐름:
 *   1. Gmail 검색 (GmailFilter)
 *   2. 메시지 추출 및 중복 제거
 *   3. Gemini AI 분석 (GeminiAnalyzer)
 *   4. Google Sheet 저장 (SheetWriter)
 *   5. 실행 로그 기록
 */

// ============================================================
// 메인 실행 함수
// ============================================================

/**
 * P5 복합동 메일 분석 시스템 - 메인 실행 함수
 * 일일 트리거로 자동 실행됨
 */
function main() {
  const startTime = Date.now();
  Logger.log('=== P5 메일 분석 시작 ===');
  Logger.log(`시스템: ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION}`);
  Logger.log(`실행 시각: ${new Date().toLocaleString('ko-KR')}`);

  // 실행 통계 초기화
  const stats = {
    totalSearched: 0,
    newEmails: 0,
    successfulWrites: 0,
    failedWrites: 0,
    executionTimeMs: 0
  };

  try {
    // 설정 검증
    const configValidation = validateConfig_();
    if (!configValidation.valid) {
      throw new Error(`설정 오류: ${configValidation.errors.join(', ')}`);
    }

    // 1. Gmail 검색
    Logger.log('\n[Step 1] Gmail 검색 시작...');
    const threads = filterGmailThreads_();
    Logger.log(`검색된 스레드: ${threads.length}개`);

    if (threads.length === 0) {
      Logger.log('검색된 스레드 없음. 실행 종료.');
      return;
    }

    // 2. 메시지 추출
    Logger.log('\n[Step 2] 메시지 추출 중...');
    const messages = extractMessagesFromThreads_(threads);
    stats.totalSearched = messages.length;
    Logger.log(`추출된 메시지: ${messages.length}개`);

    // 3. 중복 필터링
    Logger.log('\n[Step 3] 중복 필터링 중...');
    const newMessages = filterDuplicates_(messages);
    stats.newEmails = newMessages.length;
    Logger.log(`신규 메시지: ${newMessages.length}개 (중복 제외: ${messages.length - newMessages.length}개)`);

    if (newMessages.length === 0) {
      Logger.log('처리할 신규 메시지 없음. 실행 종료.');
      logExecution_(stats);
      return;
    }

    // 4. AI 분석
    Logger.log('\n[Step 4] AI 분석 시작...');
    const analysisResults = analyzeEmails_(newMessages);
    Logger.log(`분석 완료: ${analysisResults.length}건`);

    // 5. Sheet 쓰기
    Logger.log('\n[Step 5] Sheet 저장 중...');
    const writeResult = writeWithRollbackSupport_(analysisResults);
    stats.successfulWrites = writeResult.success;
    stats.failedWrites = writeResult.failed.length;
    Logger.log(`쓰기 성공: ${writeResult.success}건, 실패: ${writeResult.failed.length}건`);

    // 5.5. Dashboard 동기화 (선택적)
    if (CONFIG.DASHBOARD_SYNC_ENABLED && writeResult.success > 0) {
      Logger.log('\n[Step 5.5] Dashboard 동기화 중...');
      try {
        const syncResult = syncAnalysisToDashboard_(analysisResults);
        stats.dashboardCreated = syncResult.created || 0;
        stats.dashboardSkipped = syncResult.skipped || 0;
        Logger.log(`Dashboard 이슈 생성: ${syncResult.created}건, 스킵: ${syncResult.skipped}건`);
      } catch (syncError) {
        Logger.log(`⚠️ Dashboard 동기화 실패 (메인 처리는 성공): ${syncError.message}`);
        stats.dashboardError = syncError.message;
      }
    }

    // 6. 실행 완료
    stats.executionTimeMs = Date.now() - startTime;
    logExecution_(stats);

    Logger.log(`\n=== 완료 (${stats.executionTimeMs}ms) ===`);
    Logger.log(`요약: 검색 ${stats.totalSearched} → 신규 ${stats.newEmails} → 저장 ${stats.successfulWrites}` +
               (stats.dashboardCreated ? ` → Dashboard ${stats.dashboardCreated}` : ''));

  } catch (e) {
    Logger.log(`\n❌ 실행 오류: ${e.message}`);
    Logger.log(e.stack);

    // 에러 발생 시에도 로그 기록
    stats.executionTimeMs = Date.now() - startTime;
    stats.error = e.message;
    logExecution_(stats);
  }
}

// ============================================================
// 트리거 관리 함수
// ============================================================

/**
 * 일일 트리거 설정 (매일 오전 9시)
 */
function setupDailyTrigger() {
  // 기존 main 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log(`기존 트리거 삭제: ${trigger.getUniqueId()}`);
    }
  });

  // 새 트리거 생성 (매일 오전 9시)
  ScriptApp.newTrigger('main')
           .timeBased()
           .everyDays(1)
           .atHour(9)
           .create();

  Logger.log('✅ 일일 트리거 설정 완료 (매일 09:00 KST)');
}

/**
 * 시간별 트리거 설정 (테스트/모니터링용)
 * @param {number} hours - 실행 간격 (시간)
 */
function setupHourlyTrigger(hours) {
  hours = hours || 4; // 기본 4시간

  // 기존 main 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 새 트리거 생성
  ScriptApp.newTrigger('main')
           .timeBased()
           .everyHours(hours)
           .create();

  Logger.log(`✅ 시간별 트리거 설정 완료 (${hours}시간 간격)`);
}

/**
 * 모든 트리거 제거
 */
function removeAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;

  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
    count++;
  });

  Logger.log(`✅ 모든 트리거 제거 완료 (${count}개 삭제)`);
}

/**
 * 현재 트리거 목록 조회
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();

  Logger.log('=== 현재 트리거 목록 ===');

  if (triggers.length === 0) {
    Logger.log('설정된 트리거 없음');
    return;
  }

  triggers.forEach((trigger, idx) => {
    Logger.log(`[${idx + 1}] 함수: ${trigger.getHandlerFunction()}`);
    Logger.log(`    타입: ${trigger.getEventType()}`);
    Logger.log(`    ID: ${trigger.getUniqueId()}`);
  });
}

// ============================================================
// 테스트 및 유틸리티 함수
// ============================================================

/**
 * 시스템 상태 확인
 */
function checkSystemStatus() {
  Logger.log('=== P5 메일 분석 시스템 상태 ===\n');

  // 1. 버전 정보
  Logger.log(`[시스템 정보]`);
  Logger.log(`  버전: ${CONFIG.VERSION}`);
  Logger.log(`  이름: ${CONFIG.SYSTEM_NAME}`);

  // 2. 설정 검증
  Logger.log(`\n[설정 검증]`);
  const validation = validateConfig_();
  if (validation.valid) {
    Logger.log('  ✅ 모든 설정 정상');
  } else {
    Logger.log('  ❌ 설정 오류:');
    validation.errors.forEach(err => Logger.log(`    - ${err}`));
  }

  // 3. 트리거 상태
  Logger.log(`\n[트리거 상태]`);
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log(`  설정된 트리거: ${triggers.length}개`);

  // 4. Sheet 연결 확인
  Logger.log(`\n[Sheet 연결]`);
  try {
    const sheetId = getSheetId_();
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    Logger.log(`  ✅ Sheet 연결 성공: ${spreadsheet.getName()}`);

    const mainSheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    if (mainSheet) {
      const lastRow = mainSheet.getLastRow();
      Logger.log(`  ✅ 메인 시트 존재: ${lastRow - 1}개 데이터`);
    } else {
      Logger.log(`  ⚠️ 메인 시트 없음: ${CONFIG.SHEET_NAME}`);
    }
  } catch (e) {
    Logger.log(`  ❌ Sheet 연결 실패: ${e.message}`);
  }

  // 5. Gemini API 확인
  Logger.log(`\n[Gemini API]`);
  try {
    const apiKey = getGeminiApiKey_();
    Logger.log(`  ✅ API 키 설정됨 (길이: ${apiKey.length})`);
    Logger.log(`  모델: ${CONFIG.GEMINI_MODEL}`);
  } catch (e) {
    Logger.log(`  ❌ API 키 오류: ${e.message}`);
  }

  Logger.log('\n=== 상태 확인 완료 ===');
}

/**
 * 테스트 실행 (샘플 3건만 처리)
 */
function testRun() {
  Logger.log('=== 테스트 실행 (최대 3건) ===\n');

  try {
    // 1. Gmail 검색
    const threads = filterGmailThreads_();
    Logger.log(`검색된 스레드: ${threads.length}개`);

    if (threads.length === 0) {
      Logger.log('검색된 스레드 없음');
      return;
    }

    // 2. 메시지 추출 (최대 3건)
    const messages = extractMessagesFromThreads_(threads).slice(0, 3);
    Logger.log(`테스트 대상 메시지: ${messages.length}개`);

    // 3. 중복 필터링
    const newMessages = filterDuplicates_(messages);
    Logger.log(`신규 메시지: ${newMessages.length}개`);

    if (newMessages.length === 0) {
      Logger.log('신규 메시지 없음 - 테스트 종료');
      return;
    }

    // 4. AI 분석 (1건만)
    const testEmail = newMessages[0];
    Logger.log(`\n[테스트 메일]`);
    Logger.log(`  제목: ${testEmail.subject}`);
    Logger.log(`  발신: ${testEmail.from}`);

    const analysis = analyzeEmail_(testEmail);
    Logger.log(`\n[분석 결과]`);
    Logger.log(`  발생원: ${analysis.발생원}`);
    Logger.log(`  긴급도: ${analysis.긴급도}`);
    Logger.log(`  공법구분: ${analysis.공법구분}`);
    Logger.log(`  본문요약: ${analysis.본문요약}`);

    // 5. 테스트 시트에 쓰기
    const testSheet = SpreadsheetApp.openById(getSheetId_())
                                    .getSheetByName(CONFIG.TEST_SHEET_NAME);

    if (testSheet) {
      const rowNumber = getNextRowNumber_(testSheet);
      const rowData = transformToRow_(testEmail, analysis, rowNumber);
      testSheet.appendRow(rowData);
      Logger.log(`\n✅ 테스트 시트에 저장 완료 (행 ${rowNumber})`);
    } else {
      Logger.log(`\n⚠️ 테스트 시트 없음: ${CONFIG.TEST_SHEET_NAME}`);
    }

    Logger.log('\n=== 테스트 완료 ===');

  } catch (e) {
    Logger.log(`❌ 테스트 오류: ${e.message}`);
    Logger.log(e.stack);
  }
}

/**
 * 수동 실행 (특정 건수 지정)
 * @param {number} maxCount - 최대 처리 건수 (기본: 10)
 */
function manualRun(maxCount) {
  maxCount = maxCount || 10;

  Logger.log(`=== 수동 실행 (최대 ${maxCount}건) ===\n`);

  // 임시로 배치 크기 변경
  const originalBatchSize = CONFIG.MAX_BATCH_SIZE;
  CONFIG.MAX_BATCH_SIZE = maxCount;

  try {
    main();
  } finally {
    // 원래 배치 크기 복원
    CONFIG.MAX_BATCH_SIZE = originalBatchSize;
  }
}

// ============================================================
// 메뉴 등록 (Google Sheet UI)
// ============================================================

/**
 * Sheet 열릴 때 커스텀 메뉴 추가
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('🔧 P5 메일 분석')
    .addItem('📊 시스템 상태 확인', 'checkSystemStatus')
    .addItem('🧪 테스트 실행 (3건)', 'testRun')
    .addSeparator()
    .addItem('▶️ 수동 실행 (10건)', 'manualRun')
    .addItem('▶️ 전체 실행', 'main')
    .addSeparator()
    .addSubMenu(ui.createMenu('⏰ 트리거 관리')
      .addItem('일일 트리거 설정 (09:00)', 'setupDailyTrigger')
      .addItem('4시간 트리거 설정', 'setupHourlyTrigger')
      .addItem('트리거 목록 조회', 'listTriggers')
      .addItem('모든 트리거 제거', 'removeAllTriggers'))
    .addSeparator()
    .addItem('📋 26컬럼 헤더 생성', 'createSheetHeaders')
    .addItem('⚙️ 설정 출력', 'printConfig')
    .addToUi();
}
