/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - 설정 관리
 * ============================================================
 *
 * 파일: Config.gs
 * 목적: 전역 설정 상수 및 환경 변수 관리
 * 버전: 2.4.0
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
  VERSION: "2.4.0",
  SYSTEM_NAME: "P5 복합동 메일 분석 시스템",

  // ----------------------------------------------------------
  // Gemini API 설정
  // ----------------------------------------------------------
  GEMINI_MODEL: "gemini-2.0-flash",
  GEMINI_ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models/",
  GEMINI_TEMPERATURE: 0.2, // 낮은 창의성, 높은 일관성
  GEMINI_MAX_TOKENS: 2048, // 최대 출력 토큰

  // ----------------------------------------------------------
  // Gmail 검색 설정
  // ----------------------------------------------------------
  DATE_RANGE_DAYS: 14, // 검색 기간 (일)
  MAX_BATCH_SIZE: 50, // 배치당 최대 처리 건수
  MAX_TOTAL_THREADS: 500, // 전체 최대 스레드 수 (pagination 상한)
  PAGINATION_SIZE: 50, // pagination당 조회 건수

  // ----------------------------------------------------------
  // 동시성 제어 설정
  // ----------------------------------------------------------
  LOCK_TIMEOUT_MS: 60000, // LockService 타임아웃 (1분)
  LOCK_WAIT_MS: 5000, // Lock 획득 대기 시간 (5초)

  // ----------------------------------------------------------
  // API 재시도 및 레이트리밋 설정
  // ----------------------------------------------------------
  RETRY_COUNT: 3, // 최대 재시도 횟수
  RETRY_DELAY_MS: 1000, // 기본 재시도 대기 (ms)
  TIMEOUT_MS: 30000, // API 타임아웃 (ms)
  RATE_LIMIT_DELAY_MS: 1000, // Gemini API 호출 간 대기 (레이트리밋 완충)

  // ----------------------------------------------------------
  // Dashboard 연동 설정
  // ----------------------------------------------------------
  DASHBOARD_SYNC_ENABLED: true, // 분석 결과 → Dashboard 자동 동기화
  DASHBOARD_AUTO_CREATE_ISSUES: true, // Critical/High 긴급도 이슈 자동 생성

  // ----------------------------------------------------------
  // Google Sheet 설정
  // ----------------------------------------------------------
  SHEET_NAME: "P5_메일_분석_DB", // 메인 데이터 시트
  LOG_SHEET_NAME: "실행로그", // 실행 로그 시트
  TEST_SHEET_NAME: "테스트", // 테스트용 시트
  COLUMNS: 26, // 총 컬럼 수

  // ----------------------------------------------------------
  // 키워드 화이트리스트 (메일 필터링용)
  // ----------------------------------------------------------
  KEYWORDS: [
    "복합동",
    "P5",
    "P56",
    "PSRC",
    "HMB",
    "PC",
    "접합",
    "Shop",
    "하중",
    "골조",
    "변단면",
    "설계변경",
    "Shop Drawing",
    "접합부",
    "간섭",
  ],

  // ----------------------------------------------------------
  // 참여자 도메인/이메일 화이트리스트
  // ----------------------------------------------------------
  PARTICIPANTS: [
    // 삼성E&A (시공/PM)
    "@samsung.com",

    // 삼우종합건축 (원설계)
    "@samoo.com",

    // 이앤디몰 (PC설계) - 특정 계정
    "vickysong1@naver.com",
    "dhkim2630@naver.com",

    // 센구조 (전환설계)
    "@senkuzo.com",
    "@senvex.net",
  ],

  // ----------------------------------------------------------
  // 발생원 매핑 규칙
  // ----------------------------------------------------------
  ORIGIN_MAPPING: {
    "@samoo.com": "삼우(원설계)",
    "@samsung.com": "ENA(시공/PM)",
    "vickysong1@naver.com": "이앤디몰(PC설계)",
    "dhkim2630@naver.com": "이앤디몰(PC설계)",
    "@senkuzo.com": "센코어(전환설계)",
    "@senvex.net": "센코어(전환설계)",
  },

  // ----------------------------------------------------------
  // 긴급도 레벨 정의
  // ----------------------------------------------------------
  URGENCY_LEVELS: {
    SHOWSTOPPER: "Showstopper",
    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  },

  // ----------------------------------------------------------
  // Urgency → Severity 매핑 (AI 분석 → Dashboard 통합용)
  // ----------------------------------------------------------
  URGENCY_TO_SEVERITY: {
    Showstopper: "critical",
    Critical: "critical",
    High: "high",
    Medium: "medium",
    Low: "low",
  },

  // ----------------------------------------------------------
  // 공법 구분 카테고리
  // ----------------------------------------------------------
  METHOD_CATEGORIES: [
    "PSRC-PC접합",
    "PSRC-Steel접합",
    "HMB-PC접합",
    "변단면 이슈",
    "하중 검토",
    "접합부 간섭",
    "기타",
  ],

  // ----------------------------------------------------------
  // 상태 값 정의
  // ----------------------------------------------------------
  STATUS: {
    UNPROCESSED: "미처리",
    IN_PROGRESS: "진행중",
    COMPLETED: "완료",
  },

  PROCESS_STATUS: {
    PENDING: "검토대기",
    REVIEWING: "검토중",
    DONE: "조치완료",
    HOLD: "보류",
  },

  // ----------------------------------------------------------
  // 26개 컬럼 헤더 정의
  // ----------------------------------------------------------
  COLUMN_HEADERS: [
    "NO", // 1: 자동 증가 번호
    "상태", // 2: 미처리/진행중/완료
    "긴급도", // 3: Critical/High/Medium/Low
    "발생원", // 4: 삼우/ENA/이앤디몰/센코어
    "공법구분", // 5: PSRC-PC접합 등
    "메일ID", // 6: Gmail Message ID
    "발신자", // 7: From 주소
    "수신일시", // 8: 메일 수신 시각
    "제목", // 9: 메일 제목
    "본문요약", // 10: AI 생성 요약
    "AI분석", // 11: 공법적 분석
    "추천조치", // 12: AI 제안 조치
    "키워드", // 13: 추출된 키워드
    "첨부파일수", // 14: 첨부 파일 개수
    "스레드ID", // 15: Gmail Thread ID
    "참조인", // 16: CC 리스트
    "라벨", // 17: Gmail 라벨
    "중요표시", // 18: 별표 여부
    "읽음여부", // 19: 읽음 상태
    "처리담당", // 20: 담당자 이름
    "처리기한", // 21: 목표 완료일
    "처리상태", // 22: 세부 상태
    "메모", // 23: 수동 메모
    "비고", // 24: 기타 정보
    "RawJSON", // 25: 원본 AI 응답
    "등록일시", // 26: 시스템 등록 시각
  ],
};

