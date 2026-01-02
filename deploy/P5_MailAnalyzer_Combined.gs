// ============================================================
// P5 복합동 메일 분석 시스템 - 통합 배포 파일
// ============================================================
// 생성일: 2025-12-30 13:30:05
// 
// 이 파일은 배포 편의를 위해 자동 생성되었습니다.
// 개별 파일 수정 시 다시 deploy.py를 실행하세요.
// ============================================================


// ============================================================
// FILE: Config.gs
// ============================================================

/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - 설정 관리
 * ============================================================
 *
 * 파일: Config.gs
 * 목적: 전역 설정 상수 및 환경 변수 관리
 * 버전: 1.0.0
 * 작성일: 2025-12-29
 *
 * 사용법:
 *   1. Script Properties에 GEMINI_API_KEY, SHEET_ID 설정
 *   2. CONFIG 객체로 모든 설정값 접근
 */

// ============================================================
// 전역 설정 객체
// ============================================================

const CONFIG = {
  // ----------------------------------------------------------
  // 시스템 기본 설정
  // ----------------------------------------------------------
  VERSION: '1.0.0',
  SYSTEM_NAME: 'P5 복합동 메일 분석 시스템',

  // ----------------------------------------------------------
  // Gemini API 설정
  // ----------------------------------------------------------
  GEMINI_MODEL: 'gemini-2.0-flash',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/',
  GEMINI_TEMPERATURE: 0.2,        // 낮은 창의성, 높은 일관성
  GEMINI_MAX_TOKENS: 2048,        // 최대 출력 토큰

  // ----------------------------------------------------------
  // Gmail 검색 설정
  // ----------------------------------------------------------
  DATE_RANGE_DAYS: 14,            // 검색 기간 (일)
  MAX_BATCH_SIZE: 50,             // 배치당 최대 처리 건수

  // ----------------------------------------------------------
  // API 재시도 설정
  // ----------------------------------------------------------
  RETRY_COUNT: 3,                 // 최대 재시도 횟수
  RETRY_DELAY_MS: 1000,           // 기본 재시도 대기 (ms)
  TIMEOUT_MS: 30000,              // API 타임아웃 (ms)

  // ----------------------------------------------------------
  // Google Sheet 설정
  // ----------------------------------------------------------
  SHEET_NAME: 'P5_메일_분석_DB',   // 메인 데이터 시트
  LOG_SHEET_NAME: '실행로그',       // 실행 로그 시트
  TEST_SHEET_NAME: '테스트',       // 테스트용 시트
  COLUMNS: 26,                    // 총 컬럼 수

  // ----------------------------------------------------------
  // 키워드 화이트리스트 (메일 필터링용)
  // ----------------------------------------------------------
  KEYWORDS: [
    '복합동',
    'P5',
    'P56',
    'PSRC',
    'HMB',
    'PC',
    '접합',
    'Shop',
    '하중',
    '골조',
    '변단면',
    '설계변경',
    'Shop Drawing',
    '접합부',
    '간섭'
  ],

  // ----------------------------------------------------------
  // 참여자 도메인/이메일 화이트리스트
  // ----------------------------------------------------------
  PARTICIPANTS: [
    // 삼성E&A (시공/PM)
    '@samsung.com',

    // 삼우종합건축 (원설계)
    '@samoo.com',

    // 이앤디몰 (PC설계) - 특정 계정
    'vickysong1@naver.com',
    'dhkim2630@naver.com',

    // 센구조 (전환설계)
    '@senkuzo.com',
    '@senvex.net'
  ],

  // ----------------------------------------------------------
  // 발생원 매핑 규칙
  // ----------------------------------------------------------
  ORIGIN_MAPPING: {
    '@samoo.com': '삼우(원설계)',
    '@samsung.com': 'ENA(시공/PM)',
    'vickysong1@naver.com': '이앤디몰(PC설계)',
    'dhkim2630@naver.com': '이앤디몰(PC설계)',
    '@senkuzo.com': '센코어(전환설계)',
    '@senvex.net': '센코어(전환설계)'
  },

  // ----------------------------------------------------------
  // 긴급도 레벨 정의
  // ----------------------------------------------------------
  URGENCY_LEVELS: {
    SHOWSTOPPER: 'Showstopper',
    CRITICAL: 'Critical',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low'
  },

  // ----------------------------------------------------------
  // 공법 구분 카테고리
  // ----------------------------------------------------------
  METHOD_CATEGORIES: [
    'PSRC-PC접합',
    'PSRC-Steel접합',
    'HMB-PC접합',
    '변단면 이슈',
    '하중 검토',
    '접합부 간섭',
    '기타'
  ],

  // ----------------------------------------------------------
  // 상태 값 정의
  // ----------------------------------------------------------
  STATUS: {
    UNPROCESSED: '미처리',
    IN_PROGRESS: '진행중',
    COMPLETED: '완료'
  },

  PROCESS_STATUS: {
    PENDING: '검토대기',
    REVIEWING: '검토중',
    DONE: '조치완료',
    HOLD: '보류'
  },

  // ----------------------------------------------------------
  // 26개 컬럼 헤더 정의
  // ----------------------------------------------------------
  COLUMN_HEADERS: [
    'NO',           // 1: 자동 증가 번호
    '상태',          // 2: 미처리/진행중/완료
    '긴급도',        // 3: Critical/High/Medium/Low
    '발생원',        // 4: 삼우/ENA/이앤디몰/센코어
    '공법구분',      // 5: PSRC-PC접합 등
    '메일ID',        // 6: Gmail Message ID
    '발신자',        // 7: From 주소
    '수신일시',      // 8: 메일 수신 시각
    '제목',          // 9: 메일 제목
    '본문요약',      // 10: AI 생성 요약
    'AI분석',        // 11: 공법적 분석
    '추천조치',      // 12: AI 제안 조치
    '키워드',        // 13: 추출된 키워드
    '첨부파일수',    // 14: 첨부 파일 개수
    '스레드ID',      // 15: Gmail Thread ID
    '참조인',        // 16: CC 리스트
    '라벨',          // 17: Gmail 라벨
    '중요표시',      // 18: 별표 여부
    '읽음여부',      // 19: 읽음 상태
    '처리담당',      // 20: 담당자 이름
    '처리기한',      // 21: 목표 완료일
    '처리상태',      // 22: 세부 상태
    '메모',          // 23: 수동 메모
    '비고',          // 24: 기타 정보
    'RawJSON',       // 25: 원본 AI 응답
    '등록일시'       // 26: 시스템 등록 시각
  ]
};

