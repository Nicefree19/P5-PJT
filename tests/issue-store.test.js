/**
 * Issue Store Tests
 *
 * Tests for buildIssueIndex, hasIssue, and related functions
 * Priority: 🔴 HIGH - Core issue lookup functionality
 */

const {
  buildIssueIndex,
  hasIssue,
  isCellInIssueRange,
  getIssueForCell,
  getIssuesForCell,
  getIssueSeverityClass,
  getIssueTitle
} = require('../src/dashboard/js/stores/issue-store');

describe('Issue Store', () => {
  // Test fixtures
  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const sampleIssues = [
    {
      id: 'ISSUE-001',
      title: 'Concrete crack in Zone A',
      severity: 'critical',
      startColumn: 3,
      endColumn: 5,
      startRow: 'A',
      endRow: 'B'
    },
    {
      id: 'ISSUE-002',
      title: 'Rebar misalignment',
      severity: 'high',
      startColumn: 10,
      endColumn: 12,
      startRow: 'C',
      endRow: 'D'
    },
    {
      id: 'ISSUE-003',
      title: 'Minor surface defect',
      severity: 'low',
      startColumn: 3,
      endColumn: 4,
      startRow: 'A',
      endRow: 'A'
    }
  ];

  describe('buildIssueIndex', () => {
    it('should create O(1) lookup map', () => {
      const map = buildIssueIndex(sampleIssues, rowLabels);

      expect(map).toBeInstanceOf(Map);
      expect(map.size).toBeGreaterThan(0);
    });

    it('should index all affected cells for an issue', () => {
      const issues = [sampleIssues[0]]; // 3-5 cols, A-B rows = 6 cells
      const map = buildIssueIndex(issues, rowLabels);

      // Should have 6 cells indexed: A-X3, A-X4, A-X5, B-X3, B-X4, B-X5
      expect(map.has('A-X3')).toBe(true);
      expect(map.has('A-X4')).toBe(true);
      expect(map.has('A-X5')).toBe(true);
      expect(map.has('B-X3')).toBe(true);
      expect(map.has('B-X4')).toBe(true);
      expect(map.has('B-X5')).toBe(true);
      expect(map.size).toBe(6);
    });

    it('should not index cells outside issue range', () => {
      const map = buildIssueIndex([sampleIssues[0]], rowLabels);

      expect(map.has('A-X1')).toBe(false);
      expect(map.has('A-X2')).toBe(false);
      expect(map.has('A-X6')).toBe(false);
      expect(map.has('C-X3')).toBe(false);
    });

    it('should handle multiple issues affecting same cell', () => {
      // ISSUE-001 and ISSUE-003 both affect A-X3 and A-X4
      const map = buildIssueIndex(sampleIssues, rowLabels);

      const issuesAtA3 = map.get('A-X3');
      expect(issuesAtA3).toHaveLength(2);
      expect(issuesAtA3.map(i => i.id)).toContain('ISSUE-001');
      expect(issuesAtA3.map(i => i.id)).toContain('ISSUE-003');
    });

    it('should return empty map for empty issues array', () => {
      const map = buildIssueIndex([], rowLabels);
      expect(map.size).toBe(0);
    });

    it('should return empty map for null/undefined inputs', () => {
      expect(buildIssueIndex(null, rowLabels).size).toBe(0);
      expect(buildIssueIndex(undefined, rowLabels).size).toBe(0);
      expect(buildIssueIndex(sampleIssues, null).size).toBe(0);
      expect(buildIssueIndex(sampleIssues, undefined).size).toBe(0);
    });

    it('should skip issues with missing column range', () => {
      const incompleteIssues = [
        { id: 'BAD-1', startColumn: 1 }, // missing endColumn
        { id: 'BAD-2', endColumn: 5 },   // missing startColumn
        { id: 'BAD-3' }                   // missing both
      ];
      const map = buildIssueIndex(incompleteIssues, rowLabels);
      expect(map.size).toBe(0);
    });

    it('should skip issues with invalid row labels', () => {
      const badRowIssues = [{
        id: 'BAD-4',
        startColumn: 1,
        endColumn: 2,
        startRow: 'Z', // not in rowLabels
        endRow: 'Y'
      }];
      const map = buildIssueIndex(badRowIssues, rowLabels);
      expect(map.size).toBe(0);
    });
  });

  describe('hasIssue', () => {
    let issueIndexMap;

    beforeEach(() => {
      issueIndexMap = buildIssueIndex(sampleIssues, rowLabels);
    });

    it('should return true for cell with issue', () => {
      const cell = { row: 'A', col: 3 };
      expect(hasIssue(cell, issueIndexMap)).toBe(true);
    });

    it('should return false for cell without issue', () => {
      const cell = { row: 'A', col: 1 };
      expect(hasIssue(cell, issueIndexMap)).toBe(false);
    });

    it('should return false for null cell', () => {
      expect(hasIssue(null, issueIndexMap)).toBe(false);
    });

    it('should return false for null map', () => {
      const cell = { row: 'A', col: 3 };
      expect(hasIssue(cell, null)).toBe(false);
    });

    it('should provide O(1) lookup performance', () => {
      // This test validates the performance characteristic
      // by checking that lookup is direct Map.has() call
      const cell = { row: 'B', col: 4 };
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        hasIssue(cell, issueIndexMap);
      }

      const elapsed = performance.now() - start;
      // 10000 lookups should be < 50ms for O(1)
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('isCellInIssueRange', () => {
    const issue = sampleIssues[0]; // cols 3-5, rows A-B

    it('should return true for cell within range', () => {
      expect(isCellInIssueRange({ row: 'A', col: 3 }, issue, rowLabels)).toBe(true);
      expect(isCellInIssueRange({ row: 'A', col: 5 }, issue, rowLabels)).toBe(true);
      expect(isCellInIssueRange({ row: 'B', col: 4 }, issue, rowLabels)).toBe(true);
    });

    it('should return false for cell outside column range', () => {
      expect(isCellInIssueRange({ row: 'A', col: 2 }, issue, rowLabels)).toBe(false);
      expect(isCellInIssueRange({ row: 'A', col: 6 }, issue, rowLabels)).toBe(false);
    });

    it('should return false for cell outside row range', () => {
      expect(isCellInIssueRange({ row: 'C', col: 4 }, issue, rowLabels)).toBe(false);
      expect(isCellInIssueRange({ row: 'D', col: 4 }, issue, rowLabels)).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(isCellInIssueRange(null, issue, rowLabels)).toBe(false);
      expect(isCellInIssueRange({ row: 'A', col: 3 }, {}, rowLabels)).toBe(false);
    });
  });

  describe('getIssueForCell', () => {
    let issueIndexMap;

    beforeEach(() => {
      issueIndexMap = buildIssueIndex(sampleIssues, rowLabels);
    });

    it('should return first issue for cell', () => {
      const cell = { row: 'A', col: 3 };
      const issue = getIssueForCell(cell, issueIndexMap);

      expect(issue).not.toBeNull();
      expect(issue.id).toBe('ISSUE-001'); // First in array
    });

    it('should return null for cell without issues', () => {
      const cell = { row: 'H', col: 69 };
      expect(getIssueForCell(cell, issueIndexMap)).toBeNull();
    });

    it('should return null for header cell', () => {
      const cell = { row: 'A', col: 3, isHeader: true };
      expect(getIssueForCell(cell, issueIndexMap)).toBeNull();
    });
  });

  describe('getIssuesForCell', () => {
    let issueIndexMap;

    beforeEach(() => {
      issueIndexMap = buildIssueIndex(sampleIssues, rowLabels);
    });

    it('should return all issues for cell', () => {
      const cell = { row: 'A', col: 3 };
      const issues = getIssuesForCell(cell, issueIndexMap);

      expect(issues).toHaveLength(2);
    });

    it('should return empty array for cell without issues', () => {
      const cell = { row: 'H', col: 69 };
      expect(getIssuesForCell(cell, issueIndexMap)).toEqual([]);
    });

    it('should return empty array for header cell', () => {
      const cell = { row: 'A', col: 3, isHeader: true };
      expect(getIssuesForCell(cell, issueIndexMap)).toEqual([]);
    });
  });

  describe('getIssueSeverityClass', () => {
    let issueIndexMap;

    beforeEach(() => {
      issueIndexMap = buildIssueIndex(sampleIssues, rowLabels);
    });

    it('should return correct class for critical severity', () => {
      const cell = { row: 'A', col: 3 };
      expect(getIssueSeverityClass(cell, issueIndexMap)).toBe('issue-pin-critical');
    });

    it('should return correct class for high severity', () => {
      const cell = { row: 'C', col: 10 };
      expect(getIssueSeverityClass(cell, issueIndexMap)).toBe('issue-pin-high');
    });

    it('should return empty string for cell without issues', () => {
      const cell = { row: 'H', col: 69 };
      expect(getIssueSeverityClass(cell, issueIndexMap)).toBe('');
    });

    it('should return medium class for unknown severity', () => {
      const unknownSeverityIssue = [{
        id: 'UNKNOWN',
        severity: 'unknown',
        startColumn: 50,
        endColumn: 51,
        startRow: 'H',
        endRow: 'H'
      }];
      const map = buildIssueIndex(unknownSeverityIssue, rowLabels);
      const cell = { row: 'H', col: 50 };
      expect(getIssueSeverityClass(cell, map)).toBe('issue-pin-medium');
    });
  });

  describe('getIssueTitle', () => {
    let issueIndexMap;

    beforeEach(() => {
      issueIndexMap = buildIssueIndex(sampleIssues, rowLabels);
    });

    it('should return single issue title', () => {
      const cell = { row: 'C', col: 10 };
      expect(getIssueTitle(cell, issueIndexMap)).toBe('Rebar misalignment');
    });

    it('should return combined title for multiple issues', () => {
      const cell = { row: 'A', col: 3 };
      const title = getIssueTitle(cell, issueIndexMap);

      expect(title).toContain('2개 이슈');
      expect(title).toContain('Concrete crack in Zone A');
      expect(title).toContain('Minor surface defect');
    });

    it('should return empty string for cell without issues', () => {
      const cell = { row: 'H', col: 69 };
      expect(getIssueTitle(cell, issueIndexMap)).toBe('');
    });
  });
});
