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
// 동시성 제어 (LockService)
// ============================================================

/**
 * 스크립트 락 획득 시도
 * @returns {Lock|null} 획득된 락 객체 또는 null
 * @private
 */
function acquireLock_() {
  const lock = LockService.getScriptLock();
  const timeout = CONFIG.LOCK_WAIT_MS || 5000;

  try {
    const acquired = lock.tryLock(timeout);
    if (acquired) {
      Logger.log(`[Lock] 락 획득 성공 (대기: ${timeout}ms)`);
      return lock;
    } else {
      Logger.log(`[Lock] 락 획득 실패 - 다른 인스턴스 실행 중`);
      return null;
    }
  } catch (e) {
    Logger.log(`[Lock] 락 획득 오류: ${e.message}`);
    return null;
  }
}

/**
 * 스크립트 락 해제
 * @param {Lock} lock - 해제할 락 객체
 * @private
 */
function releaseLock_(lock) {
  if (lock) {
    try {
      lock.releaseLock();
      Logger.log('[Lock] 락 해제 완료');
    } catch (e) {
      Logger.log(`[Lock] 락 해제 오류: ${e.message}`);
    }
  }
}

// ============================================================
// 처리 상태 로깅
// ============================================================

/**
 * 처리 진행률 로그 출력
 * @param {string} phase - 현재 단계명
 * @param {number} current - 현재 처리 건수
 * @param {number} total - 전체 건수
 * @private
 */
function logProgress_(phase, current, total) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const progressBar = generateProgressBar_(percentage);
  Logger.log(`[${phase}] ${progressBar} ${current}/${total} (${percentage}%)`);
}

/**
 * 프로그레스 바 문자열 생성
 * @param {number} percentage - 진행률 (0-100)
 * @returns {string} 프로그레스 바 문자열
 * @private
 */
function generateProgressBar_(percentage) {
  const filled = Math.round(percentage / 5); // 20칸 기준
  const empty = 20 - filled;
  return '[' + '='.repeat(filled) + ' '.repeat(empty) + ']';
}

/**
 * 처리 통계 요약 로그
 * @param {Object} stats - 통계 객체
 * @private
 */
function logStatsSummary_(stats) {
  Logger.log('\n========== 실행 통계 요약 ==========');
  Logger.log(`| 총 검색 스레드     | ${stats.totalThreads || 0}개`);
  Logger.log(`| 추출 메시지        | ${stats.totalSearched || 0}개`);
  Logger.log(`| 신규 메시지        | ${stats.newEmails || 0}개`);
  Logger.log(`| 중복 스킵          | ${(stats.totalSearched - stats.newEmails) || 0}개`);
  Logger.log(`| AI 분석 완료       | ${stats.analyzed || 0}개`);
  Logger.log(`| Sheet 저장 성공    | ${stats.successfulWrites || 0}건`);
  Logger.log(`| Sheet 저장 실패    | ${stats.failedWrites || 0}건`);
  if (stats.dashboardCreated !== undefined) {
    Logger.log(`| Dashboard 생성     | ${stats.dashboardCreated}건`);
    Logger.log(`| Dashboard 스킵     | ${stats.dashboardSkipped || 0}건`);
  }
  Logger.log(`| 실행 시간          | ${stats.executionTimeMs}ms`);
  Logger.log(`| Pagination 페이지  | ${stats.paginationPages || 1}개`);
  if (stats.error) {
    Logger.log(`| 오류               | ${stats.error}`);
  }
  Logger.log('=====================================\n');
}

// ============================================================
// 메인 실행 함수
// ============================================================

/**
 * P5 복합동 메일 분석 시스템 - 메인 실행 함수
 * 일일 트리거로 자동 실행됨
 * LockService로 동시 실행 방지, Pagination으로 전체 메일 처리
 */
