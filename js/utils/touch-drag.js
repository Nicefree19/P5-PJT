/**
 * Touch Drag Selection Utilities
 *
 * Provides touch-based drag selection calculations for mobile devices.
 * Extracted from index.html for testability and reusability.
 */

/**
 * Calculate cells within a touch drag rectangle
 *
 * @param {Object} params - Drag parameters
 * @param {Object} params.startPoint - Start point { x, y }
 * @param {Object} params.endPoint - End point { x, y }
 * @param {Object} params.gridRect - Grid element bounding rect
 * @param {number} params.scrollLeft - Grid scroll left position
 * @param {number} params.scrollTop - Grid scroll top position
 * @param {number} params.cellWidth - Cell width in pixels
 * @param {number} params.cellHeight - Cell height in pixels
 * @param {number} params.totalCols - Total number of columns
 * @param {number} params.totalRows - Total number of rows (rowLabels.length)
 * @param {Array} params.rowLabels - Array of row labels
 * @param {Object} params.columns - Columns data object
 * @returns {Array} Array of selected cell UIDs
 */
function getCellsInTouchDragRect(params) {
  const {
    startPoint,
    endPoint,
    gridRect,
    scrollLeft = 0,
    scrollTop = 0,
    cellWidth = 28,
    cellHeight = 30,
    totalCols = 69,
    totalRows = 8,
    rowLabels = [],
    columns = {}
  } = params;

  if (!startPoint || !endPoint || !gridRect) return [];

  const cells = [];

  // Convert screen coordinates to grid coordinates
  const startX = Math.min(startPoint.x, endPoint.x) - gridRect.left + scrollLeft;
  const startY = Math.min(startPoint.y, endPoint.y) - gridRect.top + scrollTop;
  const endX = Math.max(startPoint.x, endPoint.x) - gridRect.left + scrollLeft;
  const endY = Math.max(startPoint.y, endPoint.y) - gridRect.top + scrollTop;

  // Account for header row
  const headerHeight = cellHeight;

  // Calculate row/col range
  const startCol = Math.max(1, Math.floor(startX / cellWidth));
  const endCol = Math.min(totalCols, Math.ceil(endX / cellWidth));
  const startRow = Math.max(0, Math.floor((startY - headerHeight) / cellHeight));
  const endRow = Math.min(totalRows - 1, Math.ceil((endY - headerHeight) / cellHeight));

  // Generate UIDs for selected cells
  for (let r = startRow; r <= endRow; r++) {
    const rowLabel = rowLabels[r];
    if (!rowLabel) continue;

    for (let c = startCol; c <= endCol; c++) {
      const uid = `${rowLabel}-X${c}`;
      // Only include cells that exist in columns data
      if (columns[uid] !== undefined) {
        cells.push(uid);
      }
    }
  }

  return cells;
}

/**
 * Calculate touch drag overlay position and size
 *
 * @param {Object} startPoint - Start point { x, y }
 * @param {Object} endPoint - End point { x, y }
 * @returns {Object} Overlay style { left, top, width, height }
 */
function calculateOverlayStyle(startPoint, endPoint) {
  if (!startPoint || !endPoint) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const left = Math.min(startPoint.x, endPoint.x);
  const top = Math.min(startPoint.y, endPoint.y);
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  return { left, top, width, height };
}

/**
 * Count cells that would be selected in a drag rect
 *
 * @param {Object} params - Same as getCellsInTouchDragRect
 * @returns {number} Number of cells that would be selected
 */
function countCellsInDragRect(params) {
  return getCellsInTouchDragRect(params).length;
}

/**
 * Validate touch point is within grid bounds
 *
 * @param {Object} point - Touch point { x, y }
 * @param {Object} gridRect - Grid bounding rect
 * @returns {boolean} True if point is within bounds
 */
function isPointInGrid(point, gridRect) {
  if (!point || !gridRect) return false;

  return point.x >= gridRect.left &&
         point.x <= gridRect.right &&
         point.y >= gridRect.top &&
         point.y <= gridRect.bottom;
}

/**
 * Constrain point to grid bounds
 *
 * @param {Object} point - Touch point { x, y }
 * @param {Object} gridRect - Grid bounding rect
 * @returns {Object} Constrained point { x, y }
 */
function constrainPointToGrid(point, gridRect) {
  if (!point || !gridRect) return point;

  return {
    x: Math.max(gridRect.left, Math.min(gridRect.right, point.x)),
    y: Math.max(gridRect.top, Math.min(gridRect.bottom, point.y))
  };
}

// Export for testing and module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCellsInTouchDragRect,
    calculateOverlayStyle,
    countCellsInDragRect,
    isPointInGrid,
    constrainPointToGrid
  };
}
