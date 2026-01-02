/**
 * P5 Dashboard - Apps Script Web API
 *
 * Google Sheet과 Frontend Dashboard를 연결하는 RESTful API
 *
 * Endpoints:
 * GET  ?action=getZones          - Zone 목록 조회
 * GET  ?action=getColumns        - 전체 기둥 데이터 조회
 * GET  ?action=getColumns&zone=zone_a  - Zone별 기둥 조회
 * GET  ?action=getColumns&floorId=F01  - 층별 기둥 조회 (Phase 7+)
 * GET  ?action=getIssues         - 이슈 목록 조회
 * GET  ?action=getFloors         - 층 목록 조회 (Phase 7)
 * GET  ?action=getJeolju         - 절주 목록 조회 (Phase 7)
 * GET  ?action=getFloorData&floorId=F01 - 특정 층 전체 데이터 (Phase 7)
 * GET  ?action=getFloorStats     - 전체 층 통계 (Phase 7+)
 * GET  ?action=getSlackSettings  - Slack 알림 설정 조회 (Phase 11)
 * GET  ?action=getEmailSettings  - Email 알림 설정 조회 (Phase 12)
 * POST ?action=updateColumn      - 기둥 상태 업데이트
 * POST ?action=bulkUpdate        - 다중 기둥 일괄 업데이트
 * POST ?action=createIssue       - 이슈 등록
 * POST ?action=resolveIssue      - 이슈 해결
 * POST ?action=triggerAnalysis   - 이메일 분석 트리거 (Phase 5)
 * POST ?action=saveSlackSettings - Slack 알림 설정 저장 (Phase 11)
 * POST ?action=testSlackNotification - Slack 테스트 알림 전송 (Phase 11)
 * POST ?action=saveEmailSettings - Email 알림 설정 저장 (Phase 12)
 * POST ?action=testEmailNotification - Email 테스트 알림 전송 (Phase 12)
 *
 * Migration Functions (Apps Script에서 직접 실행):
 * - migrateAddFloorIdColumn()    - 기존 데이터에 floorId 컬럼 추가
 * - generateAllFloorData()       - 11층 전체 데이터 생성
 * - initializeFloorJeoljuSheets() - Floors/Jeolju 시트 초기화
 *
 * @version 2.3 (Phase 12 Email Integration)
 * @author P5 Dashboard Team
 */

// ===== Configuration =====
const DASHBOARD_CONFIG = {
  SPREADSHEET_ID:
    PropertiesService.getScriptProperties().getProperty("DASHBOARD_SHEET_ID") ||
    "",
  SHEETS: {
    ZONES: "Zones",
    COLUMNS: "Columns",
    ISSUES: "Issues",
    HISTORY: "History",
    STATUS_CODES: "StatusCodes",
    // Phase 7: 층-절주 구조
    FLOORS: "Floors",
    JEOLJU: "Jeolju",
  },

  // ===== Security Settings (Phase 10) =====
  SECURITY: {
    // 허용된 도메인 목록 (쉼표로 구분된 문자열)
    ALLOWED_ORIGINS:
      PropertiesService.getScriptProperties().getProperty("ALLOWED_ORIGINS") ||
      "",

    // API 키 인증 활성화 여부
    REQUIRE_API_KEY:
      PropertiesService.getScriptProperties().getProperty("REQUIRE_API_KEY") ===
      "true",

    // Rate Limiting (분당 요청 수)
    RATE_LIMIT_PER_MINUTE: 60,

    // 디버그 모드 (프로덕션에서는 false)
    DEBUG_MODE:
      PropertiesService.getScriptProperties().getProperty("DEBUG_MODE") ===
      "true",
  },

  // 입력값 검증 패턴
  VALIDATION: {
    UID_PATTERN: /^[A-Za-z0-9\-_]+$/, // 영문숫자, 하이픈, 언더스코어만 허용
    ACTION_PATTERN: /^[a-zA-Z]+$/, // 영문만 허용
    MAX_INPUT_LENGTH: 500, // 최대 입력 길이
  },
};

// ===== Security Helpers (Phase 10) =====

/**
 * API 키 인증 검증
 * @param {Object} e - 이벤트 객체
 * @returns {boolean} 인증 성공 여부
 */
function validateApiKey_(e) {
  if (!DASHBOARD_CONFIG.SECURITY.REQUIRE_API_KEY) {
    return true; // 인증 비활성화 시 항상 통과
  }

  const storedKey =
    PropertiesService.getScriptProperties().getProperty("API_KEY");
  if (!storedKey) {
    console.warn("[Security] API_KEY not configured in Script Properties");
    return true; // 키 미설정 시 통과 (초기 설정 전)
  }

  // 헤더 또는 쿼리 파라미터에서 API 키 추출
  const providedKey =
    e.parameter?.apiKey ||
    e.parameter?.api_key ||
    (e.postData ? JSON.parse(e.postData.contents).apiKey : null);

  return providedKey === storedKey;
}

/**
 * Rate Limiting 검증 (CacheService 활용)
 * @param {string} clientId - 클라이언트 식별자 (IP 또는 세션)
 * @returns {Object} {allowed: boolean, remaining: number}
 */
function checkRateLimit_(clientId) {
  const cache = CacheService.getScriptCache();
  const key = `rate_limit_${clientId || "default"}`;
  const limit = DASHBOARD_CONFIG.SECURITY.RATE_LIMIT_PER_MINUTE;

  let count = parseInt(cache.get(key) || "0", 10);

  if (count >= limit) {
    return { allowed: false, remaining: 0, limit: limit };
  }

  cache.put(key, String(count + 1), 60); // 60초 TTL
  return { allowed: true, remaining: limit - count - 1, limit: limit };
}

/**
 * 입력값 Sanitization
 * @param {string} input - 입력값
 * @param {string} type - 검증 타입 (uid, action, text)
 * @returns {Object} {valid: boolean, sanitized: string, error: string}
 */
function sanitizeInput_(input, type = "text") {
  if (input === null || input === undefined) {
    return { valid: true, sanitized: "", error: null };
  }

  const strInput = String(input);

  // 길이 제한
  if (strInput.length > DASHBOARD_CONFIG.VALIDATION.MAX_INPUT_LENGTH) {
    return {
      valid: false,
      sanitized: strInput.substring(
        0,
        DASHBOARD_CONFIG.VALIDATION.MAX_INPUT_LENGTH
      ),
      error: "Input too long",
    };
  }

  // 타입별 검증
  switch (type) {
    case "uid":
      if (!DASHBOARD_CONFIG.VALIDATION.UID_PATTERN.test(strInput)) {
        return { valid: false, sanitized: "", error: "Invalid UID format" };
      }
      break;
    case "action":
      if (!DASHBOARD_CONFIG.VALIDATION.ACTION_PATTERN.test(strInput)) {
        return { valid: false, sanitized: "", error: "Invalid action format" };
      }
      break;
    case "text":
    default:
      // HTML 특수문자 이스케이프
      break;
  }

  // HTML 엔티티 이스케이프
  const escaped = strInput
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return { valid: true, sanitized: escaped, error: null };
}

/**
 * 보안 에러 응답 생성 (스택 트레이스 숨김)
 * @param {Error} error - 에러 객체
 * @param {string} context - 에러 컨텍스트
 * @returns {Object} 안전한 에러 응답
 */
function createSecureErrorResponse_(error, context) {
  const response = {
    success: false,
    error: error.message || "An error occurred",
    context: context,
  };

  // 디버그 모드에서만 스택 트레이스 포함
  if (DASHBOARD_CONFIG.SECURITY.DEBUG_MODE) {
    response.stack = error.stack;
    response.debugInfo = { timestamp: new Date().toISOString() };
  }

  return response;
}

// ===== Web App Entry Points =====

/**
 * HTTP GET 요청 처리 (보안 강화 버전 + GIS 인증)
 * @param {Object} e - 이벤트 객체
 * @returns {ContentService.TextOutput} JSON 응답
 */
function doGet(e) {
  let result;
  let currentUser = null;

  try {
    // ===== Security Checks (Phase 10 + GIS) =====

    // 1. 인증: API 키 또는 GIS ID Token
    const apiKeyValid = validateApiKey_(e);
    const idToken = e.parameter?.token || null;

    if (!apiKeyValid && !idToken) {
      // 인증 없음 - status 액션만 허용
      if (e.parameter?.action !== "status") {
        return createJsonResponse({
          success: false,
          error: "Authentication required",
          code: 401,
        });
      }
    }

    // GIS 토큰 검증 (토큰이 있는 경우)
    if (idToken && !apiKeyValid) {
      const tokenResult = validateIdToken_(idToken);
      if (!tokenResult.valid) {
        return createJsonResponse({
          success: false,
          error: tokenResult.error,
          code: tokenResult.code || 401,
        });
      }
      currentUser = tokenResult;
    }

    // 2. Rate Limiting
    const rateLimitResult = checkRateLimit_(
      e.parameter?.clientId || "anonymous"
    );
    if (!rateLimitResult.allowed) {
      return createJsonResponse({
        success: false,
        error: "Rate limit exceeded. Please try again later.",
        code: 429,
        retryAfter: 60,
      });
    }

    // 3. action 파라미터 검증
    const action = e.parameter.action || "status";
    const actionValidation = sanitizeInput_(action, "action");
    if (!actionValidation.valid) {
      return createJsonResponse({
        success: false,
        error: actionValidation.error,
        code: 400,
      });
    }

    // ===== Route Handling =====
    switch (action) {
      case "status":
        result = {
          success: true,
          message: "P5 Dashboard API v2.1 (Secure)",
          timestamp: getKSTTimestamp_(),
          rateLimit: {
            remaining: rateLimitResult.remaining,
            limit: rateLimitResult.limit,
          },
        };
        break;

      case "getZones":
        result = getZones();
        break;

      case "getColumns":
        const zoneFilter = e.parameter.zone || null;
        result = getColumns(zoneFilter);
        break;

      case "getIssues":
        const statusFilter = e.parameter.status || null;
        result = getIssues(statusFilter);
        break;

      case "getStatusCodes":
        result = getStatusCodes();
        break;

      case "getFullData":
        result = getFullDashboardData();
        break;

      // Phase 7: 층-절주 구조
      case "getFloors":
        result = getFloors();
        break;

      case "getJeolju":
        result = getJeolju();
        break;

      case "getFloorData":
        const floorId = e.parameter.floorId || "F01";
        // floorId 검증
        const floorValidation = sanitizeInput_(floorId, "uid");
        if (!floorValidation.valid) {
          return createJsonResponse({
            success: false,
            error: floorValidation.error,
            code: 400,
          });
        }
        result = getFloorData(floorId);
        break;

      case "getFloorStats":
        result = getAllFloorStats();
        break;

      // Slack Integration (Phase 11)
      case "getSlackSettings":
        result = getSlackSettings();
        break;

      // Email Integration (Phase 12)
      case "getEmailSettings":
        result = getEmailSettings();
        break;

      default:
        result = {
          success: false,
          error: `Unknown action: ${action}`,
          code: 404,
        };
    }
  } catch (error) {
    result = createSecureErrorResponse_(error, "doGet");
  }

  return createJsonResponse(result);
}

/**
 * HTTP POST 요청 처리 (보안 강화 버전 + GIS 인증)
 * @param {Object} e - 이벤트 객체
 * @returns {ContentService.TextOutput} JSON 응답
 */
function doPost(e) {
  let result;
  let currentUser = null;

  try {
    // ===== Security Checks (Phase 10 + GIS) =====

    // 1. 인증: API 키 또는 GIS ID Token (payload에서 추출)
    const apiKeyValid = validateApiKey_(e);
    let idToken = e.parameter?.token || null;

    // POST body에서도 토큰 확인
    if (!idToken && e.postData?.contents) {
      try {
        const tempPayload = JSON.parse(e.postData.contents);
        idToken = tempPayload.token || tempPayload.idToken || null;
      } catch {}
    }

    if (!apiKeyValid && !idToken) {
      return createJsonResponse({
        success: false,
        error: "Authentication required",
        code: 401,
      });
    }

    // GIS 토큰 검증
    if (idToken && !apiKeyValid) {
      const tokenResult = validateIdToken_(idToken);
      if (!tokenResult.valid) {
        return createJsonResponse({
          success: false,
          error: tokenResult.error,
          code: tokenResult.code || 401,
        });
      }
      currentUser = tokenResult;
    }

    // 2. Rate Limiting
    const rateLimitResult = checkRateLimit_(
      e.parameter?.clientId || "anonymous"
    );
    if (!rateLimitResult.allowed) {
      return createJsonResponse({
        success: false,
        error: "Rate limit exceeded. Please try again later.",
        code: 429,
        retryAfter: 60,
      });
    }

    // 3. Payload 파싱 및 검증
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createJsonResponse({
        success: false,
        error: "Invalid JSON payload",
        code: 400,
      });
    }

    const action = payload.action || "";

    // 4. action 검증
    const actionValidation = sanitizeInput_(action, "action");
    if (!actionValidation.valid && action !== "") {
      return createJsonResponse({
        success: false,
        error: actionValidation.error,
        code: 400,
      });
    }

    // 5. UID 파라미터 검증 (해당되는 경우)
    if (payload.uid) {
      const uidValidation = sanitizeInput_(payload.uid, "uid");
      if (!uidValidation.valid) {
        return createJsonResponse({
          success: false,
          error: "Invalid UID format: " + uidValidation.error,
          code: 400,
        });
      }
    }

    // ===== Route Handling =====
    switch (action) {
      case "updateColumn":
        result = updateColumn(payload.uid, payload.data, payload.user || "api");
        break;

      case "bulkUpdate":
        // uids 배열 검증
        if (payload.uids && Array.isArray(payload.uids)) {
          for (const uid of payload.uids) {
            const uidCheck = sanitizeInput_(uid, "uid");
            if (!uidCheck.valid) {
              return createJsonResponse({
                success: false,
                error: `Invalid UID in bulk update: ${uid}`,
                code: 400,
              });
            }
          }
        }
        result = bulkUpdateColumns(
          payload.uids,
          payload.data,
          payload.user || "api"
        );
        break;

      case "createIssue":
        result = createIssue(payload.issueData, payload.user || "api");
        break;

      case "resolveIssue":
        result = resolveIssue(
          payload.issueId,
          payload.resolution,
          payload.user || "api"
        );
        break;

      // Phase 6: 공정 단계 업데이트
      case "updateStage":
        result = updateColumnStage(
          payload.uid,
          payload.stageCode,
          payload.stageStatus,
          payload.user || "api"
        );
        break;

      case "bulkUpdateStages":
        result = bulkUpdateColumnStages(
          payload.uids,
          payload.stageCode,
          payload.stageStatus,
          payload.user || "api"
        );
        break;

      case "syncFromLocal":
        result = syncFromLocalData(payload.data, payload.user || "api");
        break;

      // Phase 5: 비동기 분석 트리거 API
      case "triggerAnalysis":
        result = triggerEmailAnalysis(payload.user || "dashboard");
        break;

      case "getAnalysisStatus":
        result = getAnalysisJobStatus();
        break;

      // Slack Integration (Phase 11)
      case "saveSlackSettings":
        result = saveSlackSettings(payload);
        break;

      case "testSlackNotification":
        result = sendSlackTestNotification();
        break;

      // Email Integration (Phase 12)
      case "saveEmailSettings":
        result = saveEmailSettings(payload);
        break;

      case "testEmailNotification":
        result = sendEmailTestNotification();
        break;

      default:
        result = {
          success: false,
          error: `Unknown action: ${action}`,
          code: 404,
        };
    }
  } catch (error) {
    result = createSecureErrorResponse_(error, "doPost");
  }

  return createJsonResponse(result);
}