// ============================================================
// 환경 변수 접근 함수
// ============================================================

/**
 * Gemini API 키 조회
 * @returns {string} API 키
 */
function getGeminiApiKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. Script Properties를 확인하세요.');
  }
  return key;
}

/**
 * Google Sheet ID 조회
 * @returns {string} Sheet ID
 */
function getSheetId_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) {
    throw new Error('SHEET_ID가 설정되지 않았습니다. Script Properties를 확인하세요.');
  }
  return id;
}

/**
 * 디버그 모드 확인
 * @returns {boolean} 디버그 모드 여부
 */
function isDebugMode_() {
  const mode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE');
  return mode === 'true';
}

// ============================================================
// 설정 검증 함수
// ============================================================

/**
 * 전체 설정 유효성 검증
 * @returns {Object} 검증 결과 {valid: boolean, errors: string[]}
 */
function validateConfig_() {
  const errors = [];

  // 필수 환경 변수 검증
  try {
    getGeminiApiKey_();
  } catch (e) {
    errors.push(e.message);
  }

  try {
    getSheetId_();
  } catch (e) {
    errors.push(e.message);
  }

  // 키워드 검증
  if (!CONFIG.KEYWORDS || CONFIG.KEYWORDS.length === 0) {
    errors.push('키워드 목록이 비어있습니다.');
  }

  // 참여자 검증
  if (!CONFIG.PARTICIPANTS || CONFIG.PARTICIPANTS.length === 0) {
    errors.push('참여자 목록이 비어있습니다.');
  }

  // 컬럼 헤더 검증
  if (CONFIG.COLUMN_HEADERS.length !== CONFIG.COLUMNS) {
    errors.push(`컬럼 헤더 수 불일치: 예상 ${CONFIG.COLUMNS}, 실제 ${CONFIG.COLUMN_HEADERS.length}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 설정 출력 (디버깅용)
 */
function printConfig() {
  Logger.log('=== P5 메일 분석 시스템 설정 ===');
  Logger.log(`버전: ${CONFIG.VERSION}`);
  Logger.log(`Gemini 모델: ${CONFIG.GEMINI_MODEL}`);
  Logger.log(`검색 기간: ${CONFIG.DATE_RANGE_DAYS}일`);
  Logger.log(`배치 크기: ${CONFIG.MAX_BATCH_SIZE}건`);
  Logger.log(`키워드 수: ${CONFIG.KEYWORDS.length}개`);
  Logger.log(`참여자 수: ${CONFIG.PARTICIPANTS.length}개`);
  Logger.log(`컬럼 수: ${CONFIG.COLUMNS}개`);
  Logger.log(`디버그 모드: ${isDebugMode_()}`);

  const validation = validateConfig_();
  if (validation.valid) {
    Logger.log('✅ 설정 검증 통과');
  } else {
    Logger.log('❌ 설정 검증 실패:');
    validation.errors.forEach(err => Logger.log(`  - ${err}`));
  }
}

// ============================================================
// Script Properties 초기화 헬퍼
// ============================================================

/**
 * Script Properties 초기 설정 (최초 1회 실행)
 * 주의: 실제 값으로 교체 후 실행하세요!
 */
function initializeScriptProperties() {
  const props = PropertiesService.getScriptProperties();

  // 주의: 아래 값들을 실제 값으로 교체하세요!
  props.setProperties({
    'GEMINI_API_KEY': 'YOUR_GEMINI_API_KEY_HERE',
    'SHEET_ID': 'YOUR_GOOGLE_SHEET_ID_HERE',
    'DEBUG_MODE': 'true'
  });

  Logger.log('✅ Script Properties 초기화 완료');
  Logger.log('⚠️ 실제 API 키와 Sheet ID로 교체하세요!');
}


// ============================================================
// FILE: Utils.gs
// ============================================================

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


// ============================================================
// FILE: GeminiAnalyzer.gs
// ============================================================

/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - Gemini AI 분석 모듈
 * ============================================================
 *
 * 파일: GeminiAnalyzer.gs
 * 목적: Gemini 1.5 Flash API 연동 및 메일 분석
 * 버전: 1.0.0
 * 작성일: 2025-12-29
 *
 * 주요 기능:
 *   - Gemini API 호출 (JSON 응답)
 *   - PSRC/HMB 공법 전문가 페르소나 프롬프트
 *   - 응답 파싱 및 검증
 */

// ============================================================
// 페르소나 프롬프트
// ============================================================

const PERSONA_PROMPT = `
# 역할 설정
당신은 **PSRC(프리캐스트 철근 콘크리트 기둥)** 및 **HMB(하프 슬래브 보)** 공법의
총괄 엔지니어이자, 대형 반도체 FAB 프로젝트 구조 설계를 검토하는 전문가입니다.

# 분석 목표
다음 메일을 분석하여:
1. 공법적 리스크를 식별
2. 접합부 간섭 이슈를 추출
3. 설계 변경 사항을 파악
4. 이해관계자 간 책임 경계를 명확히

# 발생원 추론 규칙
| 이메일 패턴 | 발생원 |
|------------|--------|
| @samoo.com | 삼우(원설계) |
| @samsung.com | ENA(시공/PM) |
| vickysong1@naver.com | 이앤디몰(PC설계) |
| dhkim2630@naver.com | 이앤디몰(PC설계) |
| @senkuzo.com | 센코어(전환설계) |
| @senvex.net | 센코어(전환설계) |

# 긴급도 평가 기준
| 조건 | 긴급도 |
|------|--------|
| Shop Drawing 제작 완료 후 변경 요청 | **Showstopper** |
| 0.75fpu 인장 강도 오류 발견 | **Showstopper** |
| 변단면 상세 설계 오류 | **Critical** |
| 접합부 간섭 우려 | **High** |
| 설계 문의/질의 | **Medium** |
| 일반 행정 연락 | **Low** |

# 공법 구분 카테고리
- PSRC-PC접합
- PSRC-Steel접합
- HMB-PC접합
- 변단면 이슈
- 하중 검토
- 접합부 간섭
- 기타

# 출력 형식 (JSON)
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드 블록 없이 순수 JSON만 출력:
{
  "발생원": "삼우(원설계)",
  "공법구분": "PSRC-PC접합",
  "긴급도": "Critical",
  "본문요약": "메일 내용을 2-3문장으로 요약",
  "AI분석": "공법적 관점에서 분석한 내용",
  "추천조치": "권장 후속 조치 사항",
  "키워드": ["PSRC", "접합부", "Shop Drawing"]
}
`;

// ============================================================
// Gemini API 호출
// ============================================================

/**
 * Gemini API 호출 (기본)
 * @param {string} prompt - 프롬프트 텍스트
 * @returns {Object} API 응답 객체
 * @private
 */
function callGeminiAPI_(prompt) {
  const apiKey = getGeminiApiKey_();
  const url = `${CONFIG.GEMINI_ENDPOINT}${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: CONFIG.GEMINI_TEMPERATURE,
      maxOutputTokens: CONFIG.GEMINI_MAX_TOKENS,
      responseMimeType: 'application/json'
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    throw new Error(`Gemini API 오류 (${responseCode}): ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText());
}

/**
 * Gemini API 호출 (재시도 로직 포함)
 * @param {string} prompt - 프롬프트 텍스트
 * @param {number} maxRetries - 최대 재시도 횟수
 * @returns {Object|null} API 응답 또는 null
 * @private
 */
function callGeminiWithRetry_(prompt, maxRetries) {
  maxRetries = maxRetries || CONFIG.RETRY_COUNT;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      debugLog_(`Gemini API 호출 시도 ${attempt}/${maxRetries}`);

      const response = callGeminiAPI_(prompt);

      // 유효한 응답 확인
      if (response.candidates && response.candidates.length > 0) {
        return response;
      }

      debugLog_('응답에 candidates 없음');

    } catch (e) {
      errorLog_(`API 호출 실패 (시도 ${attempt}/${maxRetries})`, e);

      if (attempt < maxRetries) {
        // 지수 백오프 대기
        const delay = Math.pow(2, attempt) * CONFIG.RETRY_DELAY_MS;
        debugLog_(`${delay}ms 후 재시도...`);
        Utilities.sleep(delay);
      }
    }
  }

  return null;
}

/**
 * API 응답에서 텍스트 추출
 * @param {Object} response - API 응답 객체
 * @returns {string|null} 응답 텍스트 또는 null
 * @private
 */
function extractResponseText_(response) {
  try {
    return response.candidates[0].content.parts[0].text;
  } catch (e) {
    errorLog_('응답 텍스트 추출 실패', e);
    return null;
  }
}

// ============================================================
// 프롬프트 빌더
// ============================================================

/**
 * 메일 분석용 프롬프트 생성
 * @param {Object} emailData - 메일 데이터 객체
 * @returns {string} 완성된 프롬프트
 * @private
 */
function buildAnalysisPrompt_(emailData) {
  return `${PERSONA_PROMPT}

---
## 분석 대상 메일

**발신자**: ${emailData.from}
**수신자**: ${emailData.to || '(없음)'}
**참조**: ${emailData.cc || '없음'}
**일시**: ${formatDate_(emailData.date)}
**제목**: ${emailData.subject}

**본문**:
${emailData.body}
`;
}

// ============================================================
// JSON 응답 파싱
// ============================================================

/**
 * JSON 응답 정제 (코드 블록 제거)
 * @param {string} text - 원본 응답 텍스트
 * @returns {string} 정제된 JSON 문자열
 * @private
 */
function cleanJsonResponse_(text) {
  if (!text) return '';

  let cleaned = text;

  // ```json ... ``` 패턴 제거
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // ``` 만 있는 경우
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  return cleaned.trim();
}

/**
 * 분석 응답 파싱 및 검증
 * @param {string} responseText - API 응답 텍스트
 * @returns {Object|null} 파싱된 분석 결과 또는 null
 * @private
 */
function parseAnalysisResponse_(responseText) {
  const cleaned = cleanJsonResponse_(responseText);

  try {
    const parsed = JSON.parse(cleaned);

    // 필수 필드 검증
    const requiredFields = ['발생원', '공법구분', '긴급도', '본문요약', 'AI분석', '추천조치', '키워드'];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`필수 필드 누락: ${field}`);
      }
    }

    // 키워드 배열 검증
    if (!Array.isArray(parsed.키워드)) {
      parsed.키워드 = [];
    }

    // 긴급도 검증
    const validUrgencies = Object.values(CONFIG.URGENCY_LEVELS);
    if (!validUrgencies.includes(parsed.긴급도)) {
      debugLog_(`알 수 없는 긴급도: ${parsed.긴급도}, Medium으로 대체`);
      parsed.긴급도 = 'Medium';
    }

    return parsed;

  } catch (e) {
    errorLog_('JSON 파싱 오류', e);
    debugLog_(`원본 응답: ${responseText}`);
    return null;
  }
}

/**
 * 파싱 실패 시 기본값 반환
 * @param {Object} emailData - 메일 데이터 객체
 * @returns {Object} 기본 분석 결과
 * @private
 */
function getDefaultAnalysis_(emailData) {
  return {
    발생원: inferOrigin_(emailData.from) || '미분류',
    공법구분: '기타',
    긴급도: 'Medium',
    본문요약: emailData.subject || '(분석 실패)',
    AI분석: 'AI 분석 실패 - 수동 검토 필요',
    추천조치: '담당자 수동 확인 필요',
    키워드: []
  };
}

// ============================================================
// 통합 분석 함수
// ============================================================

/**
 * 메일 1건 분석
 * @param {Object} emailData - 메일 데이터 객체
 * @returns {Object} 분석 결과
 * @private
 */
function analyzeEmail_(emailData) {
  debugLog_(`메일 분석 시작: ${emailData.subject}`);

  const prompt = buildAnalysisPrompt_(emailData);
  const response = callGeminiWithRetry_(prompt);

  if (!response) {
    debugLog_('API 응답 없음 - 기본값 사용');
    return getDefaultAnalysis_(emailData);
  }

  const text = extractResponseText_(response);

  if (!text) {
    debugLog_('응답 텍스트 없음 - 기본값 사용');
    return getDefaultAnalysis_(emailData);
  }

  const analysis = parseAnalysisResponse_(text);

  if (!analysis) {
    debugLog_('JSON 파싱 실패 - 기본값 사용');
    return getDefaultAnalysis_(emailData);
  }

  debugLog_(`분석 완료: 긴급도=${analysis.긴급도}, 발생원=${analysis.발생원}`);
  return analysis;
}

/**
 * 다건 메일 배치 분석
 * @param {Object[]} emails - 메일 데이터 배열
 * @returns {Object[]} 분석 결과 배열 [{email, analysis}, ...]
 * @private
 */
function analyzeEmails_(emails) {
  const results = [];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    Logger.log(`[${i + 1}/${emails.length}] 분석 중: ${truncateString_(email.subject, 40)}`);

    try {
      const analysis = analyzeEmail_(email);

      results.push({
        email: email,
        analysis: analysis
      });

    } catch (e) {
      errorLog_(`메일 분석 실패: ${email.id}`, e);

      results.push({
        email: email,
        analysis: getDefaultAnalysis_(email)
      });
    }

    // API Rate Limit 대응 (1초 대기)
    if (i < emails.length - 1) {
      Utilities.sleep(1000);
    }
  }

  return results;
}

