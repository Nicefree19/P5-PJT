/**
 * E2E Test Fixtures
 * 테스트용 고정 데이터
 */

export const TEST_ZONES = [
  { id: 'zone_a', name: 'ZONE A (FAB)', startCol: 3, endCol: 111, color: '#3b82f6' },
  { id: 'zone_b', name: 'ZONE B (CUB)', startCol: 112, endCol: 220, color: '#22c55e' },
  { id: 'zone_c', name: 'ZONE C (COMPLEX)', startCol: 221, endCol: 329, color: '#f59e0b' }
];

export const TEST_STATUS_CODES = {
  'not_started': { label: '미착수', color: '#6b7280', order: 1 },
  'in_progress': { label: '진행중', color: '#3b82f6', order: 2 },
  'complete': { label: '완료', color: '#22c55e', order: 3 },
  'delayed': { label: '지연', color: '#ef4444', order: 4 }
};

export const TEST_COLUMNS: Record<string, any> = {};

// 테스트용 컬럼 생성 (A-X3 ~ A-X50, 약 48개)
const rowLabels = ['A', 'B', 'C', 'D', 'E'];
for (let col = 3; col <= 50; col++) {
  for (const row of rowLabels) {
    const uid = `${row}-X${col}`;
    const statusOptions = ['not_started', 'in_progress', 'complete', 'delayed'];
    const randomStatus = statusOptions[Math.floor((col + row.charCodeAt(0)) % 4)];

    TEST_COLUMNS[uid] = {
      uid,
      row,
      col,
      floor: 'F1',
      zone: col <= 111 ? 'zone_a' : col <= 220 ? 'zone_b' : 'zone_c',
      status: { code: randomStatus },
      stages: {
        hmb_fab: { status: col % 3 === 0 ? 'complete' : 'active' },
        pre_assem: { status: col % 5 === 0 ? 'complete' : 'pending' }
      },
      isLocked: col % 10 === 0,
      updatedAt: new Date().toISOString()
    };
  }
}

export const TEST_ISSUES = [
  {
    id: 'ISS-001',
    title: '균열 발견 - A구역',
    description: 'A-X10 ~ A-X15 구간 균열 발견',
    severity: 'critical',
    status: 'open',
    affectedColumns: { startCol: 10, endCol: 15, rows: ['A', 'B'] },
    reportedAt: '2025-01-01T09:00:00Z',
    reportedBy: 'inspector@test.com'
  },
  {
    id: 'ISS-002',
    title: '자재 지연',
    description: 'B구역 자재 도착 지연',
    severity: 'high',
    status: 'open',
    affectedColumns: { startCol: 20, endCol: 25, rows: ['C', 'D'] },
    reportedAt: '2025-01-02T14:00:00Z',
    reportedBy: 'pm@test.com'
  },
  {
    id: 'ISS-003',
    title: '품질 검사 필요',
    description: '설치 완료 후 검사 대기',
    severity: 'medium',
    status: 'in_progress',
    affectedColumns: { startCol: 30, endCol: 35, rows: ['A'] },
    reportedAt: '2025-01-03T10:00:00Z',
    reportedBy: 'qa@test.com'
  }
];

export const TEST_FLOOR_STATS = {
  floors: [
    { id: 'F1', name: '1층', columnCount: 240, completionRate: 45 },
    { id: 'F2', name: '2층', columnCount: 240, completionRate: 30 }
  ],
  totalColumns: 480,
  overallProgress: 37
};

export const TEST_MASTER_SNAPSHOT = {
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  data: {
    columns: TEST_COLUMNS,
    issues: TEST_ISSUES,
    zones: TEST_ZONES,
    statusCodes: TEST_STATUS_CODES
  }
};

/**
 * API 응답 모킹용 데이터
 */
export const MOCK_API_RESPONSES = {
  getFloorStats: {
    success: true,
    data: TEST_FLOOR_STATS
  },
  getFloorData: {
    success: true,
    columns: TEST_COLUMNS,
    zones: TEST_ZONES,
    issues: TEST_ISSUES
  },
  getZones: {
    success: true,
    zones: TEST_ZONES
  }
};
