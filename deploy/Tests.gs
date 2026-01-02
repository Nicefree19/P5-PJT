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

  // Check API key exists
  try {
    const key = CONFIG.GEMINI_API_KEY;
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
  }

  // Check Sheet ID exists
  try {
    const sheetId = CONFIG.SHEET_ID;
    if (sheetId && sheetId !== 'YOUR_SHEET_ID_HERE') {
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

    // Check date range
    if (query.includes('after:')) {
      results.passed++;
      console.log('✅ Date range filter included');
    } else {
      results.failed++;
      results.errors.push('Date range filter missing');
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

  // Skip if API key not configured
  if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    console.log('⚠️ Skipping - API key not configured');
    return { passed: 0, failed: 0, skipped: true };
  }

  try {
    // Simple API test
    const testPrompt = '테스트입니다. "OK"라고만 응답하세요.';
    const endpoint = CONFIG.GEMINI_ENDPOINT + CONFIG.GEMINI_MODEL + ':generateContent?key=' + CONFIG.GEMINI_API_KEY;

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

  // Skip if Sheet ID not configured
  if (!CONFIG.SHEET_ID || CONFIG.SHEET_ID === 'YOUR_SHEET_ID_HERE') {
    console.log('⚠️ Skipping - Sheet ID not configured');
    return { passed: 0, failed: 0, skipped: true };
  }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

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

  // Skip if API key not configured
  if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
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

          if (CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
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

  // Config check
  if (CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    checks.config = true;
    console.log('✅ Configuration: OK');
  } else {
    console.log('❌ Configuration: API key not set');
  }

  // Gemini check
  if (checks.config) {
    try {
      const endpoint = CONFIG.GEMINI_ENDPOINT + CONFIG.GEMINI_MODEL + ':generateContent?key=' + CONFIG.GEMINI_API_KEY;
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

  // Sheet check
  if (CONFIG.SHEET_ID && CONFIG.SHEET_ID !== 'YOUR_SHEET_ID_HERE') {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      checks.sheet = !!ss;
      console.log(checks.sheet ? '✅ Google Sheet: OK' : '❌ Google Sheet: Failed');
    } catch (e) {
      console.log('❌ Google Sheet: Error - ' + e.message);
    }
  } else {
    console.log('❌ Google Sheet: ID not set');
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