// ===== CORS Response Helper =====

function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ===== GET Operations =====

/**
 * Zone 목록 조회
 */
function getZones() {
  const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.ZONES);
  if (!sheet) {
    return { success: false, error: "Zones sheet not found" };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const zones = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    zones.push({
      id: row[0],
      name: row[1],
      displayName: row[2],
      description: row[3],
      range: {
        startColumn: row[4],
        endColumn: row[5],
        startRow: row[6],
        endRow: row[7],
      },
      style: {
        primaryColor: row[8],
        backgroundColor: row[9],
      },
    });
  }

  return {
    success: true,
    zones,
    count: zones.length,
    timestamp: getKSTTimestamp_(),
  };
}

// ===== Phase 7: Floor-Jeolju Structure =====

/**
 * 층 목록 조회
 * @returns {Object} 11개 층 정보
 */
function getFloors() {
  const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.FLOORS);
  if (!sheet) {
    // 시트가 없으면 기본 데이터 반환
    return {
      success: true,
      floors: getDefaultFloors_(),
      count: 11,
      timestamp: getKSTTimestamp_(),
      source: "default",
    };
  }

  const data = sheet.getDataRange().getValues();
  const floors = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // 빈 행 스킵

    floors.push({
      floorId: row[0],
      label: row[1],
      order: row[2],
      hasVariation: row[3] === true || row[3] === "TRUE",
      variationNote: row[4] || null,
      totalColumns: row[5] || 828,
      createdAt: row[6],
    });
  }

  return {
    success: true,
    floors,
    count: floors.length,
    timestamp: getKSTTimestamp_(),
    source: "sheet",
  };
}

/**
 * 절주 목록 조회
 * @returns {Object} 8개 절주 정보
 */
function getJeolju() {
  const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.JEOLJU);
  if (!sheet) {
    // 시트가 없으면 기본 데이터 반환
    return {
      success: true,
      jeolju: getDefaultJeolju_(),
      count: 8,
      timestamp: getKSTTimestamp_(),
      source: "default",
    };
  }

  const data = sheet.getDataRange().getValues();
  const jeolju = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    jeolju.push({
      jeoljuId: row[0],
      label: row[1],
      startColumn: row[2],
      endColumn: row[3],
      columnCount: row[4],
      priority: row[5],
      status: row[6] || "pending",
      note: row[7] || null,
    });
  }

  return {
    success: true,
    jeolju,
    count: jeolju.length,
    timestamp: getKSTTimestamp_(),
    source: "sheet",
  };
}

/**
 * 특정 층의 전체 데이터 조회
 * @param {string} floorId - 층 ID (F01-F10, RF)
 * @returns {Object} 해당 층의 기둥, 이슈, 통계 데이터
 */
function getFloorData(floorId) {
  // 층 정보 조회
  const floorsResult = getFloors();
  const floor = floorsResult.floors.find((f) => f.floorId === floorId);

  if (!floor) {
    return { success: false, error: `Floor not found: ${floorId}` };
  }

  // 해당 층의 기둥 데이터 조회 (floorId로 필터링)
  const columnsResult = getColumns(null, floorId);
  const floorColumns = columnsResult.columns || {};

  // 해당 층 관련 이슈 조회 (floorId로 필터링)
  const issuesResult = getIssues();
  const floorIssues = (issuesResult.issues || []).filter((issue) => {
    // 이슈에 연결된 기둥 중 하나라도 해당 층에 속하면 포함
    return issue.affectedColumns.some((uid) => uid.startsWith(floorId + "-"));
  });

  // 절주별 통계 계산
  const jeoljuResult = getJeolju();
  const statsByJeolju = calculateJeoljuStats_(
    floorColumns,
    jeoljuResult.jeolju
  );

  return {
    success: true,
    floor,
    columns: floorColumns,
    columnCount: Object.keys(floorColumns).length,
    issues: floorIssues,
    issueCount: floorIssues.length,
    stats: {
      totalColumns: Object.keys(floorColumns).length,
      byJeolju: statsByJeolju,
      byStatus: calculateStatusStats_(floorColumns),
    },
    timestamp: getKSTTimestamp_(),
  };
}

/**
 * 전체 층 통계 조회 (Dashboard Overview용)
 * 모든 층의 요약 통계를 한 번에 반환
 *
 * @returns {Object} 층별 통계 요약
 */
function getAllFloorStats() {
  const floorsResult = getFloors();
  const floors = floorsResult.floors || [];

  // 전체 기둥 데이터 조회 (한 번만)
  const allColumnsResult = getColumns(null, null);
  const allColumns = allColumnsResult.columns || {};

  // 전체 이슈 데이터 조회 (한 번만)
  const issuesResult = getIssues();
  const allIssues = issuesResult.issues || [];

  // 층별 통계 계산
  const floorStats = {};
  const summary = {
    totalFloors: floors.length,
    totalColumns: 0,
    totalIssues: allIssues.length,
    byStatus: { pending: 0, active: 0, installed: 0, hold: 0 },
  };

  for (const floor of floors) {
    // 해당 층 기둥 필터링
    const floorColumns = {};
    for (const [uid, col] of Object.entries(allColumns)) {
      const colFloorId = col.location?.floorId;
      // floorId 컬럼 또는 UID prefix로 매칭
      if (colFloorId === floor.floorId || uid.startsWith(floor.floorId + "-")) {
        floorColumns[uid] = col;
      }
    }

    // 해당 층 이슈 필터링
    const floorIssues = allIssues.filter((issue) =>
      issue.affectedColumns.some((uid) => uid.startsWith(floor.floorId + "-"))
    );

    // 상태별 통계
    const statusStats = { pending: 0, active: 0, installed: 0, hold: 0 };
    for (const col of Object.values(floorColumns)) {
      const status = col.status?.code || "pending";
      if (status.startsWith("hold")) {
        statusStats.hold++;
      } else if (statusStats[status] !== undefined) {
        statusStats[status]++;
      }
    }

    // 진행률 계산
    const total = Object.keys(floorColumns).length;
    const progress =
      total > 0 ? Math.round((statusStats.installed / total) * 100) : 0;

    floorStats[floor.floorId] = {
      floorId: floor.floorId,
      label: floor.label,
      order: floor.order,
      columnCount: total,
      issueCount: floorIssues.length,
      byStatus: statusStats,
      progress,
      hasVariation: floor.hasVariation,
    };

    // 전체 요약 업데이트
    summary.totalColumns += total;
    summary.byStatus.pending += statusStats.pending;
    summary.byStatus.active += statusStats.active;
    summary.byStatus.installed += statusStats.installed;
    summary.byStatus.hold += statusStats.hold;
  }

  // 전체 진행률
  summary.overallProgress =
    summary.totalColumns > 0
      ? Math.round((summary.byStatus.installed / summary.totalColumns) * 100)
      : 0;

  return {
    success: true,
    floors: floorStats,
    summary,
    timestamp: getKSTTimestamp_(),
  };
}

/**
 * 기본 층 데이터 (시트가 없을 때 사용)
 */
function getDefaultFloors_() {
  return [
    {
      floorId: "F01",
      label: "1층",
      order: 1,
      hasVariation: false,
      columnSize: "1600x1600",
      jeolju: "J1",
    },
    {
      floorId: "F02",
      label: "2층",
      order: 2,
      hasVariation: false,
      columnSize: "1600x1600",
      jeolju: "J1",
    },
    {
      floorId: "F03",
      label: "3층",
      order: 3,
      hasVariation: false,
      columnSize: "1600x1600",
      jeolju: "J2",
    },
    {
      floorId: "F04",
      label: "4층",
      order: 4,
      hasVariation: false,
      columnSize: "1500x1500",
      jeolju: "J3",
    },
    {
      floorId: "F05",
      label: "5층",
      order: 5,
      hasVariation: true,
      variationNote: "부분 차이",
      columnSize: "1500x1500",
      jeolju: "J4",
    },
    {
      floorId: "F06",
      label: "6층",
      order: 6,
      hasVariation: false,
      columnSize: "1300x1300",
      jeolju: "J5",
    },
    {
      floorId: "F07",
      label: "7층",
      order: 7,
      hasVariation: false,
      columnSize: "1300x1300",
      jeolju: "J5",
    },
    {
      floorId: "F08",
      label: "8층",
      order: 8,
      hasVariation: true,
      variationNote: "부분 차이",
      columnSize: "1300x1300",
      jeolju: "J6",
    },
    {
      floorId: "F09",
      label: "9층",
      order: 9,
      hasVariation: false,
      columnSize: "1300x1300",
      jeolju: "J7",
    },
    {
      floorId: "F10",
      label: "10층",
      order: 10,
      hasVariation: false,
      columnSize: "1200x1200",
      jeolju: "J8",
    },
    {
      floorId: "RF",
      label: "RF층",
      order: 11,
      hasVariation: true,
      variationNote: "지붕층",
      columnSize: "1200x1200",
      jeolju: "J8",
    },
  ];
}

/**
 * 기본 절주 데이터 (시트가 없을 때 사용)
 * 절주별 X좌표 범위는 실제 데이터 확인 후 조정 필요
 */
function getDefaultJeolju_() {
  return [
    {
      jeoljuId: "J1",
      label: "절주1",
      startColumn: 1,
      endColumn: 9,
      columnCount: 9,
      priority: 1,
    },
    {
      jeoljuId: "J2",
      label: "절주2",
      startColumn: 10,
      endColumn: 18,
      columnCount: 9,
      priority: 2,
    },
    {
      jeoljuId: "J3",
      label: "절주3",
      startColumn: 19,
      endColumn: 27,
      columnCount: 9,
      priority: 3,
    },
    {
      jeoljuId: "J4",
      label: "절주4",
      startColumn: 28,
      endColumn: 36,
      columnCount: 9,
      priority: 4,
    },
    {
      jeoljuId: "J5",
      label: "절주5",
      startColumn: 37,
      endColumn: 45,
      columnCount: 9,
      priority: 5,
    },
    {
      jeoljuId: "J6",
      label: "절주6",
      startColumn: 46,
      endColumn: 54,
      columnCount: 9,
      priority: 6,
    },
    {
      jeoljuId: "J7",
      label: "절주7",
      startColumn: 55,
      endColumn: 62,
      columnCount: 8,
      priority: 7,
    },
    {
      jeoljuId: "J8",
      label: "절주8",
      startColumn: 63,
      endColumn: 69,
      columnCount: 7,
      priority: 8,
    },
  ];
}

/**
 * 절주별 통계 계산
 */
function calculateJeoljuStats_(columns, jeoljuList) {
  const stats = {};

  jeoljuList.forEach((j) => {
    stats[j.jeoljuId] = {
      total: 0,
      pending: 0,
      active: 0,
      installed: 0,
      hold: 0,
    };
  });

  Object.values(columns).forEach((col) => {
    const colNum = parseInt(col.location.column);
    const jeolju = jeoljuList.find(
      (j) => colNum >= j.startColumn && colNum <= j.endColumn
    );

    if (jeolju && stats[jeolju.jeoljuId]) {
      stats[jeolju.jeoljuId].total++;
      const status = col.status.code || "pending";
      if (status.startsWith("hold")) {
        stats[jeolju.jeoljuId].hold++;
      } else if (stats[jeolju.jeoljuId][status] !== undefined) {
        stats[jeolju.jeoljuId][status]++;
      }
    }
  });

  return stats;
}

/**
 * 상태별 통계 계산
 */
function calculateStatusStats_(columns) {
  const stats = { pending: 0, active: 0, installed: 0, hold: 0 };

  Object.values(columns).forEach((col) => {
    const status = col.status.code || "pending";
    if (status.startsWith("hold")) {
      stats.hold++;
    } else if (stats[status] !== undefined) {
      stats[status]++;
    }
  });

  return stats;
}

/**
 * 기둥 데이터 조회
 * Phase 6: 6단계 공정 상태 포함
 * Phase 9: 층별 필터링 지원
 * @param {string|null} zoneFilter - Zone ID 필터 (optional)
 * @param {string|null} floorFilter - Floor ID 필터 (optional, e.g., "F01", "RF")
 */
function getColumns(zoneFilter, floorFilter) {
  const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.COLUMNS);
  if (!sheet) {
    return { success: false, error: "Columns sheet not found" };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const columns = {};

  // floorId 컬럼 인덱스 (Column S = Index 18, 0-based)
  // 스키마: 1-12 기본, 13-18 공정단계, 19 floorId -> 18 index
  const FLOOR_ID_COL = 18;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uid = row[0];
    const zoneId = row[3];
    const floorId = row[FLOOR_ID_COL] || null;

    // Zone 필터 적용
    if (zoneFilter && zoneId !== zoneFilter) continue;

    // Floor 필터 적용 (UID 기반 또는 floorId 컬럼 기반)
    if (floorFilter) {
      // 방법 1: floorId 컬럼이 있으면 사용
      if (floorId && floorId !== floorFilter) continue;
      // 방법 2: UID에서 floorId 추출 (F01-A-X1 형식)
      if (!floorId && uid && !uid.startsWith(floorFilter + "-")) continue;
    }

    columns[uid] = {
      uid: uid,
      location: {
        row: row[1],
        column: row[2],
        zoneId: zoneId,
        floorId: floorId,
      },
      status: {
        code: row[4],
        source: row[5],
        isLocked: row[6] === true || row[6] === "TRUE",
        updatedAt: row[7],
      },
      member: {
        type: row[8],
        section: row[9],
        material: row[10],
      },
      issueId: row[11] || null,
      // Phase 6: 6단계 공정 상태 (2x3 그리드)
      stages: {
        hmb_fab: row[12] || "pending", // HMB제작 (row 0, col 0)
        pre_assem: row[13] || "pending", // 면조립 (row 0, col 1)
        main_assem: row[14] || "pending", // 대조립 (row 0, col 2)
        hmb_psrc: row[15] || "pending", // HMB+PSRC (row 1, col 0)
        form: row[16] || "pending", // FORM (row 1, col 1)
        embed: row[17] || "pending", // 앰베드 (row 1, col 2)
      },
    };
  }

  return {
    success: true,
    columns,
    count: Object.keys(columns).length,
    floorFilter: floorFilter || null,
    zoneFilter: zoneFilter || null,
    timestamp: getKSTTimestamp_(),
  };
}

