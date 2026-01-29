/**
 * Structure Store - MGT Structural Framework Data Manager
 * 골조 구조 데이터 저장소 (Alpine.js Store)
 *
 * @module StructureStore
 * @version 2.3.2 - 경로 수정 + 자동 로드 기능 추가
 * @requires Alpine.js
 * @requires mgt-parser.js
 */

(function() {
    'use strict';

    // 캐시 키 상수
    const CACHE_KEY = 'p5_structure_cache_v1';
    const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7일

    /**
     * 스토어 초기화를 위한 팩토리 함수
     * @returns {Object} Alpine store 객체
     */
    function createStructureStore() {
        return {
            // === 상태 ===
            enabled: false,
            loaded: false,
            loading: false,
            error: null,

            // === 구조 데이터 ===
            nodes: new Map(),
            beams: [],
            girders: [],
            columns: [],

            // === 동적 매핑 테이블 (피드백 #1 반영) ===
            coordMap: {
                xToCol: new Map(),  // MGT X → 열 인덱스
                yToRow: new Map(),  // MGT Y → 행 인덱스
                zToFloor: new Map() // MGT Z → 층 ID (F1, F2, ... RF)
            },

            // === 층별 Z값 범위 (피드백 #4 반영) ===
            floorZRanges: new Map(), // floorId → { zMin, zMax }

            // === 캐시 ===
            floorCache: new Map(),

            // === 현재 뷰 상태 ===
            currentFloor: 'F1',
            viewMode: 'plan',

            // === 표시 옵션 ===
            display: {
                showBeams: true,
                showGirders: true,
                showColumns: true,
                opacity: 0.7,
                stageGridOpacity: 0.3,
                lineWidth: 2,
                showLabels: false
            },

            // === 그리드 설정 (mgt-parser의 calculateGridConfig 결과 사용) ===
            gridConfig: {
                xValues: [],
                yValues: [],
                zValues: [],
                xMin: 0,
                xMax: 0,
                yMin: 0,
                yMax: 0,
                xSpacing: 7.2,   // 건축 그리드 간격 (m), 동적으로 업데이트됨
                ySpacing: 10.0
            },

            // === 렌더링 설정 (피드백 #2 반영: 픽셀 변환) ===
            renderConfig: {
                cellWidth: 28,      // 대시보드 CSS 그리드 셀 너비 (px) - DOM 측정값
                cellHeight: 28,     // 대시보드 CSS 그리드 셀 높이 (px) - DOM 측정값
                gridGap: 0,         // CSS grid gap (px) - 셀 사이 간격 없음
                gridStartX: 37,     // 첫 번째 열(X1) 시작 X 좌표 (px)
                gridStartY: 25,     // 첫 번째 행(A) 시작 Y 좌표 (px) - 헤더 높이
                zoomLevel: 1.0,     // 현재 줌 레벨
                dashboardCols: 69,  // 대시보드 전체 열 수 (X1~X69)
                dashboardRows: 11,  // 대시보드 표시 행 수 (A~K)
                // 물리적 좌표계 (미터)
                colSpacingM: 7.2,       // 열 간격 (m) - 건축 그리드 간격
                rowSpacingM: 9.85       // 행 간격 (m) - 108.4m / 11행 = 9.85m
            },

            // === 통계 ===
            stats: {
                totalNodes: 0,
                totalBeams: 0,
                totalGirders: 0,
                totalColumns: 0,
                floorCount: 0,
                lastUpdate: null
            },

            // === 메타데이터 ===
            meta: {
                sourceFile: null,
                parsedAt: null,
                version: '2.3.1'
            },

            // === 초기화 ===
            init() {
                console.log('[StructureStore] Initializing v2.3.0...');

                // 캐시에서 복원 시도 (피드백 #3)
                this._tryLoadFromCache();

                // 렌더링 설정 동기화
                this._syncRenderConfig();

                // 이벤트 리스너 설정
                this._setupEventListeners();

                console.log('[StructureStore] Initialized');
            },

            /**
             * 이벤트 리스너 설정
             * @private
             */
            _setupEventListeners() {
                // 층 변경은 selectFloor() → Alpine.store('structure').setFloor() 로 직접 호출됨

                // 윈도우 리사이즈 시 렌더 설정 재계산
                window.addEventListener('resize', () => {
                    this._syncRenderConfig();
                });
            },

            /**
             * 대시보드 그리드의 실제 CSS 설정 동기화 (피드백 #2, #3 Low)
             * @private
             */
            _syncRenderConfig() {
                const gridContainer = document.getElementById('gridMap');
                if (!gridContainer) return;

                const computedStyle = getComputedStyle(gridContainer);
                const firstCell = gridContainer.querySelector('.grid-cell');
                const headerCell = gridContainer.querySelector('.grid-cell-header');

                // 셀 크기 측정
                if (firstCell) {
                    const cellRect = firstCell.getBoundingClientRect();
                    this.renderConfig.cellWidth = cellRect.width;
                    this.renderConfig.cellHeight = cellRect.height;
                }

                // 헤더 오프셋 동적 계산 (헤더 셀이 존재하면 1, 아니면 0)
                this.renderConfig.headerOffset = headerCell ? 1 : 0;

                // CSS 변수에서 gap 읽기
                const gap = parseFloat(computedStyle.gap) || 1;
                this.renderConfig.gridGap = gap;

                // 컨테이너 패딩 읽기
                const scrollView = document.getElementById('gridScrollView');
                if (scrollView) {
                    const scrollStyle = getComputedStyle(scrollView);
                    this.renderConfig.paddingLeft = parseFloat(scrollStyle.paddingLeft) || 0;
                    this.renderConfig.paddingTop = parseFloat(scrollStyle.paddingTop) || 0;
                }

                // gridConfig에서 제외 열 수 확인 (mgt-parser 결과 기반)
                if (this.gridConfig.excludedColumns && this.gridConfig.excludedColumns.length > 0) {
                    this.renderConfig.excludedColOffset = this.gridConfig.excludedColumns.length;
                }

                console.log('[StructureStore] Render config synced:', this.renderConfig);
            },

            /**
             * SVG 오버레이 직접 업데이트 (Alpine x-html 반응성 문제 해결)
             * @private
             */
            _updateSvgOverlay() {
                // 약간의 지연 후 DOM 업데이트 (Alpine 렌더링 완료 대기)
                setTimeout(() => {
                    const svg = document.querySelector('.structure-overlay');
                    if (svg && this.enabled && this.loaded) {
                        svg.innerHTML = this.getSvgContent();
                        svg.style.display = 'block';
                        console.log('[StructureStore] SVG overlay updated manually');
                    }
                }, 50);
            },

            // === 동적 매핑 테이블 생성 (피드백 #1) ===

            /**
             * MGT 좌표를 그리드 인덱스로 매핑하는 테이블 생성
             * @param {Object} gridConfig - mgt-parser의 calculateGridConfig 결과
             * @private
             */
            _buildCoordMaps(gridConfig) {
                const { xValues, yValues, zValues } = gridConfig;

                // X → Column 매핑
                this.coordMap.xToCol.clear();
                xValues.forEach((x, idx) => {
                    this.coordMap.xToCol.set(x, idx);
                });

                // Y → Row 매핑
                this.coordMap.yToRow.clear();
                yValues.forEach((y, idx) => {
                    this.coordMap.yToRow.set(y, idx);
                });

                // Z → Floor 매핑 및 층별 Z 범위 계산 (피드백 #4)
                this.coordMap.zToFloor.clear();
                this.floorZRanges.clear();

                const sortedZ = [...zValues].sort((a, b) => a - b);
                sortedZ.forEach((z, idx) => {
                    const floorId = idx === sortedZ.length - 1 ? 'RF' : `F${idx + 1}`;
                    this.coordMap.zToFloor.set(z, floorId);

                    // 층별 Z 범위 계산
                    const zMin = z;
                    const zMax = idx < sortedZ.length - 1 ? sortedZ[idx + 1] : z + 10;
                    this.floorZRanges.set(floorId, { zMin, zMax });
                });

                console.log('[StructureStore] Coord maps built:', {
                    xCount: this.coordMap.xToCol.size,
                    yCount: this.coordMap.yToRow.size,
                    zCount: this.coordMap.zToFloor.size
                });
            },

            /**
             * MGT X 좌표에 가장 가까운 열 인덱스 반환 (변단면 대응)
             * @param {number} x - MGT X 좌표 (미터)
             * @returns {number} 열 인덱스
             */
            xToColIndex(x) {
                // 정확한 매핑 먼저 시도
                if (this.coordMap.xToCol.has(x)) {
                    return this.coordMap.xToCol.get(x);
                }

                // 가장 가까운 X값 찾기
                let closestX = null;
                let minDiff = Infinity;
                for (const [mapX] of this.coordMap.xToCol) {
                    const diff = Math.abs(mapX - x);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestX = mapX;
                    }
                }

                return closestX !== null ? this.coordMap.xToCol.get(closestX) : -1;
            },

            /**
             * MGT Y 좌표에 가장 가까운 행 인덱스 반환
             * @param {number} y - MGT Y 좌표 (미터)
             * @returns {number} 행 인덱스
             */
            yToRowIndex(y) {
                if (this.coordMap.yToRow.has(y)) {
                    return this.coordMap.yToRow.get(y);
                }

                let closestY = null;
                let minDiff = Infinity;
                for (const [mapY] of this.coordMap.yToRow) {
                    const diff = Math.abs(mapY - y);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestY = mapY;
                    }
                }

                return closestY !== null ? this.coordMap.yToRow.get(closestY) : -1;
            },

            // === 픽셀 변환 (피드백 #2) ===

            /**
             * 미터 좌표를 픽셀 좌표로 변환 (물리적 좌표계 기반)
             *
             * 대시보드 그리드 좌표계:
             * - X1 = 0m, X2 = 7.2m, X3 = 14.4m, ... (열 간격 7.2m)
             * - A = 0m, B = 9.85m, ... (행 간격 9.85m)
             * - 그리드 첫 셀(X1) 시작: left=37px
             *
             * @param {number} mgtX - MGT X 좌표 (미터)
             * @param {number} mgtY - MGT Y 좌표 (미터)
             * @returns {Object} { x, y } 픽셀 좌표
             */
            mToPx(mgtX, mgtY) {
                const {
                    cellWidth, cellHeight, gridStartX, gridStartY, zoomLevel,
                    colSpacingM, rowSpacingM
                } = this.renderConfig;

                // 물리적 좌표 → 그리드 열/행 인덱스 변환 (0-based)
                // X=0 → colIndex=0 (X1), X=7.2 → colIndex=1 (X2), X=14.4 → colIndex=2 (X3)
                const colIndex = mgtX / colSpacingM;

                // Y=0 → rowIndex=0 (A), Y=9.85 → rowIndex=1 (B)
                const rowIndex = mgtY / rowSpacingM;

                // 픽셀 계산
                // 열 Xn 중앙 = gridStartX + (n-1) * cellWidth + cellWidth/2
                //            = gridStartX + colIndex * cellWidth + cellWidth/2
                const px = gridStartX + colIndex * cellWidth + cellWidth / 2;
                const py = gridStartY + rowIndex * cellHeight + cellHeight / 2;

                // 줌 레벨 적용
                return {
                    x: px * zoomLevel,
                    y: py * zoomLevel
                };
            },

            /**
             * SVG viewBox에 맞는 좌표로 변환
             * @param {number} mgtX - MGT X 좌표
             * @param {number} mgtY - MGT Y 좌표
             * @returns {Object} { x, y } SVG 좌표
             */
            toSvgCoords(mgtX, mgtY) {
                return this.mToPx(mgtX, mgtY);
            },

            // === 데이터 로드 ===

            /**
             * MGT 파일에서 구조 데이터 로드
             * @param {string} mgtContent - MGT 파일 내용
             * @param {string} fileName - 파일명
             * @returns {boolean} 성공 여부
             */
            loadFromMGT(mgtContent, fileName = 'unknown.mgt') {
                this.loading = true;
                this.error = null;

                try {
                    if (!window.parseMGT) {
                        throw new Error('MGT Parser not loaded');
                    }

                    const parseResult = window.parseMGT(mgtContent);

                    if (!parseResult || !parseResult.structure) {
                        throw new Error('Failed to parse MGT file');
                    }

                    // 그리드 설정 저장 (mgt-parser의 calculateGridConfig 결과)
                    if (parseResult.gridConfig) {
                        this.gridConfig = { ...this.gridConfig, ...parseResult.gridConfig };

                        // 동적 매핑 테이블 생성 (피드백 #1)
                        this._buildCoordMaps(parseResult.gridConfig);
                    }

                    // 구조 데이터 저장
                    const structure = parseResult.structure;
                    this.nodes = structure.nodeMap || new Map();
                    this.beams = structure.beams || [];
                    this.girders = structure.girders || [];
                    this.columns = structure.columns || [];
                    this.floorCache = structure.floorStructure || new Map();

                    // 통계 업데이트
                    this.stats = {
                        totalNodes: this.nodes.size,
                        totalBeams: this.beams.length,
                        totalGirders: this.girders.length,
                        totalColumns: this.columns.length,
                        floorCount: this.floorCache.size,
                        lastUpdate: new Date().toISOString()
                    };

                    // 메타데이터
                    this.meta = {
                        sourceFile: fileName,
                        parsedAt: new Date().toISOString(),
                        version: '2.3.2'
                    };

                    this.loaded = true;
                    this.loading = false;

                    // 캐시에 저장 (피드백 #3)
                    this._saveToCache();

                    // Alpine x-html 반응성 문제 해결: SVG 직접 업데이트
                    this._updateSvgOverlay();

                    console.log('[StructureStore] Loaded structure data:', this.stats);
                    return true;

                } catch (err) {
                    console.error('[StructureStore] Load error:', err);
                    this.error = err.message;
                    this.loading = false;
                    return false;
                }
            },

            /**
             * URL에서 MGT 파일 로드 (편의 메서드)
             * @param {string} url - MGT 파일 URL
             * @returns {Promise<boolean>} 성공 여부
             */
            async loadFromURL(url = 'data/P5_복합동.mgt') {
                this.loading = true;
                this.error = null;

                try {
                    console.log('[StructureStore] Fetching MGT from:', url);
                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const content = await response.text();
                    const fileName = url.split('/').pop();

                    console.log('[StructureStore] MGT file size:', (content.length / 1024).toFixed(1), 'KB');
                    return this.loadFromMGT(content, fileName);

                } catch (err) {
                    console.error('[StructureStore] Fetch error:', err);
                    this.error = err.message;
                    this.loading = false;
                    return false;
                }
            },

            // === 캐싱 (피드백 #3) ===

            /**
             * 파싱된 데이터를 LocalStorage에 캐싱
             * @private
             */
            _saveToCache() {
                try {
                    // Map을 직렬화 가능한 형태로 변환
                    const cacheData = {
                        gridConfig: this.gridConfig,
                        coordMap: {
                            xToCol: Array.from(this.coordMap.xToCol.entries()),
                            yToRow: Array.from(this.coordMap.yToRow.entries()),
                            zToFloor: Array.from(this.coordMap.zToFloor.entries())
                        },
                        floorZRanges: Array.from(this.floorZRanges.entries()),
                        beams: this.beams,
                        girders: this.girders,
                        columns: this.columns,
                        floorCache: Array.from(this.floorCache.entries()),
                        stats: this.stats,
                        meta: this.meta,
                        cachedAt: Date.now()
                    };

                    // LZ-String 압축 (이미 로드됨)
                    if (typeof LZString !== 'undefined') {
                        const compressed = LZString.compressToUTF16(JSON.stringify(cacheData));
                        localStorage.setItem(CACHE_KEY, compressed);
                        console.log('[StructureStore] Cached to localStorage (compressed)');
                    } else {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                        console.log('[StructureStore] Cached to localStorage');
                    }
                } catch (err) {
                    console.warn('[StructureStore] Cache save failed:', err);
                }
            },

            /**
             * 캐시에서 데이터 복원 시도
             * @private
             */
            _tryLoadFromCache() {
                try {
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (!cached) return false;

                    // LZ-String 압축 해제
                    let cacheData;
                    if (typeof LZString !== 'undefined') {
                        const decompressed = LZString.decompressFromUTF16(cached);
                        cacheData = JSON.parse(decompressed);
                    } else {
                        cacheData = JSON.parse(cached);
                    }

                    // 캐시 만료 확인
                    if (Date.now() - cacheData.cachedAt > CACHE_EXPIRY_MS) {
                        console.log('[StructureStore] Cache expired, clearing...');
                        localStorage.removeItem(CACHE_KEY);
                        return false;
                    }

                    // 데이터 복원
                    this.gridConfig = cacheData.gridConfig;
                    this.coordMap.xToCol = new Map(cacheData.coordMap.xToCol);
                    this.coordMap.yToRow = new Map(cacheData.coordMap.yToRow);
                    this.coordMap.zToFloor = new Map(cacheData.coordMap.zToFloor);
                    this.floorZRanges = new Map(cacheData.floorZRanges);
                    this.beams = cacheData.beams;
                    this.girders = cacheData.girders;
                    this.columns = cacheData.columns;
                    this.floorCache = new Map(cacheData.floorCache);
                    this.stats = cacheData.stats;
                    this.meta = cacheData.meta;

                    this.loaded = true;

                    // 캐시 복원 후 SVG 업데이트
                    if (this.enabled) {
                        this._updateSvgOverlay();
                    }

                    console.log('[StructureStore] Restored from cache:', this.stats);
                    return true;

                } catch (err) {
                    console.warn('[StructureStore] Cache load failed:', err);
                    localStorage.removeItem(CACHE_KEY);
                    return false;
                }
            },

            /**
             * 캐시 삭제
             */
            clearCache() {
                localStorage.removeItem(CACHE_KEY);
                console.log('[StructureStore] Cache cleared');
            },

            // === 층 관리 (피드백 #4: Z-Level 필터링 개선) ===

            /**
             * 현재 층 설정
             * @param {string} floorId - 층 ID
             */
            setFloor(floorId) {
                if (this.currentFloor === floorId) return;
                this.currentFloor = floorId;
                console.log('[StructureStore] Floor changed to:', floorId);

                // 층 변경 시 SVG 업데이트
                if (this.enabled && this.loaded) {
                    this._updateSvgOverlay();
                }
            },

            /**
             * 현재 층의 Z값 범위 반환
             * @returns {Object} { zMin, zMax }
             */
            getCurrentFloorZRange() {
                return this.floorZRanges.get(this.currentFloor) || { zMin: 0, zMax: 100 };
            },

            /**
             * 현재 층의 구조 요소 반환 (Z-Level 필터링 적용)
             * @returns {Object} { beams, girders, columns }
             */
            getCurrentFloorStructure() {
                if (!this.loaded) {
                    return { beams: [], girders: [], columns: [] };
                }

                // 캐시된 데이터 사용
                const cached = this.floorCache.get(this.currentFloor);
                if (cached) {
                    return {
                        beams: this.display.showBeams ? cached.beams : [],
                        girders: this.display.showGirders ? cached.girders : [],
                        columns: this.display.showColumns ? cached.columns : []
                    };
                }

                // 캐시에 없으면 Z-Level 기반 필터링 (피드백 #4)
                const { zMin, zMax } = this.getCurrentFloorZRange();

                const filterByZ = (element) => {
                    const z1 = element.n1?.z ?? 0;
                    const z2 = element.n2?.z ?? z1;
                    // 두 노드 모두 현재 층 Z 범위에 포함
                    return z1 >= zMin && z1 < zMax && z2 >= zMin && z2 < zMax;
                };

                return {
                    beams: this.display.showBeams
                        ? this.beams.filter(filterByZ)
                        : [],
                    girders: this.display.showGirders
                        ? this.girders.filter(filterByZ)
                        : [],
                    columns: this.display.showColumns
                        ? this.columns.filter(c => {
                            const z = c.n1?.z ?? 0;
                            return z >= zMin && z < zMax;
                        })
                        : []
                };
            },

            /**
             * 사용 가능한 층 목록
             * @returns {string[]}
             */
            getAvailableFloors() {
                return Array.from(this.floorZRanges.keys()).sort((a, b) => {
                    const aNum = a === 'RF' ? 999 : parseInt(a.replace('F', ''));
                    const bNum = b === 'RF' ? 999 : parseInt(b.replace('F', ''));
                    return aNum - bNum;
                });
            },

            // === SVG 렌더링 ===

            /**
             * 구조 요소를 SVG 라인 데이터로 변환
             * @param {Object} element - 구조 요소
             * @returns {Object} SVG 라인 데이터
             */
            elementToSvgLine(element) {
                const p1 = this.mToPx(element.n1.x, element.n1.y);
                const p2 = this.mToPx(element.n2.x, element.n2.y);

                return {
                    id: element.id,
                    x1: p1.x,
                    y1: p1.y,
                    x2: p2.x,
                    y2: p2.y,
                    type: element.direction,
                    floorId: element.floorId
                };
            },

            /**
             * 현재 층의 SVG 렌더링 데이터 반환
             * @returns {Object} { beamLines, girderLines, columnPoints }
             */
            getSvgRenderData() {
                const structure = this.getCurrentFloorStructure();

                return {
                    beamLines: structure.beams.map(b => this.elementToSvgLine(b)),
                    girderLines: structure.girders.map(g => this.elementToSvgLine(g)),
                    columnPoints: structure.columns.map(c => {
                        const pos = this.mToPx(c.n1.x, c.n1.y);
                        return {
                            id: c.id,
                            cx: pos.x,
                            cy: pos.y,
                            floorId: c.floorId
                        };
                    })
                };
            },

            /**
             * SVG 요소를 HTML 문자열로 생성 (Alpine x-html용)
             * @returns {Object} { girders, beams, columns } HTML 문자열
             */
            getSvgHtml() {
                const data = this.getSvgRenderData();

                // 거더 라인 HTML
                const girdersHtml = this.display.showGirders
                    ? data.girderLines.map(line =>
                        `<line class="structure-line girder" x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" data-id="${line.id}"></line>`
                    ).join('')
                    : '';

                // 보 라인 HTML
                const beamsHtml = this.display.showBeams
                    ? data.beamLines.map(line =>
                        `<line class="structure-line beam" x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" data-id="${line.id}"></line>`
                    ).join('')
                    : '';

                // 기둥 점 HTML
                const columnsHtml = this.display.showColumns
                    ? data.columnPoints.map(pt =>
                        `<circle class="structure-column" cx="${pt.cx}" cy="${pt.cy}" r="4" data-id="${pt.id}"></circle>`
                    ).join('')
                    : '';

                return { girders: girdersHtml, beams: beamsHtml, columns: columnsHtml };
            },

            /**
             * 전체 SVG 콘텐츠 HTML 반환
             * @returns {string} SVG 내부 콘텐츠 HTML
             */
            getSvgContent() {
                const html = this.getSvgHtml();
                return `
                    <g class="structure-girders">${html.girders}</g>
                    <g class="structure-beams">${html.beams}</g>
                    <g class="structure-columns">${html.columns}</g>
                `;
            },

            // === 표시 옵션 제어 ===

            toggle() {
                this.enabled = !this.enabled;
                if (this.enabled) {
                    this._syncRenderConfig();
                    if (this.loaded) {
                        this._updateSvgOverlay();
                    } else if (!this.loading) {
                        // 로드되지 않은 경우 자동 로드
                        console.log('[StructureStore] Auto-loading MGT file...');
                        this.loadFromURL();
                    }
                }
                console.log('[StructureStore] Overlay', this.enabled ? 'enabled' : 'disabled');
            },

            toggleElementType(type) {
                if (type === 'beams') this.display.showBeams = !this.display.showBeams;
                else if (type === 'girders') this.display.showGirders = !this.display.showGirders;
                else if (type === 'columns') this.display.showColumns = !this.display.showColumns;
            },

            setOpacity(value) {
                this.display.opacity = Math.max(0, Math.min(1, value));
            },

            setStageGridOpacity(value) {
                this.display.stageGridOpacity = Math.max(0, Math.min(1, value));
            },

            // === 유틸리티 ===

            reset() {
                this.enabled = false;
                this.loaded = false;
                this.nodes = new Map();
                this.beams = [];
                this.girders = [];
                this.columns = [];
                this.floorCache = new Map();
                this.coordMap.xToCol.clear();
                this.coordMap.yToRow.clear();
                this.coordMap.zToFloor.clear();
                this.floorZRanges.clear();
                this.error = null;
                this.stats = {
                    totalNodes: 0,
                    totalBeams: 0,
                    totalGirders: 0,
                    totalColumns: 0,
                    floorCount: 0,
                    lastUpdate: null
                };
                console.log('[StructureStore] Reset');
            },

            debug() {
                console.log('[StructureStore] Debug Info:');
                console.log('  Version:', this.meta.version);
                console.log('  Enabled:', this.enabled);
                console.log('  Loaded:', this.loaded);
                console.log('  Current Floor:', this.currentFloor);
                console.log('  Floor Z Range:', this.getCurrentFloorZRange());
                console.log('  Stats:', this.stats);
                console.log('  Render Config:', this.renderConfig);
                console.log('  Coord Maps:', {
                    xCount: this.coordMap.xToCol.size,
                    yCount: this.coordMap.yToRow.size,
                    zCount: this.coordMap.zToFloor.size
                });
                console.log('  Available Floors:', this.getAvailableFloors());
            }
        };
    }

    // Alpine.js 스토어 등록
    function registerStore() {
        if (typeof Alpine !== 'undefined') {
            Alpine.store('structure', createStructureStore());
            console.log('[StructureStore] Registered with Alpine.js');
        } else {
            document.addEventListener('alpine:init', () => {
                Alpine.store('structure', createStructureStore());
                console.log('[StructureStore] Registered with Alpine.js (deferred)');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerStore);
    } else {
        registerStore();
    }

    window.StructureStoreFactory = createStructureStore;

})();

console.log('[StructureStore] Module v2.3.0 loaded');