// ============================================================
// 테스트 함수
// ============================================================

/**
 * Gemini API 연결 테스트
 */
function testGeminiConnection() {
  Logger.log('=== Gemini API 연결 테스트 ===\n');

  try {
    const testPrompt = '안녕하세요. 테스트입니다. "OK"라고만 응답하세요.';

    const response = callGeminiAPI_(testPrompt);
    const text = extractResponseText_(response);

    Logger.log(`✅ API 연결 성공`);
    Logger.log(`응답: ${text}`);

  } catch (e) {
    Logger.log(`❌ API 연결 실패: ${e.message}`);
  }
}

/**
 * JSON 파싱 테스트
 */
function testJsonParsing() {
  Logger.log('=== JSON 파싱 테스트 ===\n');

  // 정상 케이스
  const validJson = `{
    "발생원": "삼우(원설계)",
    "공법구분": "PSRC-PC접합",
    "긴급도": "High",
    "본문요약": "테스트 요약",
    "AI분석": "테스트 분석",
    "추천조치": "테스트 조치",
    "키워드": ["PSRC", "테스트"]
  }`;

  const result1 = parseAnalysisResponse_(validJson);
  Logger.log(`[정상 JSON] ${result1 ? '✅ 파싱 성공' : '❌ 파싱 실패'}`);

  // 코드 블록 포함 케이스
  const withCodeBlock = '```json\n' + validJson + '\n```';
  const result2 = parseAnalysisResponse_(withCodeBlock);
  Logger.log(`[코드 블록 포함] ${result2 ? '✅ 파싱 성공' : '❌ 파싱 실패'}`);

  // 필드 누락 케이스
  const missingField = '{"발생원": "삼우"}';
  const result3 = parseAnalysisResponse_(missingField);
  Logger.log(`[필드 누락] ${result3 ? '❌ 파싱 성공 (예상: 실패)' : '✅ 파싱 실패 (예상대로)'}`);
}