/**
 * 이슈 목록 조회
 * @param {string|null} statusFilter - 상태 필터 (open, resolved, etc.)
 */
function getIssues(statusFilter) {
  const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.ISSUES);
  if (!sheet) {
    return { success: false, error: "Issues sheet not found" };
  }

  const data = sheet.getDataRange().getValues();
  const issues = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[9];

    if (statusFilter && status !== statusFilter) continue;

    issues.push({
      id: row[0],
      type: row[1],
      title: row[2],
      affectedColumns: row[3] ? row[3].split(",") : [],
      zoneId: row[4],
      severity: row[5],
      description: row[6],
      expectedResolution: row[7],
      actualResolution: row[8],
      status: status,
      reportedBy: row[10],
      reportedAt: row[11],
      assignedTo: row[12],
      // AI 메타데이터 (Phase 5)
      source: row[13] || "user",
      emailId: row[14] || "",
      aiSummary: row[15] || "",
      aiAnalysis: row[16] || "",
      aiKeywords: row[17] ? row[17].split(",") : [],
      // Phase 7+: Extended Issue Schema
      detail: {
        rootCause: row[18] || "",
        mitigationPlan: row[19] || "",
      },
      comments: row[20] ? JSON.parse(row[20]) : [],
      createdAt: row[21] || row[11], // fallback to reportedAt
      updatedAt: row[22] || row[11],
    });
  }

  return {
    success: true,
    issues,
    count: issues.length,
    timestamp: getKSTTimestamp_(),
  };
}

/**
 * 상태 코드 목록 조회
 */
function getStatusCodes() {
  const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.STATUS_CODES);
  if (!sheet) {
    // 기본값 반환
    return {
      success: true,
      statusCodes: {
        pending: { label: "대기", color: "#484f58" },
        active: { label: "진행중", color: "#1f6feb" },
        installed: { label: "설치완료", color: "#238636" },
        hold_tc: { label: "T/C Hold", color: "#da3633" },
        hold_design: { label: "설계 변경", color: "#d29922" },
        hold_material: { label: "자재 대기", color: "#8957e5" },
      },
    };
  }

  const data = sheet.getDataRange().getValues();
  const statusCodes = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    statusCodes[row[0]] = {
      label: row[1],
      color: row[2],
      shape: row[3] || "circle",
    };
  }

  return { success: true, statusCodes, timestamp: getKSTTimestamp_() };
}

/**
 * 전체 대시보드 데이터 조회 (초기 로드용)
 */
function getFullDashboardData() {
  const zonesResult = getZones();
  const columnsResult = getColumns(null);
  const issuesResult = getIssues(null);
  const statusCodesResult = getStatusCodes();

  return {
    success: true,
    zones: zonesResult.zones || [],
    columns: columnsResult.columns || {},
    issues: issuesResult.issues || [],
    statusCodes: statusCodesResult.statusCodes || {},
    timestamp: getKSTTimestamp_(),
  };
}

// ===== POST Operations =====

/**
 * 단일 기둥 업데이트
 * @param {string} uid - 기둥 UID (e.g., "A-X1")
 * @param {object} data - 업데이트할 데이터
 * @param {string} user - 변경한 사용자
 */
function updateColumn(uid, data, user) {
  // LockService로 동시성 제어
  const lock = LockService.getDocumentLock();

  try {
    // 5초 동안 Lock 획득 시도
    if (!lock.tryLock(5000)) {
      return {
        success: false,
        error: "Cannot acquire lock. Another operation in progress. Try again.",
        retryable: true,
      };
    }

    const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.COLUMNS);
    if (!sheet) {
      return { success: false, error: "Columns sheet not found" };
    }

    const allData = sheet.getDataRange().getValues();
    let rowIndex = -1;

    // UID로 행 찾기
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === uid) {
        rowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: `Column ${uid} not found` };
    }

    // Lock 체크
    const isLocked =
      allData[rowIndex - 1][6] === true || allData[rowIndex - 1][6] === "TRUE";
    const currentSource = allData[rowIndex - 1][5];

    // AI가 업데이트하려는데 Lock되어 있으면 거부
    if (isLocked && user === "ai") {
      return {
        success: false,
        error: `Column ${uid} is locked. Manual unlock required.`,
        isLocked: true,
      };
    }

    // 업데이트 수행
    const timestamp = getKSTTimestamp_();
    const updates = [];

    if (data.status) {
      sheet.getRange(rowIndex, 5).setValue(data.status); // Column E: status code
      updates.push("status");
    }
    if (data.isLocked !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(data.isLocked); // Column G: isLocked
      updates.push("isLocked");
    }

    // Phase 6: 공정 단계 업데이트
    const stageColumns = {
      hmb_fab: 13, // Column M
      pre_assem: 14, // Column N
      main_assem: 15, // Column O
      hmb_psrc: 16, // Column P
      form: 17, // Column Q
      embed: 18, // Column R
    };

    if (data.stages) {
      for (const [stageCode, stageStatus] of Object.entries(data.stages)) {
        if (stageColumns[stageCode]) {
          sheet
            .getRange(rowIndex, stageColumns[stageCode])
            .setValue(stageStatus);
          updates.push(`stage:${stageCode}`);
        }
      }
    }

    // Source & Timestamp 업데이트
    sheet.getRange(rowIndex, 6).setValue(user); // Column F: source
    sheet.getRange(rowIndex, 8).setValue(timestamp); // Column H: updatedAt

    // History 기록
    logHistory(uid, "update", data, user);

    return {
      success: true,
      uid,
      updated: updates,
      timestamp,
      message: `Column ${uid} updated successfully`,
    };
  } catch (e) {
    return {
      success: false,
      error: `Update failed: ${e.message}`,
      retryable: true,
    };
  } finally {
    // Lock 해제 (반드시 실행)
    lock.releaseLock();
  }
}

/**
 * 다중 기둥 일괄 업데이트 (Bulk Edit)
 * LockService 재시도 로직 포함
 * @param {string[]} uids - 기둥 UID 배열
 * @param {object} data - 공통 업데이트 데이터
 * @param {string} user - 변경한 사용자
 */
function bulkUpdateColumns(uids, data, user) {
  const results = { success: 0, failed: 0, locked: 0, retried: 0, details: [] };
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 500;

  for (const uid of uids) {
    let result = null;
    let retries = 0;

    // 재시도 로직 (retryable 에러 처리)
    while (retries <= MAX_RETRIES) {
      result = updateColumn(uid, data, user);

      if (result.success || !result.retryable) {
        break; // 성공 또는 재시도 불가능한 에러
      }

      retries++;
      if (retries <= MAX_RETRIES) {
        results.retried++;
        Utilities.sleep(RETRY_DELAY_MS * retries); // 점진적 대기
      }
    }

    // 결과 집계
    if (result.success) {
      results.success++;
    } else if (result.isLocked) {
      results.locked++;
    } else {
      results.failed++;
    }
    results.details.push({ uid, retries, ...result });
  }

  // Phase 11: Slack 알림 트리거 (대량 업데이트 10개 이상)
  if (results.success >= 10) {
    try {
      triggerSlackNotification_("bulkUpdate", {
        updateCount: results.success,
        updateType: "status",
        newValue: data.status || "multiple",
        user: user
      });
    } catch (slackError) {
      console.warn("[Slack] Failed to send bulk update notification:", slackError);
    }

    // Phase 12: Email 알림 트리거 (대량 업데이트 10개 이상)
    try {
      triggerEmailNotification_("bulkUpdate", {
        updateCount: results.success,
        updateType: "status",
        newValue: data.status || "multiple",
        user: user
      });
    } catch (emailError) {
      console.warn("[Email] Failed to send bulk update notification:", emailError);
    }
  }

  // Phase 11: Slack 알림 트리거 (hold 상태로 변경)
  if (data.status && (data.status === "blocked" || data.status.startsWith("hold"))) {
    try {
      const successUids = results.details.filter(d => d.success).map(d => d.uid);
      if (successUids.length > 0) {
        triggerSlackNotification_("statusChange", {
          newStatus: data.status,
          affectedColumns: successUids,
          user: user
        });

        // Phase 12: Email 알림 트리거 (blocked/hold 상태 변경)
        try {
          triggerEmailNotification_("statusChange", {
            newStatus: data.status,
            affectedColumns: successUids,
            user: user
          });
        } catch (emailError) {
          console.warn("[Email] Failed to send status change notification:", emailError);
        }
      }
    } catch (slackError) {
      console.warn("[Slack] Failed to send status change notification:", slackError);
    }
  }

  return {
    success: results.failed === 0,
    summary: `Updated: ${results.success}, Locked: ${results.locked}, Failed: ${results.failed}, Retried: ${results.retried}`,
    results,
    timestamp: getKSTTimestamp_(),
  };
}

// ===== Phase 6: 공정 단계 업데이트 =====

/**
 * 단일 기둥의 특정 공정 단계 업데이트
 * @param {string} uid - 기둥 UID
 * @param {string} stageCode - 공정 단계 코드 (hmb_fab, pre_assem, main_assem, hmb_psrc, form, embed)
 * @param {string} stageStatus - 상태 코드 (pending, active, installed)
 * @param {string} user - 변경한 사용자
 */
function updateColumnStage(uid, stageCode, stageStatus, user) {
  const validStages = [
    "hmb_fab",
    "pre_assem",
    "main_assem",
    "hmb_psrc",
    "form",
    "embed",
  ];
  const validStatuses = ["pending", "active", "installed", "hold"];

  if (!validStages.includes(stageCode)) {
    return {
      success: false,
      error: `Invalid stage code: ${stageCode}. Valid codes: ${validStages.join(
        ", "
      )}`,
    };
  }

  // H-2 Fix: stageStatus 유효성 검증 추가
  if (!validStatuses.includes(stageStatus)) {
    return {
      success: false,
      error: `Invalid stage status: ${stageStatus}. Valid statuses: ${validStatuses.join(
        ", "
      )}`,
    };
  }

  // updateColumn에 stages 데이터 전달
  return updateColumn(uid, { stages: { [stageCode]: stageStatus } }, user);
}

/**
 * 다중 기둥의 특정 공정 단계 일괄 업데이트
 * @param {string[]} uids - 기둥 UID 배열
 * @param {string} stageCode - 공정 단계 코드
 * @param {string} stageStatus - 상태 코드
 * @param {string} user - 변경한 사용자
 */
function bulkUpdateColumnStages(uids, stageCode, stageStatus, user) {
  const validStages = [
    "hmb_fab",
    "pre_assem",
    "main_assem",
    "hmb_psrc",
    "form",
    "embed",
  ];
  const validStatuses = ["pending", "active", "installed", "hold"];

  if (!validStages.includes(stageCode)) {
    return {
      success: false,
      error: `Invalid stage code: ${stageCode}. Valid codes: ${validStages.join(
        ", "
      )}`,
    };
  }

  // H-2 Fix: stageStatus 유효성 검증 추가 (early return)
  if (!validStatuses.includes(stageStatus)) {
    return {
      success: false,
      error: `Invalid stage status: ${stageStatus}. Valid statuses: ${validStatuses.join(
        ", "
      )}`,
    };
  }

  // H-3 Fix: 재시도 로직 추가 (bulkUpdateColumns와 동일한 패턴)
  const results = { success: 0, failed: 0, locked: 0, retried: 0, details: [] };
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 500;

  for (const uid of uids) {
    let result = null;
    let retries = 0;

    // 재시도 로직 (retryable 에러 처리)
    while (retries <= MAX_RETRIES) {
      result = updateColumnStage(uid, stageCode, stageStatus, user);

      if (result.success || !result.retryable) {
        break; // 성공 또는 재시도 불가능한 에러
      }

      retries++;
      if (retries <= MAX_RETRIES) {
        results.retried++;
        Utilities.sleep(RETRY_DELAY_MS * retries); // 점진적 대기
      }
    }

    // 결과 집계
    if (result.success) {
      results.success++;
    } else if (result.isLocked) {
      results.locked++;
    } else {
      results.failed++;
    }
    results.details.push({ uid, retries, ...result });
  }

  return {
    success: results.failed === 0,
    summary: `Updated: ${results.success}, Locked: ${results.locked}, Failed: ${results.failed}, Retried: ${results.retried}`,
    stageCode,
    stageStatus,
    results,
    timestamp: getKSTTimestamp_(),
  };
}

/**
 * 이슈 생성
 * LockService로 동시성 제어 (이슈 ID 중복 방지)
 * @param {object} issueData - 이슈 데이터
 * @param {string} user - 등록자
 */
