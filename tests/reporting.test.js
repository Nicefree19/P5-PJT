/**
 * Reporting Utilities Tests
 *
 * Tests for advanced reporting functions
 * WP-4: 고급 리포팅 기능
 */

const {
  calculateZoneProgress,
  calculateJeoljuProgress,
  calculateIssueStats,
  calculateProgressTrend,
  calculateStageProgress,
  generateBarChartData,
  generateDonutChartData,
  generateLineChartData,
  formatReportForExcel
} = require('../src/dashboard/js/utils/reporting');

describe('Reporting Utils', () => {
  // Test fixtures
  const statusCodes = {
    'not_started': { label: '미착수', color: '#gray' },
    'in_progress': { label: '진행중', color: '#blue' },
    'complete': { label: '완료', color: '#green' },
    'delayed': { label: '지연', color: '#red' }
  };

  const zones = [
    { id: 'zone_a', name: 'Zone A (FAB)', startCol: 1, endCol: 23 },
    { id: 'zone_b', name: 'Zone B (CUB)', startCol: 24, endCol: 45 },
    { id: 'zone_c', name: 'Zone C (COMPLEX)', startCol: 46, endCol: 69 }
  ];

  const jeoljuConfig = [
    { id: 'J1', name: '1절주', startCol: 1, endCol: 8 },
    { id: 'J2', name: '2절주', startCol: 9, endCol: 17 },
    { id: 'J3', name: '3절주', startCol: 18, endCol: 26 }
  ];

  const stageConfigs = [
    { code: 'hmb_fab', label: 'HMB제작', color: '#f97316', order: 1 },
    { code: 'pre_assem', label: '면조립', color: '#eab308', order: 2 },
    { code: 'main_assem', label: '대조립', color: '#22c55e', order: 3 }
  ];

  // Generate sample columns
  const generateColumns = (count, statusDistribution = {}) => {
    const columns = {};
    const statuses = Object.keys(statusDistribution);
    let index = 0;

    for (let c = 1; c <= count; c++) {
      const uid = `A-X${c}`;
      let status = 'not_started';

      // Distribute statuses
      for (const s of statuses) {
        if (index < statusDistribution[s]) {
          status = s;
          break;
        }
        index -= statusDistribution[s];
      }

      columns[uid] = {
        uid,
        status: { code: status },
        stages: {}
      };
      index++;
    }

    return columns;
  };

  describe('calculateZoneProgress', () => {
    it('should calculate progress for each zone', () => {
      const columns = {};
      // Zone A: 23 columns (1-23)
      for (let c = 1; c <= 23; c++) {
        columns[`A-X${c}`] = { status: { code: c <= 10 ? 'complete' : 'in_progress' } };
      }
      // Zone B: 22 columns (24-45)
      for (let c = 24; c <= 45; c++) {
        columns[`A-X${c}`] = { status: { code: 'not_started' } };
      }

      const stats = calculateZoneProgress(columns, zones, statusCodes);

      expect(stats).toHaveLength(3);
      expect(stats[0].zoneId).toBe('zone_a');
      expect(stats[0].total).toBe(23);
      expect(stats[0].byStatus.complete).toBe(10);
      expect(stats[0].completionRate).toBe(43); // 10/23 ≈ 43%
    });

    it('should handle empty columns', () => {
      const stats = calculateZoneProgress({}, zones, statusCodes);

      expect(stats).toHaveLength(3);
      stats.forEach(zone => {
        expect(zone.total).toBe(0);
        expect(zone.completionRate).toBe(0);
      });
    });

    it('should calculate in-progress rate', () => {
      const columns = {};
      for (let c = 1; c <= 10; c++) {
        columns[`A-X${c}`] = { status: { code: c <= 3 ? 'complete' : 'in_progress' } };
      }

      const stats = calculateZoneProgress(columns, zones, statusCodes);

      expect(stats[0].inProgressRate).toBe(70); // 7/10 = 70%
    });
  });

  describe('calculateJeoljuProgress', () => {
    it('should calculate progress for each jeolju', () => {
      const columns = {};
      for (let c = 1; c <= 26; c++) {
        columns[`A-X${c}`] = {
          status: { code: c <= 8 ? 'complete' : 'in_progress' },
          stages: {
            hmb_fab: { status: c <= 5 ? 'complete' : 'active' }
          }
        };
      }

      const stats = calculateJeoljuProgress(columns, jeoljuConfig, statusCodes);

      expect(stats).toHaveLength(3);
      expect(stats[0].jeoljuId).toBe('J1');
      expect(stats[0].total).toBe(8);
      expect(stats[0].completionRate).toBe(100); // 8/8 = 100%
      expect(stats[0].byStage.hmb_fab.complete).toBe(5);
    });

    it('should handle missing stages', () => {
      const columns = {
        'A-X1': { status: { code: 'complete' } }
      };

      const stats = calculateJeoljuProgress(columns, jeoljuConfig, statusCodes);

      expect(stats[0].byStage).toEqual({});
    });
  });

  describe('calculateIssueStats', () => {
    const sampleIssues = [
      { id: '1', severity: 'critical', status: 'open', reportedAt: '2025-01-01' },
      { id: '2', severity: 'critical', status: 'resolved', reportedAt: '2025-01-01', resolvedAt: '2025-01-03' },
      { id: '3', severity: 'high', status: 'open', reportedAt: '2025-01-02' },
      { id: '4', severity: 'medium', status: 'resolved', reportedAt: '2025-01-01', resolvedAt: '2025-01-05' },
      { id: '5', severity: 'low', status: 'open', reportedAt: '2025-01-03' }
    ];

    it('should count issues by severity', () => {
      const stats = calculateIssueStats(sampleIssues);

      expect(stats.total).toBe(5);
      expect(stats.bySeverity.critical.count).toBe(2);
      expect(stats.bySeverity.critical.open).toBe(1);
      expect(stats.bySeverity.high.count).toBe(1);
    });

    it('should count open and resolved issues', () => {
      const stats = calculateIssueStats(sampleIssues);

      expect(stats.open).toBe(3);
      expect(stats.resolved).toBe(2);
    });

    it('should calculate average resolution time', () => {
      const stats = calculateIssueStats(sampleIssues);

      // Issue 2: 2 days, Issue 4: 4 days -> avg = 3 days
      expect(stats.avgResolutionTime).toBe(3);
    });

    it('should find oldest open issue', () => {
      const stats = calculateIssueStats(sampleIssues);

      expect(stats.oldestOpenIssue.id).toBe('1');
    });

    it('should handle empty issues array', () => {
      const stats = calculateIssueStats([]);

      expect(stats.total).toBe(0);
      expect(stats.open).toBe(0);
      expect(stats.avgResolutionTime).toBe(0);
    });
  });

  describe('calculateProgressTrend', () => {
    it('should generate daily data points', () => {
      const history = [
        { timestamp: new Date().toISOString(), type: 'status_change', title: '완료' },
        { timestamp: new Date().toISOString(), type: 'status_change', title: '진행중' },
        { timestamp: new Date().toISOString(), type: 'issue_create', title: 'New issue' }
      ];

      const trend = calculateProgressTrend(history, 7);

      expect(trend).toHaveLength(7);
      expect(trend[6].changes).toBe(3); // Today
      expect(trend[6].completions).toBe(1);
      expect(trend[6].issues).toBe(1);
    });

    it('should use default 30 days', () => {
      const trend = calculateProgressTrend([], 30);

      expect(trend).toHaveLength(30);
    });

    it('should include date labels', () => {
      const trend = calculateProgressTrend([], 7);

      trend.forEach(day => {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(day.label).toMatch(/^\d{1,2}\/\d{1,2}$/);
      });
    });
  });

  describe('calculateStageProgress', () => {
    it('should calculate progress for each stage', () => {
      const columns = {};
      for (let c = 1; c <= 10; c++) {
        columns[`A-X${c}`] = {
          stages: {
            hmb_fab: { status: c <= 8 ? 'complete' : 'active' },
            pre_assem: { status: c <= 5 ? 'complete' : 'pending' }
          }
        };
      }

      const stats = calculateStageProgress(columns, stageConfigs);

      expect(stats).toHaveLength(3);
      expect(stats[0].stageCode).toBe('hmb_fab');
      expect(stats[0].complete).toBe(8);
      expect(stats[0].active).toBe(2);
      expect(stats[0].completionRate).toBe(80);
    });

    it('should sort by order', () => {
      const stats = calculateStageProgress({}, stageConfigs);

      expect(stats[0].order).toBe(1);
      expect(stats[1].order).toBe(2);
      expect(stats[2].order).toBe(3);
    });
  });

  describe('generateBarChartData', () => {
    it('should generate bar positions', () => {
      const data = [
        { name: 'A', value: 50, color: '#red' },
        { name: 'B', value: 75, color: '#green' },
        { name: 'C', value: 100, color: '#blue' }
      ];

      const chart = generateBarChartData(data);

      expect(chart.bars).toHaveLength(3);
      expect(chart.bars[0].value).toBe(50);
      expect(chart.bars[2].height).toBeGreaterThan(chart.bars[0].height);
    });

    it('should generate labels', () => {
      const data = [{ name: 'Test', value: 50 }];
      const chart = generateBarChartData(data, { showLabels: true });

      expect(chart.xLabels).toHaveLength(1);
      expect(chart.xLabels[0].text).toBe('Test');
    });

    it('should generate Y-axis labels', () => {
      const chart = generateBarChartData([{ name: 'A', value: 50 }]);

      expect(chart.yLabels).toHaveLength(5);
      expect(chart.yLabels[0].value).toBe(0);
      expect(chart.yLabels[4].value).toBe(100);
    });
  });

  describe('generateDonutChartData', () => {
    it('should generate segments', () => {
      const data = [
        { name: 'A', value: 25, color: '#red' },
        { name: 'B', value: 50, color: '#green' },
        { name: 'C', value: 25, color: '#blue' }
      ];

      const chart = generateDonutChartData(data);

      expect(chart.segments).toHaveLength(3);
      expect(chart.total).toBe(100);
      expect(chart.segments[1].percentage).toBe(50);
    });

    it('should skip zero values', () => {
      const data = [
        { name: 'A', value: 100, color: '#red' },
        { name: 'B', value: 0, color: '#green' }
      ];

      const chart = generateDonutChartData(data);

      expect(chart.segments).toHaveLength(1);
    });

    it('should generate SVG paths', () => {
      const data = [{ name: 'A', value: 100, color: '#red' }];
      const chart = generateDonutChartData(data);

      expect(chart.segments[0].path).toContain('M');
      expect(chart.segments[0].path).toContain('A');
    });
  });

  describe('generateLineChartData', () => {
    it('should generate points from data', () => {
      const data = [
        { label: 'Jan', value: 10 },
        { label: 'Feb', value: 20 },
        { label: 'Mar', value: 15 }
      ];

      const chart = generateLineChartData(data);

      expect(chart.points).toHaveLength(3);
      expect(chart.points[0].value).toBe(10);
    });

    it('should generate SVG path', () => {
      const data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 }
      ];

      const chart = generateLineChartData(data);

      expect(chart.path).toContain('M');
      expect(chart.path).toContain('L');
    });

    it('should generate area path when enabled', () => {
      const data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 }
      ];

      const chart = generateLineChartData(data, { showArea: true });

      expect(chart.areaPath).toContain('Z');
    });

    it('should handle empty data', () => {
      const chart = generateLineChartData([]);

      expect(chart.points).toHaveLength(0);
      expect(chart.path).toBe('');
    });
  });

  describe('formatReportForExcel', () => {
    it('should create summary sheet', () => {
      const reportData = {
        generatedAt: '2025-01-04',
        overallProgress: 45,
        completedColumns: 100,
        inProgressColumns: 50,
        notStartedColumns: 72,
        openIssues: 5,
        criticalIssues: 2
      };

      const sheets = formatReportForExcel(reportData);

      expect(sheets[0].name).toBe('요약');
      expect(sheets[0].data[0][0]).toBe('P5 복합동 진행 현황 보고서');
    });

    it('should include zone progress sheet', () => {
      const reportData = {
        zoneProgress: [
          { zoneName: 'Zone A', total: 100, byStatus: { complete: 50 }, completionRate: 50 }
        ]
      };

      const sheets = formatReportForExcel(reportData);
      const zoneSheet = sheets.find(s => s.name === 'Zone별 현황');

      expect(zoneSheet).toBeDefined();
      expect(zoneSheet.data[2][0]).toBe('Zone A');
    });

    it('should include issue stats sheet', () => {
      const reportData = {
        issueStats: {
          bySeverity: {
            critical: { count: 5, open: 2, avgResolutionDays: 3 },
            high: { count: 3, open: 1, avgResolutionDays: 5 },
            medium: { count: 2, open: 0, avgResolutionDays: 2 },
            low: { count: 1, open: 0, avgResolutionDays: 1 }
          }
        }
      };

      const sheets = formatReportForExcel(reportData);
      const issueSheet = sheets.find(s => s.name === '이슈 통계');

      expect(issueSheet).toBeDefined();
      expect(issueSheet.data[2][1]).toBe(5); // Critical count
    });

    it('should include trend data sheet', () => {
      const reportData = {
        trend: [
          { date: '2025-01-01', changes: 5, completions: 2, issues: 1 },
          { date: '2025-01-02', changes: 3, completions: 1, issues: 0 }
        ]
      };

      const sheets = formatReportForExcel(reportData);
      const trendSheet = sheets.find(s => s.name === '진행 추이');

      expect(trendSheet).toBeDefined();
      expect(trendSheet.data[2][0]).toBe('2025-01-01');
    });
  });
});