/**
 * 샘플 메일 분석 테스트
 */
function testAnalyzeEmail() {
  Logger.log('=== 샘플 메일 분석 테스트 ===\n');

  const sampleEmail = {
    id: 'test_001',
    threadId: 'thread_001',
    from: 'engineer@samoo.com',
    to: 'pm@samsung.com',
    cc: 'designer@senkuzo.com',
    subject: '[P5 복합동] PSRC 기둥-PC보 접합부 간섭 검토 요청',
    body: `
    안녕하세요, 삼우종합건축 구조팀입니다.

    P5 복합동 X23~X30열 구간의 PSRC 기둥과 PC보 접합부에서
    철근 간섭이 우려되어 검토 요청드립니다.

    현재 상황:
    - 기둥 주근 D32 8EA 배치
    - 보 주근 D25 6EA 배치
    - 접합부 내 철근 밀집으로 콘크리트 타설 우려

    검토 요청사항:
    1. 접합부 철근 간섭 해소 방안
    2. Shop Drawing 수정 필요 여부
    3. 대안 상세 검토

    회신 부탁드립니다.
    감사합니다.
    `,
    date: new Date(),
    attachments: 2,
    isStarred: false,
    isUnread: true,
    labels: ''
  };

  const analysis = analyzeEmail_(sampleEmail);

  Logger.log('[분석 결과]');
  Logger.log(`  발생원: ${analysis.발생원}`);
  Logger.log(`  공법구분: ${analysis.공법구분}`);
  Logger.log(`  긴급도: ${analysis.긴급도}`);
  Logger.log(`  본문요약: ${analysis.본문요약}`);
  Logger.log(`  AI분석: ${analysis.AI분석}`);
  Logger.log(`  추천조치: ${analysis.추천조치}`);
  Logger.log(`  키워드: ${analysis.키워드.join(', ')}`);
}