function createIssue(issueData, user) {
  // LockService로 동시성 제어 (이슈 생성 시 ID 중복 방지)
  const lock = LockService.getDocumentLock();

  try {
    // 10초 동안 Lock 획득 시도 (다중 컬럼 업데이트 포함)
    if (!lock.tryLock(10000)) {
      return {
        success: false,
        error: "Cannot acquire lock for issue creation. Try again.",
        retryable: true,
      };
    }

    const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.ISSUES);
    if (!sheet) {
      return { success: false, error: "Issues sheet not found" };
    }

    // 새 이슈 ID 생성 (Lock 내에서 생성하여 중복 방지)
    const issueId = `ISS-${Utilities.formatDate(
      new Date(),
      "Asia/Seoul",
      "yyyy"
    )}-${String(sheet.getLastRow()).padStart(4, "0")}`;
    // M-2 Fix: KST 타임스탬프 사용
    const timestamp = getKSTTimestamp_();

    // M-1 Fix: affectedColumns 크기 제한 (최대 100개)
    const MAX_AFFECTED_COLUMNS = 100;
    let affectedCols = issueData.affectedColumns || [];
    if (affectedCols.length > MAX_AFFECTED_COLUMNS) {
      console.warn(
        `⚠️ affectedColumns 제한: ${affectedCols.length}개 → ${MAX_AFFECTED_COLUMNS}개`
      );
      affectedCols = affectedCols.slice(0, MAX_AFFECTED_COLUMNS);
    }

    // 새 행 추가 (23개 컬럼 - Phase 7+ 확장)
    sheet.appendRow([
      issueId, // 1: id
      issueData.type || "other", // 2: type
      issueData.title || "Untitled Issue", // 3: title
      affectedCols.join(","), // 4: affectedColumns (M-1: 최대 100개)
      issueData.zoneId || "", // 5: zoneId
      issueData.severity || "medium", // 6: severity
      issueData.description || "", // 7: description
      issueData.expectedResolution || "", // 8: expectedResolution
      "", // 9: actualResolution
      "open", // 10: status
      user, // 11: reportedBy
      timestamp, // 12: reportedAt
      issueData.assignedTo || "", // 13: assignedTo
      // AI 메타데이터 (Phase 5)
      issueData.source || "user", // 14: source
      issueData.emailId || "", // 15: emailId
      issueData.aiSummary || "", // 16: aiSummary
      issueData.aiAnalysis || "", // 17: aiAnalysis
      (issueData.aiKeywords || []).join(","), // 18: aiKeywords
      // Phase 7+: Extended Issue Schema
      issueData.detail?.rootCause || issueData.rootCause || "", // 19: rootCause
      issueData.detail?.mitigationPlan || issueData.mitigationPlan || "", // 20: mitigationPlan
      JSON.stringify(issueData.comments || []), // 21: comments (JSON)
      timestamp, // 22: createdAt
      timestamp, // 23: updatedAt
    ]);

    // Lock 해제 후 영향받는 기둥 상태 업데이트
    // (updateColumn은 자체 Lock 사용)
    lock.releaseLock();

    // 영향받는 기둥들 상태 업데이트 (M-1: 제한된 affectedCols 사용)
    const columnResults = { updated: 0, failed: 0 };
    if (affectedCols.length > 0) {
      const holdStatus =
        issueData.type === "tc"
          ? "hold_tc"
          : issueData.type === "design"
          ? "hold_design"
          : "hold_material";

      for (const uid of affectedCols) {
        const result = updateColumn(
          uid,
          { status: holdStatus, issueId },
          "system"
        );
        if (result.success) {
          columnResults.updated++;
        } else {
          columnResults.failed++;
        }
      }
    }

    // M-3 Fix: History 기록을 모든 작업 완료 후로 이동
    logHistory(
      issueId,
      "create_issue",
      {
        ...issueData,
        affectedColumnsCount: affectedCols.length,
        columnsUpdated: columnResults.updated,
        columnsFailed: columnResults.failed,
      },
      user
    );

    // Phase 11: Slack 알림 트리거 (Critical 이슈)
    if (issueData.severity === "critical") {
      try {
        triggerSlackNotification_("criticalIssue", {
          severity: issueData.severity,
          issueData: issueData,
          issueId: issueId
        });
      } catch (slackError) {
        console.warn("[Slack] Failed to send critical issue notification:", slackError);
      }

      // Phase 12: Email 알림 트리거 (Critical 이슈)
      try {
        triggerEmailNotification_("criticalIssue", {
          severity: issueData.severity,
          issueData: issueData,
          issueId: issueId
        });
      } catch (emailError) {
        console.warn("[Email] Failed to send critical issue notification:", emailError);
      }
    }

    return {
      success: true,
      issueId,
      timestamp,
      columnsUpdated: columnResults.updated,
      columnsFailed: columnResults.failed,
      message: `Issue ${issueId} created successfully`,
    };
  } catch (e) {
    return {
      success: false,
      error: `Issue creation failed: ${e.message}`,
      retryable: true,
    };
  } finally {
    // Lock이 아직 해제되지 않았다면 해제
    try {
      lock.releaseLock();
    } catch (unlockError) {
      // 이미 해제된 경우 무시
    }
  }
}

/**
 * 이슈 해결
 * LockService로 동시성 제어
 * @param {string} issueId - 이슈 ID
 * @param {object} resolution - 해결 정보
 * @param {string} user - 처리자
 */
function resolveIssue(issueId, resolution, user) {
  // LockService로 동시성 제어
  const lock = LockService.getDocumentLock();

  try {
    // 10초 동안 Lock 획득 시도
    if (!lock.tryLock(10000)) {
      return {
        success: false,
        error: "Cannot acquire lock for issue resolution. Try again.",
        retryable: true,
      };
    }

    const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.ISSUES);
    if (!sheet) {
      return { success: false, error: "Issues sheet not found" };
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let affectedColumns = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === issueId) {
        rowIndex = i + 1;
        affectedColumns = data[i][3] ? data[i][3].split(",") : [];
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: `Issue ${issueId} not found` };
    }

    const timestamp = getKSTTimestamp_();

    // 이슈 상태 업데이트
    sheet.getRange(rowIndex, 9).setValue(timestamp); // actualResolution
    sheet.getRange(rowIndex, 10).setValue("resolved"); // status
    sheet.getRange(rowIndex, 23).setValue(timestamp); // Phase 7+: updatedAt

    // Lock 해제 후 컬럼 상태 복구 (updateColumn은 자체 Lock 사용)
    lock.releaseLock();

    // 영향받았던 기둥들 상태 복구
    const restoreStatus = resolution.restoreStatus || "active";
    const columnResults = { restored: 0, failed: 0 };
    for (const uid of affectedColumns) {
      const result = updateColumn(
        uid,
        { status: restoreStatus, issueId: "" },
        "system"
      );
      if (result.success) {
        columnResults.restored++;
      } else {
        columnResults.failed++;
      }
    }

    // M-3 Fix: History 기록을 모든 작업 완료 후로 이동
    logHistory(
      issueId,
      "resolve_issue",
      {
        ...resolution,
        affectedColumnsCount: affectedColumns.length,
        columnsRestored: columnResults.restored,
        columnsFailed: columnResults.failed,
      },
      user
    );

    return {
      success: true,
      issueId,
      restoredColumns: columnResults.restored,
      failedColumns: columnResults.failed,
      timestamp,
      message: `Issue ${issueId} resolved. ${columnResults.restored} columns restored.`,
    };
  } catch (e) {
    return {
      success: false,
      error: `Issue resolution failed: ${e.message}`,
      retryable: true,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (unlockError) {
      // 이미 해제된 경우 무시
    }
  }
}

/**
 * M-4 Fix: 이슈 삭제 (Orphan Reference 정리 포함)
 * 이슈를 완전히 삭제하고, 연관된 기둥들의 issueId 참조를 정리합니다.
 *
 * ⚠️ 주의: 일반적으로는 resolveIssue()를 사용하세요.
 *         이 함수는 잘못 등록된 이슈를 삭제할 때만 사용합니다.
 *
 * @param {string} issueId - 삭제할 이슈 ID
 * @param {string} user - 삭제 요청자
 * @param {string} reason - 삭제 사유 (필수)
 */
function deleteIssue(issueId, user, reason) {
  if (!reason || reason.trim() === "") {
    return {
      success: false,
      error:
        "❌ 삭제 사유를 반드시 입력해주세요. 이슈 삭제는 되돌릴 수 없습니다.",
    };
  }

  const lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(3000)) {
      return {
        success: false,
        error: "⏳ 다른 사용자가 작업 중입니다. 잠시 후 다시 시도해주세요.",
        retryable: true,
      };
    }

    const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.ISSUES);
    if (!sheet) {
      return { success: false, error: "❌ Issues 시트를 찾을 수 없습니다." };
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let affectedColumns = [];
    let issueTitle = "";

    // 이슈 찾기
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === issueId) {
        rowIndex = i + 1; // 1-indexed
        affectedColumns = data[i][3] ? data[i][3].split(",") : [];
        issueTitle = data[i][2] || "(제목 없음)";
        break;
      }
    }

    if (rowIndex === -1) {
      return {
        success: false,
        error: `❌ 이슈 ${issueId}를 찾을 수 없습니다.`,
      };
    }

    // 영향받는 기둥들의 issueId 참조 정리 (M-4: Orphan Reference 방지)
    const cleanupResults = { cleaned: 0, failed: 0 };
    for (const uid of affectedColumns) {
      const result = updateColumn(
        uid,
        { issueId: "", status: "active" },
        "system"
      );
      if (result.success) {
        cleanupResults.cleaned++;
      } else {
        cleanupResults.failed++;
      }
    }

    // 이슈 행 삭제
    sheet.deleteRow(rowIndex);

    lock.releaseLock();

    // M-3 Fix: History 기록을 모든 작업 완료 후로 이동
    logHistory(
      issueId,
      "delete_issue",
      {
        title: issueTitle,
        reason: reason,
        affectedColumnsCount: affectedColumns.length,
        cleanedColumns: cleanupResults.cleaned,
        failedColumns: cleanupResults.failed,
      },
      user
    );

    return {
      success: true,
      issueId,
      message: `✅ 이슈 "${issueTitle}"이(가) 삭제되었습니다.`,
      details: {
        cleanedColumns: cleanupResults.cleaned,
        failedColumns: cleanupResults.failed,
        reason: reason,
      },
      timestamp: getKSTTimestamp_(),
    };
  } catch (e) {
    return {
      success: false,
      error: `❌ 이슈 삭제 중 오류가 발생했습니다: ${e.message}`,
      retryable: true,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (unlockError) {
      // 이미 해제된 경우 무시
    }
  }
}

/**
 * M-4: Orphan Issue Reference 정리 유틸리티
 * 존재하지 않는 이슈를 참조하는 기둥들을 스캔하고 정리합니다.
 * 주기적인 유지보수 또는 데이터 정합성 검사에 사용합니다.
 *
 * @param {boolean} dryRun - true면 실제 수정 없이 스캔만 수행
 * @returns {Object} 스캔/정리 결과
 */
function cleanupOrphanIssueReferences(dryRun = true) {
  try {
    const columnsSheet = getSheet(DASHBOARD_CONFIG.SHEETS.COLUMNS);
    const issuesSheet = getSheet(DASHBOARD_CONFIG.SHEETS.ISSUES);

    if (!columnsSheet || !issuesSheet) {
      return { success: false, error: "Required sheets not found" };
    }

    // 유효한 이슈 ID 목록 수집
    const issuesData = issuesSheet.getDataRange().getValues();
    const validIssueIds = new Set();
    for (let i = 1; i < issuesData.length; i++) {
      if (issuesData[i][0]) {
        validIssueIds.add(issuesData[i][0]);
      }
    }

    // 기둥 데이터 스캔
    const columnsData = columnsSheet.getDataRange().getValues();
    const orphans = [];

    for (let i = 1; i < columnsData.length; i++) {
      const uid = columnsData[i][0];
      const issueId = columnsData[i][11]; // Column L: issueId

      if (issueId && !validIssueIds.has(issueId)) {
        orphans.push({
          uid,
          orphanIssueId: issueId,
          rowIndex: i + 1,
        });
      }
    }

    // Dry run이면 결과만 반환
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        orphanCount: orphans.length,
        orphans: orphans.slice(0, 20), // 최대 20개만 표시
        message:
          orphans.length > 0
            ? `⚠️ ${orphans.length}개의 orphan reference 발견. dryRun=false로 실행하면 정리됩니다.`
            : "✅ Orphan reference가 없습니다.",
      };
    }

    // 실제 정리 수행
    const results = { cleaned: 0, failed: 0 };
    for (const orphan of orphans) {
      try {
        columnsSheet.getRange(orphan.rowIndex, 12).setValue(""); // issueId 컬럼 비우기
        columnsSheet.getRange(orphan.rowIndex, 5).setValue("active"); // status를 active로 복구
        results.cleaned++;
      } catch (e) {
        results.failed++;
      }
    }

    // 정리 히스토리 기록
    logHistory(
      "SYSTEM",
      "cleanup_orphan_references",
      {
        orphanCount: orphans.length,
        cleaned: results.cleaned,
        failed: results.failed,
      },
      "system"
    );

    return {
      success: true,
      dryRun: false,
      orphanCount: orphans.length,
      cleaned: results.cleaned,
      failed: results.failed,
      message: `✅ ${results.cleaned}개의 orphan reference가 정리되었습니다.`,
      timestamp: getKSTTimestamp_(),
    };
  } catch (e) {
    return {
      success: false,
      error: `Orphan cleanup failed: ${e.message}`,
    };
  }
}

/**
 * 로컬 데이터 동기화 (Hybrid Sync)
 * 클라이언트에서 모은 변경사항을 일괄 동기화
 * @param {object} data - { columns: {uid: columnData}, timestamp: string }
 * @param {string} user - 동기화 요청자
 */
function syncFromLocalData(data, user) {
  const results = { synced: 0, conflicts: 0, details: [] };
  const serverData = getColumns(null);

  for (const uid in data.columns) {
    const localColumn = data.columns[uid];
    const serverColumn = serverData.columns[uid];

    // 충돌 감지: 서버 데이터가 더 최신인 경우
    if (
      serverColumn &&
      new Date(serverColumn.status.updatedAt) >
        new Date(localColumn.status.updatedAt)
    ) {
      // Lock된 경우 서버 우선
      if (serverColumn.status.isLocked) {
        results.conflicts++;
        results.details.push({
          uid,
          conflict: "server_locked",
          serverTimestamp: serverColumn.status.updatedAt,
        });
        continue;
      }
    }

    // 동기화 수행
    const result = updateColumn(uid, localColumn.status, user);
    if (result.success) {
      results.synced++;
    }
    results.details.push({ uid, ...result });
  }

  return {
    success: true,
    summary: `Synced: ${results.synced}, Conflicts: ${results.conflicts}`,
    results,
    serverTimestamp: getKSTTimestamp_(),
  };
}

// ===== Phase 5: 비동기 분석 트리거 =====

/**
 * 이메일 분석 트리거 (비동기)
 * Dashboard에서 수동으로 분석을 시작할 때 사용
 *
 * @param {string} user - 트리거 요청자
 * @returns {Object} { success, jobId, message }
 */