// ============================================================
// 환경 변수 접근 함수
// ============================================================

/**
 * Gemini API 키 조회
 * @returns {string} API 키
 */
function getGeminiApiKey_() {
  const key =
    PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. Script Properties를 확인하세요."
    );
  }
  return key;
}

/**
 * Google Sheet ID 조회
 * @returns {string} Sheet ID
 */
function getSheetId_() {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) {
    throw new Error(
      "SHEET_ID가 설정되지 않았습니다. Script Properties를 확인하세요."
    );
  }
  return id;
}

/**
 * 디버그 모드 확인
 * @returns {boolean} 디버그 모드 여부
 */
function isDebugMode_() {
  const mode =
    PropertiesService.getScriptProperties().getProperty("DEBUG_MODE");
  return mode === "true";
}

// ============================================================
// 데이터 변환 헬퍼 함수
// ============================================================

/**
 * AI 분석 Urgency를 Dashboard Severity로 변환
 * @param {string} urgency - AI 분석에서 반환된 긴급도 값
 * @returns {string} Dashboard severity 값 (critical, high, medium, low)
 */
function convertUrgencyToSeverity_(urgency) {
  if (!urgency || typeof urgency !== "string") {
    return "medium"; // 기본값
  }

  const normalized = urgency.trim();
  const severity = CONFIG.URGENCY_TO_SEVERITY[normalized];

  if (severity) {
    return severity;
  }

  // 알 수 없는 입력에 대한 fuzzy matching
  const lowerUrgency = normalized.toLowerCase();
  if (lowerUrgency.includes("showstopper") || lowerUrgency.includes("긴급")) {
    return "critical";
  }
  if (lowerUrgency.includes("critical") || lowerUrgency.includes("심각")) {
    return "critical";
  }
  if (lowerUrgency.includes("high") || lowerUrgency.includes("높음")) {
    return "high";
  }
  if (lowerUrgency.includes("low") || lowerUrgency.includes("낮음")) {
    return "low";
  }

  // 기본값: medium
  return "medium";
}

