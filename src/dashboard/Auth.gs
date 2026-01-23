/**
 * P5 Dashboard - Authentication Helpers (Backend)
 * Google ID Token 검증 및 RBAC
 * @version 1.0.0
 */

// ===== Token Validation =====

/**
 * Google ID Token 검증
 * @param {string} idToken - JWT ID Token
 * @returns {Object} {valid, email, name, role, error, code}
 */
function validateIdToken_(idToken) {
  if (!idToken) {
    return { valid: false, error: "No token provided", code: 401 };
  }

  try {
    const response = UrlFetchApp.fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      { muteHttpExceptions: true }
    );

    if (response.getResponseCode() !== 200) {
      return { valid: false, error: "Invalid token", code: 401 };
    }

    const payload = JSON.parse(response.getContentText());

    // 도메인 검증
    const allowedDomains = (
      PropertiesService.getScriptProperties().getProperty("ALLOWED_DOMAINS") ||
      ""
    )
      .split(",")
      .filter((d) => d.trim());

    if (allowedDomains.length > 0 && !allowedDomains.includes(payload.hd)) {
      return {
        valid: false,
        error: "Unauthorized domain: " + payload.hd,
        code: 403,
      };
    }

    // 토큰 만료 확인
    const exp = parseInt(payload.exp, 10) * 1000;
    if (exp < Date.now()) {
      return { valid: false, error: "Token expired", code: 401 };
    }

    return {
      valid: true,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      domain: payload.hd,
      role: getUserRole_(payload.email),
    };
  } catch (error) {
    console.error("[Auth] Token validation error:", error);
    return { valid: false, error: error.message, code: 500 };
  }
}

/**
 * Bearer 토큰 추출 (다중 소스 지원)
 * 우선순위: 1. Authorization 헤더 2. query parameter 3. POST body
 * @param {Object} e - 이벤트 객체
 * @returns {string|null} ID Token
 */
function extractBearerToken_(e) {
  // 1. Authorization 헤더에서 Bearer 토큰 추출 시도
  // GAS Web App에서 헤더 접근 방법: e.parameter에 'authorization' 키로 전달되거나
  // 또는 X-Authorization 커스텀 헤더 사용
  if (e.parameter) {
    // X-Authorization 헤더 (커스텀 헤더로 우회)
    if (e.parameter['X-Authorization']) {
      const authHeader = e.parameter['X-Authorization'];
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return authHeader;
    }

    // 직접 token 파라미터
    if (e.parameter.token) {
      return e.parameter.token;
    }
  }

  // 2. POST 요청의 경우 body에서 추출
  if (e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);

      // Authorization 필드 (Bearer 토큰 형식)
      if (body.authorization) {
        const auth = body.authorization;
        if (auth.startsWith('Bearer ')) {
          return auth.substring(7);
        }
        return auth;
      }

      // 직접 토큰 필드
      return body.token || body.idToken || null;
    } catch {
      return null;
    }
  }

  return null;
}

// ===== RBAC (Role-Based Access Control) =====

/**
 * 사용자 역할 조회
 * @param {string} email - 사용자 이메일
 * @returns {string} 역할 (admin, editor, viewer)
 */
function getUserRole_(email) {
  if (!email) return "viewer";

  try {
    const ss = SpreadsheetApp.openById(DASHBOARD_CONFIG.SPREADSHEET_ID);
    const usersSheet = ss.getSheetByName("Users");

    if (!usersSheet) {
      // Users 시트가 없으면 기본 viewer
      console.warn("[Auth] Users sheet not found, defaulting to viewer");
      return "viewer";
    }

    const data = usersSheet.getDataRange().getValues();
    // 첫 번째 행은 헤더로 가정: [email, role, createdAt, lastLogin]
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        // 마지막 로그인 시간 업데이트
        usersSheet.getRange(i + 1, 4).setValue(new Date());
        return data[i][1] || "viewer";
      }
    }

    return "viewer";
  } catch (error) {
    console.error("[Auth] Error getting user role:", error);
    return "viewer";
  }
}

/**
 * 권한 검증
 * @param {string} userRole - 사용자 역할
 * @param {string} requiredRole - 필요한 최소 역할
 * @returns {boolean} 권한 있음 여부
 */
function checkPermission_(userRole, requiredRole) {
  const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

// ===== Auth Middleware =====

/**
 * 인증 미들웨어 (doGet/doPost에서 호출)
 * @param {Object} e - 이벤트 객체
 * @param {string} requiredRole - 필요한 역할 (기본: viewer)
 * @returns {Object} {authenticated, user, error, code}
 */
function authMiddleware_(e, requiredRole = "viewer") {
  // API Key 인증 (기존 방식 호환)
  if (validateApiKey_(e)) {
    return {
      authenticated: true,
      user: { email: "api@system", role: "admin" },
    };
  }

  // ID Token 인증 (새 방식)
  const token = extractBearerToken_(e);
  if (!token) {
    return {
      authenticated: false,
      error: "No authentication provided",
      code: 401,
    };
  }

  const validation = validateIdToken_(token);
  if (!validation.valid) {
    return {
      authenticated: false,
      error: validation.error,
      code: validation.code,
    };
  }

  // 권한 검증
  if (!checkPermission_(validation.role, requiredRole)) {
    return {
      authenticated: false,
      error: `Insufficient permissions. Required: ${requiredRole}, Current: ${validation.role}`,
      code: 403,
    };
  }

  return { authenticated: true, user: validation };
}

// ===== Users Sheet 초기화 =====

/**
 * Users 시트 생성 (관리자용)
 */
function initializeUsersSheet() {
  const ss = SpreadsheetApp.openById(DASHBOARD_CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Users");

  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["email", "role", "createdAt", "lastLogin"]);
    sheet.setFrozenRows(1);
    console.log("[Auth] Users sheet created");
  }

  // 관리자 계정 추가 (필요 시)
  const adminEmail =
    PropertiesService.getScriptProperties().getProperty("ADMIN_EMAIL");
  if (adminEmail) {
    const data = sheet.getDataRange().getValues();
    const exists = data.some((row) => row[0] === adminEmail);
    if (!exists) {
      sheet.appendRow([adminEmail, "admin", new Date(), null]);
      console.log("[Auth] Admin user added:", adminEmail);
    }
  }

  return { success: true, message: "Users sheet initialized" };
}
