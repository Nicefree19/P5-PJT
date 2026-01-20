/**
 * P5 프로젝트 빠른 검증 스크립트
 * Google Apps Script에서 실행하여 기본 기능 확인
 */

function quickHealthCheck() {
  console.log('=== P5 시스템 빠른 상태 확인 ===\n');
  
  const results = {
    config: false,
    utils: false,
    gmail: false,
    sheet: false,
    gemini: false
  };
  
  // 1. Config 검증
  try {
    const validation = validateConfig_();
    results.config = validation.valid;
    console.log(`✅ Config 검증: ${validation.valid ? '통과' : '실패'}`);
    if (!validation.valid) {
      console.log(`   오류: ${validation.errors.join(', ')}`);
    }
  } catch (e) {
    console.log(`❌ Config 오류: ${e.message}`);
  }
  
  // 2. Utils 함수 테스트
  try {
    const testDate = formatDate_(new Date());
    const testString = truncateString_('테스트 문자열입니다', 5);
    results.utils = testDate && testString;
    console.log(`✅ Utils 함수: ${results.utils ? '정상' : '오류'}`);
  } catch (e) {
    console.log(`❌ Utils 오류: ${e.message}`);
  }
  
  // 3. Gmail 접근 테스트
  try {
    const threads = GmailApp.search('is:unread', 0, 1);
    results.gmail = true;
    console.log(`✅ Gmail 접근: 정상 (${threads.length}개 스레드 확인)`);
  } catch (e) {
    console.log(`❌ Gmail 접근 오류: ${e.message}`);
  }
  
  // 4. Sheet 접근 테스트
  try {
    const sheetId = getSheetId_();
    const ss = SpreadsheetApp.openById(sheetId);
    results.sheet = !!ss;
    console.log(`✅ Sheet 접근: 정상 (${ss.getName()})`);
  } catch (e) {
    console.log(`❌ Sheet 접근 오류: ${e.message}`);
  }
  
  // 5. Gemini API 테스트 (간단한 ping)
  try {
    const apiKey = getGeminiApiKey_();
    const endpoint = `${CONFIG.GEMINI_ENDPOINT}${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;
    
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 10 }
      }),
      muteHttpExceptions: true
    });
    
    results.gemini = response.getResponseCode() === 200;
    console.log(`✅ Gemini API: ${results.gemini ? '정상' : '오류'} (${response.getResponseCode()})`);
  } catch (e) {
    console.log(`❌ Gemini API 오류: ${e.message}`);
  }
  
  // 결과 요약
  console.log('\n=== 상태 요약 ===');
  const allOk = Object.values(results).every(v => v);
  console.log(`전체 상태: ${allOk ? '✅ 정상' : '⚠️ 일부 문제'}`);
  
  Object.entries(results).forEach(([key, value]) => {
    console.log(`  ${key}: ${value ? '✅' : '❌'}`);
  });
  
  return results;
}

function testBasicFunctions() {
  console.log('=== 기본 함수 테스트 ===\n');
  
  // Gmail 쿼리 빌더 테스트
  try {
    console.log('[Gmail 쿼리 빌더]');
    const query = buildFullQuery_();
    console.log(`✅ 쿼리 생성 성공: ${query.substring(0, 100)}...`);
  } catch (e) {
    console.log(`❌ 쿼리 생성 실패: ${e.message}`);
  }
  
  // 데이터 변환 테스트
  try {
    console.log('\n[데이터 변환]');
    const mockEmail = {
      id: 'test_123',
      threadId: 'thread_123',
      from: 'test@samoo.com',
      to: 'receiver@samsung.com',
      subject: '테스트 메일',
      body: '테스트 본문',
      date: new Date(),
      attachments: 0,
      isStarred: false,
      isUnread: true,
      labels: ''
    };
    
    const mockAnalysis = {
      발생원: '삼우(원설계)',
      공법구분: 'PSRC-PC접합',
      긴급도: 'High',
      본문요약: '테스트 요약',
      AI분석: '테스트 분석',
      추천조치: '테스트 조치',
      키워드: ['PSRC', '테스트']
    };
    
    const rowData = transformToRow_(mockEmail, mockAnalysis, 1);
    console.log(`✅ 행 변환 성공: ${rowData.length}개 컬럼`);
    
    validateRowData_(rowData);
    console.log(`✅ 데이터 검증 통과`);
  } catch (e) {
    console.log(`❌ 데이터 변환 실패: ${e.message}`);
  }
  
  console.log('\n=== 기본 함수 테스트 완료 ===');
}

function initializeSystem() {
  console.log('=== 시스템 초기화 ===\n');
  
  try {
    // Sheet 헤더 생성
    console.log('[1/2] Sheet 헤더 생성...');
    createSheetHeaders();
    console.log('✅ Sheet 헤더 생성 완료');
    
    // 설정 출력
    console.log('\n[2/2] 설정 확인...');
    printConfig();
    console.log('✅ 설정 확인 완료');
    
    console.log('\n✅ 시스템 초기화 완료!');
    console.log('\n다음 단계:');
    console.log('1. quickHealthCheck() 실행');
    console.log('2. testBasicFunctions() 실행');
    console.log('3. 실제 메일 분석 테스트');
    
  } catch (e) {
    console.log(`❌ 초기화 실패: ${e.message}`);
    console.log(e.stack);
  }
}