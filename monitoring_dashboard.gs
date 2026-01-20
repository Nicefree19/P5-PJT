/**
 * P5 프로젝트 모니터링 대시보드
 * 시스템 상태, 성능 지표, 에러 추적
 */

// ============================================================
// 모니터링 설정
// ============================================================

const MONITORING_CONFIG = {
  // 알림 임계값
  THRESHOLDS: {
    PROCESSING_TIME_MS: 30000,    // 30초 초과 시 알림
    ERROR_RATE_PERCENT: 10,       // 10% 초과 시 알림
    QUEUE_SIZE: 100,              // 100건 초과 시 알림
    API_FAILURE_COUNT: 5          // 5회 연속 실패 시 알림
  },
  
  // 모니터링 시트명
  SHEETS: {
    METRICS: '시스템_지표',
    ERRORS: '에러_로그',
    PERFORMANCE: '성능_추적',
    ALERTS: '알림_이력'
  },
  
  // 데이터 보존 기간 (일)
  RETENTION_DAYS: 30
};

// ============================================================
// 시스템 지표 수집
// ============================================================

/**
 * 현재 시스템 상태 수집
 * @returns {Object} 시스템 지표
 */
function collectSystemMetrics() {
  const metrics = {
    timestamp: new Date(),
    
    // Gmail 관련
    gmail: {
      searchQuery: buildFullQuery_(),
      threadsFound: 0,
      messagesExtracted: 0,
      processingTimeMs: 0
    },
    
    // Gemini API 관련
    gemini: {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      avgResponseTimeMs: 0,
      errorRate: 0
    },
    
    // Sheet 관련
    sheet: {
      totalRows: 0,
      todayRows: 0,
      writeSuccessCount: 0,
      writeFailureCount: 0
    },
    
    // 시스템 전반
    system: {
      totalProcessingTimeMs: 0,
      memoryUsage: 0,
      errorCount: 0,
      status: 'unknown'
    }
  };
  
  try {
    // Gmail 지표 수집
    const gmailStart = Date.now();
    const threads = GmailApp.search(metrics.gmail.searchQuery, 0, 10);
    metrics.gmail.threadsFound = threads.length;
    metrics.gmail.processingTimeMs = Date.now() - gmailStart;
    
    if (threads.length > 0) {
      const messages = extractMessagesFromThreads_(threads.slice(0, 3));
      metrics.gmail.messagesExtracted = messages.length;
    }
    
    // Sheet 지표 수집
    const sheet = getTargetSheet_();
    metrics.sheet.totalRows = sheet.getLastRow() - 1; // 헤더 제외
    
    // 오늘 등록된 데이터 수 계산
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (metrics.sheet.totalRows > 0) {
      const lastCol = CONFIG.COLUMN_HEADERS.indexOf('등록일시') + 1;
      const dateRange = sheet.getRange(2, lastCol, metrics.sheet.totalRows, 1);
      const dates = dateRange.getValues();
      
      metrics.sheet.todayRows = dates.filter(row => {
        const date = new Date(row[0]);
        return date >= todayStart;
      }).length;
    }
    
    // 시스템 상태 결정
    metrics.system.status = determineSystemStatus_(metrics);
    
  } catch (e) {
    metrics.system.errorCount++;
    metrics.system.status = 'error';
    logError_('시스템 지표 수집 실패', e);
  }
  
  return metrics;
}

/**
 * 시스템 상태 결정
 * @param {Object} metrics - 수집된 지표
 * @returns {string} 시스템 상태
 */
function determineSystemStatus_(metrics) {
  // 에러가 있으면 error
  if (metrics.system.errorCount > 0) {
    return 'error';
  }
  
  // 처리 시간이 임계값 초과하면 warning
  if (metrics.gmail.processingTimeMs > MONITORING_CONFIG.THRESHOLDS.PROCESSING_TIME_MS) {
    return 'warning';
  }
  
  // Gemini API 에러율이 높으면 warning
  if (metrics.gemini.errorRate > MONITORING_CONFIG.THRESHOLDS.ERROR_RATE_PERCENT) {
    return 'warning';
  }
  
  return 'healthy';
}

// ============================================================
// 지표 저장
// ============================================================

/**
 * 지표를 모니터링 시트에 저장
 * @param {Object} metrics - 시스템 지표
 */
function saveMetrics(metrics) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSheetId_());
    let metricsSheet = spreadsheet.getSheetByName(MONITORING_CONFIG.SHEETS.METRICS);
    
    // 시트가 없으면 생성
    if (!metricsSheet) {
      metricsSheet = createMetricsSheet_(spreadsheet);
    }
    
    // 데이터 행 생성
    const row = [
      metrics.timestamp,
      metrics.system.status,
      metrics.gmail.threadsFound,
      metrics.gmail.messagesExtracted,
      metrics.gmail.processingTimeMs,
      metrics.gemini.requestCount,
      metrics.gemini.successCount,
      metrics.gemini.failureCount,
      metrics.gemini.errorRate,
      metrics.sheet.totalRows,
      metrics.sheet.todayRows,
      metrics.system.totalProcessingTimeMs,
      metrics.system.errorCount
    ];
    
    metricsSheet.appendRow(row);
    
    // 오래된 데이터 정리
    cleanupOldMetrics_(metricsSheet);
    
    debugLog_('시스템 지표 저장 완료');
    
  } catch (e) {
    errorLog_('지표 저장 실패', e);
  }
}

