/**
 * Column Store - Status Management System
 *
 * Provides column status management for the P5 Dashboard grid.
 * Extracted from index.html for testability and reusability.
 */

/**
 * Change status for multiple columns
 *
 * @param {Array} selectedCells - Array of selected cell UIDs
 * @param {string} statusCode - New status code
 * @param {Object} columns - Columns data object
 * @param {Object} statusCodes - Status code definitions
 * @returns {Object} Result { success, count, updatedColumns }
 */
function quickChangeStatus(selectedCells, statusCode, columns, statusCodes = {}) {
  if (!Array.isArray(selectedCells) || selectedCells.length === 0) {
    return { success: false, count: 0, updatedColumns: {} };
  }

  const updatedColumns = {};
  let count = 0;

  for (const uid of selectedCells) {
    if (columns[uid]) {
      updatedColumns[uid] = {
        ...columns[uid],
        status: {
          code: statusCode,
          updatedAt: new Date().toISOString()
        }
      };
      count++;
    }
  }

  return {
    success: count > 0,
    count,
    updatedColumns,
    statusLabel: statusCodes[statusCode]?.label || statusCode
  };
}

/**
 * Lock/unlock columns
 *
 * @param {Array} selectedCells - Array of selected cell UIDs
 * @param {boolean} locked - Lock state
 * @param {Object} columns - Columns data object
 * @param {string} lockedBy - User who locked
 * @returns {Object} Result { success, count, updatedColumns }
 */
function bulkLockColumns(selectedCells, locked, columns, lockedBy = 'user') {
  if (!Array.isArray(selectedCells) || selectedCells.length === 0) {
    return { success: false, count: 0, updatedColumns: {} };
  }

  const updatedColumns = {};
  let count = 0;

  for (const uid of selectedCells) {
    if (columns[uid]) {
      updatedColumns[uid] = {
        ...columns[uid],
        locked,
        lockedBy: locked ? lockedBy : null,
        lockedAt: locked ? new Date().toISOString() : null
      };
      count++;
    }
  }

  return {
    success: count > 0,
    count,
    updatedColumns
  };
}

/**
 * Update production stage for columns
 *
 * @param {Array} selectedCells - Array of selected cell UIDs
 * @param {string} stageCode - Stage code
 * @param {string} stageStatus - Stage status ('active', 'complete')
 * @param {Object} columns - Columns data object
 * @returns {Object} Result { success, count, updatedColumns }
 */
function quickChangeStage(selectedCells, stageCode, stageStatus, columns) {
  if (!Array.isArray(selectedCells) || selectedCells.length === 0) {
    return { success: false, count: 0, updatedColumns: {} };
  }

  const updatedColumns = {};
  let count = 0;
  const now = new Date().toISOString();

  for (const uid of selectedCells) {
    if (columns[uid]) {
      const stages = { ...(columns[uid].stages || {}) };

      if (stageStatus === 'complete') {
        stages[stageCode] = {
          status: 'complete',
          completedAt: now
        };
      } else {
        stages[stageCode] = {
          status: stageStatus,
          startedAt: now
        };
      }

      updatedColumns[uid] = {
        ...columns[uid],
        stages
      };
      count++;
    }
  }

  return {
    success: count > 0,
    count,
    updatedColumns
  };
}

/**
 * Calculate column statistics
 *
 * @param {Object} columns - Columns data object
 * @param {Object} statusCodes - Status code definitions
 * @returns {Object} Statistics by status code
 */
function calculateColumnStats(columns, statusCodes = {}) {
  const stats = {};

  // Initialize stats for each status
  for (const code of Object.keys(statusCodes)) {
    stats[code] = { count: 0, percentage: 0 };
  }
  stats.total = 0;

  // Count columns by status
  for (const uid of Object.keys(columns)) {
    const col = columns[uid];
    if (col && col.status) {
      const code = col.status.code || 'not_started';
      if (!stats[code]) {
        stats[code] = { count: 0, percentage: 0 };
      }
      stats[code].count++;
      stats.total++;
    }
  }

  // Calculate percentages
  if (stats.total > 0) {
    for (const code of Object.keys(stats)) {
      if (code !== 'total' && stats[code]) {
        stats[code].percentage = Math.round((stats[code].count / stats.total) * 100);
      }
    }
  }

  return stats;
}

/**
 * Filter columns by zone
 *
 * @param {Object} columns - Columns data object
 * @param {Object} zone - Zone definition with startCol and endCol
 * @returns {Object} Filtered columns
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

/**
 * Validate UID format
 *
 * @param {string} uid - UID to validate
 * @returns {boolean} True if valid format
 */
function isValidUID(uid) {
  if (typeof uid !== 'string') return false;
  // Format: {rowLabel}-X{colNumber}
  return /^[A-Z]+-X\d+$/.test(uid);
}

/**
 * Parse UID into components
 *
 * @param {string} uid - UID to parse
 * @returns {Object|null} { row, col } or null if invalid
 */
function parseUID(uid) {
  if (!isValidUID(uid)) return null;

  const match = uid.match(/^([A-Z]+)-X(\d+)$/);
  if (!match) return null;

  return {
    row: match[1],
    col: parseInt(match[2], 10)
  };
}

// Export for testing (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    quickChangeStatus,
    bulkLockColumns,
    quickChangeStage,
    calculateColumnStats,
    filterColumnsByZone,
    isValidUID,
    parseUID
  };
}

// WP-1-A: Expose to browser global for Alpine.js integration
if (typeof window !== 'undefined') {
  window.ColumnStore = {
    quickChangeStatus,
    bulkLockColumns,
    quickChangeStage,
    calculateColumnStats,
    filterColumnsByZone,
    isValidUID,
    parseUID
  };
}
