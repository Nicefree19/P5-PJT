/**
 * P5 프로젝트 실제 환경 테스트 스크립트
 * Google Apps Script에서 실행하여 실제 API 연동 확인
 */

function productionHealthCheck() {
  console.log('=== P5 실제 환경 상태 확인 ===\n');
  
  const results = {
    config: false,
    gmail: false,
    gemini: false,
    sheet: false,
    analysis: false
  };
  
  const startTime = Date.now();
  
  try {
    // 1. 설정 검증
    console.log('[1/5] 설정 검증...');
    const validation = validateConfig_();
    results.config = validation.valid;
    
    if (validation.valid) {
      console.log('✅ 설정 검증 통과');
    } else {
      console.log('❌ 설정 검증 실패:');
      validation.errors.forEach(err => console.log(`  - ${err}`));
      return results;
    }
    
    // 2. Gmail 연결 테스트
    console.log('\n[2/5] Gmail 연결 테스트...');
    const query = buildFullQuery_();
    console.log(`검색 쿼리: ${query}`);
    
    const threads = GmailApp.search(query, 0, 5);
    results.gmail = true;
    console.log(`✅ Gmail 연결 성공: ${threads.length}개 스레드 발견`);
    
    if (threads.length === 0) {
      console.log('⚠️ 검색 결과 없음 - 키워드나 날짜 범위 확인 필요');
    }
    
    // 3. Gemini API 테스트
    console.log('\n[3/5] Gemini API 테스트...');
    const testPrompt = '안녕하세요. 간단한 테스트입니다. "API 연결 성공"이라고만 응답해주세요.';
    
    try {
      const response = callGeminiWithRetry_(testPrompt, 2);
      if (response) {
        const text = extractResponseText_(response);
        results.gemini = true;
        console.log(`✅ Gemini API 연결 성공`);
        console.log(`응답: ${text}`);
      } else {
        console.log('❌ Gemini API 응답 없음');
      }
    } catch (e) {
      console.log(`❌ Gemini API 오류: ${e.message}`);
    }
    
    // 4. Sheet 연결 및 쓰기 테스트
    console.log('\n[4/5] Sheet 연결 테스트...');
    try {
      const sheet = getTargetSheet_();
      const lastRow = sheet.getLastRow();
      results.sheet = true;
      console.log(`✅ Sheet 연결 성공: ${sheet.getName()} (${lastRow}행)`);
      
      // 테스트 데이터 쓰기
      const testData = [
        999999, // NO
        '테스트', // 상태
        'Low', // 긴급도
        '시스템테스트', // 발생원
        '기타', // 공법구분
        'test_' + Date.now(), // 메일ID
        'test@system.com', // 발신자
        new Date(), // 수신일시
        '[테스트] 시스템 연결 확인', // 제목
        '시스템 연결 테스트입니다.', // 본문요약
        '자동 테스트로 생성된 데이터', // AI분석
        '테스트 완료 후 삭제 예정', // 추천조치
        'test, system', // 키워드
        0, // 첨부파일수
        'test_thread', // 스레드ID
        '', // 참조인
        'test', // 라벨
        false, // 중요표시
        false, // 읽음여부
        'System', // 처리담당
        '', // 처리기한
        '테스트', // 처리상태
        '자동 테스트 데이터', // 메모
        '삭제 예정', // 비고
        '{"test": true}', // RawJSON
        new Date() // 등록일시
      ];
      
      sheet.appendRow(testData);
      console.log('✅ 테스트 데이터 쓰기 성공');
      
    } catch (e) {
      console.log(`❌ Sheet 오류: ${e.message}`);
    }
    
    // 5. 실제 메일 분석 테스트 (있는 경우)
    console.log('\n[5/5] 실제 메일 분석 테스트...');
    if (threads.length > 0 && results.gemini) {
      try {
        const messages = extractMessagesFromThreads_(threads.slice(0, 1));
        if (messages.length > 0) {
          const email = messages[0];
          console.log(`분석 대상: ${email.subject}`);
          
          const analysis = analyzeEmail_(email);
          results.analysis = true;
          
          console.log('✅ 실제 메일 분석 성공');
          console.log(`  발생원: ${analysis.발생원}`);
          console.log(`  긴급도: ${analysis.긴급도}`);
          console.log(`  공법구분: ${analysis.공법구분}`);
          console.log(`  요약: ${analysis.본문요약.substring(0, 50)}...`);
        }
      } catch (e) {
        console.log(`❌ 메일 분석 오류: ${e.message}`);
      }
    } else {
      console.log('⚠️ 메일 분석 스킵 (메일 없음 또는 Gemini API 실패)');
    }
    
  } catch (e) {
    console.log(`❌ 전체 테스트 오류: ${e.message}`);
  }
  
  // 결과 요약
  const elapsed = Date.now() - startTime;
  console.log('\n=== 테스트 결과 요약 ===');
  console.log(`실행 시간: ${elapsed}ms`);
  
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;
  
  console.log(`통과: ${passed}/${total}`);
  Object.entries(results).forEach(([key, value]) => {
    console.log(`  ${key}: ${value ? '✅' : '❌'}`);
  });
  
  if (passed === total) {
    console.log('\n🎉 모든 테스트 통과! 시스템 운영 준비 완료');
  } else {
    console.log('\n⚠️ 일부 테스트 실패 - 설정 확인 필요');
  }
  
  return results;
}

