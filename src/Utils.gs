/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - 유틸리티 모듈
 * ============================================================
 *
 * 파일: Utils.gs
 * 목적: 공통 유틸리티 함수
 * 버전: 1.0.0
 * 작성일: 2025-12-29
 *
 * 주요 기능:
 *   - 날짜/문자열 포맷팅
 *   - 디버그/에러 로깅
 *   - 데이터 검증 헬퍼
 */

// ============================================================
// 날짜 유틸리티
// ============================================================

/**
 * 날짜 포맷팅 (한국 시간)
 * @param {Date} date - 날짜 객체
 * @returns {string} 포맷된 문자열 (yyyy-MM-dd HH:mm:ss)
 */
function formatDate_(date) {
  if (!date) return '';

  try {
    return Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  } catch (e) {
    return date.toString();
  }
}

/**
 * 날짜 포맷팅 (간략)
 * @param {Date} date - 날짜 객체
 * @returns {string} 포맷된 문자열 (yyyy-MM-dd)
 */
function formatDateShort_(date) {
  if (!date) return '';

  try {
    return Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd');
  } catch (e) {
    return date.toString();
  }
}

/**
 * 상대 시간 표시 (N일 전, N시간 전)
 * @param {Date} date - 날짜 객체
 * @returns {string} 상대 시간 문자열
 */
