/**
 * Virtual Scroll Tests
 *
 * Tests for virtual scrolling calculations
 * Priority: 🟡 MED - Performance optimization
 */

const {
  calculateVisibleRange,
  getCellPosition,
  calculateGridDimensions,
  shouldEnableVirtualScroll,
  getScrollPositionInfo
} = require('../src/dashboard/js/utils/virtual-scroll');

describe('Virtual Scroll Utils', () => {
  // Default config for tests
  const defaultConfig = {
    headerWidth: 40,
    headerHeight: 30,
    cellWidth: 28,
    cellHeight: 30,
    bufferCells: 5,
    totalCols: 69,
    totalRows: 8
  };

  describe('calculateVisibleRange', () => {
    it('should calculate correct visible range at scroll position 0,0', () => {
      const params = {
        scrollLeft: 0,
        scrollTop: 0,
        viewportWidth: 800,
        viewportHeight: 600,
        ...defaultConfig
      };

      const range = calculateVisibleRange(params);

      expect(range.colStart).toBe(0);
      expect(range.rowStart).toBe(0);
      expect(range.colEnd).toBeGreaterThan(0);
      expect(range.rowEnd).toBeGreaterThan(0);
    });

    it('should include buffer cells', () => {
      const params = {
        scrollLeft: 500,
        scrollTop: 100,
        viewportWidth: 400,
        viewportHeight: 300,
        ...defaultConfig,
        bufferCells: 3
      };

      const range = calculateVisibleRange(params);

      // With buffer, range should extend beyond viewport
      expect(range.colStart).toBeLessThanOrEqual(Math.floor((500 - 40) / 28));
      expect(range.rowStart).toBeLessThanOrEqual(Math.floor((100 - 30) / 30));
    });

    it('should respect min/max bounds', () => {
      const params = {
        scrollLeft: 0,
        scrollTop: 0,
        viewportWidth: 10000,
        viewportHeight: 10000,
        ...defaultConfig
      };

      const range = calculateVisibleRange(params);

      expect(range.colStart).toBeGreaterThanOrEqual(0);
      expect(range.rowStart).toBeGreaterThanOrEqual(0);
      expect(range.colEnd).toBeLessThanOrEqual(defaultConfig.totalCols);
      expect(range.rowEnd).toBeLessThanOrEqual(defaultConfig.totalRows);
    });

    it('should handle large scroll positions', () => {
      const params = {
        scrollLeft: 1500,
        scrollTop: 200,
        viewportWidth: 400,
        viewportHeight: 300,
        ...defaultConfig
      };

      const range = calculateVisibleRange(params);

      expect(range.colStart).toBeGreaterThan(0);
      expect(range.colEnd).toBeLessThanOrEqual(defaultConfig.totalCols);
    });

    it('should use default values for missing params', () => {
      const range = calculateVisibleRange({});

      expect(range).toHaveProperty('colStart');
      expect(range).toHaveProperty('colEnd');
      expect(range).toHaveProperty('rowStart');
      expect(range).toHaveProperty('rowEnd');
    });
  });

  describe('getCellPosition', () => {
    const config = {
      headerWidth: 40,
      headerHeight: 30,
      cellWidth: 28,
      cellHeight: 30
    };

    it('should calculate correct position for first data cell', () => {
      const cell = { colIndex: 1, rowIndex: 0 };
      const pos = getCellPosition(cell, config);

      expect(pos.left).toBe(40); // headerWidth + 0 * cellWidth
      expect(pos.top).toBe(30);  // headerHeight + 0 * cellHeight
      expect(pos.width).toBe(26); // cellWidth - 2
      expect(pos.height).toBe(28); // cellHeight - 2
    });

    it('should calculate correct position for cell at col 10, row 3', () => {
      const cell = { colIndex: 10, rowIndex: 3 };
      const pos = getCellPosition(cell, config);

      expect(pos.left).toBe(40 + 9 * 28); // headerWidth + (10-1) * cellWidth
      expect(pos.top).toBe(30 + 3 * 30);  // headerHeight + 3 * cellHeight
    });

    it('should use default config values', () => {
      const cell = { colIndex: 1, rowIndex: 0 };
      const pos = getCellPosition(cell, {});

      expect(pos).toHaveProperty('left');
      expect(pos).toHaveProperty('top');
      expect(pos).toHaveProperty('width');
      expect(pos).toHaveProperty('height');
    });
  });

  describe('calculateGridDimensions', () => {
    it('should calculate correct total dimensions', () => {
      const config = {
        cols: 69,
        rows: 8,
        headerWidth: 40,
        headerHeight: 30,
        cellWidth: 28,
        cellHeight: 30
      };

      const dims = calculateGridDimensions(config);

      expect(dims.width).toBe(40 + 69 * 28);  // 1972
      expect(dims.height).toBe(30 + 8 * 30);   // 270
    });

    it('should handle P5 real grid config (327 cols)', () => {
      const p5Config = {
        cols: 327,
        rows: 8,
        headerWidth: 40,
        headerHeight: 30,
        cellWidth: 28,
        cellHeight: 30
      };

      const dims = calculateGridDimensions(p5Config);

      expect(dims.width).toBe(40 + 327 * 28); // 9196
      expect(dims.height).toBe(30 + 8 * 30);   // 270
    });

    it('should use default values for missing config', () => {
      const dims = calculateGridDimensions({});

      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });
  });

  describe('shouldEnableVirtualScroll', () => {
    it('should return true for grids > 1000 cells', () => {
      expect(shouldEnableVirtualScroll(100, 20)).toBe(true);  // 2000 cells
      expect(shouldEnableVirtualScroll(69, 20)).toBe(true);   // 1380 cells
    });

    it('should return false for grids <= 1000 cells', () => {
      expect(shouldEnableVirtualScroll(50, 10)).toBe(false);  // 500 cells
      expect(shouldEnableVirtualScroll(100, 10)).toBe(false); // 1000 cells exactly
    });

    it('should support custom threshold', () => {
      expect(shouldEnableVirtualScroll(50, 10, 400)).toBe(true);  // 500 > 400
      expect(shouldEnableVirtualScroll(50, 10, 600)).toBe(false); // 500 < 600
    });

    it('should return true for P5 actual grid', () => {
      // P5 has 327 cols x 8 rows = 2616 cells
      expect(shouldEnableVirtualScroll(327, 8)).toBe(true);
    });
  });

  describe('getScrollPositionInfo', () => {
    it('should return formatted position string', () => {
      const params = {
        visibleColStart: 10,
        visibleColEnd: 25,
        visibleRowStart: 2,
        visibleRowEnd: 6,
        totalCols: 69,
        totalRows: 8
      };

      const info = getScrollPositionInfo(params);

      expect(info).toContain('Col 11-26 / 69');
      expect(info).toContain('Row 3-6 / 8');
    });

    it('should use default values for missing params', () => {
      const info = getScrollPositionInfo({});

      expect(typeof info).toBe('string');
      expect(info.length).toBeGreaterThan(0);
    });
  });
});