function triggerEmailAnalysis(user) {
  try {
    // 이미 실행 중인 작업이 있는지 확인
    const scriptProperties = PropertiesService.getScriptProperties();
    const currentJob = scriptProperties.getProperty("ANALYSIS_JOB");

    if (currentJob) {
      const jobData = JSON.parse(currentJob);
      const elapsed = Date.now() - jobData.startedAt;

      // 10분 이상 지난 작업은 만료 처리
      if (elapsed < 10 * 60 * 1000) {
        return {
          success: false,
          error: "Analysis job already in progress",
          jobId: jobData.jobId,
          startedAt: jobData.startedAt,
        };
      }
    }

    // 새 작업 ID 생성
    const jobId = `JOB-${Utilities.formatDate(
      new Date(),
      "Asia/Seoul",
      "yyyyMMdd-HHmmss"
    )}`;
    const jobData = {
      jobId,
      startedAt: Date.now(),
      triggeredBy: user,
      status: "pending",
    };

    // 작업 상태 저장
    scriptProperties.setProperty("ANALYSIS_JOB", JSON.stringify(jobData));

    // 1초 후 비동기 실행 트리거 생성
    ScriptApp.newTrigger("runAnalysisJob_").timeBased().after(1000).create();

    return {
      success: true,
      jobId,
      message: "Analysis job scheduled successfully",
      estimatedTime: "30-60 seconds",
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to trigger analysis: ${e.message}`,
    };
  }
}

/**
 * 분석 작업 상태 조회
 *
 * @returns {Object} { success, job }
 */
function getAnalysisJobStatus() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const currentJob = scriptProperties.getProperty("ANALYSIS_JOB");

    if (!currentJob) {
      return {
        success: true,
        job: null,
        message: "No active analysis job",
      };
    }

    const jobData = JSON.parse(currentJob);
    const elapsed = Math.round((Date.now() - jobData.startedAt) / 1000);

    return {
      success: true,
      job: {
        ...jobData,
        elapsedSeconds: elapsed,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to get job status: ${e.message}`,
    };
  }
}

/**
 * 분석 작업 실행 (트리거에서 호출)
 * main() 함수를 실행하고 결과를 저장
 */
function runAnalysisJob_() {
  const scriptProperties = PropertiesService.getScriptProperties();

  try {
    // 작업 상태 업데이트
    const currentJob = scriptProperties.getProperty("ANALYSIS_JOB");
    if (currentJob) {
      const jobData = JSON.parse(currentJob);
      jobData.status = "running";
      scriptProperties.setProperty("ANALYSIS_JOB", JSON.stringify(jobData));
    }

    // 메인 분석 함수 실행
    const result = main();

    // 작업 완료 상태 저장
    const completedJob = currentJob ? JSON.parse(currentJob) : {};
    completedJob.status = "completed";
    completedJob.completedAt = Date.now();
    completedJob.result = {
      processed: result?.emailsProcessed || 0,
      success: result?.success || false,
    };
    scriptProperties.setProperty("ANALYSIS_JOB", JSON.stringify(completedJob));

    // 10분 후 작업 정보 삭제 트리거
    ScriptApp.newTrigger("clearAnalysisJob_")
      .timeBased()
      .after(10 * 60 * 1000)
      .create();
  } catch (e) {
    // 오류 상태 저장
    const errorJob = {
      status: "failed",
      error: e.message,
      failedAt: Date.now(),
    };
    scriptProperties.setProperty("ANALYSIS_JOB", JSON.stringify(errorJob));
  }

  // 자기 자신 트리거 삭제
  deleteTrigger_("runAnalysisJob_");
}

/**
 * 완료된 분석 작업 정보 삭제
 */
function clearAnalysisJob_() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty("ANALYSIS_JOB");
  deleteTrigger_("clearAnalysisJob_");
}

/**
 * 특정 함수의 트리거 삭제
 * @param {string} functionName - 삭제할 함수명
 */
function deleteTrigger_(functionName) {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}

// ===== Helper Functions =====

/**
 * 시트 가져오기
 * @param {string} sheetName - 시트 이름
 */
function getSheet(sheetName) {
  if (!DASHBOARD_CONFIG.SPREADSHEET_ID) {
    return null;
  }

  try {
    const ss = SpreadsheetApp.openById(DASHBOARD_CONFIG.SPREADSHEET_ID);
    return ss.getSheetByName(sheetName);
  } catch (e) {
    console.error(`Failed to get sheet ${sheetName}:`, e);
    return null;
  }
}

/**
 * M-2 Fix: KST 타임스탬프 헬퍼 함수
 * 모든 시간을 한국 시간(Asia/Seoul)으로 통일하여 혼란 방지
 * @returns {string} KST 형식의 타임스탬프 (예: 2025-12-30T17:30:00+09:00)
 */
function getKSTTimestamp_() {
  const now = new Date();
  // Google Apps Script의 Utilities.formatDate 활용
  const kstFormatted = Utilities.formatDate(
    now,
    "Asia/Seoul",
    "yyyy-MM-dd'T'HH:mm:ss'+09:00'"
  );
  return kstFormatted;
}

/**
 * M-2 Fix: 사용자 친화적인 한국어 시간 표시
 * @returns {string} 예: "2025년 12월 30일 오후 5시 30분"
 */
function getKSTReadable_() {
  const now = new Date();
  return Utilities.formatDate(now, "Asia/Seoul", "yyyy년 MM월 dd일 a h시 mm분");
}

/**
 * History 로깅
 * M-3 Fix: 액션 수행 전에 기록하여 일관성 확보
 * @param {string} targetId - 대상 ID (UID 또는 Issue ID)
 * @param {string} action - 액션 유형
 * @param {object} data - 변경 데이터
 * @param {string} user - 사용자
 */
function logHistory(targetId, action, data, user) {
  try {
    const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.HISTORY);
    if (!sheet) return;

    // M-2 Fix: KST 타임스탬프 사용
    sheet.appendRow([
      getKSTTimestamp_(),
      targetId,
      action,
      JSON.stringify(data),
      user,
    ]);
  } catch (e) {
    console.error("히스토리 기록 실패:", e);
  }
}

// ===== Sheet Initialization =====

/**
 * 대시보드용 Sheet 스키마 초기화
 * 처음 설정 시 한 번 실행
 */
function initializeDashboardSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Zones 시트
  let zonesSheet = ss.getSheetByName(DASHBOARD_CONFIG.SHEETS.ZONES);
  if (!zonesSheet) {
    zonesSheet = ss.insertSheet(DASHBOARD_CONFIG.SHEETS.ZONES);
    zonesSheet.appendRow([
      "id",
      "name",
      "displayName",
      "description",
      "startColumn",
      "endColumn",
      "startRow",
      "endRow",
      "primaryColor",
      "backgroundColor",
    ]);
    zonesSheet.appendRow([
      "zone_a",
      "ZONE A",
      "FAB",
      "Utility Support",
      1,
      23,
      0,
      11,
      "#238636",
      "rgba(35,134,54,0.1)",
    ]);
    zonesSheet.appendRow([
      "zone_b",
      "ZONE B",
      "CUB",
      "Main Link",
      24,
      45,
      0,
      11,
      "#1f6feb",
      "rgba(31,111,235,0.1)",
    ]);
    zonesSheet.appendRow([
      "zone_c",
      "ZONE C",
      "COMPLEX",
      "Office/Amenity",
      46,
      69,
      0,
      11,
      "#d29922",
      "rgba(210,153,34,0.1)",
    ]);
  }

  // Columns 시트 (19개 컬럼: 기본 12개 + 공정 단계 6개 + 층 1개)
  let columnsSheet = ss.getSheetByName(DASHBOARD_CONFIG.SHEETS.COLUMNS);
  if (!columnsSheet) {
    columnsSheet = ss.insertSheet(DASHBOARD_CONFIG.SHEETS.COLUMNS);
    columnsSheet.appendRow([
      // 기본 정보 (1-12)
      "uid", // 1: 고유 식별자
      "row", // 2: 행 라벨 (A-L)
      "column", // 3: 열 번호 (1-69)
      "zoneId", // 4: Zone ID
      "statusCode", // 5: 전체 상태 코드
      "source", // 6: 마지막 수정자
      "isLocked", // 7: 잠금 상태
      "updatedAt", // 8: 수정 시각
      "memberType", // 9: 부재 유형
      "section", // 10: 단면
      "material", // 11: 재질
      "issueId", // 12: 연결된 이슈 ID
      // Phase 6: 공정 단계 상태 (13-18)
      "stage_hmb_fab", // 13: HMB제작
      "stage_pre_assem", // 14: 면조립
      "stage_main_assem", // 15: 대조립
      "stage_hmb_psrc", // 16: HMB+PSRC
      "stage_form", // 17: FORM
      "stage_embed", // 18: 앰베드
      // Phase 7+: 층 정보 (19)
      "floorId", // 19: 층 ID (F01-F11)
    ]);

    // 828개 기둥 초기화
    const rowLabels = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
    ];
    const zones = [
      { id: "zone_a", start: 1, end: 23 },
      { id: "zone_b", start: 24, end: 45 },
      { id: "zone_c", start: 46, end: 69 },
    ];

    // C-1 Fix: 성능 최적화 - appendRow 828번 → setValues 1번
    const rows = [];
    const timestamp = getKSTTimestamp_();

    for (let r = 0; r < 12; r++) {
      for (let c = 1; c <= 69; c++) {
        const zoneId = zones.find((z) => c >= z.start && c <= z.end)?.id || "";
        rows.push([
          // 기본 정보
          `${rowLabels[r]}-X${c}`,
          rowLabels[r],
          c,
          zoneId,
          "pending",
          "system",
          false,
          timestamp,
          "SRC Column",
          "H-500x500",
          "SM490",
          "",
          // 공정 단계 (모두 pending으로 초기화)
          "pending", // hmb_fab
          "pending", // pre_assem
          "pending", // main_assem
          "pending", // hmb_psrc
          "pending", // form
          "pending", // embed
          // Phase 7+: 층 정보 (기본값 F01)
          "F01", // floorId
        ]);
      }
    }

    // 일괄 삽입 (1번 API 호출로 828행 삽입, 19컬럼)
    if (rows.length > 0) {
      columnsSheet.getRange(2, 1, rows.length, 19).setValues(rows);
    }
  }

  // Issues 시트 (18개 컬럼: 기본 13개 + AI 메타데이터 5개)
  let issuesSheet = ss.getSheetByName(DASHBOARD_CONFIG.SHEETS.ISSUES);
  if (!issuesSheet) {
    issuesSheet = ss.insertSheet(DASHBOARD_CONFIG.SHEETS.ISSUES);
    issuesSheet.appendRow([
      "id", // 1: 고유 식별자
      "type", // 2: 이슈 유형 (tc, design, schedule, safety, quality, other)
      "title", // 3: 이슈 제목
      "affectedColumns", // 4: 영향받는 기둥 UID (쉼표 구분)
      "zoneId", // 5: Zone ID
      "severity", // 6: 심각도 (critical, high, medium, low)
      "description", // 7: 상세 설명
      "expectedResolution", // 8: 예상 해결일
      "actualResolution", // 9: 실제 해결일
      "status", // 10: 상태 (open, in_progress, resolved, closed)
      "reportedBy", // 11: 보고자
      "reportedAt", // 12: 보고일시
      "assignedTo", // 13: 담당자
      // AI 메타데이터 컬럼 (Phase 5)
      "source", // 14: 생성 출처 ('ai' | 'user')
      "emailId", // 15: Gmail Message ID (AI 생성 시)
      "aiSummary", // 16: AI 본문요약
      "aiAnalysis", // 17: AI 분석 내용
      "aiKeywords", // 18: AI 추출 키워드 (쉼표 구분)
    ]);
  }

  // History 시트
  let historySheet = ss.getSheetByName(DASHBOARD_CONFIG.SHEETS.HISTORY);
  if (!historySheet) {
    historySheet = ss.insertSheet(DASHBOARD_CONFIG.SHEETS.HISTORY);
    historySheet.appendRow(["timestamp", "targetId", "action", "data", "user"]);
  }

  // StatusCodes 시트
  let statusCodesSheet = ss.getSheetByName(
    DASHBOARD_CONFIG.SHEETS.STATUS_CODES
  );
  if (!statusCodesSheet) {
    statusCodesSheet = ss.insertSheet(DASHBOARD_CONFIG.SHEETS.STATUS_CODES);
    statusCodesSheet.appendRow(["code", "label", "color", "shape"]);
    statusCodesSheet.appendRow(["pending", "대기", "#484f58", "circle"]);
    statusCodesSheet.appendRow(["active", "진행중", "#1f6feb", "circle"]);
    statusCodesSheet.appendRow(["installed", "설치완료", "#238636", "circle"]);
    statusCodesSheet.appendRow(["hold_tc", "T/C Hold", "#da3633", "square"]);
    statusCodesSheet.appendRow([
      "hold_design",
      "설계 변경",
      "#d29922",
      "circle",
    ]);
    statusCodesSheet.appendRow([
      "hold_material",
      "자재 대기",
      "#8957e5",
      "circle",
    ]);
  }

  // Script Property에 Spreadsheet ID 저장
  PropertiesService.getScriptProperties().setProperty(
    "DASHBOARD_SHEET_ID",
    ss.getId()
  );

  return {
    success: true,
    message: "Dashboard sheets initialized",
    spreadsheetId: ss.getId(),
  };
}

// ===== Phase 7: Floor-Jeolju Sheets Initialization =====

/**
 * Floors/Jeolju 시트 초기화
 * Apps Script 에디터에서 직접 실행
 */
function initializeFloorJeoljuSheets() {
  const ss = SpreadsheetApp.openById(DASHBOARD_CONFIG.SPREADSHEET_ID);
  if (!ss) {
    return { success: false, error: "Spreadsheet not found" };
  }

  // Floors 시트 생성
  let floorsSheet = ss.getSheetByName(DASHBOARD_CONFIG.SHEETS.FLOORS);
  if (!floorsSheet) {
    floorsSheet = ss.insertSheet(DASHBOARD_CONFIG.SHEETS.FLOORS);

    // 헤더 설정
    floorsSheet.appendRow([
      "floorId",
      "label",
      "order",
      "hasVariation",
      "variationNote",
      "totalColumns",
      "createdAt",
    ]);

    // 11개 층 데이터 입력
    const floors = getDefaultFloors_();
    const timestamp = getKSTTimestamp_();

    floors.forEach((f) => {
      floorsSheet.appendRow([
        f.floorId,
        f.label,
        f.order,
        f.hasVariation,
        f.variationNote || "",
        828, // 기본 기둥 수
        timestamp,
      ]);
    });

    // 헤더 스타일링
    floorsSheet
      .getRange(1, 1, 1, 7)
      .setFontWeight("bold")
      .setBackground("#f0f0f0");
    floorsSheet.setFrozenRows(1);

    console.log("✅ Floors 시트 생성 완료");
  } else {
    console.log("ℹ️ Floors 시트 이미 존재");
  }

  // Jeolju 시트 생성
  let jeoljuSheet = ss.getSheetByName(DASHBOARD_CONFIG.SHEETS.JEOLJU);
  if (!jeoljuSheet) {
    jeoljuSheet = ss.insertSheet(DASHBOARD_CONFIG.SHEETS.JEOLJU);

    // 헤더 설정
    jeoljuSheet.appendRow([
      "jeoljuId",
      "label",
      "startColumn",
      "endColumn",
      "columnCount",
      "priority",
      "status",
      "note",
    ]);

    // 8개 절주 데이터 입력
    const jeolju = getDefaultJeolju_();

    jeolju.forEach((j) => {
      jeoljuSheet.appendRow([
        j.jeoljuId,
        j.label,
        j.startColumn,
        j.endColumn,
        j.columnCount,
        j.priority,
        "pending",
        "",
      ]);
    });

    // 헤더 스타일링
    jeoljuSheet
      .getRange(1, 1, 1, 8)
      .setFontWeight("bold")
      .setBackground("#f0f0f0");
    jeoljuSheet.setFrozenRows(1);

    console.log("✅ Jeolju 시트 생성 완료");
  } else {
    console.log("ℹ️ Jeolju 시트 이미 존재");
  }

  return {
    success: true,
    message: "Floor/Jeolju sheets initialized",
    sheets: {
      floors: floorsSheet.getName(),
      jeolju: jeoljuSheet.getName(),
    },
  };
}