/**
 * 지표 시트 생성
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function createMetricsSheet_(spreadsheet) {
  const sheet = spreadsheet.insertSheet(MONITORING_CONFIG.SHEETS.METRICS);
  
  // 헤더 설정
  const headers = [
    '시간',
    '시스템상태',
    'Gmail스레드수',
    'Gmail메시지수',
    'Gmail처리시간ms',
    'Gemini요청수',
    'Gemini성공수',
    'Gemini실패수',
    'Gemini에러율%',
    'Sheet총행수',
    'Sheet오늘행수',
    '전체처리시간ms',
    '에러수'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // 헤더 서식
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4a86e8');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  // 열 너비 조정
  sheet.setColumnWidth(1, 150); // 시간
  sheet.setColumnWidth(2, 100); // 상태
  
  return sheet;
}

/**
 * 오래된 지표 데이터 정리
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function cleanupOldMetrics_(sheet) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MONITORING_CONFIG.RETENTION_DAYS);
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  const dateRange = sheet.getRange(2, 1, lastRow - 1, 1);
  const dates = dateRange.getValues();
  
  let deleteCount = 0;
  for (let i = 0; i < dates.length; i++) {
    const date = new Date(dates[i][0]);
    if (date < cutoffDate) {
      sheet.deleteRow(2); // 항상 2번째 행 삭제 (헤더 다음)
      deleteCount++;
    } else {
      break; // 날짜순으로 정렬되어 있다고 가정
    }
  }
  
  if (deleteCount > 0) {
    debugLog_(`오래된 지표 ${deleteCount}개 삭제`);
  }
}

// ============================================================
// 에러 추적
// ============================================================

/**
 * 에러 로그 기록
 * @param {string} component - 컴포넌트명
 * @param {string} message - 에러 메시지
 * @param {Error} error - 에러 객체
 */
function logSystemError(component, message, error) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSheetId_());
    let errorSheet = spreadsheet.getSheetByName(MONITORING_CONFIG.SHEETS.ERRORS);
    
    if (!errorSheet) {
      errorSheet = createErrorSheet_(spreadsheet);
    }
    
    const row = [
      new Date(),
      component,
      message,
      error ? error.message : '',
      error ? error.stack : '',
      'unresolved'
    ];
    
    errorSheet.appendRow(row);
    
    // 심각한 에러인 경우 알림 발송
    if (shouldSendAlert_(component, message)) {
      sendAlert_('에러 발생', `${component}: ${message}`);
    }
    
  } catch (e) {
    // 에러 로깅 실패 시 기본 로거 사용
    errorLog_('에러 로그 기록 실패', e);
  }
}

/**
 * 에러 시트 생성
 */
function createErrorSheet_(spreadsheet) {
  const sheet = spreadsheet.insertSheet(MONITORING_CONFIG.SHEETS.ERRORS);
  
  const headers = ['시간', '컴포넌트', '메시지', '에러내용', '스택트레이스', '상태'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // 헤더 서식
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#ea4335');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  
  return sheet;
}

// ============================================================
// 알림 시스템
// ============================================================

/**
 * 알림 발송 여부 결정
 * @param {string} component - 컴포넌트명
 * @param {string} message - 메시지
 * @returns {boolean}
 */
function shouldSendAlert_(component, message) {
  // Gemini API 연속 실패
  if (component === 'GeminiAnalyzer' && message.includes('연속 실패')) {
    return true;
  }
  
  // Sheet 쓰기 실패
  if (component === 'SheetWriter' && message.includes('실패')) {
    return true;
  }
  
  // Gmail 접근 실패
  if (component === 'GmailFilter' && message.includes('접근 실패')) {
    return true;
  }
  
  return false;
}

/**
 * 알림 발송
 * @param {string} title - 알림 제목
 * @param {string} message - 알림 내용
 */
function sendAlert_(title, message) {
  try {
    // 이메일 알림 (관리자에게)
    const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
    if (adminEmail) {
      GmailApp.sendEmail(
        adminEmail,
        `[P5 시스템] ${title}`,
        `시간: ${new Date().toLocaleString('ko-KR')}\n\n${message}\n\n시스템을 확인해주세요.`
      );
    }
    
    // Slack 알림 (설정된 경우)
    const slackWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK');
    if (slackWebhook) {
      const payload = {
        text: `🚨 P5 시스템 알림: ${title}`,
        attachments: [{
          color: 'danger',
          fields: [{
            title: '내용',
            value: message,
            short: false
          }]
        }]
      };
      
      UrlFetchApp.fetch(slackWebhook, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload)
      });
    }
    
  } catch (e) {
    errorLog_('알림 발송 실패', e);
  }
}