function cleanupTestData() {
  console.log('=== 테스트 데이터 정리 ===\n');
  
  try {
    const sheet = getTargetSheet_();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      console.log('정리할 데이터 없음');
      return;
    }
    
    // NO 컬럼이 999999인 테스트 데이터 찾기
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const rowsToDelete = [];
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === 999999) {
        rowsToDelete.push(i + 2); // 1-based index + header row
      }
    }
    
    // 역순으로 삭제 (인덱스 변경 방지)
    rowsToDelete.reverse().forEach(rowIndex => {
      sheet.deleteRow(rowIndex);
    });
    
    console.log(`✅ ${rowsToDelete.length}개 테스트 데이터 삭제 완료`);
    
  } catch (e) {
    console.log(`❌ 정리 오류: ${e.message}`);
  }
}

function performanceTest() {
  console.log('=== 성능 테스트 ===\n');
  
  const results = {
    gmailSearch: 0,
    messageExtraction: 0,
    geminiAnalysis: 0,
    sheetWrite: 0
  };
  
  try {
    // Gmail 검색 성능
    console.log('[1/4] Gmail 검색 성능...');
    const start1 = Date.now();
    const threads = GmailApp.search(buildFullQuery_(), 0, 10);
    results.gmailSearch = Date.now() - start1;
    console.log(`✅ Gmail 검색: ${results.gmailSearch}ms (${threads.length}개 스레드)`);
    
    if (threads.length > 0) {
      // 메시지 추출 성능
      console.log('\n[2/4] 메시지 추출 성능...');
      const start2 = Date.now();
      const messages = extractMessagesFromThreads_(threads.slice(0, 3));
      results.messageExtraction = Date.now() - start2;
      console.log(`✅ 메시지 추출: ${results.messageExtraction}ms (${messages.length}개 메시지)`);
      
      if (messages.length > 0) {
        // Gemini 분석 성능
        console.log('\n[3/4] Gemini 분석 성능...');
        const start3 = Date.now();
        const analysis = analyzeEmail_(messages[0]);
        results.geminiAnalysis = Date.now() - start3;
        console.log(`✅ Gemini 분석: ${results.geminiAnalysis}ms`);
        
        // Sheet 쓰기 성능
        console.log('\n[4/4] Sheet 쓰기 성능...');
        const start4 = Date.now();
        const rowData = transformToRow_(messages[0], analysis, 999998);
        const sheet = getTargetSheet_();
        sheet.appendRow(rowData);
        results.sheetWrite = Date.now() - start4;
        console.log(`✅ Sheet 쓰기: ${results.sheetWrite}ms`);
      }
    }
    
    // 성능 평가
    console.log('\n=== 성능 평가 ===');
    const total = Object.values(results).reduce((a, b) => a + b, 0);
    console.log(`전체 처리 시간: ${total}ms`);
    
    Object.entries(results).forEach(([key, time]) => {
      const status = time < 5000 ? '✅ 양호' : time < 10000 ? '⚠️ 보통' : '❌ 느림';
      console.log(`  ${key}: ${time}ms ${status}`);
    });
    
    if (total < 15000) {
      console.log('\n🚀 성능 우수: 15초 이내 처리');
    } else if (total < 30000) {
      console.log('\n⚠️ 성능 보통: 30초 이내 처리');
    } else {
      console.log('\n❌ 성능 개선 필요: 30초 초과');
    }
    
  } catch (e) {
    console.log(`❌ 성능 테스트 오류: ${e.message}`);
  }
  
  return results;
}

function fullSystemTest() {
  console.log('=== 전체 시스템 테스트 ===\n');
  
  // 1. 상태 확인
  const healthResults = productionHealthCheck();
  
  // 2. 성능 테스트
  console.log('\n' + '='.repeat(50));
  const perfResults = performanceTest();
  
  // 3. 정리
  console.log('\n' + '='.repeat(50));
  cleanupTestData();
  
  // 최종 결과
  console.log('\n=== 최종 결과 ===');
  const healthPassed = Object.values(healthResults).filter(v => v).length;
  const healthTotal = Object.keys(healthResults).length;
  
  console.log(`기능 테스트: ${healthPassed}/${healthTotal} 통과`);
  console.log(`성능 테스트: 완료`);
  
  if (healthPassed === healthTotal) {
    console.log('\n🎉 시스템 운영 준비 완료!');
    console.log('다음 단계:');
    console.log('1. 정기 실행 트리거 설정');
    console.log('2. 모니터링 대시보드 구축');
    console.log('3. 사용자 교육 진행');
  } else {
    console.log('\n⚠️ 시스템 설정 완료 필요');
    console.log('실패한 항목을 확인하고 설정을 완료하세요.');
  }
  
  return {
    health: healthResults,
    performance: perfResults
  };
}