/**
 * X좌표에서 절주 ID 추론
 * @param {number} columnNumber - X좌표 (1-69)
 * @returns {string} 절주 ID (J1-J8)
 */
function getJeoljuFromColumn_(columnNumber) {
  const jeolju = getDefaultJeolju_();
  for (const j of jeolju) {
    if (columnNumber >= j.startColumn && columnNumber <= j.endColumn) {
      return j.jeoljuId;
    }
  }
  return "J1"; // 기본값
}

/**
 * 층-절주 기반 UID 생성
 * @param {string} floorId - 층 ID (F01-F11)
 * @param {string} row - 행 (A-L)
 * @param {number} column - 열 (1-69)
 * @returns {string} UID (예: F11-A-X1)
 */
function generateFloorBasedUID_(floorId, row, column) {
  return `${floorId}-${row}-X${column}`;
}

// ===== Phase 7+: Migration Functions =====

/**
 * 기존 Columns 시트에 floorId 컬럼 추가 (마이그레이션)
 * Apps Script 에디터에서 한 번 실행하여 기존 데이터에 floorId 추가
 *
 * @param {string} defaultFloorId - 기본 층 ID (기본값: "F01")
 * @returns {Object} 마이그레이션 결과
 */
function migrateAddFloorIdColumn(defaultFloorId = "F01") {
  const lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(30000)) {
      return {
        success: false,
        error: "Cannot acquire lock. Try again later.",
      };
    }

    const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.COLUMNS);
    if (!sheet) {
      return { success: false, error: "Columns sheet not found" };
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // 이미 floorId 컬럼이 있는지 확인
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const floorIdColIndex = headers.indexOf("floorId");

    if (floorIdColIndex >= 0) {
      console.log(
        "ℹ️ floorId 컬럼이 이미 존재합니다. (Column " +
          (floorIdColIndex + 1) +
          ")"
      );
      return {
        success: true,
        message: "floorId column already exists",
        columnIndex: floorIdColIndex + 1,
        skipped: true,
      };
    }

    // 새 컬럼 추가 (Column 19 = Column T)
    const newColIndex = 19;

    // 헤더 추가
    sheet.getRange(1, newColIndex).setValue("floorId");

    // 데이터 행에 기본값 설정 (F01)
    if (lastRow > 1) {
      const dataRowCount = lastRow - 1;
      const defaultValues = Array(dataRowCount).fill([defaultFloorId]);
      sheet.getRange(2, newColIndex, dataRowCount, 1).setValues(defaultValues);
    }

    console.log(
      `✅ floorId 컬럼 추가 완료: ${
        lastRow - 1
      }행에 "${defaultFloorId}" 기본값 설정`
    );

    // 히스토리 기록
    logHistory(
      "SYSTEM",
      "migration_add_floorId",
      {
        defaultFloorId,
        rowsUpdated: lastRow - 1,
        columnIndex: newColIndex,
      },
      "system"
    );

    return {
      success: true,
      message: `floorId column added successfully`,
      columnIndex: newColIndex,
      rowsUpdated: lastRow - 1,
      defaultFloorId,
      timestamp: getKSTTimestamp_(),
    };
  } catch (e) {
    console.error("❌ 마이그레이션 실패:", e);
    return {
      success: false,
      error: `Migration failed: ${e.message}`,
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 11층 전체 데이터 생성 (새 프로젝트용)
 * 기존 단층 데이터를 11층 구조로 확장
 *
 * ⚠️ 주의: 이 함수는 828 × 11 = 9,108개 행을 생성합니다.
 * 기존 데이터가 있으면 덮어쓰지 않고 추가만 합니다.
 *
 * @param {boolean} dryRun - true면 실제 생성 없이 시뮬레이션
 * @returns {Object} 생성 결과
 */
function generateAllFloorData(dryRun = true) {
  const floors = getDefaultFloors_();
  const rowLabels = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
  ];
  const zones = [
    { id: "zone_a", start: 1, end: 23 },
    { id: "zone_b", start: 24, end: 45 },
    { id: "zone_c", start: 46, end: 69 },
  ];

  const totalColumns = 12 * 69; // 828 per floor
  const totalRows = totalColumns * floors.length; // 9,108 total

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      message: `시뮬레이션: ${floors.length}개 층 × ${totalColumns}개 기둥 = ${totalRows}개 행 생성 예정`,
      floors: floors.map((f) => f.floorId),
      columnsPerFloor: totalColumns,
      totalRows,
    };
  }

  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(60000)) {
      return { success: false, error: "Cannot acquire lock" };
    }

    const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.COLUMNS);
    if (!sheet) {
      return { success: false, error: "Columns sheet not found" };
    }

    const timestamp = getKSTTimestamp_();
    let createdCount = 0;

    // 층별로 데이터 생성
    for (const floor of floors) {
      const rows = [];

      for (let r = 0; r < 12; r++) {
        for (let c = 1; c <= 69; c++) {
          const zoneId =
            zones.find((z) => c >= z.start && c <= z.end)?.id || "";
          rows.push([
            `${floor.floorId}-${rowLabels[r]}-X${c}`, // UID with floorId prefix
            rowLabels[r],
            c,
            zoneId,
            "pending",
            "system",
            false,
            timestamp,
            "SRC Column",
            "H-500x500",
            "SM490",
            "",
            "pending",
            "pending",
            "pending",
            "pending",
            "pending",
            "pending", // stages
            floor.floorId, // floorId
          ]);
        }
      }

      // 층별 일괄 삽입
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, 19).setValues(rows);
      createdCount += rows.length;

      console.log(
        `✅ ${floor.floorId} (${floor.label}) 생성 완료: ${rows.length}행`
      );
    }

    return {
      success: true,
      message: `${floors.length}개 층 데이터 생성 완료`,
      totalCreated: createdCount,
      floors: floors.map((f) => f.floorId),
      timestamp: getKSTTimestamp_(),
    };
  } catch (e) {
    return { success: false, error: `Generation failed: ${e.message}` };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 특정 층의 기둥 수 조회
 * @param {string} floorId - 층 ID
 * @returns {Object} 기둥 수 통계
 */
function getFloorColumnCount(floorId) {
  const sheet = getSheet(DASHBOARD_CONFIG.SHEETS.COLUMNS);
  if (!sheet) {
    return { success: false, error: "Columns sheet not found" };
  }

  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const rowFloorId = data[i][19] || null; // floorId column (0-indexed)
    const uid = data[i][0];

    // floorId 컬럼 또는 UID prefix로 매칭
    if (rowFloorId === floorId || (uid && uid.startsWith(floorId + "-"))) {
      count++;
    }
  }

  return {
    success: true,
    floorId,
    columnCount: count,
    expectedCount: 828, // 12 rows × 69 columns
    isComplete: count === 828,
  };
}

// ===== Slack Webhook Integration =====

/**
 * Slack 알림 설정 객체
 * PropertiesService에서 설정값을 로드
 */
const SLACK_CONFIG = {
  // Webhook URL (암호화된 형태로 저장)
  getWebhookUrl: function() {
    return PropertiesService.getUserProperties().getProperty("SLACK_WEBHOOK_URL") || "";
  },

  // 알림 활성화 여부
  getNotificationSettings: function() {
    const settingsJson = PropertiesService.getUserProperties().getProperty("SLACK_NOTIFICATION_SETTINGS");
    const defaults = {
      criticalIssue: true,        // Critical 이슈 생성 시
      statusDelay: true,          // 기둥 상태가 "delay"로 변경 시
      statusBlocked: true,        // 기둥 상태가 "blocked"로 변경 시
      bulkUpdate: true,           // 대량 상태 변경 (10개 이상) 시
      dailySummary: false,        // 일일 진행률 요약
      issueResolved: false        // 이슈 해결 시
    };

    if (!settingsJson) return defaults;

    try {
      return { ...defaults, ...JSON.parse(settingsJson) };
    } catch (e) {
      console.warn("[Slack] Failed to parse notification settings:", e);
      return defaults;
    }
  },

  // Dashboard URL (알림에서 바로가기용)
  getDashboardUrl: function() {
    return PropertiesService.getScriptProperties().getProperty("DASHBOARD_URL") ||
           ScriptApp.getService().getUrl() ||
           "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
  }
};

/**
 * Slack Webhook으로 알림 전송
 * @param {string} webhookUrl - Slack Webhook URL
 * @param {Object} payload - Slack Block Kit 형식의 payload
 * @returns {Object} 전송 결과
 */
function sendSlackNotification(webhookUrl, payload) {
  if (!webhookUrl) {
    return { success: false, error: "Webhook URL is not configured" };
  }

  try {
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      console.log("[Slack] Notification sent successfully");
      return { success: true, responseCode };
    } else {
      console.error("[Slack] Failed to send notification:", response.getContentText());
      return {
        success: false,
        error: `HTTP ${responseCode}: ${response.getContentText()}`,
        responseCode
      };
    }
  } catch (e) {
    console.error("[Slack] Error sending notification:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Slack Block Kit 메시지 생성 - Critical 이슈 알림
 * @param {Object} issueData - 이슈 데이터
 * @param {string} issueId - 생성된 이슈 ID
 * @returns {Object} Slack Block Kit payload
 */
function createCriticalIssueSlackPayload_(issueData, issueId) {
  const dashboardUrl = SLACK_CONFIG.getDashboardUrl();
  const timestamp = getKSTTimestamp_();

  const severityEmoji = {
    critical: ":rotating_light:",
    high: ":warning:",
    medium: ":large_yellow_circle:",
    low: ":white_circle:"
  };

  const typeLabel = {
    tc: "T/C Hold",
    design: "Design Change",
    material: "Material Issue",
    schedule: "Schedule Delay",
    other: "Other"
  };

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${severityEmoji[issueData.severity] || ":warning:"} P5 Dashboard Alert`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Event*: Critical Issue Created\n*Issue ID*: \`${issueId}\``
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Type:*\n${typeLabel[issueData.type] || issueData.type}`
          },
          {
            type: "mrkdwn",
            text: `*Severity:*\n${(issueData.severity || "medium").toUpperCase()}`
          },
          {
            type: "mrkdwn",
            text: `*Title:*\n${issueData.title || "Untitled"}`
          },
          {
            type: "mrkdwn",
            text: `*Affected Columns:*\n${(issueData.affectedColumns || []).length}개`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Description:*\n${issueData.description || "_No description provided_"}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Timestamp:* ${timestamp} | *Reported by:* ${issueData.reportedBy || "System"}`
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: ":chart_with_upwards_trend: Open Dashboard",
              emoji: true
            },
            url: dashboardUrl,
            style: "primary"
          }
        ]
      }
    ]
  };
}

/**
 * Slack Block Kit 메시지 생성 - 상태 변경 알림 (delay/blocked)
 * @param {string} eventType - 이벤트 타입 (delay, blocked)
 * @param {Array} affectedColumns - 영향받은 기둥 UID 배열
 * @param {string} user - 변경한 사용자
 * @returns {Object} Slack Block Kit payload
 */
function createStatusChangeSlackPayload_(eventType, affectedColumns, user) {
  const dashboardUrl = SLACK_CONFIG.getDashboardUrl();
  const timestamp = getKSTTimestamp_();

  const eventConfig = {
    delay: { emoji: ":clock3:", label: "Delay Status", color: "#d29922" },
    blocked: { emoji: ":no_entry:", label: "Blocked Status", color: "#da3633" },
    hold_tc: { emoji: ":octagonal_sign:", label: "T/C Hold", color: "#da3633" },
    hold_design: { emoji: ":pencil2:", label: "Design Hold", color: "#d29922" },
    hold_material: { emoji: ":package:", label: "Material Hold", color: "#8957e5" }
  };

  const config = eventConfig[eventType] || { emoji: ":warning:", label: eventType, color: "#484f58" };

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${config.emoji} P5 Status Change Alert`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Event*: Column Status Changed to *${config.label}*`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Affected Columns:*\n${affectedColumns.length}개`
          },
          {
            type: "mrkdwn",
            text: `*Changed by:*\n${user}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Column UIDs:*\n\`${affectedColumns.slice(0, 10).join("`, `")}\`${affectedColumns.length > 10 ? ` _...and ${affectedColumns.length - 10} more_` : ""}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Timestamp:* ${timestamp}`
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: ":chart_with_upwards_trend: Open Dashboard",
              emoji: true
            },
            url: dashboardUrl,
            style: "primary"
          }
        ]
      }
    ]
  };
}

/**
 * Slack Block Kit 메시지 생성 - 대량 업데이트 알림
 * @param {number} updateCount - 업데이트된 기둥 수
 * @param {string} updateType - 업데이트 타입 (status, stage 등)
 * @param {string} newValue - 새 값
 * @param {string} user - 변경한 사용자
 * @returns {Object} Slack Block Kit payload
 */
