/**
 * Reporting Utilities
 *
 * Advanced reporting functions for P5 Dashboard
 * WP-4: 고급 리포팅 기능
 */

/**
 * Calculate zone-wise progress statistics
 *
 * @param {Object} columns - Columns data object
 * @param {Array} zones - Zone definitions with startCol, endCol
 * @param {Object} statusCodes - Status code definitions
 * @returns {Array} Zone statistics array
 */
function calculateZoneProgress(columns, zones, statusCodes = {}) {
  const stats = [];

  for (const zone of zones) {
    const zoneColumns = filterColumnsByZone(columns, zone);
    const zoneStat = {
      zoneId: zone.id,
      zoneName: zone.name || zone.id,
      total: 0,
      byStatus: {},
      completionRate: 0,
      inProgressRate: 0
    };

    // Initialize status counts
    for (const code of Object.keys(statusCodes)) {
      zoneStat.byStatus[code] = 0;
    }

    // Count columns by status
    for (const uid of Object.keys(zoneColumns)) {
      const col = zoneColumns[uid];
      if (col && col.status) {
        const code = col.status.code || 'not_started';
        if (!zoneStat.byStatus[code]) {
          zoneStat.byStatus[code] = 0;
        }
        zoneStat.byStatus[code]++;
        zoneStat.total++;
      }
    }

    // Calculate rates
    if (zoneStat.total > 0) {
      const completed = zoneStat.byStatus['complete'] || 0;
      const inProgress = zoneStat.byStatus['in_progress'] || 0;
      zoneStat.completionRate = Math.round((completed / zoneStat.total) * 100);
      zoneStat.inProgressRate = Math.round((inProgress / zoneStat.total) * 100);
    }

    stats.push(zoneStat);
  }

  return stats;
}

/**
 * Calculate jeolju (section) progress statistics
 *
 * @param {Object} columns - Columns data object
 * @param {Array} jeoljuConfig - Jeolju definitions
 * @param {Object} statusCodes - Status code definitions
 * @returns {Array} Jeolju statistics array
 */
function calculateJeoljuProgress(columns, jeoljuConfig, statusCodes = {}) {
  const stats = [];

  for (const jeolju of jeoljuConfig) {
    const jeoljuColumns = {};

    // Filter columns for this jeolju
    for (const uid of Object.keys(columns)) {
      const match = uid.match(/-X(\d+)$/);
      if (match) {
        const colNum = parseInt(match[1], 10);
        if (colNum >= jeolju.startCol && colNum <= jeolju.endCol) {
          jeoljuColumns[uid] = columns[uid];
        }
      }
    }

    const jeoljuStat = {
      jeoljuId: jeolju.id,
      jeoljuName: jeolju.name || jeolju.id,
      startCol: jeolju.startCol,
      endCol: jeolju.endCol,
      total: Object.keys(jeoljuColumns).length,
      byStatus: {},
      byStage: {},
      completionRate: 0
    };

    // Initialize status counts
    for (const code of Object.keys(statusCodes)) {
      jeoljuStat.byStatus[code] = 0;
    }

    // Count columns
    for (const uid of Object.keys(jeoljuColumns)) {
      const col = jeoljuColumns[uid];
      if (col && col.status) {
        const code = col.status.code || 'not_started';
        if (!jeoljuStat.byStatus[code]) {
          jeoljuStat.byStatus[code] = 0;
        }
        jeoljuStat.byStatus[code]++;
      }

      // Count stages
      if (col && col.stages) {
        for (const stageCode of Object.keys(col.stages)) {
          if (!jeoljuStat.byStage[stageCode]) {
            jeoljuStat.byStage[stageCode] = { complete: 0, active: 0, pending: 0 };
          }
          const stage = col.stages[stageCode];
          if (stage.status === 'complete') {
            jeoljuStat.byStage[stageCode].complete++;
          } else if (stage.status === 'active') {
            jeoljuStat.byStage[stageCode].active++;
          } else {
            jeoljuStat.byStage[stageCode].pending++;
          }
        }
      }
    }

    // Calculate completion rate
    if (jeoljuStat.total > 0) {
      const completed = jeoljuStat.byStatus['complete'] || 0;
      jeoljuStat.completionRate = Math.round((completed / jeoljuStat.total) * 100);
    }

    stats.push(jeoljuStat);
  }

  return stats;
}

/**
 * Calculate issue statistics by severity
 *
 * @param {Array} issues - Issues array
 * @returns {Object} Issue statistics
 */
