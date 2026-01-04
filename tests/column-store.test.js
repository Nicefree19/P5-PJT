/**
 * Column Store Tests
 *
 * Tests for quickChangeStatus and related column management functions
 * Priority: 🔴 HIGH - Core status management
 */

const {
  quickChangeStatus,
  bulkLockColumns,
  quickChangeStage,
  calculateColumnStats,
  filterColumnsByZone,
  isValidUID,
  parseUID
} = require('../src/dashboard/js/stores/column-store');

describe('Column Store', () => {
  // Test fixtures
  const statusCodes = {
    'not_started': { label: '미착수', color: '#gray' },
    'in_progress': { label: '진행중', color: '#blue' },
    'complete': { label: '완료', color: '#green' },
    'delayed': { label: '지연', color: '#red' }
  };

  const sampleColumns = {
    'A-X1': { uid: 'A-X1', status: { code: 'not_started' } },
    'A-X2': { uid: 'A-X2', status: { code: 'in_progress' } },
    'A-X3': { uid: 'A-X3', status: { code: 'complete' } },
    'B-X1': { uid: 'B-X1', status: { code: 'not_started' } },
    'B-X2': { uid: 'B-X2', status: { code: 'delayed' } }
  };

  describe('quickChangeStatus', () => {
    it('should change status for selected cells', () => {
      const selectedCells = ['A-X1', 'B-X1'];
      const result = quickChangeStatus(
        selectedCells,
        'in_progress',
        sampleColumns,
        statusCodes
      );

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.updatedColumns['A-X1'].status.code).toBe('in_progress');
      expect(result.updatedColumns['B-X1'].status.code).toBe('in_progress');
    });

    it('should set updatedAt timestamp', () => {
      const selectedCells = ['A-X1'];
      const before = new Date().toISOString();

      const result = quickChangeStatus(
        selectedCells,
        'complete',
        sampleColumns,
        statusCodes
      );

      const after = new Date().toISOString();
      const updatedAt = result.updatedColumns['A-X1'].status.updatedAt;

      expect(updatedAt >= before).toBe(true);
      expect(updatedAt <= after).toBe(true);
    });

    it('should return status label', () => {
      const result = quickChangeStatus(
        ['A-X1'],
        'complete',
        sampleColumns,
        statusCodes
      );

      expect(result.statusLabel).toBe('완료');
    });

    it('should return raw code if label not found', () => {
      const result = quickChangeStatus(
        ['A-X1'],
        'unknown_status',
        sampleColumns,
        statusCodes
      );

      expect(result.statusLabel).toBe('unknown_status');
    });

    it('should skip non-existent cells', () => {
      const selectedCells = ['A-X1', 'Z-X99']; // Z-X99 doesn't exist
      const result = quickChangeStatus(
        selectedCells,
        'complete',
        sampleColumns,
        statusCodes
      );

      expect(result.count).toBe(1);
      expect(result.updatedColumns['Z-X99']).toBeUndefined();
    });

    it('should return failure for empty selection', () => {
      const result = quickChangeStatus([], 'complete', sampleColumns, statusCodes);

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should return failure for null selection', () => {
      const result = quickChangeStatus(null, 'complete', sampleColumns, statusCodes);

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should preserve other column properties', () => {
      const columnsWithExtra = {
        'A-X1': {
          uid: 'A-X1',
          status: { code: 'not_started' },
          stages: { hmb_fab: { status: 'complete' } },
          locked: true
        }
      };

      const result = quickChangeStatus(
        ['A-X1'],
        'in_progress',
        columnsWithExtra,
        statusCodes
      );

      expect(result.updatedColumns['A-X1'].stages).toEqual({ hmb_fab: { status: 'complete' } });
      expect(result.updatedColumns['A-X1'].locked).toBe(true);
    });
  });

  describe('bulkLockColumns', () => {
    it('should lock selected columns', () => {
      const result = bulkLockColumns(['A-X1', 'A-X2'], true, sampleColumns, 'admin');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.updatedColumns['A-X1'].locked).toBe(true);
      expect(result.updatedColumns['A-X1'].lockedBy).toBe('admin');
      expect(result.updatedColumns['A-X1'].lockedAt).toBeDefined();
    });

    it('should unlock selected columns', () => {
      const lockedColumns = {
        'A-X1': { uid: 'A-X1', locked: true, lockedBy: 'admin', lockedAt: '2025-01-01' }
      };

      const result = bulkLockColumns(['A-X1'], false, lockedColumns, 'admin');

      expect(result.updatedColumns['A-X1'].locked).toBe(false);
      expect(result.updatedColumns['A-X1'].lockedBy).toBeNull();
      expect(result.updatedColumns['A-X1'].lockedAt).toBeNull();
    });

    it('should use default lockedBy', () => {
      const result = bulkLockColumns(['A-X1'], true, sampleColumns);

      expect(result.updatedColumns['A-X1'].lockedBy).toBe('user');
    });
  });

  describe('quickChangeStage', () => {
    it('should set stage to active', () => {
      const result = quickChangeStage(['A-X1'], 'hmb_fab', 'active', sampleColumns);

      expect(result.success).toBe(true);
      expect(result.updatedColumns['A-X1'].stages.hmb_fab.status).toBe('active');
      expect(result.updatedColumns['A-X1'].stages.hmb_fab.startedAt).toBeDefined();
    });

    it('should set stage to complete', () => {
      const result = quickChangeStage(['A-X1'], 'hmb_fab', 'complete', sampleColumns);

      expect(result.updatedColumns['A-X1'].stages.hmb_fab.status).toBe('complete');
      expect(result.updatedColumns['A-X1'].stages.hmb_fab.completedAt).toBeDefined();
    });

    it('should preserve existing stages', () => {
      const columnsWithStages = {
        'A-X1': {
          uid: 'A-X1',
          stages: {
            hmb_fab: { status: 'complete', completedAt: '2025-01-01' }
          }
        }
      };

      const result = quickChangeStage(['A-X1'], 'pre_assem', 'active', columnsWithStages);

      expect(result.updatedColumns['A-X1'].stages.hmb_fab.status).toBe('complete');
      expect(result.updatedColumns['A-X1'].stages.pre_assem.status).toBe('active');
    });
  });

  describe('calculateColumnStats', () => {
    it('should calculate counts by status', () => {
      const stats = calculateColumnStats(sampleColumns, statusCodes);

      expect(stats.not_started.count).toBe(2);
      expect(stats.in_progress.count).toBe(1);
      expect(stats.complete.count).toBe(1);
      expect(stats.delayed.count).toBe(1);
      expect(stats.total).toBe(5);
    });

    it('should calculate percentages', () => {
      const stats = calculateColumnStats(sampleColumns, statusCodes);

      expect(stats.not_started.percentage).toBe(40); // 2/5 = 40%
      expect(stats.in_progress.percentage).toBe(20); // 1/5 = 20%
      expect(stats.complete.percentage).toBe(20);
      expect(stats.delayed.percentage).toBe(20);
    });

    it('should handle empty columns', () => {
      const stats = calculateColumnStats({}, statusCodes);

      expect(stats.total).toBe(0);
    });

    it('should handle columns with undefined status codes', () => {
      const columnsWithUnknown = {
        'A-X1': { status: { code: 'unknown_code' } }
      };

      const stats = calculateColumnStats(columnsWithUnknown, statusCodes);

      expect(stats.unknown_code.count).toBe(1);
      expect(stats.total).toBe(1);
    });
  });

  describe('filterColumnsByZone', () => {
    const moreColumns = {
      'A-X1': { uid: 'A-X1' },
      'A-X10': { uid: 'A-X10' },
      'A-X25': { uid: 'A-X25' },
      'B-X5': { uid: 'B-X5' },
      'B-X30': { uid: 'B-X30' }
    };

    it('should filter columns within zone range', () => {
      const zone = { startCol: 1, endCol: 10 };
      const filtered = filterColumnsByZone(moreColumns, zone);

      expect(Object.keys(filtered)).toContain('A-X1');
      expect(Object.keys(filtered)).toContain('A-X10');
      expect(Object.keys(filtered)).toContain('B-X5');
      expect(Object.keys(filtered)).not.toContain('A-X25');
      expect(Object.keys(filtered)).not.toContain('B-X30');
    });

    it('should return all columns for invalid zone', () => {
      expect(filterColumnsByZone(moreColumns, null)).toBe(moreColumns);
      expect(filterColumnsByZone(moreColumns, {})).toBe(moreColumns);
      expect(filterColumnsByZone(moreColumns, { startCol: 1 })).toBe(moreColumns);
    });

    it('should handle Zone A (FAB) range', () => {
      const zoneA = { startCol: 1, endCol: 23 };
      const filtered = filterColumnsByZone(moreColumns, zoneA);

      expect(Object.keys(filtered)).toContain('A-X1');
      expect(Object.keys(filtered)).toContain('A-X10');
      expect(Object.keys(filtered)).not.toContain('A-X25');
    });
  });

  describe('isValidUID', () => {
    it('should return true for valid UIDs', () => {
      expect(isValidUID('A-X1')).toBe(true);
      expect(isValidUID('B-X69')).toBe(true);
      expect(isValidUID('H-X327')).toBe(true);
      expect(isValidUID('AA-X100')).toBe(true);
    });

    it('should return false for invalid UIDs', () => {
      expect(isValidUID('a-X1')).toBe(false);      // lowercase
      expect(isValidUID('A-1')).toBe(false);       // missing X
      expect(isValidUID('AX1')).toBe(false);       // missing dash
      expect(isValidUID('A-Xa')).toBe(false);      // non-numeric column
      expect(isValidUID('')).toBe(false);          // empty
      expect(isValidUID(null)).toBe(false);        // null
      expect(isValidUID(undefined)).toBe(false);   // undefined
      expect(isValidUID(123)).toBe(false);         // number
    });
  });

  describe('parseUID', () => {
    it('should parse valid UIDs', () => {
      expect(parseUID('A-X1')).toEqual({ row: 'A', col: 1 });
      expect(parseUID('B-X69')).toEqual({ row: 'B', col: 69 });
      expect(parseUID('H-X327')).toEqual({ row: 'H', col: 327 });
    });

    it('should return null for invalid UIDs', () => {
      expect(parseUID('invalid')).toBeNull();
      expect(parseUID(null)).toBeNull();
      expect(parseUID('')).toBeNull();
    });
  });
});