// ============================================================
// FILE: GmailFilter.gs
// ============================================================

/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - Gmail 필터링 모듈
 * ============================================================
 *
 * 파일: GmailFilter.gs
 * 목적: Gmail 검색, 메시지 추출, 중복 방지
 * 버전: 1.0.0
 * 작성일: 2025-12-29
 *
 * 주요 기능:
 *   - 키워드 + 참여자 기반 복합 검색 쿼리 생성
 *   - Gmail 스레드/메시지 파싱
 *   - 기존 처리 메일 중복 방지
 */

// ============================================================
// 검색 쿼리 빌더
// ============================================================

/**
 * 키워드 쿼리 생성
 * @returns {string} OR로 연결된 키워드 쿼리
 * @private
 */
function buildKeywordQuery_() {
  if (!CONFIG.KEYWORDS || CONFIG.KEYWORDS.length === 0) {
    return '';
  }
  return CONFIG.KEYWORDS.map(k => `"${k}"`).join(' OR ');
}

/**
 * 참여자 쿼리 생성 (발신자 + 수신자)
 * @returns {string} OR로 연결된 참여자 쿼리
 * @private
 */
function buildParticipantQuery_() {
  if (!CONFIG.PARTICIPANTS || CONFIG.PARTICIPANTS.length === 0) {
    return '';
  }

  const queries = CONFIG.PARTICIPANTS.map(p => {
    // 도메인인 경우 (@ 포함)
    if (p.startsWith('@')) {
      return `(from:${p} OR to:${p} OR cc:${p})`;
    }
    // 전체 이메일 주소인 경우
    return `(from:${p} OR to:${p} OR cc:${p})`;
  });

  return queries.join(' OR ');
}