function calculateIssueStats(issues) {
  const stats = {
    total: issues.length,
    open: 0,
    resolved: 0,
    bySeverity: {
      critical: { count: 0, open: 0, avgResolutionDays: 0 },
      high: { count: 0, open: 0, avgResolutionDays: 0 },
      medium: { count: 0, open: 0, avgResolutionDays: 0 },
      low: { count: 0, open: 0, avgResolutionDays: 0 }
    },
    byStatus: {},
    avgResolutionTime: 0,
    oldestOpenIssue: null,
    recentIssues: []
  };

  const resolutionTimes = [];
  const severityResolutionTimes = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  for (const issue of issues) {
    const severity = issue.severity || 'medium';
    const status = issue.status || 'open';

    // Count by severity
    if (stats.bySeverity[severity]) {
      stats.bySeverity[severity].count++;
      if (status === 'open') {
        stats.bySeverity[severity].open++;
        stats.open++;
      }
    }

    // Count by status
    if (!stats.byStatus[status]) {
      stats.byStatus[status] = 0;
    }
    stats.byStatus[status]++;

    if (status === 'resolved' || status === 'closed') {
      stats.resolved++;

      // Calculate resolution time
      if (issue.reportedAt && issue.resolvedAt) {
        const reported = new Date(issue.reportedAt);
        const resolved = new Date(issue.resolvedAt);
        const days = (resolved - reported) / (1000 * 60 * 60 * 24);
        resolutionTimes.push(days);
        if (severityResolutionTimes[severity]) {
          severityResolutionTimes[severity].push(days);
        }
      }
    }

    // Track oldest open issue
    if (status === 'open' && issue.reportedAt) {
      if (!stats.oldestOpenIssue || new Date(issue.reportedAt) < new Date(stats.oldestOpenIssue.reportedAt)) {
        stats.oldestOpenIssue = issue;
      }
    }
  }

  // Calculate averages
  if (resolutionTimes.length > 0) {
    stats.avgResolutionTime = Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length * 10) / 10;
  }

  for (const severity of Object.keys(severityResolutionTimes)) {
    const times = severityResolutionTimes[severity];
    if (times.length > 0) {
      stats.bySeverity[severity].avgResolutionDays = Math.round(times.reduce((a, b) => a + b, 0) / times.length * 10) / 10;
    }
  }

  // Recent issues (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  stats.recentIssues = issues.filter(i => i.reportedAt && new Date(i.reportedAt) >= weekAgo);

  return stats;
}

/**
 * Calculate daily progress trend
 *
 * @param {Array} history - History entries array
 * @param {number} days - Number of days to include (default: 30)
 * @returns {Array} Daily progress data points
 */
function calculateProgressTrend(history, days = 30) {
  const trend = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Initialize daily buckets
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    trend.push({
      date: date.toISOString().split('T')[0],
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      changes: 0,
      completions: 0,
      issues: 0
    });
  }

  // Aggregate history entries
  for (const entry of history) {
    if (!entry.timestamp) continue;

    const entryDate = new Date(entry.timestamp);
    entryDate.setHours(0, 0, 0, 0);
    const dateStr = entryDate.toISOString().split('T')[0];

    const dayData = trend.find(d => d.date === dateStr);
    if (dayData) {
      dayData.changes++;

      if (entry.type === 'status_change' && entry.title?.includes('완료')) {
        dayData.completions++;
      }
      if (entry.type === 'issue_create') {
        dayData.issues++;
      }
    }
  }

  return trend;
}

/**
 * Calculate stage (production) progress
 *
 * @param {Object} columns - Columns data object
 * @param {Array} stageConfigs - Stage configuration array
 * @returns {Array} Stage progress statistics
 */
function calculateStageProgress(columns, stageConfigs) {
  const stats = [];
  const totalColumns = Object.keys(columns).length;

  for (const stage of stageConfigs) {
    const stageStat = {
      stageCode: stage.code,
      stageName: stage.label || stage.code,
      stageColor: stage.color,
      order: stage.order || 0,
      complete: 0,
      active: 0,
      pending: 0,
      total: totalColumns,
      completionRate: 0
    };

    for (const uid of Object.keys(columns)) {
      const col = columns[uid];
      if (col && col.stages && col.stages[stage.code]) {
        const stageData = col.stages[stage.code];
        if (stageData.status === 'complete') {
          stageStat.complete++;
        } else if (stageData.status === 'active') {
          stageStat.active++;
        } else {
          stageStat.pending++;
        }
      } else {
        stageStat.pending++;
      }
    }

    if (stageStat.total > 0) {
      stageStat.completionRate = Math.round((stageStat.complete / stageStat.total) * 100);
    }

    stats.push(stageStat);
  }

  return stats.sort((a, b) => a.order - b.order);
}