function main() {
  const startTime = Date.now();
  let lock = null;

  Logger.log('=== P5 메일 분석 시작 ===');
  Logger.log(`시스템: ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION}`);
  Logger.log(`실행 시각: ${new Date().toLocaleString('ko-KR')}`);

  // 실행 통계 초기화
  const stats = {
    totalThreads: 0,
    totalSearched: 0,
    newEmails: 0,
    analyzed: 0,
    successfulWrites: 0,
    failedWrites: 0,
    executionTimeMs: 0,
    paginationPages: 0
  };

  try {
    // LockService로 동시 실행 방지
    lock = acquireLock_();
    if (!lock) {
      Logger.log('⚠️ 다른 인스턴스가 실행 중입니다. 현재 실행을 종료합니다.');
      stats.error = 'Lock 획득 실패 - 동시 실행 방지';
      stats.executionTimeMs = Date.now() - startTime;
      logExecution_(stats);
      return;
    }

    // 설정 검증
    const configValidation = validateConfig_();
    if (!configValidation.valid) {
      throw new Error(`설정 오류: ${configValidation.errors.join(', ')}`);
    }

    // 1. Gmail 검색 (Pagination + Incremental)
    Logger.log('\n[Step 1] Gmail 검색 시작 (Pagination + Incremental)...');
    const threads = filterGmailThreadsIncremental_(true);
    stats.totalThreads = threads.length;
    Logger.log(`검색된 스레드: ${threads.length}개`);

    if (threads.length === 0) {
      Logger.log('검색된 스레드 없음. 실행 종료.');
      stats.executionTimeMs = Date.now() - startTime;
      logStatsSummary_(stats);
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
      stats.executionTimeMs = Date.now() - startTime;
      logExecution_(stats);
      logStatsSummary_(stats);
      return;
    }

    // 4. AI 분석 (진행률 로깅 + 레이트리밋 완충)
    Logger.log('\n[Step 4] AI 분석 시작...');
    const analysisResults = [];
    const batchSize = 10; // 로깅 간격
    const rateLimitDelayMs = CONFIG.RATE_LIMIT_DELAY_MS || 1000; // 기본 1초

    for (let i = 0; i < newMessages.length; i++) {
      const result = analyzeEmail_(newMessages[i]);
      analysisResults.push({ email: newMessages[i], analysis: result });
      stats.analyzed++;

      // 10건마다 또는 마지막에 진행률 로깅
      if ((i + 1) % batchSize === 0 || i === newMessages.length - 1) {
        logProgress_('AI 분석', i + 1, newMessages.length);
      }

      // 레이트리밋 완충: 마지막 건이 아니면 대기
      if (i < newMessages.length - 1) {
        Utilities.sleep(rateLimitDelayMs);
      }
    }
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

    // 6. 마지막 처리 시점 업데이트 (전체 성공 시에만)
    if (writeResult.success > 0 && writeResult.failed.length === 0) {
      // 완전 성공: 현재 시각으로 업데이트
      const latestDate = new Date();
      setLastProcessedDate_(latestDate);
      Logger.log(`[Step 6] 마지막 처리 시점 업데이트: ${latestDate.toLocaleString('ko-KR')}`);
    } else if (writeResult.success > 0 && writeResult.failed.length > 0) {
      // 부분 성공: 체크포인트 보류 (실패 건 재처리 가능하도록)
      Logger.log(`[Step 6] ⚠️ 부분 성공 (${writeResult.failed.length}건 실패) - 체크포인트 보류`);
      Logger.log('  → 다음 실행 시 실패 건 포함하여 재처리됩니다.');
    }

    // 7. 실행 완료
    stats.executionTimeMs = Date.now() - startTime;
    logExecution_(stats);
    logStatsSummary_(stats);

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
    logStatsSummary_(stats);
  } finally {
    // 락 해제 (반드시 실행)
    releaseLock_(lock);
  }
}

/**
 * P5 메일 분석 시스템 - 전체 스캔 모드 (Incremental 무시)
 * 처음 실행 시 또는 전체 재스캔 필요 시 사용
 */
