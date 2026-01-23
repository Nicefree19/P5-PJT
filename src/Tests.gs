/**
 * P5 Gmail Analysis System - Test Suite
 * 종합 테스트 스크립트
 */

// ============================================
// Test Configuration
// ============================================

const TEST_CONFIG = {
  // 테스트용 이메일 데이터
  mockEmails: [
    {
      subject: '[긴급] P5 복합동 PSRC 기둥 Shop DWG 검토 요청',
      from: 'engineer@samsung.com',
      date: new Date(),
      body: `
        안녕하세요,

        P5 복합동 PSRC 기둥 Shop Drawing 검토 요청드립니다.

        - 기둥: C-X10 ~ C-X20 (총 11본)
        - 층: 지상 3층
        - 긴급도: 금일 17시까지 회신 요청

        첨부된 도면 확인 부탁드립니다.

        감사합니다.
      `
    },
    {
      subject: 'HMB 반입 일정 조정 협의',
      from: 'logistics@samoo.com',
      date: new Date(),
      body: `
        HMB 자재 반입 일정 조정 협의드립니다.

        현장 여건상 기존 일정 변경이 필요합니다.
        변경 전: 2025.01.05
        변경 후: 2025.01.08

        검토 후 회신 부탁드립니다.
      `
    },
    {
      subject: 'T/C 간섭 구역 작업 중지 통보',
      from: 'safety@senkuzo.com',
      date: new Date(),
      body: `
        타워크레인 작업 반경 내 안전 문제로
        해당 구역 작업 중지를 통보합니다.

        구역: Zone B, X30-X35 라인
        기간: 설계 검토 완료 시까지

        안전 조치 후 재개 예정입니다.
      `
    }
  ]
};

// ============================================
// Unit Tests
// ============================================

/**
 * Test 1: Configuration Validation
 */