/**
 * 날짜 범위 쿼리 생성
 * @returns {string} 날짜 범위 쿼리
 * @private
 */
function buildDateQuery_() {
  return `newer_than:${CONFIG.DATE_RANGE_DAYS}d`;
}

/**
 * 최종 복합 쿼리 조합
 * 구조: (키워드) AND (참여자) AND 날짜범위
 * @returns {string} 완성된 Gmail 검색 쿼리
 * @private
 */
function buildFullQuery_() {
  const keywords = buildKeywordQuery_();
  const participants = buildParticipantQuery_();
  const dateRange = buildDateQuery_();

  // 쿼리 조합
  const parts = [];

  if (keywords) {
    parts.push(`(${keywords})`);
  }

  if (participants) {
    parts.push(`(${participants})`);
  }

  parts.push(dateRange);

  return parts.join(' AND ');
}

// ============================================================
// Gmail 스레드 검색
// ============================================================

/**
 * Gmail 스레드 검색 (안전 버전)
 * @returns {GmailThread[]} 검색된 스레드 배열
 * @private
 */
function filterGmailThreads_() {
  const query = buildFullQuery_();

  debugLog_(`Gmail 검색 쿼리: ${query}`);

  try {
    const threads = GmailApp.search(query, 0, CONFIG.MAX_BATCH_SIZE);
    debugLog_(`검색 결과: ${threads.length}개 스레드`);
    return threads;
  } catch (e) {
    errorLog_('Gmail 검색 오류', e);
    return [];
  }
}