function createBulkUpdateSlackPayload_(updateCount, updateType, newValue, user) {
  const dashboardUrl = SLACK_CONFIG.getDashboardUrl();
  const timestamp = getKSTTimestamp_();

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":arrows_counterclockwise: P5 Bulk Update Alert",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Event*: Bulk Update Completed`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Columns Updated:*\n${updateCount}개`
          },
          {
            type: "mrkdwn",
            text: `*Update Type:*\n${updateType}`
          },
          {
            type: "mrkdwn",
            text: `*New Value:*\n${newValue}`
          },
          {
            type: "mrkdwn",
            text: `*Changed by:*\n${user}`
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Timestamp:* ${timestamp}`
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: ":chart_with_upwards_trend: Open Dashboard",
              emoji: true
            },
            url: dashboardUrl
          }
        ]
      }
    ]
  };
}

/**
 * Slack Block Kit 메시지 생성 - 일일 진행률 요약
 * @param {Object} stats - 진행률 통계
 * @returns {Object} Slack Block Kit payload
 */
function createDailySummarySlackPayload_(stats) {
  const dashboardUrl = SLACK_CONFIG.getDashboardUrl();
  const timestamp = getKSTTimestamp_();

  const progressBar = (percent) => {
    const filled = Math.floor(percent / 10);
    const empty = 10 - filled;
    return ":large_green_square:".repeat(filled) + ":white_large_square:".repeat(empty);
  };

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":bar_chart: P5 Daily Progress Summary",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Date:* ${timestamp.split(" ")[0]}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Overall Progress:* ${stats.overallProgress || 0}%\n${progressBar(stats.overallProgress || 0)}`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Total Columns:*\n${stats.totalColumns || 0}`
          },
          {
            type: "mrkdwn",
            text: `*Installed:*\n${stats.byStatus?.installed || 0}`
          },
          {
            type: "mrkdwn",
            text: `*In Progress:*\n${stats.byStatus?.active || 0}`
          },
          {
            type: "mrkdwn",
            text: `*On Hold:*\n${stats.byStatus?.hold || 0}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Open Issues:* ${stats.openIssues || 0} | *Critical:* ${stats.criticalIssues || 0}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_Generated automatically by P5 Dashboard_`
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: ":chart_with_upwards_trend: View Full Dashboard",
              emoji: true
            },
            url: dashboardUrl,
            style: "primary"
          }
        ]
      }
    ]
  };
}

/**
 * 조건에 따라 Slack 알림 전송 (내부 트리거 함수)
 * @param {string} eventType - 이벤트 타입
 * @param {Object} eventData - 이벤트 데이터
 */
function triggerSlackNotification_(eventType, eventData) {
  const webhookUrl = SLACK_CONFIG.getWebhookUrl();
  const settings = SLACK_CONFIG.getNotificationSettings();

  if (!webhookUrl) {
    console.log("[Slack] Webhook URL not configured, skipping notification");
    return;
  }

  let payload = null;
  let shouldSend = false;

  switch (eventType) {
    case "criticalIssue":
      shouldSend = settings.criticalIssue && eventData.severity === "critical";
      if (shouldSend) {
        payload = createCriticalIssueSlackPayload_(eventData.issueData, eventData.issueId);
      }
      break;

    case "statusChange":
      const isDelay = settings.statusDelay && eventData.newStatus === "delay";
      const isBlocked = settings.statusBlocked &&
                        (eventData.newStatus === "blocked" || eventData.newStatus.startsWith("hold"));
      shouldSend = isDelay || isBlocked;
      if (shouldSend) {
        payload = createStatusChangeSlackPayload_(
          eventData.newStatus,
          eventData.affectedColumns || [eventData.uid],
          eventData.user
        );
      }
      break;

    case "bulkUpdate":
      shouldSend = settings.bulkUpdate && eventData.updateCount >= 10;
      if (shouldSend) {
        payload = createBulkUpdateSlackPayload_(
          eventData.updateCount,
          eventData.updateType,
          eventData.newValue,
          eventData.user
        );
      }
      break;

    case "dailySummary":
      shouldSend = settings.dailySummary;
      if (shouldSend) {
        payload = createDailySummarySlackPayload_(eventData.stats);
      }
      break;

    case "issueResolved":
      shouldSend = settings.issueResolved;
      if (shouldSend) {
        payload = createIssueResolvedSlackPayload_(eventData.issueId, eventData.resolution, eventData.user);
      }
      break;

    default:
      console.log(`[Slack] Unknown event type: ${eventType}`);
      return;
  }

  if (shouldSend && payload) {
    const result = sendSlackNotification(webhookUrl, payload);
    if (!result.success) {
      console.error(`[Slack] Failed to send ${eventType} notification:`, result.error);
    }
  }
}

/**
 * Slack Block Kit 메시지 생성 - 이슈 해결 알림
 * @param {string} issueId - 이슈 ID
 * @param {Object} resolution - 해결 정보
 * @param {string} user - 처리자
 * @returns {Object} Slack Block Kit payload
 */
function createIssueResolvedSlackPayload_(issueId, resolution, user) {
  const dashboardUrl = SLACK_CONFIG.getDashboardUrl();
  const timestamp = getKSTTimestamp_();

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":white_check_mark: P5 Issue Resolved",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Issue ID:* \`${issueId}\` has been resolved`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Resolved by:*\n${user}`
          },
          {
            type: "mrkdwn",
            text: `*Timestamp:*\n${timestamp}`
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: resolution.notes ? `*Notes:* ${resolution.notes}` : "_No resolution notes provided_"
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: ":chart_with_upwards_trend: Open Dashboard",
              emoji: true
            },
            url: dashboardUrl
          }
        ]
      }
    ]
  };
}

/**
 * Slack Webhook 설정 저장 (POST API)
 * @param {Object} payload - { webhookUrl, settings }
 * @returns {Object} 저장 결과
 */
function saveSlackSettings(payload) {
  try {
    const userProps = PropertiesService.getUserProperties();

    // Webhook URL 저장 (마스킹 없이 저장, UI에서만 마스킹)
    if (payload.webhookUrl !== undefined) {
      if (payload.webhookUrl === "") {
        userProps.deleteProperty("SLACK_WEBHOOK_URL");
      } else {
        userProps.setProperty("SLACK_WEBHOOK_URL", payload.webhookUrl);
      }
    }

    // 알림 설정 저장
    if (payload.settings) {
      userProps.setProperty("SLACK_NOTIFICATION_SETTINGS", JSON.stringify(payload.settings));
    }

    return {
      success: true,
      message: "Slack settings saved successfully",
      timestamp: getKSTTimestamp_()
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to save Slack settings: ${e.message}`
    };
  }
}

/**
 * Slack Webhook 설정 조회 (GET API)
 * @returns {Object} 현재 설정 (Webhook URL은 마스킹 처리)
 */
function getSlackSettings() {
  const webhookUrl = SLACK_CONFIG.getWebhookUrl();
  const settings = SLACK_CONFIG.getNotificationSettings();

  // Webhook URL 마스킹 (앞 20자 + *** + 마지막 10자)
  let maskedUrl = "";
  if (webhookUrl) {
    if (webhookUrl.length > 35) {
      maskedUrl = webhookUrl.substring(0, 25) + "***" + webhookUrl.substring(webhookUrl.length - 10);
    } else {
      maskedUrl = webhookUrl.substring(0, 10) + "***";
    }
  }

  return {
    success: true,
    webhookConfigured: !!webhookUrl,
    webhookUrlMasked: maskedUrl,
    settings: settings,
    timestamp: getKSTTimestamp_()
  };
}

/**
 * Slack 테스트 알림 전송 (POST API)
 * @returns {Object} 전송 결과
 */
function sendSlackTestNotification() {
  const webhookUrl = SLACK_CONFIG.getWebhookUrl();

  if (!webhookUrl) {
    return {
      success: false,
      error: "Webhook URL is not configured. Please save your Webhook URL first."
    };
  }

  const testPayload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":test_tube: P5 Dashboard Test Notification",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "This is a test notification from P5 Dashboard.\n\n:white_check_mark: *Slack integration is working correctly!*"
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Timestamp:* ${getKSTTimestamp_()}`
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: ":chart_with_upwards_trend: Open Dashboard",
              emoji: true
            },
            url: SLACK_CONFIG.getDashboardUrl(),
            style: "primary"
          }
        ]
      }
    ]
  };

  return sendSlackNotification(webhookUrl, testPayload);
}

/**
 * 일일 진행률 요약 전송 (시간 기반 트리거용)
 * Apps Script 트리거에서 매일 특정 시간에 호출
 */
function sendDailyProgressSummary() {
  const settings = SLACK_CONFIG.getNotificationSettings();

  if (!settings.dailySummary) {
    console.log("[Slack] Daily summary is disabled");
    return { success: false, error: "Daily summary is disabled" };
  }

  // 전체 통계 조회
  const floorStats = getAllFloorStats();
  if (!floorStats.success) {
    return { success: false, error: "Failed to get floor stats" };
  }

  // 이슈 통계 조회
  const issuesResult = getIssues("open");
  const openIssues = issuesResult.issues || [];
  const criticalIssues = openIssues.filter(i => i.severity === "critical").length;

  const stats = {
    ...floorStats.summary,
    openIssues: openIssues.length,
    criticalIssues: criticalIssues
  };

  triggerSlackNotification_("dailySummary", { stats });

  return {
    success: true,
    message: "Daily summary sent",
    stats
  };
}

// ===== Phase 12: Email Notification Integration =====

/**
 * Email 알림 설정 (PropertiesService 사용)
 */
const EMAIL_CONFIG = {
  // 수신자 이메일 목록 조회
  getRecipients: function() {
    const recipientsJson = PropertiesService.getUserProperties().getProperty("EMAIL_RECIPIENTS");
    return recipientsJson ? JSON.parse(recipientsJson) : [];
  },

  // 알림 활성화 여부 조회
  getNotificationSettings: function() {
    const settingsJson = PropertiesService.getUserProperties().getProperty("EMAIL_NOTIFICATION_SETTINGS");
    const defaults = {
      criticalIssue: true,        // Critical 이슈 생성 시
      statusDelay: true,          // 기둥 상태가 "delay"로 변경 시
      statusBlocked: true,        // 기둥 상태가 "blocked"로 변경 시
      bulkUpdate: true,           // 대량 상태 변경 (10개 이상) 시
      weeklySummary: false,       // 주간 진행률 요약 리포트
      issueResolved: false        // 이슈 해결 시
    };

    if (settingsJson) {
      return { ...defaults, ...JSON.parse(settingsJson) };
    }
    return defaults;
  },

  // 대시보드 URL
  getDashboardUrl: function() {
    return PropertiesService.getScriptProperties().getProperty("DASHBOARD_URL") ||
           "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
  }
};

/**
 * HTML 이메일 템플릿 기본 레이아웃
 * @param {string} title - 이메일 제목
 * @param {string} content - 본문 내용 (HTML)
 * @param {string} accentColor - 강조 색상 (hex)
 * @returns {string} HTML 이메일 템플릿
 */
function createEmailTemplate_(title, content, accentColor = "#238636") {
  const dashboardUrl = EMAIL_CONFIG.getDashboardUrl();
  const timestamp = getKSTTimestamp_();

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color:#0d1117; color:#c9d1d9;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0d1117;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px; background-color:#161b22; border:1px solid #30363d; border-radius:12px; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${accentColor} 0%, #1a2735 100%); padding:24px 32px; text-align:center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin:0; font-size:24px; font-weight:700; color:#ffffff; letter-spacing:-0.5px;">
                      P5 Dashboard
                    </h1>
                    <p style="margin:8px 0 0 0; font-size:12px; color:rgba(255,255,255,0.8);">
                      복합동 구조 통합 관리 시스템
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Bar -->
          <tr>
            <td style="background-color:#21262d; padding:16px 32px; border-bottom:1px solid #30363d;">
              <h2 style="margin:0; font-size:18px; font-weight:600; color:#ffffff;">
                ${title}
              </h2>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:24px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:6px; background-color:${accentColor};">
                    <a href="${dashboardUrl}" target="_blank" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                      대시보드 열기 &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0d1117; padding:20px 32px; border-top:1px solid #30363d;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size:11px; color:#8b949e;">
                    <p style="margin:0;">
                      이 알림은 P5 Dashboard에서 자동으로 발송되었습니다.
                    </p>
                    <p style="margin:8px 0 0 0;">
                      발송 시각: ${timestamp}
                    </p>
                  </td>
                  <td style="text-align:right; font-size:11px; color:#8b949e;">
                    <a href="${dashboardUrl}#settings" style="color:#58a6ff; text-decoration:none;">
                      알림 설정 변경
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Critical 이슈 이메일 생성
 */
function createCriticalIssueEmailContent_(issueData, issueId) {
  const severityColors = {
    critical: "#da3633",
    high: "#d29922",
    medium: "#2f81f7",
    low: "#238636"
  };

  const severityLabels = {
    critical: "긴급 (Critical)",
    high: "높음 (High)",
    medium: "중간 (Medium)",
    low: "낮음 (Low)"
  };

  const severityColor = severityColors[issueData.severity] || "#8b949e";
  const severityLabel = severityLabels[issueData.severity] || issueData.severity;

  const affectedCount = issueData.affectedColumns?.length || 0;
  const affectedList = issueData.affectedColumns?.slice(0, 5).join(", ") || "-";
  const moreCount = affectedCount > 5 ? ` 외 ${affectedCount - 5}개` : "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:16px; background-color:#21262d; border-radius:8px; border-left:4px solid ${severityColor};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <span style="display:inline-block; padding:4px 12px; background-color:${severityColor}; color:#ffffff; font-size:11px; font-weight:600; border-radius:4px; text-transform:uppercase;">
                  ${severityLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <h3 style="margin:0; font-size:16px; color:#ffffff; font-weight:600;">
                  ${issueData.title || "새로운 이슈"}
                </h3>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;">
                <p style="margin:0; font-size:13px; color:#8b949e; line-height:1.5;">
                  ${issueData.description || "설명이 없습니다."}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:12px 16px; background-color:#0d1117; border:1px solid #30363d; border-radius:6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">이슈 ID</span>
                <span style="float:right; font-size:12px; color:#c9d1d9; font-family:monospace;">${issueId}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">이슈 유형</span>
                <span style="float:right; font-size:12px; color:#c9d1d9;">${issueData.type || "-"}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">영향 기둥</span>
                <span style="float:right; font-size:12px; color:#c9d1d9;">${affectedCount}개</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="font-size:12px; color:#8b949e;">기둥 목록</span>
                <div style="margin-top:4px; font-size:11px; color:#58a6ff; font-family:monospace;">
                  ${affectedList}${moreCount}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:12px; color:#8b949e;">
      즉시 조치가 필요합니다. 대시보드에서 상세 내용을 확인하세요.
    </p>
  `;
}

/**
 * 상태 변경 이메일 생성
 */