// ============================================================
// 대시보드 함수
// ============================================================

/**
 * 모니터링 대시보드 실행
 * 정기적으로 실행하여 시스템 상태 추적
 */
function runMonitoringDashboard() {
  console.log('=== 모니터링 대시보드 실행 ===\n');
  
  try {
    // 1. 시스템 지표 수집
    console.log('[1/3] 시스템 지표 수집...');
    const metrics = collectSystemMetrics();
    
    // 2. 지표 저장
    console.log('[2/3] 지표 저장...');
    saveMetrics(metrics);
    
    // 3. 상태 보고
    console.log('[3/3] 상태 보고...');
    console.log(`시스템 상태: ${metrics.system.status}`);
    console.log(`Gmail: ${metrics.gmail.threadsFound}개 스레드, ${metrics.gmail.processingTimeMs}ms`);
    console.log(`Sheet: 총 ${metrics.sheet.totalRows}행, 오늘 ${metrics.sheet.todayRows}행`);
    
    if (metrics.system.status === 'error') {
      console.log('⚠️ 시스템 에러 상태 - 확인 필요');
    } else if (metrics.system.status === 'warning') {
      console.log('⚠️ 시스템 경고 상태 - 모니터링 필요');
    } else {
      console.log('✅ 시스템 정상 상태');
    }
    
  } catch (e) {
    console.log(`❌ 모니터링 실행 실패: ${e.message}`);
    logSystemError('MonitoringDashboard', '모니터링 실행 실패', e);
  }
}

/**
 * 모니터링 트리거 설정
 * 매 시간마다 모니터링 실행
 */
function setupMonitoringTrigger() {
  // 기존 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runMonitoringDashboard') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 새 트리거 생성 (매 시간)
  ScriptApp.newTrigger('runMonitoringDashboard')
    .timeBased()
    .everyHours(1)
    .create();
    
  console.log('✅ 모니터링 트리거 설정 완료 (매 시간 실행)');
}

/**
 * 모니터링 리포트 생성
 * 일일/주간 리포트 생성
 */
function generateMonitoringReport(days = 7) {
  console.log(`=== ${days}일간 모니터링 리포트 ===\n`);
  
  try {
    const spreadsheet = SpreadsheetApp.openById(getSheetId_());
    const metricsSheet = spreadsheet.getSheetByName(MONITORING_CONFIG.SHEETS.METRICS);
    
    if (!metricsSheet) {
      console.log('모니터링 데이터 없음');
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const lastRow = metricsSheet.getLastRow();
    if (lastRow <= 1) {
      console.log('리포트 데이터 없음');
      return;
    }
    
    const data = metricsSheet.getRange(2, 1, lastRow - 1, 13).getValues();
    const recentData = data.filter(row => new Date(row[0]) >= cutoffDate);
    
    if (recentData.length === 0) {
      console.log('최근 데이터 없음');
      return;
    }
    
    // 통계 계산
    const stats = {
      totalRecords: recentData.length,
      healthyCount: recentData.filter(row => row[1] === 'healthy').length,
      warningCount: recentData.filter(row => row[1] === 'warning').length,
      errorCount: recentData.filter(row => row[1] === 'error').length,
      avgGmailThreads: recentData.reduce((sum, row) => sum + row[2], 0) / recentData.length,
      avgProcessingTime: recentData.reduce((sum, row) => sum + row[4], 0) / recentData.length,
      totalErrors: recentData.reduce((sum, row) => sum + row[12], 0)
    };
    
    // 리포트 출력
    console.log(`기간: ${cutoffDate.toLocaleDateString()} ~ ${new Date().toLocaleDateString()}`);
    console.log(`총 기록: ${stats.totalRecords}개`);
    console.log(`상태 분포:`);
    console.log(`  정상: ${stats.healthyCount}개 (${(stats.healthyCount/stats.totalRecords*100).toFixed(1)}%)`);
    console.log(`  경고: ${stats.warningCount}개 (${(stats.warningCount/stats.totalRecords*100).toFixed(1)}%)`);
    console.log(`  에러: ${stats.errorCount}개 (${(stats.errorCount/stats.totalRecords*100).toFixed(1)}%)`);
    console.log(`평균 Gmail 스레드: ${stats.avgGmailThreads.toFixed(1)}개`);
    console.log(`평균 처리 시간: ${stats.avgProcessingTime.toFixed(0)}ms`);
    console.log(`총 에러 수: ${stats.totalErrors}개`);
    
    return stats;
    
  } catch (e) {
    console.log(`❌ 리포트 생성 실패: ${e.message}`);
  }
}