/**
 * Gmail 검색 (쿼리 직접 지정)
 * @param {string} customQuery - 커스텀 검색 쿼리
 * @param {number} maxResults - 최대 결과 수
 * @returns {GmailThread[]} 검색된 스레드 배열
 */
function searchGmailWithQuery(customQuery, maxResults) {
  maxResults = maxResults || CONFIG.MAX_BATCH_SIZE;

  try {
    return GmailApp.search(customQuery, 0, maxResults);
  } catch (e) {
    errorLog_('Gmail 검색 오류', e);
    return [];
  }
}

// ============================================================
// 메시지 추출 및 파싱
// ============================================================

/**
 * 스레드에서 메시지 추출
 * @param {GmailThread[]} threads - Gmail 스레드 배열
 * @returns {Object[]} 파싱된 메시지 객체 배열
 * @private
 */
function extractMessagesFromThreads_(threads) {
  const messages = [];

  threads.forEach(thread => {
    try {
      const threadMessages = thread.getMessages();
      const labels = thread.getLabels().map(l => l.getName()).join(', ');

      threadMessages.forEach(msg => {
        const messageData = {
          // 기본 식별자
          id: msg.getId(),
          threadId: thread.getId(),

          // 발신/수신 정보
          from: msg.getFrom(),
          to: msg.getTo() || '',
          cc: msg.getCc() || '',

          // 메일 내용
          subject: msg.getSubject() || '(제목 없음)',
          body: sanitizeEmailBody_(msg.getPlainBody() || ''),

          // 메타 정보
          date: msg.getDate(),
          attachments: msg.getAttachments().length,
          isStarred: msg.isStarred(),
          isUnread: msg.isUnread(),
          labels: labels
        };

        messages.push(messageData);
      });
    } catch (e) {
      errorLog_(`스레드 파싱 오류 (${thread.getId()})`, e);
    }
  });

  // 최신순 정렬
  messages.sort((a, b) => b.date - a.date);

  return messages;
}

/**
 * 메일 본문 정제 (서명, 인용 제거)
 * @param {string} body - 원본 본문
 * @returns {string} 정제된 본문
 * @private
 */
function sanitizeEmailBody_(body) {
  if (!body) return '';

  let cleaned = body;

  // 서명 패턴 제거 (-- 이후)
  cleaned = cleaned.replace(/--\s*\n[\s\S]*$/m, '');

  // 인용 메시지 제거 (> 시작 라인)
  cleaned = cleaned.replace(/^>.*$/gm, '');

  // 이전 메시지 헤더 제거
  cleaned = cleaned.replace(/On .+ wrote:[\s\S]*$/gm, '');
  cleaned = cleaned.replace(/-----Original Message-----[\s\S]*$/gm, '');
  cleaned = cleaned.replace(/보낸 사람:.*보낸 날짜:[\s\S]*$/gm, '');

  // 연속 공백/줄바꿈 정리
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // 최대 길이 제한 (Gemini 토큰 효율)
  const maxLength = 3000;
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '\n...(본문 생략)';
  }

  return cleaned.trim();
}

// ============================================================
// 중복 방지 메커니즘
// ============================================================

/**
 * 기존 처리된 메일ID 목록 조회
 * @returns {Set<string>} 기존 메일ID Set
 * @private
 */
function getExistingMessageIds_() {
  try {
    const sheet = SpreadsheetApp.openById(getSheetId_())
                               .getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      debugLog_('메인 시트 없음 - 빈 Set 반환');
      return new Set();
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      // 헤더만 있는 경우
      return new Set();
    }

    // 메일ID 컬럼 (6번째 = 인덱스 5)
    const idColumnIndex = CONFIG.COLUMN_HEADERS.indexOf('메일ID') + 1;
    const data = sheet.getRange(2, idColumnIndex, lastRow - 1, 1).getValues();

    const ids = new Set();
    data.forEach(row => {
      if (row[0]) {
        ids.add(row[0].toString());
      }
    });

    debugLog_(`기존 메일ID 로드: ${ids.size}개`);
    return ids;

  } catch (e) {
    errorLog_('기존 메일ID 조회 오류', e);
    return new Set();
  }
}