/**
 * 공법구분을 Issue Type으로 변환
 * @param {string} method - AI 분석에서 반환된 공법구분 값
 * @returns {string} Dashboard issue type (tc, design, schedule, safety, quality, other)
 */
function mapMethodToIssueType_(method) {
  if (!method || typeof method !== "string") {
    return "other";
  }

  const lowerMethod = method.toLowerCase();

  // T/C (타워크레인) 관련
  // H-1 Fix: master_config.json의 issueTypes.code 'tc'와 일치
  if (
    lowerMethod.includes("t/c") ||
    lowerMethod.includes("타워크레인") ||
    lowerMethod.includes("tower") ||
    lowerMethod.includes("crane")
  ) {
    return "tc";
  }

  // 설계 관련
  if (
    lowerMethod.includes("설계") ||
    lowerMethod.includes("design") ||
    lowerMethod.includes("psrc") ||
    lowerMethod.includes("hmb") ||
    lowerMethod.includes("접합") ||
    lowerMethod.includes("변단면")
  ) {
    return "design";
  }

  // 일정 관련
  if (
    lowerMethod.includes("일정") ||
    lowerMethod.includes("schedule") ||
    lowerMethod.includes("반입") ||
    lowerMethod.includes("delivery")
  ) {
    return "schedule";
  }

  // 안전 관련
  if (
    lowerMethod.includes("안전") ||
    lowerMethod.includes("safety") ||
    lowerMethod.includes("중지") ||
    lowerMethod.includes("stop")
  ) {
    return "safety";
  }

  // 품질 관련
  if (
    lowerMethod.includes("품질") ||
    lowerMethod.includes("quality") ||
    lowerMethod.includes("검수") ||
    lowerMethod.includes("inspection")
  ) {
    return "quality";
  }

  return "other";
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
    errors.push("키워드 목록이 비어있습니다.");
  }

  // 참여자 검증
  if (!CONFIG.PARTICIPANTS || CONFIG.PARTICIPANTS.length === 0) {
    errors.push("참여자 목록이 비어있습니다.");
  }

  // 컬럼 헤더 검증
  if (CONFIG.COLUMN_HEADERS.length !== CONFIG.COLUMNS) {
    errors.push(
      `컬럼 헤더 수 불일치: 예상 ${CONFIG.COLUMNS}, 실제 ${CONFIG.COLUMN_HEADERS.length}`
    );
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

/**
 * 설정 출력 (디버깅용)
 */
function printConfig() {
  Logger.log("=== P5 메일 분석 시스템 설정 ===");
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
    Logger.log("✅ 설정 검증 통과");
  } else {
    Logger.log("❌ 설정 검증 실패:");
    validation.errors.forEach((err) => Logger.log(`  - ${err}`));
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
    GEMINI_API_KEY: "YOUR_GEMINI_API_KEY_HERE",
    SHEET_ID: "YOUR_GOOGLE_SHEET_ID_HERE",
    DEBUG_MODE: "true",
  });

  Logger.log("✅ Script Properties 초기화 완료");
  Logger.log("⚠️ 실제 API 키와 Sheet ID로 교체하세요!");
}