function mainFullScan() {
  const startTime = Date.now();
  let lock = null;

  Logger.log('=== P5 메일 분석 전체 스캔 시작 ===');
  Logger.log(`시스템: ${CONFIG.SYSTEM_NAME} v${CONFIG.VERSION}`);
  Logger.log(`모드: 전체 스캔 (Incremental 비활성화)`);

  const stats = {
    totalThreads: 0,
    totalSearched: 0,
    newEmails: 0,
    analyzed: 0,
    successfulWrites: 0,
    failedWrites: 0,
    executionTimeMs: 0
  };

  try {
    lock = acquireLock_();
    if (!lock) {
      Logger.log('⚠️ 다른 인스턴스가 실행 중입니다.');
      return;
    }

    const configValidation = validateConfig_();
    if (!configValidation.valid) {
      throw new Error(`설정 오류: ${configValidation.errors.join(', ')}`);
    }

    // Incremental 비활성화하여 전체 스캔
    Logger.log('\n[Step 1] Gmail 전체 스캔 (Pagination)...');
    const threads = filterGmailThreadsWithPagination_();
    stats.totalThreads = threads.length;
    Logger.log(`검색된 스레드: ${threads.length}개`);

    if (threads.length === 0) {
      Logger.log('검색된 스레드 없음.');
      return;
    }

    Logger.log('\n[Step 2] 메시지 추출 중...');
    const messages = extractMessagesFromThreads_(threads);
    stats.totalSearched = messages.length;

    Logger.log('\n[Step 3] 중복 필터링 중...');
    const newMessages = filterDuplicates_(messages);
    stats.newEmails = newMessages.length;

    if (newMessages.length === 0) {
      Logger.log('처리할 신규 메시지 없음.');
      stats.executionTimeMs = Date.now() - startTime;
      logStatsSummary_(stats);
      return;
    }

    Logger.log('\n[Step 4] AI 분석 시작...');
    const analysisResults = analyzeEmails_(newMessages);
    stats.analyzed = analysisResults.length;

    Logger.log('\n[Step 5] Sheet 저장 중...');
    const writeResult = writeWithRollbackSupport_(analysisResults);
    stats.successfulWrites = writeResult.success;
    stats.failedWrites = writeResult.failed.length;

    if (CONFIG.DASHBOARD_SYNC_ENABLED && writeResult.success > 0) {
      try {
        const syncResult = syncAnalysisToDashboard_(analysisResults);
        stats.dashboardCreated = syncResult.created || 0;
        stats.dashboardSkipped = syncResult.skipped || 0;
      } catch (syncError) {
        stats.dashboardError = syncError.message;
      }
    }

    // 체크포인트 업데이트 (전체 성공 시에만 - main()과 동일 정책)
    if (writeResult.success > 0 && writeResult.failed.length === 0) {
      setLastProcessedDate_(new Date());
      Logger.log('[Step 6] 마지막 처리 시점 업데이트 완료');
    } else if (writeResult.success > 0 && writeResult.failed.length > 0) {
      Logger.log(`[Step 6] ⚠️ 부분 성공 (${writeResult.failed.length}건 실패) - 체크포인트 보류`);
    }

    stats.executionTimeMs = Date.now() - startTime;
    logExecution_(stats);
    logStatsSummary_(stats);

  } catch (e) {
    Logger.log(`❌ 전체 스캔 오류: ${e.message}`);
    stats.error = e.message;
    stats.executionTimeMs = Date.now() - startTime;
    logExecution_(stats);
  } finally {
    releaseLock_(lock);
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

  // 임시로 배치 크기 및 pagination 제한 변경
  const originalBatchSize = CONFIG.MAX_BATCH_SIZE;
  const originalMaxTotalThreads = CONFIG.MAX_TOTAL_THREADS;
  const originalPaginationSize = CONFIG.PAGINATION_SIZE;

  CONFIG.MAX_BATCH_SIZE = maxCount;
  CONFIG.MAX_TOTAL_THREADS = maxCount; // pagination 상한도 제한
  CONFIG.PAGINATION_SIZE = Math.min(maxCount, 50); // 페이지당 조회 건수도 제한

  try {
    main();
  } finally {
    // 원래 설정 복원
    CONFIG.MAX_BATCH_SIZE = originalBatchSize;
    CONFIG.MAX_TOTAL_THREADS = originalMaxTotalThreads;
    CONFIG.PAGINATION_SIZE = originalPaginationSize;
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
    .addItem('▶️ 전체 실행 (Incremental)', 'main')
    .addItem('▶️ 전체 스캔 (전체 재검색)', 'mainFullScan')
    .addSeparator()
    .addSubMenu(ui.createMenu('⏰ 트리거 관리')
      .addItem('일일 트리거 설정 (09:00)', 'setupDailyTrigger')
      .addItem('4시간 트리거 설정', 'setupHourlyTrigger')
      .addItem('트리거 목록 조회', 'listTriggers')
      .addItem('모든 트리거 제거', 'removeAllTriggers'))
    .addSubMenu(ui.createMenu('🔄 Incremental 관리')
      .addItem('마지막 처리 시점 확인', 'checkLastProcessedDate')
      .addItem('마지막 처리 시점 초기화', 'resetLastProcessedDate'))
    .addSeparator()
    .addItem('📋 26컬럼 헤더 생성', 'createSheetHeaders')
    .addItem('⚙️ 설정 출력', 'printConfig')
    .addToUi();
}

/**
 * 마지막 처리 시점 확인
 */
function checkLastProcessedDate() {
  const lastProcessed = getLastProcessedDate_();
  if (lastProcessed) {
    Logger.log(`마지막 처리 시점: ${lastProcessed.toLocaleString('ko-KR')}`);
    SpreadsheetApp.getUi().alert(`마지막 처리 시점: ${lastProcessed.toLocaleString('ko-KR')}`);
  } else {
    Logger.log('마지막 처리 시점이 설정되지 않았습니다.');
    SpreadsheetApp.getUi().alert('마지막 처리 시점이 설정되지 않았습니다.\n전체 스캔 실행이 필요합니다.');
  }
}

/**
 * 마지막 처리 시점 초기화 (전체 재스캔 준비)
 */
function resetLastProcessedDate() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '확인',
    '마지막 처리 시점을 초기화하시겠습니까?\n다음 실행 시 전체 메일을 다시 스캔합니다.',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    PropertiesService.getScriptProperties().deleteProperty('LAST_PROCESSED_DATE');
    Logger.log('마지막 처리 시점이 초기화되었습니다.');
    ui.alert('마지막 처리 시점이 초기화되었습니다.');
  }
}