/**
 * 중복 메일 필터링
 * @param {Object[]} messages - 메시지 배열
 * @returns {Object[]} 중복 제외된 메시지 배열
 * @private
 */
function filterDuplicates_(messages) {
  const existingIds = getExistingMessageIds_();

  const filtered = messages.filter(msg => !existingIds.has(msg.id));

  const skipped = messages.length - filtered.length;
  if (skipped > 0) {
    debugLog_(`중복 스킵: ${skipped}건`);
  }

  return filtered;
}

// ============================================================
// 발생원 추론
// ============================================================

/**
 * 발신자 이메일로 발생원 추론
 * @param {string} fromEmail - 발신자 이메일 주소
 * @returns {string} 발생원 이름
 */
function inferOrigin_(fromEmail) {
  if (!fromEmail) return '미분류';

  const email = fromEmail.toLowerCase();

  // 정확한 이메일 매칭 우선
  for (const [pattern, origin] of Object.entries(CONFIG.ORIGIN_MAPPING)) {
    if (pattern.startsWith('@')) {
      // 도메인 매칭
      if (email.includes(pattern)) {
        return origin;
      }
    } else {
      // 전체 이메일 매칭
      if (email.includes(pattern.toLowerCase())) {
        return origin;
      }
    }
  }

  return '미분류';
}

// ============================================================
// 테스트 함수
// ============================================================

/**
 * 검색 쿼리 테스트
 */
function testBuildQuery() {
  Logger.log('=== Gmail 쿼리 빌더 테스트 ===\n');

  Logger.log('[키워드 쿼리]');
  Logger.log(buildKeywordQuery_());

  Logger.log('\n[참여자 쿼리]');
  Logger.log(buildParticipantQuery_());

  Logger.log('\n[날짜 범위 쿼리]');
  Logger.log(buildDateQuery_());

  Logger.log('\n[최종 복합 쿼리]');
  Logger.log(buildFullQuery_());
}

/**
 * Gmail 검색 테스트
 */
function testGmailSearch() {
  Logger.log('=== Gmail 검색 테스트 ===\n');

  const threads = filterGmailThreads_();
  Logger.log(`검색 결과: ${threads.length}개 스레드`);

  if (threads.length > 0) {
    Logger.log('\n[상위 5개 스레드]');
    threads.slice(0, 5).forEach((thread, idx) => {
      const firstMsg = thread.getMessages()[0];
      Logger.log(`${idx + 1}. ${firstMsg.getSubject()}`);
      Logger.log(`   From: ${firstMsg.getFrom()}`);
      Logger.log(`   Date: ${firstMsg.getDate()}`);
    });
  }
}

/**
 * 메시지 추출 테스트
 */
function testExtractMessages() {
  Logger.log('=== 메시지 추출 테스트 ===\n');

  const threads = filterGmailThreads_();
  if (threads.length === 0) {
    Logger.log('검색 결과 없음');
    return;
  }

  const messages = extractMessagesFromThreads_(threads.slice(0, 3));
  Logger.log(`추출된 메시지: ${messages.length}개`);

  if (messages.length > 0) {
    const sample = messages[0];
    Logger.log('\n[샘플 메시지]');
    Logger.log(`ID: ${sample.id}`);
    Logger.log(`제목: ${sample.subject}`);
    Logger.log(`발신: ${sample.from}`);
    Logger.log(`발생원: ${inferOrigin_(sample.from)}`);
    Logger.log(`본문 (100자): ${sample.body.substring(0, 100)}...`);
    Logger.log(`첨부파일: ${sample.attachments}개`);
  }
}


// ============================================================
// FILE: SheetWriter.gs
// ============================================================

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


// ============================================================
// FILE: Code.gs
// ============================================================

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

    // 6. 실행 완료
    stats.executionTimeMs = Date.now() - startTime;
    logExecution_(stats);

    Logger.log(`\n=== 완료 (${stats.executionTimeMs}ms) ===`);
    Logger.log(`요약: 검색 ${stats.totalSearched} → 신규 ${stats.newEmails} → 저장 ${stats.successfulWrites}`);

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


// ============================================================
// FILE: Tests.gs
// ============================================================

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