/**
 * Generate chart data for bar chart (Zone/Jeolju progress)
 *
 * @param {Array} data - Array of { name, value, color } objects
 * @param {Object} options - Chart options
 * @returns {Object} Chart configuration
 */
function generateBarChartData(data, options = {}) {
  const {
    width = 400,
    height = 200,
    barWidth = 30,
    gap = 10,
    maxValue = 100,
    showLabels = true,
    showValues = true
  } = options;

  const chartData = {
    width,
    height,
    bars: [],
    xLabels: [],
    yLabels: []
  };

  const barAreaWidth = width - 60; // Leave room for y-axis
  const barAreaHeight = height - 40; // Leave room for x-axis
  const totalBars = data.length;
  const actualBarWidth = Math.min(barWidth, (barAreaWidth - (totalBars - 1) * gap) / totalBars);

  // Y-axis labels
  chartData.yLabels = [0, 25, 50, 75, 100].map(v => ({
    value: v,
    y: barAreaHeight - (v / maxValue) * barAreaHeight + 20
  }));

  // Generate bars
  data.forEach((item, index) => {
    const x = 60 + index * (actualBarWidth + gap);
    const barHeight = (item.value / maxValue) * barAreaHeight;
    const y = barAreaHeight - barHeight + 20;

    chartData.bars.push({
      x,
      y,
      width: actualBarWidth,
      height: barHeight,
      value: item.value,
      label: item.name,
      color: item.color || '#238636'
    });

    if (showLabels) {
      chartData.xLabels.push({
        x: x + actualBarWidth / 2,
        y: height - 5,
        text: item.name
      });
    }
  });

  return chartData;
}

/**
 * Generate chart data for donut/pie chart
 *
 * @param {Array} data - Array of { name, value, color } objects
 * @param {Object} options - Chart options
 * @returns {Object} Chart configuration
 */
function generateDonutChartData(data, options = {}) {
  const {
    size = 150,
    innerRadius = 40,
    outerRadius = 70
  } = options;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const center = size / 2;
  let currentAngle = -Math.PI / 2; // Start from top

  const chartData = {
    size,
    center,
    innerRadius,
    outerRadius,
    total,
    segments: []
  };

  for (const item of data) {
    if (item.value === 0) continue;

    const percentage = item.value / total;
    const angle = percentage * Math.PI * 2;
    const endAngle = currentAngle + angle;

    // Calculate arc path
    const startX = center + Math.cos(currentAngle) * outerRadius;
    const startY = center + Math.sin(currentAngle) * outerRadius;
    const endX = center + Math.cos(endAngle) * outerRadius;
    const endY = center + Math.sin(endAngle) * outerRadius;
    const innerStartX = center + Math.cos(endAngle) * innerRadius;
    const innerStartY = center + Math.sin(endAngle) * innerRadius;
    const innerEndX = center + Math.cos(currentAngle) * innerRadius;
    const innerEndY = center + Math.sin(currentAngle) * innerRadius;

    const largeArc = angle > Math.PI ? 1 : 0;

    chartData.segments.push({
      name: item.name,
      value: item.value,
      percentage: Math.round(percentage * 100),
      color: item.color,
      path: `M ${startX} ${startY} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endX} ${endY} L ${innerStartX} ${innerStartY} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEndX} ${innerEndY} Z`,
      startAngle: currentAngle,
      endAngle
    });

    currentAngle = endAngle;
  }

  return chartData;
}

/**
 * Generate trend line chart data
 *
 * @param {Array} data - Array of { label, value } objects
 * @param {Object} options - Chart options
 * @returns {Object} Chart configuration
 */
