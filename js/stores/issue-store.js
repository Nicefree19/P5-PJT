/**
 * Issue Store - O(1) Issue Lookup System
 *
 * Provides efficient issue indexing and lookup for the P5 Dashboard grid.
 * Extracted from index.html for testability and reusability.
 */

/**
 * Build an O(1) lookup map for issues
 * Maps cell UIDs to arrays of issues affecting that cell
 *
 * @param {Array} issues - Array of issue objects with startColumn, endColumn, startRow, endRow
 * @param {Array} rowLabels - Array of row labels (e.g., ['A', 'B', 'C', ...])
 * @returns {Map} Map of UID -> [issues]
 */
function buildIssueIndex(issues, rowLabels) {
  const map = new Map();

  if (!Array.isArray(issues) || !Array.isArray(rowLabels)) {
    return map;
  }

  for (const issue of issues) {
    if (!issue.startColumn || !issue.endColumn) continue;

    const startRow = rowLabels.indexOf(issue.startRow);
    const endRow = rowLabels.indexOf(issue.endRow);
    if (startRow < 0 || endRow < 0) continue;

    // Populate map with all affected cell UIDs
    for (let r = startRow; r <= endRow; r++) {
      const rowLabel = rowLabels[r];
      if (!rowLabel) continue;

      for (let c = issue.startColumn; c <= issue.endColumn; c++) {
        const uid = `${rowLabel}-X${c}`;
        if (!map.has(uid)) {
          map.set(uid, []);
        }
        map.get(uid).push(issue);
      }
    }
  }

  return map;
}

/**
 * Check if a cell has any open issues - O(1)
 *
 * @param {Object} cell - Cell object with row and col properties
 * @param {Map} issueIndexMap - Pre-built issue index map
 * @returns {boolean} True if cell has issues
 */
function hasIssue(cell, issueIndexMap) {
  if (!cell || !issueIndexMap) return false;
  const uid = `${cell.row}-X${cell.col}`;
  return issueIndexMap.has(uid);
}

/**
 * Check if cell is within issue's affected range (legacy fallback)
 *
 * @param {Object} cell - Cell object with row and col properties
 * @param {Object} issue - Issue object with column/row range
 * @param {Array} rowLabels - Array of row labels
 * @returns {boolean} True if cell is within issue range
 */
function isCellInIssueRange(cell, issue, rowLabels) {
  if (!issue.startColumn || !issue.endColumn) return false;
  if (!cell || !rowLabels) return false;

  const colNum = cell.col;
  const rowIdx = rowLabels.indexOf(cell.row);
  const issueStartRow = rowLabels.indexOf(issue.startRow);
  const issueEndRow = rowLabels.indexOf(issue.endRow);

  if (rowIdx < 0 || issueStartRow < 0 || issueEndRow < 0) return false;

  return colNum >= issue.startColumn &&
         colNum <= issue.endColumn &&
         rowIdx >= issueStartRow &&
         rowIdx <= issueEndRow;
}

/**
 * Get the first issue affecting a cell - O(1)
 *
 * @param {Object} cell - Cell object with row and col properties
 * @param {Map} issueIndexMap - Pre-built issue index map
 * @returns {Object|null} First issue or null
 */
function getIssueForCell(cell, issueIndexMap) {
  if (!cell || cell.isHeader || !issueIndexMap) return null;
  const uid = `${cell.row}-X${cell.col}`;
  const issues = issueIndexMap.get(uid);
  return issues ? issues[0] : null;
}

/**
 * Get all issues affecting a cell - O(1)
 *
 * @param {Object} cell - Cell object with row and col properties
 * @param {Map} issueIndexMap - Pre-built issue index map
 * @returns {Array} Array of issues (empty if none)
 */
function getIssuesForCell(cell, issueIndexMap) {
  if (!cell || cell.isHeader || !issueIndexMap) return [];
  const uid = `${cell.row}-X${cell.col}`;
  return issueIndexMap.get(uid) || [];
}

/**
 * Get CSS class based on issue severity
 *
 * @param {Object} cell - Cell object
 * @param {Map} issueIndexMap - Pre-built issue index map
 * @returns {string} CSS class name
 */
function getIssueSeverityClass(cell, issueIndexMap) {
  const issue = getIssueForCell(cell, issueIndexMap);
  if (!issue) return '';

  const severityClasses = {
    'critical': 'issue-pin-critical',
    'high': 'issue-pin-high',
    'medium': 'issue-pin-medium',
    'low': 'issue-pin-low'
  };
  return severityClasses[issue.severity] || 'issue-pin-medium';
}

/**
 * Get issue title for tooltip
 *
 * @param {Object} cell - Cell object
 * @param {Map} issueIndexMap - Pre-built issue index map
 * @returns {string} Title for tooltip
 */
function getIssueTitle(cell, issueIndexMap) {
  const issues = getIssuesForCell(cell, issueIndexMap);
  if (issues.length === 0) return '';
  if (issues.length === 1) return issues[0].title;
  return `${issues.length}개 이슈: ${issues.map(i => i.title).join(', ')}`;
}

// Export for testing (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildIssueIndex,
    hasIssue,
    isCellInIssueRange,
    getIssueForCell,
    getIssuesForCell,
    getIssueSeverityClass,
    getIssueTitle
  };
}

// WP-1-A: Expose to browser global for Alpine.js integration
if (typeof window !== 'undefined') {
  window.IssueStore = {
    buildIssueIndex,
    hasIssue,
    isCellInIssueRange,
    getIssueForCell,
    getIssuesForCell,
    getIssueSeverityClass,
    getIssueTitle
  };
}
