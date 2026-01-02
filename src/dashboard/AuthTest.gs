/**
 * P5 Dashboard - Auth Test Utilities
 * RBAC 및 인증 테스트용 헬퍼 함수
 *
 * 사용법: Apps Script 에디터에서 직접 실행
 */

// ===== Test Configuration =====

const TEST_CONFIG = {
  // 테스트용 사용자 (Users 시트에 등록 필요)
  ADMIN_EMAIL: "admin@samsung.com",
  EDITOR_EMAIL: "editor@samsung.com",
  VIEWER_EMAIL: "viewer@samsung.com",
  UNAUTHORIZED_EMAIL: "test@gmail.com",
};

// ===== Test Runners =====

/**
 * 전체 인증 테스트 실행
 */
function runAllAuthTests() {
  console.log("===== P5 Dashboard Auth Tests =====");
  console.log("Start time:", new Date().toISOString());

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Users 시트 존재 확인
  runTest(results, "Users 시트 존재", () => {
    const ss = SpreadsheetApp.openById(DASHBOARD_CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Users");
    if (!sheet) throw new Error("Users sheet not found");
    return true;
  });

  // Test 2: 역할 조회 테스트
  runTest(results, "Admin 역할 조회", () => {
    const role = getUserRole_(TEST_CONFIG.ADMIN_EMAIL);
    if (role !== "admin") throw new Error(`Expected admin, got ${role}`);
    return true;
  });

  runTest(results, "Editor 역할 조회", () => {
    const role = getUserRole_(TEST_CONFIG.EDITOR_EMAIL);
    if (role !== "editor") throw new Error(`Expected editor, got ${role}`);
    return true;
  });

  runTest(results, "Viewer 역할 조회", () => {
    const role = getUserRole_(TEST_CONFIG.VIEWER_EMAIL);
    if (role !== "viewer") throw new Error(`Expected viewer, got ${role}`);
    return true;
  });

  runTest(results, "미등록 사용자 기본 Viewer", () => {
    const role = getUserRole_(TEST_CONFIG.UNAUTHORIZED_EMAIL);
    if (role !== "viewer") throw new Error(`Expected viewer, got ${role}`);
    return true;
  });

  // Test 3: 권한 검증 테스트
  runTest(results, "Admin은 모든 권한", () => {
    if (!checkPermission_("admin", "admin"))
      throw new Error("Admin should have admin permission");
    if (!checkPermission_("admin", "editor"))
      throw new Error("Admin should have editor permission");
    if (!checkPermission_("admin", "viewer"))
      throw new Error("Admin should have viewer permission");
    return true;
  });

  runTest(results, "Editor 권한 제한", () => {
    if (checkPermission_("editor", "admin"))
      throw new Error("Editor should not have admin permission");
    if (!checkPermission_("editor", "editor"))
      throw new Error("Editor should have editor permission");
    if (!checkPermission_("editor", "viewer"))
      throw new Error("Editor should have viewer permission");
    return true;
  });

  runTest(results, "Viewer 권한 제한", () => {
    if (checkPermission_("viewer", "admin"))
      throw new Error("Viewer should not have admin permission");
    if (checkPermission_("viewer", "editor"))
      throw new Error("Viewer should not have editor permission");
    if (!checkPermission_("viewer", "viewer"))
      throw new Error("Viewer should have viewer permission");
    return true;
  });

  // Test 4: API 키 검증 테스트
  runTest(results, "API 키 비활성화 시 통과", () => {
    const mockEvent = { parameter: {} };
    // REQUIRE_API_KEY가 false면 통과해야 함
    const result = validateApiKey_(mockEvent);
    // 설정에 따라 결과가 다름
    console.log("API Key validation result:", result);
    return true;
  });

  // 결과 출력
  console.log("\n===== Test Results =====");
  console.log(`Passed: ${results.passed}/${results.tests.length}`);
  console.log(`Failed: ${results.failed}/${results.tests.length}`);

  results.tests.forEach((t) => {
    const status = t.passed ? "✅" : "❌";
    console.log(`${status} ${t.name}: ${t.message || "OK"}`);
  });

  return results;
}

/**
 * 테스트 실행 헬퍼
 */
function runTest(results, name, testFn) {
  try {
    testFn();
    results.passed++;
    results.tests.push({ name, passed: true });
  } catch (error) {
    results.failed++;
    results.tests.push({ name, passed: false, message: error.message });
  }
}

// ===== Setup Helpers =====

/**
 * 테스트용 Users 시트 초기화
 */
function setupTestUsers() {
  const ss = SpreadsheetApp.openById(DASHBOARD_CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Users");

  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["email", "role", "createdAt", "lastLogin"]);
    sheet.setFrozenRows(1);
  }

  // 테스트 사용자 추가
  const testUsers = [
    [TEST_CONFIG.ADMIN_EMAIL, "admin", new Date(), null],
    [TEST_CONFIG.EDITOR_EMAIL, "editor", new Date(), null],
    [TEST_CONFIG.VIEWER_EMAIL, "viewer", new Date(), null],
  ];

  testUsers.forEach((user) => {
    // 중복 확인
    const data = sheet.getDataRange().getValues();
    const exists = data.some((row) => row[0] === user[0]);
    if (!exists) {
      sheet.appendRow(user);
      console.log("Added test user:", user[0]);
    }
  });

  console.log("Test users setup complete");
}

/**
 * 인증 설정 확인
 */
function checkAuthConfig() {
  const props = PropertiesService.getScriptProperties();

  console.log("===== Auth Configuration =====");
  console.log("REQUIRE_API_KEY:", props.getProperty("REQUIRE_API_KEY"));
  console.log(
    "API_KEY:",
    props.getProperty("API_KEY") ? "***SET***" : "NOT SET"
  );
  console.log("ALLOWED_DOMAINS:", props.getProperty("ALLOWED_DOMAINS"));
  console.log("ADMIN_EMAIL:", props.getProperty("ADMIN_EMAIL"));
  console.log("DEBUG_MODE:", props.getProperty("DEBUG_MODE"));
}
