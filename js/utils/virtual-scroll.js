/**
 * Virtual Scroll Utilities
 *
 * Provides efficient virtual scrolling calculations for large grids.
 * Extracted from index.html for testability and reusability.
 */

/**
 * Calculate visible range for virtual scrolling
 *
 * @param {Object} params - Scroll parameters
 * @param {number} params.scrollLeft - Current horizontal scroll position
 * @param {number} params.scrollTop - Current vertical scroll position
 * @param {number} params.viewportWidth - Viewport width in pixels
 * @param {number} params.viewportHeight - Viewport height in pixels
 * @param {number} params.headerWidth - Row header width
 * @param {number} params.headerHeight - Column header height
 * @param {number} params.cellWidth - Cell width in pixels
 * @param {number} params.cellHeight - Cell height in pixels
 * @param {number} params.bufferCells - Number of buffer cells outside viewport
 * @param {number} params.totalCols - Total number of columns
 * @param {number} params.totalRows - Total number of rows
 * @returns {Object} Visible range { colStart, colEnd, rowStart, rowEnd }
 */
function calculateVisibleRange(params) {
  const {
    scrollLeft = 0,
    scrollTop = 0,
    viewportWidth = 800,
    viewportHeight = 600,
    headerWidth = 40,
    headerHeight = 30,
    cellWidth = 28,
    cellHeight = 30,
    bufferCells = 5,
    totalCols = 69,
    totalRows = 8
  } = params;

  // Calculate visible column range
  const colStart = Math.max(0, Math.floor((scrollLeft - headerWidth) / cellWidth) - bufferCells);
  const colEnd = Math.min(totalCols, Math.ceil((scrollLeft + viewportWidth - headerWidth) / cellWidth) + bufferCells);

  // Calculate visible row range
  const rowStart = Math.max(0, Math.floor((scrollTop - headerHeight) / cellHeight) - bufferCells);
  const rowEnd = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight - headerHeight) / cellHeight) + bufferCells);

  return {
    colStart,
    colEnd,
    rowStart,
    rowEnd
  };
}

/**
 * Get cell position style for absolute positioning
 *
 * @param {Object} cell - Cell object with colIndex and rowIndex
 * @param {Object} config - Virtual scroll config
 * @param {number} config.headerWidth - Row header width
 * @param {number} config.headerHeight - Column header height
 * @param {number} config.cellWidth - Cell width in pixels
 * @param {number} config.cellHeight - Cell height in pixels
 * @returns {Object} Position { left, top, width, height }
 */
function getCellPosition(cell, config) {
  const {
    headerWidth = 40,
    headerHeight = 30,
    cellWidth = 28,
    cellHeight = 30
  } = config;

  const left = headerWidth + ((cell.colIndex - 1) * cellWidth);
  const top = headerHeight + (cell.rowIndex * cellHeight);

  return {
    left,
    top,
    width: cellWidth - 2,
    height: cellHeight - 2
  };
}

/**
 * Calculate total grid dimensions
 *
 * @param {Object} config - Grid configuration
 * @param {number} config.cols - Number of columns
 * @param {number} config.rows - Number of rows
 * @param {number} config.headerWidth - Row header width
 * @param {number} config.headerHeight - Column header height
 * @param {number} config.cellWidth - Cell width in pixels
 * @param {number} config.cellHeight - Cell height in pixels
 * @returns {Object} Dimensions { width, height }
 */
function calculateGridDimensions(config) {
  const {
    cols = 69,
    rows = 8,
    headerWidth = 40,
    headerHeight = 30,
    cellWidth = 28,
    cellHeight = 30
  } = config;

  return {
    width: headerWidth + (cols * cellWidth),
    height: headerHeight + (rows * cellHeight)
  };
}

/**
 * Check if virtual scrolling should be enabled
 *
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @param {number} threshold - Cell count threshold (default: 1000)
 * @returns {boolean} True if virtual scrolling should be enabled
 */
function shouldEnableVirtualScroll(cols, rows, threshold = 1000) {
  return cols * rows > threshold;
}

/**
 * Calculate scroll position info for indicator
 *
 * @param {Object} params - Scroll parameters
 * @returns {string} Position info string
 */
function getScrollPositionInfo(params) {
  const {
    scrollLeft = 0,
    scrollTop = 0,
    viewportWidth = 800,
    viewportHeight = 600,
    totalWidth = 2000,
    totalHeight = 300,
    visibleColStart = 0,
    visibleColEnd = 20,
    visibleRowStart = 0,
    visibleRowEnd = 8,
    totalCols = 69,
    totalRows = 8
  } = params;

  return `Col ${visibleColStart + 1}-${visibleColEnd + 1} / ${totalCols} | Row ${visibleRowStart + 1}-${visibleRowEnd} / ${totalRows}`;
}

// Export for testing and module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateVisibleRange,
    getCellPosition,
    calculateGridDimensions,
    shouldEnableVirtualScroll,
    getScrollPositionInfo
  };
}