function generateLineChartData(data, options = {}) {
  const {
    width = 400,
    height = 150,
    color = '#238636',
    showDots = true,
    showArea = true
  } = options;

  const chartData = {
    width,
    height,
    points: [],
    path: '',
    areaPath: '',
    xLabels: [],
    yLabels: []
  };

  if (data.length === 0) return chartData;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const padding = { left: 40, right: 20, top: 20, bottom: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const xStep = chartWidth / (data.length - 1 || 1);

  // Generate points
  data.forEach((item, index) => {
    const x = padding.left + index * xStep;
    const y = padding.top + chartHeight - (item.value / maxValue) * chartHeight;

    chartData.points.push({ x, y, value: item.value, label: item.label });
  });

  // Generate SVG path
  if (chartData.points.length > 0) {
    chartData.path = `M ${chartData.points.map(p => `${p.x} ${p.y}`).join(' L ')}`;

    if (showArea) {
      const baseY = padding.top + chartHeight;
      chartData.areaPath = `${chartData.path} L ${chartData.points[chartData.points.length - 1].x} ${baseY} L ${chartData.points[0].x} ${baseY} Z`;
    }
  }

  // X-axis labels (show every nth)
  const labelInterval = Math.ceil(data.length / 7);
  data.forEach((item, index) => {
    if (index % labelInterval === 0 || index === data.length - 1) {
      chartData.xLabels.push({
        x: padding.left + index * xStep,
        y: height - 5,
        text: item.label
      });
    }
  });

  // Y-axis labels
  const ySteps = [0, 0.25, 0.5, 0.75, 1];
  ySteps.forEach(step => {
    chartData.yLabels.push({
      value: Math.round(maxValue * step),
      y: padding.top + chartHeight * (1 - step)
    });
  });

  return chartData;
}

/**
 * Format report data for Excel export
 *
 * @param {Object} reportData - Report data object
 * @returns {Array} Array of sheets with data
 */
function formatReportForExcel(reportData) {
  const sheets = [];

  // Summary sheet
  sheets.push({
    name: '요약',
    data: [
      ['P5 복합동 진행 현황 보고서'],
      ['생성일시', reportData.generatedAt || new Date().toISOString()],
      [],
      ['전체 진행률', `${reportData.overallProgress || 0}%`],
      ['완료 기둥', reportData.completedColumns || 0],
      ['진행중 기둥', reportData.inProgressColumns || 0],
      ['미착수 기둥', reportData.notStartedColumns || 0],
      [],
      ['미해결 이슈', reportData.openIssues || 0],
      ['Critical 이슈', reportData.criticalIssues || 0]
    ]
  });

  // Zone progress sheet
  if (reportData.zoneProgress) {
    const zoneData = [
      ['Zone별 진행 현황'],
      ['Zone', '전체', '완료', '진행중', '미착수', '완료율']
    ];
    for (const zone of reportData.zoneProgress) {
      zoneData.push([
        zone.zoneName,
        zone.total,
        zone.byStatus?.complete || 0,
        zone.byStatus?.in_progress || 0,
        zone.byStatus?.not_started || 0,
        `${zone.completionRate}%`
      ]);
    }
    sheets.push({ name: 'Zone별 현황', data: zoneData });
  }

  // Issue statistics sheet
  if (reportData.issueStats) {
    const issueData = [
      ['이슈 통계'],
      ['구분', '전체', 'Open', '평균 해결일'],
      ['Critical', reportData.issueStats.bySeverity?.critical?.count || 0,
       reportData.issueStats.bySeverity?.critical?.open || 0,
       reportData.issueStats.bySeverity?.critical?.avgResolutionDays || '-'],
      ['High', reportData.issueStats.bySeverity?.high?.count || 0,
       reportData.issueStats.bySeverity?.high?.open || 0,
       reportData.issueStats.bySeverity?.high?.avgResolutionDays || '-'],
      ['Medium', reportData.issueStats.bySeverity?.medium?.count || 0,
       reportData.issueStats.bySeverity?.medium?.open || 0,
       reportData.issueStats.bySeverity?.medium?.avgResolutionDays || '-'],
      ['Low', reportData.issueStats.bySeverity?.low?.count || 0,
       reportData.issueStats.bySeverity?.low?.open || 0,
       reportData.issueStats.bySeverity?.low?.avgResolutionDays || '-']
    ];
    sheets.push({ name: '이슈 통계', data: issueData });
  }

  // Trend data sheet
  if (reportData.trend) {
    const trendData = [
      ['일별 진행 추이'],
      ['날짜', '변경', '완료', '신규 이슈']
    ];
    for (const day of reportData.trend) {
      trendData.push([day.date, day.changes, day.completions, day.issues]);
    }
    sheets.push({ name: '진행 추이', data: trendData });
  }

  return sheets;
}

/**
 * Filter columns by zone
 * (Imported from column-store for standalone use)
 */
function filterColumnsByZone(columns, zone) {
  if (!zone || !zone.startCol || !zone.endCol) {
    return columns;
  }

  const filtered = {};
  for (const uid of Object.keys(columns)) {
    const match = uid.match(/-X(\d+)$/);
    if (match) {
      const colNum = parseInt(match[1], 10);
      if (colNum >= zone.startCol && colNum <= zone.endCol) {
        filtered[uid] = columns[uid];
      }
    }
  }

  return filtered;
}

// Export for testing and module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateZoneProgress,
    calculateJeoljuProgress,
    calculateIssueStats,
    calculateProgressTrend,
    calculateStageProgress,
    generateBarChartData,
    generateDonutChartData,
    generateLineChartData,
    formatReportForExcel,
    filterColumnsByZone
  };
}