function createStatusChangeEmailContent_(eventType, affectedColumns, user) {
  const eventConfig = {
    delay: { emoji: "⏳", label: "지연 (Delay)", color: "#d29922" },
    blocked: { emoji: "🚫", label: "중단 (Blocked)", color: "#da3633" },
    hold: { emoji: "⏸️", label: "보류 (Hold)", color: "#6e7681" }
  };

  const config = eventConfig[eventType] || eventConfig.delay;
  const affectedCount = affectedColumns?.length || 0;
  const affectedList = affectedColumns?.slice(0, 10).join(", ") || "-";
  const moreCount = affectedCount > 10 ? ` 외 ${affectedCount - 10}개` : "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:16px; background-color:#21262d; border-radius:8px; border-left:4px solid ${config.color};">
          <h3 style="margin:0; font-size:16px; color:#ffffff;">
            ${config.emoji} 기둥 상태 변경 알림
          </h3>
          <p style="margin:8px 0 0 0; font-size:13px; color:#8b949e;">
            ${affectedCount}개 기둥이 <strong style="color:${config.color};">${config.label}</strong> 상태로 변경되었습니다.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:12px 16px; background-color:#0d1117; border:1px solid #30363d; border-radius:6px;">
          <p style="margin:0 0 8px 0; font-size:11px; color:#8b949e; text-transform:uppercase; letter-spacing:0.5px;">
            영향받은 기둥
          </p>
          <p style="margin:0; font-size:12px; color:#58a6ff; font-family:monospace; line-height:1.6;">
            ${affectedList}${moreCount}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:12px; color:#8b949e;">
      변경자: <strong style="color:#c9d1d9;">${user || "System"}</strong>
    </p>
  `;
}

/**
 * 대량 업데이트 이메일 생성
 */
function createBulkUpdateEmailContent_(updateCount, updateType, newValue, user) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:16px; background-color:#21262d; border-radius:8px; border-left:4px solid #2f81f7;">
          <h3 style="margin:0; font-size:16px; color:#ffffff;">
            📦 대량 업데이트 알림
          </h3>
          <p style="margin:8px 0 0 0; font-size:13px; color:#8b949e;">
            <strong style="color:#58a6ff;">${updateCount}개</strong> 기둥이 일괄 업데이트되었습니다.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:12px 16px; background-color:#0d1117; border:1px solid #30363d; border-radius:6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">업데이트 유형</span>
                <span style="float:right; font-size:12px; color:#c9d1d9;">${updateType}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">새 값</span>
                <span style="float:right; font-size:12px; color:#58a6ff;">${newValue}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="font-size:12px; color:#8b949e;">변경자</span>
                <span style="float:right; font-size:12px; color:#c9d1d9;">${user || "System"}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * 주간 요약 이메일 생성
 */
function createWeeklySummaryEmailContent_(stats) {
  const progressPercent = stats.progressPercent || 0;
  const progressBarWidth = Math.min(100, Math.max(0, progressPercent));

  const progressColor = progressPercent >= 80 ? "#238636" :
                        progressPercent >= 50 ? "#d29922" : "#da3633";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:16px; background-color:#21262d; border-radius:8px;">
          <h3 style="margin:0 0 16px 0; font-size:16px; color:#ffffff;">
            📊 주간 진행률 요약
          </h3>

          <!-- Progress Bar -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="background-color:#0d1117; border-radius:4px; padding:2px;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:${progressBarWidth}%; min-width:1%;">
                  <tr>
                    <td style="background-color:${progressColor}; height:24px; border-radius:3px; text-align:center;">
                      <span style="font-size:12px; font-weight:600; color:#ffffff;">
                        ${progressPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:12px 16px; background-color:#0d1117; border:1px solid #30363d; border-radius:6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">전체 기둥</span>
                <span style="float:right; font-size:12px; color:#c9d1d9;">${stats.totalColumns || 0}개</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">완료</span>
                <span style="float:right; font-size:12px; color:#238636;">${stats.completedColumns || 0}개</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">진행 중</span>
                <span style="float:right; font-size:12px; color:#2f81f7;">${stats.inProgressColumns || 0}개</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">지연/중단</span>
                <span style="float:right; font-size:12px; color:#da3633;">${stats.delayedColumns || 0}개</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="font-size:12px; color:#8b949e;">미해결 이슈</span>
                <span style="float:right; font-size:12px; color:#d29922;">${stats.openIssues || 0}개</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:12px; color:#8b949e;">
      대시보드에서 상세 현황을 확인하세요.
    </p>
  `;
}

/**
 * 이메일 알림 전송
 * @param {string} subject - 이메일 제목
 * @param {string} htmlBody - HTML 본문
 * @param {Array<string>} recipients - 수신자 목록 (optional, 기본값: 설정된 수신자)
 * @returns {Object} 전송 결과
 */
function sendEmailNotification(subject, htmlBody, recipients = null) {
  const recipientList = recipients || EMAIL_CONFIG.getRecipients();

  if (!recipientList || recipientList.length === 0) {
    return { success: false, error: "No email recipients configured" };
  }

  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  recipientList.forEach(email => {
    try {
      MailApp.sendEmail({
        to: email,
        subject: `[P5 Dashboard] ${subject}`,
        htmlBody: htmlBody,
        name: "P5 Dashboard Alert"
      });
      results.success++;
      console.log(`[Email] Sent to ${email}`);
    } catch (e) {
      results.failed++;
      results.errors.push({ email, error: e.message });
      console.error(`[Email] Failed to send to ${email}:`, e);
    }
  });

  return {
    success: results.success > 0,
    sentCount: results.success,
    failedCount: results.failed,
    errors: results.errors
  };
}

/**
 * 이벤트 기반 이메일 알림 트리거
 * @param {string} eventType - 이벤트 유형
 * @param {Object} eventData - 이벤트 데이터
 */
function triggerEmailNotification_(eventType, eventData) {
  const recipients = EMAIL_CONFIG.getRecipients();
  const settings = EMAIL_CONFIG.getNotificationSettings();

  if (!recipients || recipients.length === 0) {
    console.log("[Email] No recipients configured, skipping notification");
    return;
  }

  let subject = "";
  let content = "";
  let accentColor = "#238636";
  let shouldSend = false;

  switch (eventType) {
    case "criticalIssue":
      shouldSend = settings.criticalIssue && eventData.severity === "critical";
      if (shouldSend) {
        subject = "긴급 이슈 발생";
        accentColor = "#da3633";
        content = createCriticalIssueEmailContent_(eventData.issueData, eventData.issueId);
      }
      break;

    case "statusChange":
      const isDelay = settings.statusDelay && eventData.newStatus === "delay";
      const isBlocked = settings.statusBlocked &&
                        (eventData.newStatus === "blocked" || eventData.newStatus.startsWith("hold"));
      shouldSend = isDelay || isBlocked;
      if (shouldSend) {
        subject = `기둥 상태 변경: ${eventData.newStatus.toUpperCase()}`;
        accentColor = eventData.newStatus === "blocked" ? "#da3633" : "#d29922";
        content = createStatusChangeEmailContent_(
          eventData.newStatus,
          eventData.affectedColumns || [eventData.uid],
          eventData.user
        );
      }
      break;

    case "bulkUpdate":
      shouldSend = settings.bulkUpdate && eventData.updateCount >= 10;
      if (shouldSend) {
        subject = `대량 업데이트: ${eventData.updateCount}개 기둥`;
        accentColor = "#2f81f7";
        content = createBulkUpdateEmailContent_(
          eventData.updateCount,
          eventData.updateType,
          eventData.newValue,
          eventData.user
        );
      }
      break;

    case "weeklySummary":
      shouldSend = settings.weeklySummary;
      if (shouldSend) {
        subject = "주간 진행률 요약 리포트";
        accentColor = "#238636";
        content = createWeeklySummaryEmailContent_(eventData.stats);
      }
      break;

    case "issueResolved":
      shouldSend = settings.issueResolved;
      if (shouldSend) {
        subject = `이슈 해결: ${eventData.issueId}`;
        accentColor = "#238636";
        content = createIssueResolvedEmailContent_(eventData.issueId, eventData.resolution, eventData.user);
      }
      break;
  }

  if (shouldSend && content) {
    const htmlBody = createEmailTemplate_(subject, content, accentColor);
    const result = sendEmailNotification(subject, htmlBody, recipients);
    if (!result.success) {
      console.error(`[Email] Failed to send ${eventType} notification:`, result.errors);
    }
  }
}

/**
 * 이슈 해결 이메일 생성
 */
function createIssueResolvedEmailContent_(issueId, resolution, user) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:16px; background-color:#21262d; border-radius:8px; border-left:4px solid #238636;">
          <h3 style="margin:0; font-size:16px; color:#ffffff;">
            ✅ 이슈가 해결되었습니다
          </h3>
          <p style="margin:8px 0 0 0; font-size:13px; color:#8b949e;">
            이슈 ID: <strong style="color:#58a6ff; font-family:monospace;">${issueId}</strong>
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:12px 16px; background-color:#0d1117; border:1px solid #30363d; border-radius:6px;">
          <p style="margin:0 0 8px 0; font-size:11px; color:#8b949e; text-transform:uppercase; letter-spacing:0.5px;">
            해결 내용
          </p>
          <p style="margin:0; font-size:13px; color:#c9d1d9; line-height:1.5;">
            ${resolution || "상세 내용이 없습니다."}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:12px; color:#8b949e;">
      해결자: <strong style="color:#c9d1d9;">${user || "System"}</strong>
    </p>
  `;
}

/**
 * Email 설정 저장
 * @param {Object} payload - 설정 데이터
 * @returns {Object} 저장 결과
 */
function saveEmailSettings(payload) {
  try {
    const userProps = PropertiesService.getUserProperties();

    // 수신자 목록 저장
    if (payload.recipients !== undefined) {
      if (Array.isArray(payload.recipients)) {
        // 이메일 형식 검증
        const validEmails = payload.recipients.filter(email => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        });
        userProps.setProperty("EMAIL_RECIPIENTS", JSON.stringify(validEmails));
      } else if (payload.recipients === "") {
        userProps.deleteProperty("EMAIL_RECIPIENTS");
      }
    }

    // 알림 설정 저장
    if (payload.settings) {
      userProps.setProperty("EMAIL_NOTIFICATION_SETTINGS", JSON.stringify(payload.settings));
    }

    return {
      success: true,
      message: "Email settings saved successfully",
      recipientCount: EMAIL_CONFIG.getRecipients().length
    };
  } catch (e) {
    console.error("[Email] Error saving settings:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Email 설정 조회
 * @returns {Object} 현재 설정
 */
function getEmailSettings() {
  const recipients = EMAIL_CONFIG.getRecipients();
  const settings = EMAIL_CONFIG.getNotificationSettings();

  return {
    success: true,
    recipientCount: recipients.length,
    recipients: recipients, // 전체 목록 반환 (보안 상 마스킹 필요시 수정)
    settings: settings
  };
}

/**
 * 테스트 이메일 전송
 * @returns {Object} 전송 결과
 */
function sendEmailTestNotification() {
  const recipients = EMAIL_CONFIG.getRecipients();

  if (!recipients || recipients.length === 0) {
    return {
      success: false,
      error: "No email recipients configured. Please add recipients first."
    };
  }

  const testContent = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:16px; background-color:#21262d; border-radius:8px; border-left:4px solid #238636;">
          <h3 style="margin:0; font-size:16px; color:#ffffff;">
            🧪 테스트 알림
          </h3>
          <p style="margin:8px 0 0 0; font-size:13px; color:#8b949e;">
            이 메시지가 보인다면 이메일 알림이 정상적으로 작동하고 있습니다!
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:12px 16px; background-color:#0d1117; border:1px solid #30363d; border-radius:6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #21262d;">
                <span style="font-size:12px; color:#8b949e;">수신자 수</span>
                <span style="float:right; font-size:12px; color:#c9d1d9;">${recipients.length}명</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="font-size:12px; color:#8b949e;">설정 상태</span>
                <span style="float:right; font-size:12px; color:#238636;">✓ 정상</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:12px; color:#8b949e;">
      실제 이벤트 발생 시 이와 유사한 형식의 알림이 전송됩니다.
    </p>
  `;

  const htmlBody = createEmailTemplate_("테스트 알림", testContent, "#238636");

  return sendEmailNotification("테스트 알림", htmlBody, recipients);
}

/**
 * 주간 진행률 요약 이메일 전송 (시간 기반 트리거용)
 * Apps Script 트리거에서 매주 특정 요일/시간에 호출
 */
function sendWeeklyProgressSummaryEmail() {
  const settings = EMAIL_CONFIG.getNotificationSettings();

  if (!settings.weeklySummary) {
    console.log("[Email] Weekly summary is disabled");
    return { success: false, error: "Weekly summary is disabled" };
  }

  // 통계 데이터 수집
  const allColumns = getColumns_(null).filter(col => col.status);
  const totalColumns = allColumns.length;
  const completedColumns = allColumns.filter(col =>
    col.status === "completed" || col.status === "done"
  ).length;
  const inProgressColumns = allColumns.filter(col =>
    col.status === "in_progress" || col.status === "ongoing"
  ).length;
  const delayedColumns = allColumns.filter(col =>
    col.status === "delay" || col.status === "blocked" || col.status.startsWith("hold")
  ).length;

  const issues = getIssues_();
  const openIssues = issues.filter(issue => issue.status === "open").length;

  const progressPercent = totalColumns > 0 ? (completedColumns / totalColumns) * 100 : 0;

  const stats = {
    totalColumns,
    completedColumns,
    inProgressColumns,
    delayedColumns,
    openIssues,
    progressPercent
  };

  triggerEmailNotification_("weeklySummary", { stats });

  return {
    success: true,
    message: "Weekly summary email sent",
    stats
  };
}

// ===== Apps Script UI Integration =====

/**
 * 스프레드시트가 열릴 때 실행되는 함수
 * 상단 메뉴에 'P5 Dashboard' 메뉴를 추가합니다.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("P5 Dashboard")
    .addItem("🛠️ Add FloorID Column (Phase 9)", "migrateAddFloorIdColumn")
    .addItem("🛠️ Generate All Floor Data (11F)", "generateAllFloorData")
    .addSeparator()
    .addItem("📊 Initialize Floor/Jeolju Sheets", "initializeFloorJeoljuSheets")
    .addSeparator()
    .addItem("🔔 Send Slack Test Notification", "sendSlackTestNotification")
    .addItem("📧 Send Email Test Notification", "sendEmailTestNotification")
    .addSeparator()
    .addItem("📈 Send Daily Progress Summary (Slack)", "sendDailyProgressSummary")
    .addItem("📊 Send Weekly Progress Summary (Email)", "sendWeeklyProgressSummaryEmail")
    .addToUi();
}