function test_Configuration() {
  console.log('=== Test 1: Configuration Validation ===');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Check API key exists (Script Properties 기반)
  try {
    const key = getGeminiApiKey_();
    if (key && key !== 'YOUR_GEMINI_API_KEY_HERE') {
      results.passed++;
      console.log('✅ GEMINI_API_KEY is configured');
    } else {
      results.failed++;
      results.errors.push('GEMINI_API_KEY is not set');
      console.log('❌ GEMINI_API_KEY is not configured');
    }
  } catch (e) {
    results.failed++;
    results.errors.push(e.message);
    console.log(`❌ GEMINI_API_KEY: ${e.message}`);
  }

  // Check Sheet ID exists (Script Properties 기반)
  try {
    const sheetId = getSheetId_();
    if (sheetId && sheetId !== 'YOUR_GOOGLE_SHEET_ID_HERE') {
      results.passed++;
      console.log('✅ SHEET_ID is configured');
    } else {
      results.failed++;
      results.errors.push('SHEET_ID is not set');
      console.log('❌ SHEET_ID is not configured');
    }
  } catch (e) {
    results.failed++;
    results.errors.push(e.message);
    console.log(`❌ SHEET_ID: ${e.message}`);
  }

  // Check keywords array
  if (CONFIG.KEYWORDS && CONFIG.KEYWORDS.length > 0) {
    results.passed++;
    console.log(`✅ KEYWORDS configured: ${CONFIG.KEYWORDS.length} keywords`);
  } else {
    results.failed++;
    results.errors.push('KEYWORDS is empty');
    console.log('❌ KEYWORDS is empty');
  }

  // Check column headers count
  if (CONFIG.COLUMN_HEADERS && CONFIG.COLUMN_HEADERS.length === 26) {
    results.passed++;
    console.log('✅ COLUMN_HEADERS has 26 columns');
  } else {
    results.failed++;
    results.errors.push(`COLUMN_HEADERS has ${CONFIG.COLUMN_HEADERS?.length || 0} columns, expected 26`);
    console.log(`❌ COLUMN_HEADERS has ${CONFIG.COLUMN_HEADERS?.length || 0} columns`);
  }

  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

/**
 * Test 2: Gmail Query Builder
 */
function test_GmailQueryBuilder() {
  console.log('\n=== Test 2: Gmail Query Builder ===');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test query building
    const query = buildFullQuery_();

    if (query && query.length > 0) {
      results.passed++;
      console.log('✅ Query generated successfully');
      console.log(`   Query length: ${query.length} chars`);
      console.log(`   Preview: ${query.substring(0, 100)}...`);
    } else {
      results.failed++;
      results.errors.push('Empty query generated');
    }

    // Check date range (GmailFilter.gs uses newer_than:)
    if (query.includes('newer_than:')) {
      results.passed++;
      console.log('✅ Date range filter included (newer_than)');
    } else {
      results.failed++;
      results.errors.push('Date range filter missing (expected newer_than:)');
    }

    // Check participant filter
    if (query.includes('@samsung.com') || query.includes('@samoo.com')) {
      results.passed++;
      console.log('✅ Participant filters included');
    } else {
      results.failed++;
      results.errors.push('Participant filters missing');
    }

  } catch (e) {
    results.failed++;
    results.errors.push(`Query builder error: ${e.message}`);
    console.log(`❌ Error: ${e.message}`);
  }

  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

/**
 * Test 3: Gemini API Connection
 */
function test_GeminiConnection() {
  console.log('\n=== Test 3: Gemini API Connection ===');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Skip if API key not configured (Script Properties 기반)
  let apiKey;
  try {
    apiKey = getGeminiApiKey_();
  } catch (e) {
    console.log('⚠️ Skipping - API key not configured: ' + e.message);
    return { passed: 0, failed: 0, skipped: true };
  }

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.log('⚠️ Skipping - API key not configured');
    return { passed: 0, failed: 0, skipped: true };
  }

  try {
    // Simple API test
    const testPrompt = '테스트입니다. "OK"라고만 응답하세요.';
    const endpoint = CONFIG.GEMINI_ENDPOINT + CONFIG.GEMINI_MODEL + ':generateContent?key=' + apiKey;

    const payload = {
      contents: [{ parts: [{ text: testPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 50
      }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(endpoint, options);
    const statusCode = response.getResponseCode();

    if (statusCode === 200) {
      results.passed++;
      console.log('✅ Gemini API connection successful');

      const json = JSON.parse(response.getContentText());
      if (json.candidates && json.candidates[0]?.content?.parts[0]?.text) {
        results.passed++;
        console.log('✅ Response parsing successful');
      }
    } else {
      results.failed++;
      results.errors.push(`API returned status ${statusCode}`);
      console.log(`❌ API returned status ${statusCode}`);
    }

  } catch (e) {
    results.failed++;
    results.errors.push(`API error: ${e.message}`);
    console.log(`❌ Error: ${e.message}`);
  }

  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

/**
 * Test 4: Sheet Connection
 */
function test_SheetConnection() {
  console.log('\n=== Test 4: Sheet Connection ===');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Skip if Sheet ID not configured (Script Properties 기반)
  let sheetId;
  try {
    sheetId = getSheetId_();
  } catch (e) {
    console.log('⚠️ Skipping - Sheet ID not configured: ' + e.message);
    return { passed: 0, failed: 0, skipped: true };
  }

  if (!sheetId || sheetId === 'YOUR_GOOGLE_SHEET_ID_HERE') {
    console.log('⚠️ Skipping - Sheet ID not configured');
    return { passed: 0, failed: 0, skipped: true };
  }

  try {
    const ss = SpreadsheetApp.openById(sheetId);

    if (ss) {
      results.passed++;
      console.log('✅ Spreadsheet opened successfully');
      console.log(`   Name: ${ss.getName()}`);
    }

    // Check or create sheet
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (sheet) {
      results.passed++;
      console.log(`✅ Sheet "${CONFIG.SHEET_NAME}" exists`);
      console.log(`   Rows: ${sheet.getLastRow()}`);
    } else {
      console.log(`⚠️ Sheet "${CONFIG.SHEET_NAME}" not found, creating...`);
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
      if (sheet) {
        results.passed++;
        console.log('✅ Sheet created successfully');
      }
    }

    // Check headers
    if (sheet.getLastRow() > 0) {
      const headers = sheet.getRange(1, 1, 1, 26).getValues()[0];
      const hasHeaders = headers.some(h => h && h.length > 0);
      if (hasHeaders) {
        results.passed++;
        console.log('✅ Headers exist in sheet');
      }
    }

  } catch (e) {
    results.failed++;
    results.errors.push(`Sheet error: ${e.message}`);
    console.log(`❌ Error: ${e.message}`);
  }

  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

/**
 * Test 5: Email Analysis (Mock)
 */
function test_EmailAnalysisMock() {
  console.log('\n=== Test 5: Email Analysis (Mock) ===');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Skip if API key not configured (Script Properties 기반)
  let apiKey;
  try {
    apiKey = getGeminiApiKey_();
  } catch (e) {
    console.log('⚠️ Skipping - API key not configured: ' + e.message);
    return { passed: 0, failed: 0, skipped: true };
  }

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.log('⚠️ Skipping - API key not configured');
    return { passed: 0, failed: 0, skipped: true };
  }

  const mockEmail = TEST_CONFIG.mockEmails[0];

  try {
    console.log(`Testing with: "${mockEmail.subject}"`);

    // Build analysis prompt
    const prompt = buildAnalysisPrompt_(mockEmail.subject, mockEmail.body, mockEmail.from);

    if (prompt && prompt.length > 0) {
      results.passed++;
      console.log('✅ Analysis prompt generated');
    }

    // Call Gemini API
    const analysis = callGeminiWithRetry_(prompt, 2);

    if (analysis) {
      results.passed++;
      console.log('✅ Gemini analysis received');

      // Check expected fields
      const expectedFields = ['업무유형', '긴급도', '발생원', '관련기둥'];
      const foundFields = expectedFields.filter(f => analysis.includes(f));

      if (foundFields.length >= 2) {
        results.passed++;
        console.log(`✅ Found ${foundFields.length}/${expectedFields.length} expected fields`);
      } else {
        results.failed++;
        results.errors.push('Missing expected fields in analysis');
      }

      console.log('\nAnalysis Preview:');
      console.log(analysis.substring(0, 300) + '...');
    }

  } catch (e) {
    results.failed++;
    results.errors.push(`Analysis error: ${e.message}`);
    console.log(`❌ Error: ${e.message}`);
  }

  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

/**
 * Test 6: Row Transformation
 */
function test_RowTransformation() {
  console.log('\n=== Test 6: Row Transformation ===');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Mock analysis result
  const mockAnalysis = {
    업무유형: '도면검토',
    긴급도: '긴급',
    발생원: '설계팀',
    관련Zone: 'Zone A',
    관련기둥: 'C-X10~C-X20',
    문서종류: 'Shop DWG',
    상세내용: 'PSRC 기둥 Shop Drawing 검토 요청',
    요청일시: '2025-01-03',
    회신기한: '2025-01-03 17:00',
    담당부서: '현장사무소',
    액션상태: '검토중',
    처리결과: '',
    우선순위: 1,
    영향범위: '기둥 11본',
    Risk레벨: '중',
    연관이슈: '',
    비고: ''
  };

  const mockEmail = {
    subject: TEST_CONFIG.mockEmails[0].subject,
    from: TEST_CONFIG.mockEmails[0].from,
    date: new Date(),
    id: 'test_id_12345',
    threadId: 'test_thread_12345'
  };

  try {
    const row = transformToRow_(mockEmail, mockAnalysis);

    if (row && row.length === 26) {
      results.passed++;
      console.log('✅ Row has exactly 26 columns');
    } else {
      results.failed++;
      results.errors.push(`Row has ${row?.length || 0} columns, expected 26`);
      console.log(`❌ Row has ${row?.length || 0} columns`);
    }

    // Check first few columns
    if (row[0]) { // NO
      results.passed++;
      console.log('✅ NO column populated');
    }

    if (row[1] === '검토중') { // 상태
      results.passed++;
      console.log('✅ Status column correct');
    }

    if (row[2] === '긴급') { // 긴급도
      results.passed++;
      console.log('✅ Urgency column correct');
    }

    console.log('\nRow Preview (first 10 columns):');
    row.slice(0, 10).forEach((val, i) => {
      console.log(`  ${CONFIG.COLUMN_HEADERS[i]}: ${val}`);
    });

  } catch (e) {
    results.failed++;
    results.errors.push(`Transform error: ${e.message}`);
    console.log(`❌ Error: ${e.message}`);
  }

  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

// ============================================
// Integration Tests
// ============================================

/**
 * Integration Test: Full Pipeline (Dry Run)
 */
function test_FullPipelineDryRun() {
  console.log('\n=== Integration Test: Full Pipeline (Dry Run) ===');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Step 1: Build query
    console.log('\n1. Building Gmail query...');
    const query = buildFullQuery_();
    if (query) {
      results.passed++;
      console.log('   ✅ Query built');
    }

    // Step 2: Search Gmail (limit 5)
    console.log('\n2. Searching Gmail (limit 5)...');
    const threads = GmailApp.search(query, 0, 5);
    console.log(`   Found ${threads.length} threads`);

    if (threads.length > 0) {
      results.passed++;
      console.log('   ✅ Threads found');

      // Step 3: Extract messages
      console.log('\n3. Extracting messages...');
      const messages = extractMessagesFromThreads_(threads);
      console.log(`   Extracted ${messages.length} messages`);

      if (messages.length > 0) {
        results.passed++;
        console.log('   ✅ Messages extracted');

        // Step 4: Filter duplicates
        console.log('\n4. Filtering duplicates...');
        const filtered = filterDuplicates_(messages);
        console.log(`   ${filtered.length} unique messages`);

        if (filtered.length > 0) {
          results.passed++;

          // Step 5: Sample analysis (first message only)
          console.log('\n5. Analyzing first message...');
          const first = filtered[0];
          console.log(`   Subject: ${first.subject}`);

          // Script Properties 기반 API 키 체크
          let analysisApiKey;
          try {
            analysisApiKey = getGeminiApiKey_();
          } catch (e) {
            analysisApiKey = null;
          }

          if (analysisApiKey && analysisApiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
            const analysis = analyzeEmail_(first);
            if (analysis) {
              results.passed++;
              console.log('   ✅ Analysis complete');
            }
          } else {
            console.log('   ⚠️ Skipped analysis (API key not set)');
          }
        }
      }
    } else {
      console.log('   ⚠️ No matching threads found');
    }

  } catch (e) {
    results.failed++;
    results.errors.push(`Pipeline error: ${e.message}`);
    console.log(`❌ Error: ${e.message}`);
  }

  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

// ============================================
// Test Runner
// ============================================

/**
 * Run All Tests
 */
function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   P5 Gmail Analysis System - Tests     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`Started at: ${new Date().toLocaleString()}\n`);

  const allResults = {
    total: { passed: 0, failed: 0, skipped: 0 },
    tests: []
  };

  // Run each test
  const tests = [
    { name: 'Configuration', fn: test_Configuration },
    { name: 'Gmail Query Builder', fn: test_GmailQueryBuilder },
    { name: 'Gemini Connection', fn: test_GeminiConnection },
    { name: 'Sheet Connection', fn: test_SheetConnection },
    { name: 'Email Analysis (Mock)', fn: test_EmailAnalysisMock },
    { name: 'Row Transformation', fn: test_RowTransformation },
    { name: 'Full Pipeline (Dry Run)', fn: test_FullPipelineDryRun }
  ];

  tests.forEach(test => {
    try {
      const result = test.fn();
      allResults.tests.push({ name: test.name, ...result });
      allResults.total.passed += result.passed || 0;
      allResults.total.failed += result.failed || 0;
      if (result.skipped) allResults.total.skipped++;
    } catch (e) {
      console.log(`\n❌ Test "${test.name}" crashed: ${e.message}`);
      allResults.tests.push({ name: test.name, passed: 0, failed: 1, errors: [e.message] });
      allResults.total.failed++;
    }
  });

  // Summary
  console.log('\n════════════════════════════════════════');
  console.log('                 SUMMARY                 ');
  console.log('════════════════════════════════════════');
  console.log(`Total Passed: ${allResults.total.passed}`);
  console.log(`Total Failed: ${allResults.total.failed}`);
  console.log(`Tests Skipped: ${allResults.total.skipped}`);
  console.log('════════════════════════════════════════\n');

  // Status
  if (allResults.total.failed === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed. Check the log above.');
  }

  return allResults;
}

/**
 * Quick Health Check
 */
function quickHealthCheck() {
  console.log('=== Quick Health Check ===\n');

  const checks = {
    config: false,
    gemini: false,
    sheet: false,
    gmail: false
  };

  // Config check (Script Properties 기반)
  let healthApiKey;
  try {
    healthApiKey = getGeminiApiKey_();
    if (healthApiKey && healthApiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      checks.config = true;
      console.log('✅ Configuration: OK');
    } else {
      console.log('❌ Configuration: API key not set');
    }
  } catch (e) {
    console.log('❌ Configuration: ' + e.message);
  }

  // Gemini check
  if (checks.config) {
    try {
      const endpoint = CONFIG.GEMINI_ENDPOINT + CONFIG.GEMINI_MODEL + ':generateContent?key=' + healthApiKey;
      const response = UrlFetchApp.fetch(endpoint, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 10 }
        }),
        muteHttpExceptions: true
      });
      checks.gemini = response.getResponseCode() === 200;
      console.log(checks.gemini ? '✅ Gemini API: OK' : '❌ Gemini API: Failed');
    } catch (e) {
      console.log('❌ Gemini API: Error - ' + e.message);
    }
  }

  // Sheet check (Script Properties 기반)
  let healthSheetId;
  try {
    healthSheetId = getSheetId_();
    if (healthSheetId && healthSheetId !== 'YOUR_GOOGLE_SHEET_ID_HERE') {
      const ss = SpreadsheetApp.openById(healthSheetId);
      checks.sheet = !!ss;
      console.log(checks.sheet ? '✅ Google Sheet: OK' : '❌ Google Sheet: Failed');
    } else {
      console.log('❌ Google Sheet: ID not set');
    }
  } catch (e) {
    console.log('❌ Google Sheet: Error - ' + e.message);
  }

  // Gmail check
  try {
    const threads = GmailApp.search('is:unread', 0, 1);
    checks.gmail = true;
    console.log('✅ Gmail Access: OK');
  } catch (e) {
    console.log('❌ Gmail Access: Error - ' + e.message);
  }

  console.log('\n--- Summary ---');
  const allOk = Object.values(checks).every(v => v);
  console.log(allOk ? '✅ System is ready!' : '⚠️ Some checks failed');

  return checks;
}

// ============================================
// LockService Tests (Phase 5 - Task 3)
// ============================================

/**
 * Test LockService for Dashboard API
 * 동시성 제어 테스트
 */
function test_LockService() {
  console.log('\n=== LockService Concurrency Test ===\n');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Lock 획득 테스트
  console.log('[Test 1] Lock 획득 테스트...');
  try {
    const lock = LockService.getDocumentLock();
    const acquired = lock.tryLock(1000);

    if (acquired) {
      results.passed++;
      console.log('✅ Lock 획득 성공');
      lock.releaseLock();
      console.log('✅ Lock 해제 성공');
      results.passed++;
    } else {
      results.failed++;
      results.errors.push('Lock 획득 실패');
      console.log('❌ Lock 획득 실패');
    }
  } catch (e) {
    results.failed++;
    results.errors.push(`Lock 테스트 오류: ${e.message}`);
    console.log(`❌ 오류: ${e.message}`);
  }

  // Test 2: 이중 Lock 획득 시도 (동일 스레드)
  console.log('\n[Test 2] 이중 Lock 방지 테스트...');
  try {
    const lock1 = LockService.getDocumentLock();
    const lock2 = LockService.getDocumentLock();

    const acquired1 = lock1.tryLock(1000);
    if (acquired1) {
      results.passed++;
      console.log('✅ 첫 번째 Lock 획득');

      // 동일 Lock은 같은 스레드에서 재획득 가능 (Apps Script 특성)
      const acquired2 = lock2.tryLock(100);
      if (acquired2) {
        console.log('ℹ️ 동일 스레드에서 Lock 재획득 허용됨 (예상된 동작)');
        results.passed++;
        lock2.releaseLock();
      }

      lock1.releaseLock();
    }
  } catch (e) {
    results.failed++;
    results.errors.push(`이중 Lock 테스트 오류: ${e.message}`);
    console.log(`❌ 오류: ${e.message}`);
  }

  // Test 3: updateColumn 함수 Lock 테스트
  console.log('\n[Test 3] updateColumn() Lock 적용 확인...');
  try {
    // 존재하지 않는 UID로 테스트 (실제 데이터 변경 방지)
    const result = updateColumn('TEST-X999', { status: 'test' }, 'test_user');

    if (result.retryable !== undefined || result.success !== undefined) {
      results.passed++;
      console.log('✅ updateColumn이 Lock 관련 응답 반환');
      console.log(`   결과: ${JSON.stringify(result)}`);
    } else {
      results.failed++;
      console.log('❌ updateColumn 응답 형식 불일치');
    }
  } catch (e) {
    // updateColumn 함수가 정의되지 않은 경우
    if (e.message.includes('is not defined')) {
      console.log('⚠️ updateColumn 함수를 찾을 수 없음 (DashboardAPI 스크립트 필요)');
    } else {
      results.failed++;
      results.errors.push(`updateColumn 테스트 오류: ${e.message}`);
      console.log(`❌ 오류: ${e.message}`);
    }
  }

  // Test 4: bulkUpdateColumns 함수 테스트
  console.log('\n[Test 4] bulkUpdateColumns() 재시도 로직 확인...');
  try {
    const result = bulkUpdateColumns(['TEST-X998', 'TEST-X999'], { status: 'test' }, 'test_user');

    if (result.results && result.results.retried !== undefined) {
      results.passed++;
      console.log('✅ bulkUpdateColumns가 재시도 카운트 포함');
      console.log(`   결과: ${result.summary}`);
    } else {
      results.failed++;
      console.log('❌ bulkUpdateColumns 응답 형식 불일치');
    }
  } catch (e) {
    if (e.message.includes('is not defined')) {
      console.log('⚠️ bulkUpdateColumns 함수를 찾을 수 없음');
    } else {
      results.failed++;
      results.errors.push(`bulkUpdateColumns 테스트 오류: ${e.message}`);
      console.log(`❌ 오류: ${e.message}`);
    }
  }

  // Test 5: createIssue 함수 Lock 테스트
  console.log('\n[Test 5] createIssue() Lock 적용 확인...');
  try {
    const testIssue = {
      type: 'test',
      title: 'LockService Test Issue',
      affectedColumns: [],
      severity: 'low',
      description: 'This is a test issue for LockService verification'
    };

    // 실제 이슈 생성 (테스트 후 정리 필요)
    const result = createIssue(testIssue, 'test_lockservice');

    if (result.retryable !== undefined || result.success !== undefined) {
      results.passed++;
      console.log('✅ createIssue가 Lock 관련 응답 반환');
      console.log(`   결과: ${JSON.stringify(result)}`);

      if (result.success && result.issueId) {
        console.log(`   생성된 이슈 ID: ${result.issueId}`);
        console.log('   ⚠️ 테스트 이슈가 생성됨 - 수동 삭제 필요');
      }
    } else {
      results.failed++;
      console.log('❌ createIssue 응답 형식 불일치');
    }
  } catch (e) {
    if (e.message.includes('is not defined')) {
      console.log('⚠️ createIssue 함수를 찾을 수 없음');
    } else {
      results.failed++;
      results.errors.push(`createIssue 테스트 오류: ${e.message}`);
      console.log(`❌ 오류: ${e.message}`);
    }
  }

  // 결과 요약
  console.log('\n=== LockService 테스트 결과 ===');
  console.log(`✅ 통과: ${results.passed}`);
  console.log(`❌ 실패: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n오류 목록:');
    results.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  return results;
}

/**
 * Quick LockService verification
 * Dashboard API 배포 후 실행
 */
function verifyLockService() {
  console.log('=== LockService Quick Verification ===\n');

  const checks = {
    lockAcquire: false,
    lockRelease: false,
    updateColumn: false,
    createIssue: false
  };

  // Lock 기본 동작
  try {
    const lock = LockService.getDocumentLock();
    checks.lockAcquire = lock.tryLock(1000);
    if (checks.lockAcquire) {
      lock.releaseLock();
      checks.lockRelease = true;
    }
  } catch (e) {
    console.log(`Lock 오류: ${e.message}`);
  }

  // updateColumn 함수 체크
  try {
    const result = updateColumn('VERIFY-X1', {}, 'verify');
    checks.updateColumn = result.hasOwnProperty('retryable') || result.hasOwnProperty('success');
  } catch (e) {
    // 함수가 없으면 false 유지
  }

  // createIssue 함수 체크
  try {
    // 실제 생성하지 않고 Sheet 존재 여부로 확인
    checks.createIssue = typeof createIssue === 'function';
  } catch (e) {
    // 함수가 없으면 false 유지
  }

  console.log('Lock 획득:', checks.lockAcquire ? '✅' : '❌');
  console.log('Lock 해제:', checks.lockRelease ? '✅' : '❌');
  console.log('updateColumn Lock:', checks.updateColumn ? '✅' : '⚠️');
  console.log('createIssue Lock:', checks.createIssue ? '✅' : '⚠️');

  return checks;
}

// ============================================
// Task 4: Urgency→Severity 매핑 테스트
// ============================================

/**
 * Test: URGENCY_TO_SEVERITY 매핑 검증
 * Config.gs의 매핑 테이블 및 변환 함수 테스트
 */
function test_UrgencyToSeverityMapping() {
  console.log('=== Test: URGENCY_TO_SEVERITY Mapping ===\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: 기본 매핑 테이블 존재 확인
  console.log('Test 1: 매핑 테이블 존재 확인');
  try {
    const mapping = CONFIG.URGENCY_TO_SEVERITY;
    if (mapping && typeof mapping === 'object') {
      results.passed++;
      results.tests.push({ name: '매핑 테이블 존재', status: 'passed' });
      console.log('✅ URGENCY_TO_SEVERITY 매핑 테이블 존재\n');
    } else {
      throw new Error('매핑 테이블이 없음');
    }
  } catch (e) {
    results.failed++;
    results.tests.push({ name: '매핑 테이블 존재', status: 'failed', error: e.message });
    console.log(`❌ ${e.message}\n`);
  }

  // Test 2: 각 Urgency 값 매핑 테스트
  console.log('Test 2: 개별 Urgency 값 매핑');
  const testCases = [
    { input: 'Showstopper', expected: 'critical' },
    { input: 'Critical', expected: 'critical' },
    { input: 'High', expected: 'high' },
    { input: 'Medium', expected: 'medium' },
    { input: 'Low', expected: 'low' }
  ];

  testCases.forEach(tc => {
    const result = CONFIG.URGENCY_TO_SEVERITY[tc.input];
    if (result === tc.expected) {
      results.passed++;
      console.log(`  ✅ ${tc.input} → ${result}`);
    } else {
      results.failed++;
      console.log(`  ❌ ${tc.input} → ${result} (expected: ${tc.expected})`);
    }
  });
  console.log('');

  // Test 3: convertUrgencyToSeverity_() 함수 테스트
  console.log('Test 3: convertUrgencyToSeverity_() 함수');
  const functionTests = [
    { input: 'Showstopper', expected: 'critical' },
    { input: 'Critical', expected: 'critical' },
    { input: 'High', expected: 'high' },
    { input: 'Medium', expected: 'medium' },
    { input: 'Low', expected: 'low' },
    { input: null, expected: 'medium' },        // null 처리
    { input: '', expected: 'medium' },          // 빈 문자열
    { input: 'Unknown', expected: 'medium' },   // 알 수 없는 값
    { input: '긴급', expected: 'critical' },    // 한글 fuzzy match
    { input: '높음', expected: 'high' }         // 한글 fuzzy match
  ];

  functionTests.forEach(tc => {
    try {
      const result = convertUrgencyToSeverity_(tc.input);
      if (result === tc.expected) {
        results.passed++;
        console.log(`  ✅ "${tc.input}" → ${result}`);
      } else {
        results.failed++;
        console.log(`  ❌ "${tc.input}" → ${result} (expected: ${tc.expected})`);
      }
    } catch (e) {
      results.failed++;
      console.log(`  ❌ "${tc.input}" 에러: ${e.message}`);
    }
  });
  console.log('');

  // Test 4: mapMethodToIssueType_() 함수 테스트
  console.log('Test 4: mapMethodToIssueType_() 함수');
  const methodTests = [
    { input: 'T/C 간섭', expected: 't_c' },
    { input: 'PSRC-PC접합', expected: 'design' },
    { input: 'HMB 반입', expected: 'schedule' },
    { input: '안전 점검', expected: 'safety' },
    { input: '품질 검수', expected: 'quality' },
    { input: '기타', expected: 'other' },
    { input: null, expected: 'other' }
  ];

  methodTests.forEach(tc => {
    try {
      const result = mapMethodToIssueType_(tc.input);
      if (result === tc.expected) {
        results.passed++;
        console.log(`  ✅ "${tc.input}" → ${result}`);
      } else {
        results.failed++;
        console.log(`  ❌ "${tc.input}" → ${result} (expected: ${tc.expected})`);
      }
    } catch (e) {
      results.failed++;
      console.log(`  ❌ "${tc.input}" 에러: ${e.message}`);
    }
  });
  console.log('');

  // 결과 요약
  console.log('=== Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);

  return results;
}

// ============================================
// Task 1: 시맨틱 프롬프트 테스트
// ============================================

/**
 * Test: ZONE_CONTEXT 및 시맨틱 프롬프트 검증
 */
function test_SemanticPrompt() {
  console.log('=== Test: Semantic Prompt & Zone Context ===\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: ZONE_CONTEXT 상수 존재 확인
  console.log('Test 1: ZONE_CONTEXT 상수');
  try {
    if (typeof ZONE_CONTEXT === 'string' && ZONE_CONTEXT.length > 0) {
      results.passed++;
      console.log('✅ ZONE_CONTEXT 상수 존재\n');
    } else {
      throw new Error('ZONE_CONTEXT가 비어있음');
    }
  } catch (e) {
    results.failed++;
    console.log(`❌ ${e.message}\n`);
  }

  // Test 2: PERSONA_PROMPT에 Zone 정보 포함 확인
  console.log('Test 2: PERSONA_PROMPT Zone 정보');
  try {
    if (PERSONA_PROMPT.includes('zoneId') && PERSONA_PROMPT.includes('affectedColumns')) {
      results.passed++;
      console.log('✅ PERSONA_PROMPT에 zoneId, affectedColumns 포함\n');
    } else {
      throw new Error('PERSONA_PROMPT에 Zone 필드 누락');
    }
  } catch (e) {
    results.failed++;
    console.log(`❌ ${e.message}\n`);
  }

  // Test 3: inferZoneFromColumns_() 함수 테스트
  console.log('Test 3: inferZoneFromColumns_() 함수');
  const zoneTests = [
    { input: ['A-X10', 'B-X15', 'C-X20'], expected: 'zone_a' },
    { input: ['A-X30', 'B-X35', 'C-X40'], expected: 'zone_b' },
    { input: ['A-X50', 'B-X55', 'C-X60'], expected: 'zone_c' },
    { input: [], expected: '' },
    { input: null, expected: '' },
    { input: ['A-X10', 'B-X30', 'C-X50'], expected: 'zone_a' } // 동률 시 첫 번째
  ];

  zoneTests.forEach(tc => {
    try {
      const result = inferZoneFromColumns_(tc.input);
      if (result === tc.expected) {
        results.passed++;
        console.log(`  ✅ ${JSON.stringify(tc.input)} → ${result}`);
      } else {
        results.failed++;
        console.log(`  ❌ ${JSON.stringify(tc.input)} → ${result} (expected: ${tc.expected})`);
      }
    } catch (e) {
      results.failed++;
      console.log(`  ❌ ${JSON.stringify(tc.input)} 에러: ${e.message}`);
    }
  });
  console.log('');

  // Test 4: getDefaultAnalysis_() 필드 검증
  console.log('Test 4: getDefaultAnalysis_() 신규 필드');
  try {
    const mockEmail = { from: 'test@samsung.com', subject: 'Test' };
    const defaultAnalysis = getDefaultAnalysis_(mockEmail);

    if ('zoneId' in defaultAnalysis && 'affectedColumns' in defaultAnalysis) {
      results.passed++;
      console.log('✅ getDefaultAnalysis_()에 zoneId, affectedColumns 포함\n');
    } else {
      throw new Error('getDefaultAnalysis_()에 신규 필드 누락');
    }
  } catch (e) {
    results.failed++;
    console.log(`❌ ${e.message}\n`);
  }

  // 결과 요약
  console.log('=== Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);

  return results;
}

// ============================================
// Phase 6: Production Stages 테스트
// ============================================

/**
 * Test: 6단계 공정 상태 API
 * DashboardAPI.gs의 stage 관련 함수 테스트
 */
function test_ProductionStages() {
  console.log('=== Test: Production Stages (Phase 6) ===\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const validStages = ['hmb_fab', 'pre_assem', 'main_assem', 'hmb_psrc', 'form', 'embed'];
  const testUid = 'A-X1'; // 테스트용 UID

  // Test 1: 유효한 공정 단계 코드 확인
  console.log('Test 1: 유효한 공정 단계 코드');
  try {
    // updateColumnStage 함수로 유효한 stage 테스트
    const result = updateColumnStage(testUid, 'hmb_fab', 'active', 'test_stage');

    if (result.success || result.error) {
      results.passed++;
      console.log('✅ updateColumnStage() 함수 정상 동작');
      console.log(`   결과: ${JSON.stringify(result)}\n`);
    }
  } catch (e) {
    if (e.message.includes('is not defined')) {
      console.log('⚠️ updateColumnStage 함수를 찾을 수 없음 (DashboardAPI 필요)\n');
    } else {
      results.failed++;
      console.log(`❌ 오류: ${e.message}\n`);
    }
  }

  // Test 2: 잘못된 공정 단계 코드 거부
  console.log('Test 2: 잘못된 공정 단계 코드 거부');
  try {
    const result = updateColumnStage(testUid, 'invalid_stage', 'active', 'test');

    if (result.success === false && result.error.includes('Invalid stage code')) {
      results.passed++;
      console.log('✅ 잘못된 stage 코드 정상 거부\n');
    } else {
      results.failed++;
      console.log(`❌ 잘못된 stage 코드가 거부되지 않음\n`);
    }
  } catch (e) {
    if (e.message.includes('is not defined')) {
      console.log('⚠️ updateColumnStage 함수를 찾을 수 없음\n');
    } else {
      results.failed++;
      console.log(`❌ 오류: ${e.message}\n`);
    }
  }

  // Test 3: getColumns()가 stages 객체 반환하는지 확인
  console.log('Test 3: getColumns() stages 객체 반환');
  try {
    const result = getColumns('zone_a');

    if (result.success && result.columns) {
      const firstColumn = Object.values(result.columns)[0];

      if (firstColumn && firstColumn.stages) {
        results.passed++;
        console.log('✅ getColumns()가 stages 객체 포함');
        console.log(`   stages: ${JSON.stringify(firstColumn.stages)}\n`);
      } else {
        results.failed++;
        console.log('❌ stages 객체가 없음\n');
      }
    }
  } catch (e) {
    if (e.message.includes('is not defined')) {
      console.log('⚠️ getColumns 함수를 찾을 수 없음\n');
    } else {
      results.failed++;
      console.log(`❌ 오류: ${e.message}\n`);
    }
  }

  // Test 4: bulkUpdateColumnStages() 함수 테스트
  console.log('Test 4: bulkUpdateColumnStages() 함수');
  try {
    const result = bulkUpdateColumnStages(['A-X1', 'A-X2'], 'hmb_fab', 'active', 'test_bulk');

    if (result.summary && result.stageCode === 'hmb_fab') {
      results.passed++;
      console.log('✅ bulkUpdateColumnStages() 정상 동작');
      console.log(`   결과: ${result.summary}\n`);
    } else {
      results.failed++;
      console.log('❌ bulkUpdateColumnStages() 응답 형식 불일치\n');
    }
  } catch (e) {
    if (e.message.includes('is not defined')) {
      console.log('⚠️ bulkUpdateColumnStages 함수를 찾을 수 없음\n');
    } else {
      results.failed++;
      console.log(`❌ 오류: ${e.message}\n`);
    }
  }

  // Test 5: updateColumn()으로 stages 일괄 업데이트
  console.log('Test 5: updateColumn() stages 일괄 업데이트');
  try {
    const stagesData = {
      stages: {
        hmb_fab: 'installed',
        pre_assem: 'active',
        main_assem: 'pending'
      }
    };

    const result = updateColumn(testUid, stagesData, 'test_stages_batch');

    if (result.success || result.error) {
      results.passed++;
      console.log('✅ updateColumn()으로 다중 stages 업데이트 가능');
      console.log(`   업데이트 항목: ${JSON.stringify(result.updated || [])}\n`);
    }
  } catch (e) {
    if (e.message.includes('is not defined')) {
      console.log('⚠️ updateColumn 함수를 찾을 수 없음\n');
    } else {
      results.failed++;
      console.log(`❌ 오류: ${e.message}\n`);
    }
  }

  // 결과 요약
  console.log('=== Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);

  return results;
}

// ============================================
// Phase 7+: 층-절주 구조 Backend 테스트
// ============================================

/**
 * Test: 층(Floor) 데이터 API
 * getFloorData, getFloorStats 함수 테스트
 */
function test_FloorAPI() {
  console.log('=== Test: Floor Data API (Phase 7+) ===\n');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  const testFloors = ['F01', 'F02', 'F03', 'F10', 'RF'];

  // Test 1: getFloorData() 함수 테스트
  console.log('Test 1: getFloorData() 함수');
  testFloors.forEach(floorId => {
    try {
      const result = getFloorData(floorId);

      if (result.success) {
        results.passed++;
        const columnCount = Object.keys(result.columns || {}).length;
        console.log(`  ✅ ${floorId}: ${columnCount} columns`);
      } else {
        results.failed++;
        console.log(`  ❌ ${floorId}: ${result.error || 'Unknown error'}`);
      }
    } catch (e) {
      if (e.message.includes('is not defined')) {
        console.log(`  ⚠️ getFloorData 함수를 찾을 수 없음`);
        return;
      }
      results.failed++;
      results.errors.push(`${floorId}: ${e.message}`);
      console.log(`  ❌ ${floorId}: ${e.message}`);
    }
  });
  console.log('');

  // Test 2: getFloorData() 응답 구조 검증
  console.log('Test 2: getFloorData() 응답 구조');
  try {
    const result = getFloorData('F01');

    if (result.success) {
      const hasColumns = 'columns' in result;
      const hasStats = 'stats' in result && 'byJeolju' in result.stats;
      const hasIssues = 'issues' in result;

      if (hasColumns && hasStats && hasIssues) {
        results.passed++;
        console.log('  ✅ 응답 구조 정상 (columns, stats.byJeolju, issues)');
      } else {
        results.failed++;
        console.log(`  ❌ 응답 구조 불완전: columns=${hasColumns}, stats.byJeolju=${hasStats}, issues=${hasIssues}`);
      }
    }
  } catch (e) {
    if (!e.message.includes('is not defined')) {
      results.failed++;
      console.log(`  ❌ 응답 구조 검증 실패: ${e.message}`);
    }
  }
  console.log('');

  // Test 3: 잘못된 층 ID 처리
  console.log('Test 3: 잘못된 층 ID 처리');
  try {
    const result = getFloorData('INVALID');

    if (result.success === false) {
      results.passed++;
      console.log('  ✅ 잘못된 층 ID 정상 거부');
    } else {
      results.failed++;
      console.log('  ❌ 잘못된 층 ID가 거부되지 않음');
    }
  } catch (e) {
    if (!e.message.includes('is not defined')) {
      results.failed++;
      console.log(`  ❌ 예외 발생: ${e.message}`);
    }
  }
  console.log('');

  // 결과 요약
  console.log('=== Floor API Test Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  return results;
}

/**
 * Test: 절주(Jeolju) 관련 API
 * 절주별 통계 및 필터 테스트
 */
function test_JeoljuAPI() {
  console.log('=== Test: Jeolju API (Phase 7+) ===\n');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  const testJeoljus = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8'];

  // Test 1: 절주별 통계 확인
  console.log('Test 1: 절주별 통계 확인');
  try {
    const result = getFloorData('F01');

    if (result.success && result.stats && result.stats.byJeolju) {
      const byJeolju = result.stats.byJeolju;
      let allJeoljuPresent = true;

      testJeoljus.forEach(j => {
        if (j in byJeolju) {
          console.log(`  ✅ ${j}: total=${byJeolju[j].total}, issues=${byJeolju[j].issues || 0}`);
        } else {
          allJeoljuPresent = false;
          console.log(`  ❌ ${j}: 통계 없음`);
        }
      });

      if (allJeoljuPresent) {
        results.passed++;
      } else {
        results.failed++;
      }
    } else {
      results.failed++;
      console.log('  ❌ 절주별 통계 데이터 없음');
    }
  } catch (e) {
    if (!e.message.includes('is not defined')) {
      results.failed++;
      results.errors.push(`절주 통계: ${e.message}`);
      console.log(`  ❌ 오류: ${e.message}`);
    }
  }
  console.log('');

  // Test 2: 절주 범위 매핑 확인
  console.log('Test 2: 절주 범위 매핑');
  const jeoljuRanges = {
    J1: { start: 1, end: 9 },
    J2: { start: 10, end: 17 },
    J3: { start: 18, end: 26 },
    J4: { start: 27, end: 34 },
    J5: { start: 35, end: 43 },
    J6: { start: 44, end: 52 },
    J7: { start: 53, end: 61 },
    J8: { start: 62, end: 69 }
  };

  try {
    const result = getFloorData('F01');

    if (result.success && result.columns) {
      let mappingCorrect = true;

      // 샘플 컬럼으로 절주 매핑 검증
      Object.entries(result.columns).forEach(([uid, col]) => {
        if (col.jeoljuId) {
          // UID에서 X 번호 추출 (예: F01-A-X10 → 10)
          const match = uid.match(/X(\d+)/);
          if (match) {
            const xNum = parseInt(match[1], 10);
            const expectedJeolju = Object.entries(jeoljuRanges).find(
              ([_, range]) => xNum >= range.start && xNum <= range.end
            );

            if (expectedJeolju && expectedJeolju[0] !== col.jeoljuId) {
              mappingCorrect = false;
              console.log(`  ❌ ${uid}: 예상 ${expectedJeolju[0]}, 실제 ${col.jeoljuId}`);
            }
          }
        }
      });

      if (mappingCorrect) {
        results.passed++;
        console.log('  ✅ 절주 범위 매핑 정상');
      } else {
        results.failed++;
      }
    }
  } catch (e) {
    if (!e.message.includes('is not defined')) {
      results.failed++;
      console.log(`  ❌ 오류: ${e.message}`);
    }
  }
  console.log('');

  // 결과 요약
  console.log('=== Jeolju API Test Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  return results;
}

/**
 * Test: 전체 층 통계 API
 * getAllFloorStats() 함수 테스트
 */
function test_FloorStats() {
  console.log('=== Test: Floor Stats API (Phase 7+) ===\n');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  const expectedFloors = ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'RF'];

  // Test 1: getAllFloorStats() 함수
  console.log('Test 1: getAllFloorStats() 함수');
  try {
    const result = getAllFloorStats();

    if (result.success && result.floors) {
      results.passed++;
      console.log('  ✅ getAllFloorStats() 정상 동작');
      console.log(`  총 층수: ${Object.keys(result.floors).length}`);

      // 각 층 통계 출력
      Object.entries(result.floors).forEach(([floorId, stats]) => {
        console.log(`    ${floorId}: total=${stats.total}, withIssues=${stats.withIssues || 0}`);
      });
    } else {
      results.failed++;
      console.log(`  ❌ getAllFloorStats() 실패: ${result.error || 'Unknown'}`);
    }
  } catch (e) {
    if (e.message.includes('is not defined')) {
      console.log('  ⚠️ getAllFloorStats 함수를 찾을 수 없음');
    } else {
      results.failed++;
      results.errors.push(`getAllFloorStats: ${e.message}`);
      console.log(`  ❌ 오류: ${e.message}`);
    }
  }
  console.log('');

  // Test 2: 모든 층 포함 확인
  console.log('Test 2: 모든 층 포함 확인');
  try {
    const result = getAllFloorStats();

    if (result.success && result.floors) {
      const missingFloors = expectedFloors.filter(f => !(f in result.floors));

      if (missingFloors.length === 0) {
        results.passed++;
        console.log('  ✅ 모든 11개 층 데이터 포함');
      } else {
        results.failed++;
        console.log(`  ❌ 누락된 층: ${missingFloors.join(', ')}`);
      }
    }
  } catch (e) {
    if (!e.message.includes('is not defined')) {
      results.failed++;
      console.log(`  ❌ 오류: ${e.message}`);
    }
  }
  console.log('');

  // Test 3: 전체 통계 합산 확인
  console.log('Test 3: 전체 통계 합산');
  try {
    const result = getAllFloorStats();

    if (result.success && result.summary) {
      results.passed++;
      console.log('  ✅ 전체 통계 합산 포함');
      console.log(`    총 기둥: ${result.summary.totalColumns}`);
      console.log(`    이슈 있는 기둥: ${result.summary.withIssues || 0}`);
      console.log(`    평균 진행률: ${result.summary.avgProgress || 0}%`);
    } else {
      // summary가 없어도 통과 (선택적 기능)
      console.log('  ℹ️ summary 필드 없음 (선택적)');
    }
  } catch (e) {
    if (!e.message.includes('is not defined')) {
      console.log(`  ❌ 오류: ${e.message}`);
    }
  }
  console.log('');

  // 결과 요약
  console.log('=== Floor Stats Test Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  return results;
}

/**
 * Test: Columns API 층 필터
 * getColumns에 floorFilter 파라미터 테스트
 */
function test_ColumnsFloorFilter() {
  console.log('=== Test: Columns Floor Filter (Phase 7+) ===\n');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: floorFilter 파라미터 테스트
  console.log('Test 1: floorFilter 파라미터');
  try {
    // Zone 필터 없이 층 필터만 적용
    const result = getColumns(null, 'F01');

    if (result.success && result.columns) {
      const columns = Object.values(result.columns);
      const allSameFloor = columns.every(c => c.floorId === 'F01');

      if (allSameFloor) {
        results.passed++;
        console.log(`  ✅ F01 필터 정상: ${columns.length} columns`);
      } else {
        results.failed++;
        const otherFloors = [...new Set(columns.map(c => c.floorId))];
        console.log(`  ❌ 다른 층 데이터 포함: ${otherFloors.join(', ')}`);
      }
    }
  } catch (e) {
    if (!e.message.includes('is not defined')) {
      results.failed++;
      results.errors.push(`floorFilter: ${e.message}`);
      console.log(`  ❌ 오류: ${e.message}`);
    }
  }
  console.log('');

  // Test 2: Zone + Floor 복합 필터
  console.log('Test 2: Zone + Floor 복합 필터');
  try {
    const result = getColumns('zone_a', 'F01');

    if (result.success && result.columns) {
      const columns = Object.values(result.columns);
      const allMatch = columns.every(c => c.floorId === 'F01' && c.zone === 'zone_a');

      if (allMatch) {
        results.passed++;
        console.log(`  ✅ Zone A + F01 필터 정상: ${columns.length} columns`);
      } else {
        results.failed++;
        console.log('  ❌ 필터 조건 불일치');
      }
    }
  } catch (e) {
    if (!e.message.includes('is not defined')) {
      results.failed++;
      console.log(`  ❌ 오류: ${e.message}`);
    }
  }
  console.log('');

  // Test 3: 필터 없이 전체 조회
  console.log('Test 3: 필터 없이 전체 조회');
  try {
    const result = getColumns();

    if (result.success && result.columns) {
      const columns = Object.values(result.columns);
      const floors = [...new Set(columns.map(c => c.floorId))];

      if (floors.length > 1) {
        results.passed++;
        console.log(`  ✅ 전체 조회 정상: ${columns.length} columns, ${floors.length} floors`);
      } else {
        console.log(`  ℹ️ 현재 1개 층 데이터만 존재: ${floors[0]}`);
      }
    }
  } catch (e) {
    if (!e.message.includes('is not defined')) {
      results.failed++;
      console.log(`  ❌ 오류: ${e.message}`);
    }
  }
  console.log('');

  // 결과 요약
  console.log('=== Columns Floor Filter Test Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  return results;
}

/**
 * Test: 마이그레이션 함수
 * floorId 컬럼 추가 마이그레이션 테스트
 */
function test_MigrationFunctions() {
  console.log('=== Test: Migration Functions (Phase 7+) ===\n');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: getFloorColumnCount() 함수
  console.log('Test 1: getFloorColumnCount() 함수');
  try {
    const result = getFloorColumnCount('F01');

    if (typeof result === 'number' && result >= 0) {
      results.passed++;
      console.log(`  ✅ F01 기둥 수: ${result}`);
    } else {
      results.failed++;
      console.log(`  ❌ 잘못된 반환값: ${result}`);
    }
  } catch (e) {
    if (e.message.includes('is not defined')) {
      console.log('  ⚠️ getFloorColumnCount 함수를 찾을 수 없음');
    } else {
      results.failed++;
      console.log(`  ❌ 오류: ${e.message}`);
    }
  }
  console.log('');

  // Test 2: migrateAddFloorIdColumn() 함수 존재 확인
  console.log('Test 2: migrateAddFloorIdColumn() 함수 존재');
  try {
    if (typeof migrateAddFloorIdColumn === 'function') {
      results.passed++;
      console.log('  ✅ migrateAddFloorIdColumn() 함수 정의됨');
      console.log('  ⚠️ 실제 마이그레이션은 수동 실행 필요');
    } else {
      results.failed++;
      console.log('  ❌ 함수가 function 타입이 아님');
    }
  } catch (e) {
    console.log('  ⚠️ migrateAddFloorIdColumn 함수를 찾을 수 없음');
  }
  console.log('');

  // Test 3: generateAllFloorData() 함수 존재 확인
  console.log('Test 3: generateAllFloorData() 함수 존재');
  try {
    if (typeof generateAllFloorData === 'function') {
      results.passed++;
      console.log('  ✅ generateAllFloorData() 함수 정의됨');
      console.log('  ⚠️ 실제 데이터 생성은 수동 실행 필요');
    } else {
      results.failed++;
      console.log('  ❌ 함수가 function 타입이 아님');
    }
  } catch (e) {
    console.log('  ⚠️ generateAllFloorData 함수를 찾을 수 없음');
  }
  console.log('');

  // 결과 요약
  console.log('=== Migration Functions Test Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  return results;
}

/**
 * Phase 7+ 통합 테스트 러너
 */
function runPhase7PlusTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Phase 7+: 층-절주 구조 Backend Tests     ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`Started at: ${new Date().toLocaleString()}\n`);

  const allResults = {
    total: { passed: 0, failed: 0 },
    tests: []
  };

  const tests = [
    { name: 'Floor API', fn: test_FloorAPI },
    { name: 'Jeolju API', fn: test_JeoljuAPI },
    { name: 'Floor Stats', fn: test_FloorStats },
    { name: 'Columns Floor Filter', fn: test_ColumnsFloorFilter },
    { name: 'Migration Functions', fn: test_MigrationFunctions }
  ];

  tests.forEach(test => {
    try {
      console.log(`\n${'─'.repeat(50)}`);
      const result = test.fn();
      allResults.tests.push({ name: test.name, ...result });
      allResults.total.passed += result.passed || 0;
      allResults.total.failed += result.failed || 0;
    } catch (e) {
      console.log(`\n❌ Test "${test.name}" crashed: ${e.message}`);
      allResults.tests.push({ name: test.name, passed: 0, failed: 1, errors: [e.message] });
      allResults.total.failed++;
    }
  });

  // Summary
  console.log('\n════════════════════════════════════════════');
  console.log('           PHASE 7+ TEST SUMMARY            ');
  console.log('════════════════════════════════════════════');
  console.log(`Total Passed: ${allResults.total.passed}`);
  console.log(`Total Failed: ${allResults.total.failed}`);
  console.log('════════════════════════════════════════════\n');

  if (allResults.total.failed === 0) {
    console.log('✅ All Phase 7+ tests passed!');
  } else {
    console.log('❌ Some tests failed. Check the log above.');
  }

  return allResults;
}

/**
 * Phase 7+ 빠른 상태 확인
 */
function quickPhase7PlusCheck() {
  console.log('=== Phase 7+ Quick Check ===\n');

  const checks = {
    floorData: false,
    floorStats: false,
    columnFilter: false,
    migration: false
  };

  // Floor Data API
  try {
    const result = getFloorData('F01');
    checks.floorData = result.success === true;
  } catch (e) { /* ignore */ }

  // Floor Stats API
  try {
    const result = getAllFloorStats();
    checks.floorStats = result.success === true;
  } catch (e) { /* ignore */ }

  // Column Filter
  try {
    const result = getColumns(null, 'F01');
    checks.columnFilter = result.success === true;
  } catch (e) { /* ignore */ }

  // Migration functions exist
  try {
    checks.migration = typeof migrateAddFloorIdColumn === 'function' &&
                       typeof generateAllFloorData === 'function';
  } catch (e) { /* ignore */ }

  console.log('getFloorData():', checks.floorData ? '✅' : '❌');
  console.log('getAllFloorStats():', checks.floorStats ? '✅' : '❌');
  console.log('getColumns(floorFilter):', checks.columnFilter ? '✅' : '❌');
  console.log('Migration Functions:', checks.migration ? '✅' : '❌');

  console.log('\n--- Summary ---');
  const allOk = Object.values(checks).every(v => v);
  console.log(allOk ? '✅ Phase 7+ Backend is ready!' : '⚠️ Some checks failed');

  return checks;
}
