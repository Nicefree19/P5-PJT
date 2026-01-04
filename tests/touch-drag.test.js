/**
 * Touch Drag Selection Tests
 *
 * Tests for touch-based drag selection calculations
 * Priority: 🟡 MED - UX accuracy
 */

const {
  getCellsInTouchDragRect,
  calculateOverlayStyle,
  countCellsInDragRect,
  isPointInGrid,
  constrainPointToGrid
} = require('../src/dashboard/js/utils/touch-drag');

describe('Touch Drag Utils', () => {
  // Test fixtures
  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const gridRect = {
    left: 100,
    top: 50,
    right: 900,
    bottom: 350,
    width: 800,
    height: 300
  };

  // Generate columns data for testing
  const columns = {};
  for (let r = 0; r < rowLabels.length; r++) {
    for (let c = 1; c <= 69; c++) {
      columns[`${rowLabels[r]}-X${c}`] = { uid: `${rowLabels[r]}-X${c}` };
    }
  }

  describe('getCellsInTouchDragRect', () => {
    it('should return cells within drag rectangle', () => {
      const params = {
        startPoint: { x: 130, y: 80 },  // ~col 1, row 0
        endPoint: { x: 200, y: 140 },   // ~col 3, row 2
        gridRect,
        scrollLeft: 0,
        scrollTop: 0,
        cellWidth: 28,
        cellHeight: 30,
        totalCols: 69,
        totalRows: 8,
        rowLabels,
        columns
      };

      const cells = getCellsInTouchDragRect(params);

      expect(cells.length).toBeGreaterThan(0);
      expect(cells.every(uid => typeof uid === 'string')).toBe(true);
      expect(cells.every(uid => /^[A-Z]+-X\d+$/.test(uid))).toBe(true);
    });

    it('should handle reverse drag direction (end before start)', () => {
      const params = {
        startPoint: { x: 200, y: 140 },
        endPoint: { x: 130, y: 80 },
        gridRect,
        scrollLeft: 0,
        scrollTop: 0,
        cellWidth: 28,
        cellHeight: 30,
        totalCols: 69,
        totalRows: 8,
        rowLabels,
        columns
      };

      const cells = getCellsInTouchDragRect(params);

      expect(cells.length).toBeGreaterThan(0);
    });

    it('should account for scroll position', () => {
      const params = {
        startPoint: { x: 130, y: 80 },
        endPoint: { x: 200, y: 110 },
        gridRect,
        scrollLeft: 200, // scrolled 200px right
        scrollTop: 0,
        cellWidth: 28,
        cellHeight: 30,
        totalCols: 69,
        totalRows: 8,
        rowLabels,
        columns
      };

      const cells = getCellsInTouchDragRect(params);

      // With scroll, should select different columns
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should only include cells that exist in columns data', () => {
      const limitedColumns = {
        'A-X1': { uid: 'A-X1' },
        'A-X2': { uid: 'A-X2' },
        'B-X1': { uid: 'B-X1' }
      };

      const params = {
        startPoint: { x: 100, y: 50 },
        endPoint: { x: 300, y: 200 },
        gridRect,
        scrollLeft: 0,
        scrollTop: 0,
        cellWidth: 28,
        cellHeight: 30,
        totalCols: 69,
        totalRows: 8,
        rowLabels,
        columns: limitedColumns
      };

      const cells = getCellsInTouchDragRect(params);

      // Should only return cells that exist in limitedColumns
      expect(cells.every(uid => limitedColumns[uid] !== undefined)).toBe(true);
    });

    it('should return empty array for missing inputs', () => {
      expect(getCellsInTouchDragRect({})).toEqual([]);
      expect(getCellsInTouchDragRect({ startPoint: { x: 0, y: 0 } })).toEqual([]);
      expect(getCellsInTouchDragRect({
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 100 }
      })).toEqual([]);
    });

    it('should respect totalCols and totalRows bounds', () => {
      const params = {
        startPoint: { x: 100, y: 50 },
        endPoint: { x: 10000, y: 10000 }, // Way beyond grid
        gridRect,
        scrollLeft: 0,
        scrollTop: 0,
        cellWidth: 28,
        cellHeight: 30,
        totalCols: 5,
        totalRows: 3,
        rowLabels: ['A', 'B', 'C'],
        columns
      };

      const cells = getCellsInTouchDragRect(params);

      // Check no cell exceeds bounds
      cells.forEach(uid => {
        const match = uid.match(/^([A-Z]+)-X(\d+)$/);
        expect(match).not.toBeNull();
        const col = parseInt(match[2], 10);
        expect(col).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('calculateOverlayStyle', () => {
    it('should calculate correct overlay dimensions', () => {
      const style = calculateOverlayStyle(
        { x: 100, y: 50 },
        { x: 200, y: 150 }
      );

      expect(style.left).toBe(100);
      expect(style.top).toBe(50);
      expect(style.width).toBe(100);
      expect(style.height).toBe(100);
    });

    it('should handle reversed coordinates', () => {
      const style = calculateOverlayStyle(
        { x: 200, y: 150 },
        { x: 100, y: 50 }
      );

      expect(style.left).toBe(100);
      expect(style.top).toBe(50);
      expect(style.width).toBe(100);
      expect(style.height).toBe(100);
    });

    it('should return zero dimensions for null inputs', () => {
      expect(calculateOverlayStyle(null, { x: 100, y: 100 })).toEqual({
        left: 0, top: 0, width: 0, height: 0
      });

      expect(calculateOverlayStyle({ x: 100, y: 100 }, null)).toEqual({
        left: 0, top: 0, width: 0, height: 0
      });
    });

    it('should handle same start and end point', () => {
      const style = calculateOverlayStyle(
        { x: 150, y: 75 },
        { x: 150, y: 75 }
      );

      expect(style.width).toBe(0);
      expect(style.height).toBe(0);
    });
  });

  describe('countCellsInDragRect', () => {
    it('should return count matching getCellsInTouchDragRect length', () => {
      const params = {
        startPoint: { x: 130, y: 80 },
        endPoint: { x: 200, y: 140 },
        gridRect,
        scrollLeft: 0,
        scrollTop: 0,
        cellWidth: 28,
        cellHeight: 30,
        totalCols: 69,
        totalRows: 8,
        rowLabels,
        columns
      };

      const count = countCellsInDragRect(params);
      const cells = getCellsInTouchDragRect(params);

      expect(count).toBe(cells.length);
    });
  });

  describe('isPointInGrid', () => {
    it('should return true for point inside grid', () => {
      const point = { x: 500, y: 200 };
      expect(isPointInGrid(point, gridRect)).toBe(true);
    });

    it('should return true for point on grid edge', () => {
      expect(isPointInGrid({ x: 100, y: 50 }, gridRect)).toBe(true);   // top-left
      expect(isPointInGrid({ x: 900, y: 350 }, gridRect)).toBe(true);  // bottom-right
    });

    it('should return false for point outside grid', () => {
      expect(isPointInGrid({ x: 50, y: 200 }, gridRect)).toBe(false);   // left
      expect(isPointInGrid({ x: 1000, y: 200 }, gridRect)).toBe(false); // right
      expect(isPointInGrid({ x: 500, y: 10 }, gridRect)).toBe(false);   // top
      expect(isPointInGrid({ x: 500, y: 400 }, gridRect)).toBe(false);  // bottom
    });

    it('should return false for null inputs', () => {
      expect(isPointInGrid(null, gridRect)).toBe(false);
      expect(isPointInGrid({ x: 500, y: 200 }, null)).toBe(false);
    });
  });

  describe('constrainPointToGrid', () => {
    it('should not modify point inside grid', () => {
      const point = { x: 500, y: 200 };
      const constrained = constrainPointToGrid(point, gridRect);

      expect(constrained.x).toBe(500);
      expect(constrained.y).toBe(200);
    });

    it('should constrain point to left edge', () => {
      const point = { x: 50, y: 200 };
      const constrained = constrainPointToGrid(point, gridRect);

      expect(constrained.x).toBe(100);
      expect(constrained.y).toBe(200);
    });

    it('should constrain point to right edge', () => {
      const point = { x: 1000, y: 200 };
      const constrained = constrainPointToGrid(point, gridRect);

      expect(constrained.x).toBe(900);
      expect(constrained.y).toBe(200);
    });

    it('should constrain point to top edge', () => {
      const point = { x: 500, y: 10 };
      const constrained = constrainPointToGrid(point, gridRect);

      expect(constrained.x).toBe(500);
      expect(constrained.y).toBe(50);
    });

    it('should constrain point to bottom edge', () => {
      const point = { x: 500, y: 400 };
      const constrained = constrainPointToGrid(point, gridRect);

      expect(constrained.x).toBe(500);
      expect(constrained.y).toBe(350);
    });

    it('should constrain corner point', () => {
      const point = { x: 0, y: 0 };
      const constrained = constrainPointToGrid(point, gridRect);

      expect(constrained.x).toBe(100);
      expect(constrained.y).toBe(50);
    });

    it('should return original point for null gridRect', () => {
      const point = { x: 500, y: 200 };
      expect(constrainPointToGrid(point, null)).toBe(point);
    });
  });
});