function formatRelativeTime_(date) {
  if (!date) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}일 전`;
  if (diffHour > 0) return `${diffHour}시간 전`;
  if (diffMin > 0) return `${diffMin}분 전`;
  return '방금 전';
}

// ============================================================
// 문자열 유틸리티
// ============================================================

/**
 * 문자열 자르기 (최대 길이 제한)
 * @param {string} str - 원본 문자열
 * @param {number} maxLength - 최대 길이
 * @returns {string} 잘린 문자열
 */
function truncateString_(str, maxLength) {
  if (!str) return '';

  maxLength = maxLength || 100;

  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength) + '...';
}

/**
 * HTML 태그 제거
 * @param {string} html - HTML 문자열
 * @returns {string} 텍스트만 추출
 */
function stripHtml_(html) {
  if (!html) return '';

  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * 이메일에서 이름 추출
 * @param {string} emailString - "이름 <email@domain.com>" 형식
 * @returns {string} 이름 또는 이메일
 */
function extractNameFromEmail_(emailString) {
  if (!emailString) return '';

  // "이름 <email@domain.com>" 패턴
  const match = emailString.match(/^(.+?)\s*<.+>$/);
  if (match) {
    return match[1].trim().replace(/"/g, '');
  }

  // 이메일만 있는 경우
  return emailString.split('@')[0];
}

/**
 * 이메일 주소만 추출
 * @param {string} emailString - "이름 <email@domain.com>" 형식
 * @returns {string} 이메일 주소
 */
function extractEmail_(emailString) {
  if (!emailString) return '';

  // <email@domain.com> 패턴
  const match = emailString.match(/<(.+@.+)>/);
  if (match) {
    return match[1].toLowerCase();
  }

  // 이메일만 있는 경우
  if (emailString.includes('@')) {
    return emailString.toLowerCase().trim();
  }

  return '';
}

// ============================================================
// 로깅 유틸리티
// ============================================================

/**
 * 디버그 로그 (DEBUG_MODE일 때만 출력)
 * @param {string} message - 로그 메시지
 */
function debugLog_(message) {
  if (isDebugMode_()) {
    Logger.log(`[DEBUG] ${message}`);
  }
}

/**
 * 에러 로그 (항상 출력)
 * @param {string} message - 에러 메시지
 * @param {Error} error - 에러 객체 (선택)
 */
function errorLog_(message, error) {
  Logger.log(`[ERROR] ${message}`);

  if (error) {
    Logger.log(`  Message: ${error.message}`);
    if (error.stack) {
      Logger.log(`  Stack: ${error.stack}`);
    }
  }
}

/**
 * 정보 로그
 * @param {string} message - 로그 메시지
 */
function infoLog_(message) {
  Logger.log(`[INFO] ${message}`);
}

/**
 * 경고 로그
 * @param {string} message - 경고 메시지
 */
function warnLog_(message) {
  Logger.log(`[WARN] ${message}`);
}

// ============================================================
// 데이터 검증 유틸리티
// ============================================================

/**
 * 값이 비어있는지 확인
 * @param {*} value - 검사할 값
 * @returns {boolean} 비어있으면 true
 */
function isEmpty_(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * 유효한 이메일 형식인지 확인
 * @param {string} email - 이메일 주소
 * @returns {boolean} 유효하면 true
 */
function isValidEmail_(email) {
  if (!email) return false;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * 유효한 날짜인지 확인
 * @param {*} date - 날짜 값
 * @returns {boolean} 유효하면 true
 */
function isValidDate_(date) {
  if (!date) return false;

  const d = new Date(date);
  return !isNaN(d.getTime());
}

// ============================================================
// 배열/객체 유틸리티
// ============================================================

/**
 * 배열 중복 제거
 * @param {Array} array - 원본 배열
 * @returns {Array} 중복 제거된 배열
 */
function uniqueArray_(array) {
  if (!array) return [];
  return [...new Set(array)];
}

/**
 * 배열을 청크로 분할
 * @param {Array} array - 원본 배열
 * @param {number} chunkSize - 청크 크기
 * @returns {Array[]} 분할된 배열들
 */
function chunkArray_(array, chunkSize) {
  if (!array || array.length === 0) return [];

  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 객체 깊은 복사
 * @param {Object} obj - 원본 객체
 * @returns {Object} 복사된 객체
 */
function deepClone_(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================
// 성능 유틸리티
// ============================================================

/**
 * 실행 시간 측정 래퍼
 * @param {string} label - 작업 레이블
 * @param {Function} fn - 실행할 함수
 * @returns {*} 함수 실행 결과
 */
function measureTime_(label, fn) {
  const start = Date.now();
  const result = fn();
  const elapsed = Date.now() - start;

  debugLog_(`[${label}] 실행 시간: ${elapsed}ms`);

  return result;
}

/**
 * 재시도 래퍼 (지수 백오프)
 * @param {Function} fn - 실행할 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} baseDelay - 기본 대기 시간 (ms)
 * @returns {*} 함수 실행 결과
 */
function withRetry_(fn, maxRetries, baseDelay) {
  maxRetries = maxRetries || 3;
  baseDelay = baseDelay || 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (e) {
      if (attempt === maxRetries) {
        throw e;
      }

      const delay = Math.pow(2, attempt - 1) * baseDelay;
      debugLog_(`재시도 ${attempt}/${maxRetries} - ${delay}ms 후 재시도`);
      Utilities.sleep(delay);
    }
  }
}

// ============================================================
// ID 생성 유틸리티
// ============================================================

/**
 * 고유 ID 생성
 * @returns {string} UUID 형식 ID
 */
function generateUUID_() {
  return Utilities.getUuid();
}

/**
 * 짧은 ID 생성 (8자리)
 * @returns {string} 짧은 ID
 */
function generateShortId_() {
  return Utilities.getUuid().substring(0, 8);
}

// ============================================================
// 테스트 함수
// ============================================================

/**
 * 유틸리티 함수 테스트
 */
function testUtils() {
  Logger.log('=== 유틸리티 함수 테스트 ===\n');

  // 날짜 포맷팅
  Logger.log('[날짜 포맷팅]');
  const now = new Date();
  Logger.log(`  formatDate_: ${formatDate_(now)}`);
  Logger.log(`  formatDateShort_: ${formatDateShort_(now)}`);
  Logger.log(`  formatRelativeTime_: ${formatRelativeTime_(new Date(now - 3600000))}`);

  // 문자열
  Logger.log('\n[문자열 처리]');
  Logger.log(`  truncateString_: ${truncateString_('이것은 긴 문자열입니다.', 10)}`);
  Logger.log(`  extractNameFromEmail_: ${extractNameFromEmail_('홍길동 <hong@samoo.com>')}`);
  Logger.log(`  extractEmail_: ${extractEmail_('홍길동 <hong@samoo.com>')}`);

  // 검증
  Logger.log('\n[데이터 검증]');
  Logger.log(`  isEmpty_(null): ${isEmpty_(null)}`);
  Logger.log(`  isEmpty_(''): ${isEmpty_('')}`);
  Logger.log(`  isValidEmail_('test@test.com'): ${isValidEmail_('test@test.com')}`);

  // 배열
  Logger.log('\n[배열 처리]');
  Logger.log(`  uniqueArray_: ${uniqueArray_([1, 2, 2, 3, 3, 3])}`);
  Logger.log(`  chunkArray_ (3): ${JSON.stringify(chunkArray_([1,2,3,4,5,6,7], 3))}`);

  // ID
  Logger.log('\n[ID 생성]');
  Logger.log(`  generateUUID_: ${generateUUID_()}`);
  Logger.log(`  generateShortId_: ${generateShortId_()}`);

  Logger.log('\n=== 테스트 완료 ===');
}
