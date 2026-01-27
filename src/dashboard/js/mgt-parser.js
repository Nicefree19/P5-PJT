/**
 * MGT Parser Module for P5 Dashboard
 * MIDAS Gen/Civil 해석모델 파일을 파싱하여 대시보드 그리드 구조 생성
 *
 * @author Antigravity, Claude Code
 * @version 2.0.0 - 골조 시각화 지원 추가
 */

/**
 * MGT 파일 파싱 메인 함수
 * @param {string} fileContent - MGT 파일 전체 텍스트
 * @returns {Object} 파싱된 구조 { nodes, elements, gridConfig, zones }
 */
function parseMGT(fileContent) {
    const lines = fileContent.split('\n');
    
    // 섹션별 데이터 추출
    const nodeData = extractSection(lines, '*NODE');
    const elementData = extractSection(lines, '*ELEMENT');
    
    // 노드 파싱
    const nodes = parseNodes(nodeData);
    
    // 요소 파싱
    const elements = parseElements(elementData);
    
    // 그리드 설정 계산
    const gridConfig = calculateGridConfig(nodes);
    
    // Zone 자동 생성
    const zones = generateZones(nodes, gridConfig);
    
    // 기둥 데이터 생성 (ELEMENT 기반 수직 부재 필터링)
    const columns = generateColumns(nodes, gridConfig, elements);
    
    // 골조 구조 데이터 생성 (시각화용)
    const structure = generateStructureData(nodes, elements, gridConfig);

    return {
        nodes,
        elements,
        gridConfig,
        zones,
        columns,
        structure,  // 골조 시각화 데이터 추가
        meta: {
            totalNodes: nodes.length,
            totalElements: elements.length,
            totalBeams: structure.meta.totalBeams,
            totalGirders: structure.meta.totalGirders,
            totalColumns: structure.meta.totalColumns,
            parsedAt: new Date().toISOString()
        }
    };
}

/**
 * 특정 섹션의 데이터 추출
 * @param {string[]} lines - 파일 줄 배열
 * @param {string} sectionName - 섹션 이름 (예: '*NODE')
 * @returns {string[]} 해당 섹션의 데이터 줄들
 */
function extractSection(lines, sectionName) {
    const sectionLines = [];
    let inSection = false;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // 섹션 시작 감지
        if (trimmed.startsWith(sectionName)) {
            inSection = true;
            continue;
        }
        
        // 다른 섹션 시작 = 현재 섹션 종료
        if (inSection && trimmed.startsWith('*') && !trimmed.startsWith(';')) {
            break;
        }
        
        // 주석 및 빈 줄 제외
        if (inSection && trimmed && !trimmed.startsWith(';')) {
            sectionLines.push(trimmed);
        }
    }
    
    return sectionLines;
}

/**
 * NODE 섹션 파싱
 * 형식: iNO, X, Y, Z
 * @param {string[]} nodeLines - NODE 데이터 줄들
 * @returns {Object[]} 노드 배열 [{id, x, y, z}]
 */
function parseNodes(nodeLines) {
    const nodes = [];
    
    for (const line of nodeLines) {
        // 숫자로 시작하는 줄만 처리
        if (!/^\s*\d+/.test(line)) continue;
        
        // 쉼표로 분리 후 숫자 추출
        const parts = line.split(',').map(p => p.trim());
        
        if (parts.length >= 4) {
            const id = parseInt(parts[0]);
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            const z = parseFloat(parts[3]);
            
            // 유효한 숫자인 경우만 추가
            if (!isNaN(id) && !isNaN(x) && !isNaN(y) && !isNaN(z)) {
                nodes.push({ id, x, y, z });
            }
        }
    }
    
    return nodes;
}

/**
 * ELEMENT 섹션 파싱 (골조 시각화 지원 강화)
 * 형식: iEL, TYPE, iMAT, iPRO, iN1, iN2, ...
 * @param {string[]} elementLines - ELEMENT 데이터 줄들
 * @returns {Object[]} 요소 배열 [{id, type, materialId, propertyId, nodes}]
 */
function parseElements(elementLines) {
    const elements = [];

    for (const line of elementLines) {
        if (!/^\s*\d+/.test(line)) continue;

        const parts = line.split(',').map(p => p.trim());

        if (parts.length >= 6) {
            const id = parseInt(parts[0]);
            const type = parts[1].replace(/\s+/g, '').toUpperCase(); // BEAM, TRUSS 등
            const materialId = parseInt(parts[2]);
            const propertyId = parseInt(parts[3]);
            const n1 = parseInt(parts[4]);
            const n2 = parseInt(parts[5]);

            if (!isNaN(id) && !isNaN(n1) && !isNaN(n2)) {
                elements.push({
                    id,
                    type,
                    materialId,
                    propertyId,
                    nodes: [n1, n2]
                });
            }
        }
    }

    return elements;
}

/**
 * 골조 구조 데이터 생성 (시각화용)
 * 노드 좌표를 기반으로 요소의 방향과 위치를 계산
 * @param {Object[]} nodes - 노드 배열
 * @param {Object[]} elements - 요소 배열
 * @param {Object} gridConfig - 그리드 설정
 * @returns {Object} 골조 구조 { beams, columns, girders, nodeMap, floorStructure }
 */
function generateStructureData(nodes, elements, gridConfig) {
    const { xValues, yValues, zValues } = gridConfig;
    const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

    // 노드 ID → 노드 데이터 맵
    const nodeMap = new Map();
    for (const node of nodes) {
        // 그리드 좌표 계산 (건축 그리드 매핑 사용)
        const rowIndex = yValues.findIndex(y => Math.abs(y - node.y) < 0.5);
        const floorIndex = zValues.findIndex(z => Math.abs(z - node.z) < 0.5);

        const column = xToGridColumn(node.x);
        const row = rowIndex >= 0 ? rowLabels[rowIndex] : '?';
        const floorId = floorIndex >= 0
            ? (floorIndex === zValues.length - 1 ? 'RF' : `F${floorIndex + 1}`)
            : 'F1';

        nodeMap.set(node.id, {
            ...node,
            gridCol: column,
            gridRow: row,
            rowIndex,
            floorId,
            floorIndex
        });
    }

    // 요소 분류: 보(수평), 기둥(수직), 거더(주보)
    const beams = [];      // 일반 보 (수평, 같은 Y)
    const girders = [];    // 거더 (수평, 다른 Y - 주 구조 보)
    const columns = [];    // 기둥 (수직, 다른 Z)

    for (const elem of elements) {
        const n1 = nodeMap.get(elem.nodes[0]);
        const n2 = nodeMap.get(elem.nodes[1]);

        if (!n1 || !n2) continue;

        // 방향 판정
        const dz = Math.abs(n1.z - n2.z);
        const dx = Math.abs(n1.x - n2.x);
        const dy = Math.abs(n1.y - n2.y);

        const structElem = {
            id: elem.id,
            type: elem.type,
            propertyId: elem.propertyId,
            n1: { id: n1.id, x: n1.x, y: n1.y, z: n1.z, gridCol: n1.gridCol, gridRow: n1.gridRow, floorId: n1.floorId },
            n2: { id: n2.id, x: n2.x, y: n2.y, z: n2.z, gridCol: n2.gridCol, gridRow: n2.gridRow, floorId: n2.floorId },
            floorId: n1.floorId // 시작 노드 기준
        };

        // 수직 요소 (기둥): Z 차이가 크고 X, Y는 거의 같음
        if (dz > 1.0 && dx < 0.5 && dy < 0.5) {
            columns.push({ ...structElem, direction: 'vertical' });
        }
        // 거더: X 방향 수평 (Y는 같고, X 차이 큼)
        else if (dz < 0.5 && dx > 5.0 && dy < 0.5) {
            girders.push({ ...structElem, direction: 'horizontal-x' });
        }
        // 보: Y 방향 수평 (X는 같고, Y 차이 큼)
        else if (dz < 0.5 && dy > 5.0 && dx < 0.5) {
            beams.push({ ...structElem, direction: 'horizontal-y' });
        }
        // 기타 수평 요소 (대각선 등)
        else if (dz < 0.5) {
            beams.push({ ...structElem, direction: 'horizontal-other' });
        }
    }

    // 층별 구조 캐시
    const floorStructure = new Map();
    const floorIds = [...new Set([
        ...beams.map(b => b.floorId),
        ...girders.map(g => g.floorId),
        ...columns.map(c => c.n1.floorId)
    ])];

    for (const floorId of floorIds) {
        floorStructure.set(floorId, {
            beams: beams.filter(b => b.floorId === floorId),
            girders: girders.filter(g => g.floorId === floorId),
            columns: columns.filter(c => c.n1.floorId === floorId || c.n2.floorId === floorId)
        });
    }

    console.log(`[MGT Parser] Structure: ${beams.length} beams, ${girders.length} girders, ${columns.length} columns`);

    return {
        beams,
        girders,
        columns,
        nodeMap,
        floorStructure,
        meta: {
            totalBeams: beams.length,
            totalGirders: girders.length,
            totalColumns: columns.length,
            floors: floorIds
        }
    };
}

/**
 * 특정 층의 골조 데이터 조회
 * @param {Object} structureData - generateStructureData 결과
 * @param {string} floorId - 층 ID (예: 'F1', 'RF')
 * @returns {Object} 해당 층의 골조 { beams, girders, columns }
 */
function getFloorStructure(structureData, floorId) {
    return structureData.floorStructure.get(floorId) || { beams: [], girders: [], columns: [] };
}

/**
 * 골조 요소를 SVG 좌표로 변환
 * @param {Object} element - 골조 요소 (beam, girder, column)
 * @param {Object} gridConfig - 그리드 설정
 * @param {Object} renderConfig - 렌더링 설정 { cellWidth, cellHeight, headerWidth, headerHeight }
 * @returns {Object} SVG 좌표 { x1, y1, x2, y2 }
 */
function elementToSvgCoords(element, gridConfig, renderConfig) {
    const { cellWidth = 32, cellHeight = 32, headerWidth = 50, headerHeight = 27 } = renderConfig;
    const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

    // 그리드 좌표 → SVG 픽셀 좌표 (X3 = 첫 번째 셀)
    const colToX = (col) => headerWidth + (col - GRID_MAPPING.startColumn) * cellWidth + cellWidth / 2;
    const rowToY = (row) => {
        const rowIdx = rowLabels.indexOf(row);
        return headerHeight + rowIdx * cellHeight + cellHeight / 2;
    };

    return {
        x1: colToX(element.n1.gridCol),
        y1: rowToY(element.n1.gridRow),
        x2: colToX(element.n2.gridCol),
        y2: rowToY(element.n2.gridRow)
    };
}

/**
 * 그리드 설정 계산
 * ★ cols는 건축 그리드 열 수(67, X3~X69)를 반환
 * ★ rawXValues는 모든 노드 X 좌표 (골조 시각화용)
 * @param {Object[]} nodes - 노드 배열
 * @returns {Object} 그리드 설정
 */
function calculateGridConfig(nodes) {
    // 모든 노드의 X, Y, Z 고유값 추출 및 정렬
    const rawXValues = [...new Set(nodes.map(n => n.x))].sort((a, b) => a - b);
    const yValues = [...new Set(nodes.map(n => n.y))].sort((a, b) => a - b);
    const zValues = [...new Set(nodes.map(n => n.z))].sort((a, b) => a - b);

    // 건축 그리드: 69열 (X1~X69), 7.2m 간격
    // 실제 데이터는 X4~X69 범위 (X1~X3 미사용)
    const archCols = 69;
    const xSpacing = GRID_MAPPING.spacing;
    const ySpacing = yValues.length > 1 ? yValues[1] - yValues[0] : 12.3;

    return {
        cols: archCols,         // 건축 그리드 열 수 (X1~X69, 실제 X4~X69)
        rows: yValues.length,
        floors: zValues.length,
        xSpacing,
        ySpacing,
        xValues: rawXValues,    // 모든 노드 X (골조 시각화용)
        yValues,
        zValues,
        excludedColumns: [1, 2], // X1, X2 미사용
        xMin: rawXValues[0],
        xMax: rawXValues[rawXValues.length - 1],
        yMin: yValues[0],
        yMax: yValues[yValues.length - 1]
    };
}

/**
 * SSOT Zone 경계 (master_config.json 기준)
 * 모든 Zone 판별 로직은 이 상수를 참조해야 함
 */
const ZONE_BOUNDARIES = {
    zone_a: { startColumn: 1, endColumn: 23 },
    zone_b: { startColumn: 24, endColumn: 45 },
    zone_c: { startColumn: 46, endColumn: 69 }
};

/**
 * 열 번호로 Zone ID 판별 (SSOT 기준)
 * @param {number} column - 열 번호 (1~69)
 * @returns {string} zone ID
 */
function getZoneIdFromColumn(column) {
    if (column <= ZONE_BOUNDARIES.zone_a.endColumn) return 'zone_a';
    if (column <= ZONE_BOUNDARIES.zone_b.endColumn) return 'zone_b';
    return 'zone_c';
}

/**
 * Zone 데이터 생성 (master_config.json SSOT 기준)
 * @param {Object[]} nodes - 노드 배열 (unused, 시그니처 호환 유지)
 * @param {Object} gridConfig - 그리드 설정
 * @returns {Object[]} Zone 배열
 */
function generateZones(nodes, gridConfig) {
    // UI 표시용 Zone 범위 (Type 1 기준 - F1~F3 Max Extent)
    // 실제 기둥의 Zone은 getZoneId()에 의해 층별로 동적 할당됨
    const zones = [
        {
            id: 'zone_a',
            name: 'ZONE A',
            displayName: 'FAB',
            description: 'Utility Support (X46~X69)',
            range: {
                startColumn: 46,
                endColumn: 69,
                startRow: 0,
                endRow: gridConfig.rows - 1
            },
            style: {
                primaryColor: '#238636',
                backgroundColor: 'rgba(35, 134, 54, 0.1)'
            }
        },
        {
            id: 'zone_b',
            name: 'ZONE B',
            displayName: 'CUB',
            description: 'Main Link (X20~X45)',
            range: {
                startColumn: 20,
                endColumn: 45,
                startRow: 0,
                endRow: gridConfig.rows - 1
            },
            style: {
                primaryColor: '#1f6feb',
                backgroundColor: 'rgba(31, 111, 235, 0.1)'
            }
        },
        {
            id: 'zone_c',
            name: 'ZONE C',
            displayName: 'COMPLEX',
            description: 'Office/Amenity (X1~X19)',
            range: {
                startColumn: 1,
                endColumn: 19,
                startRow: 0,
                endRow: gridConfig.rows - 1
            },
            style: {
                primaryColor: '#d29922',
                backgroundColor: 'rgba(210, 153, 34, 0.1)'
            }
        }
    ];

    return zones;
}

/**
 * 건축 그리드 매핑 상수
 * MGT X좌표 -> 건축 그리드 열 번호 변환
 * Grid X1 시작점(baseX)은 0m, Spacing: 7.2m (Architectural Standard)
 */
const GRID_MAPPING = {
    baseX: 0.0,        // X1 열의 MGT X 좌표 (가정)
    spacing: 7.2,      // 기본 그리드 간격 (m)
    startColumn: 1,    // 건축 그리드 시작 열
    tolerance: 2.0     // 매핑 허용 오차 (m) - 구조 노드 편차 허용
};

/**
 * MGT X좌표를 건축 그리드 열 번호로 변환
 * @param {number} x - MGT X좌표 (m)
 * @returns {number} 건축 그리드 열 번호 (1~69)
 */
function xToGridColumn(x) {
    // 7.2m 간격으로 Grid 번호 매핑 (반올림)
    const colIndex = Math.round((x - GRID_MAPPING.baseX) / GRID_MAPPING.spacing);
    return colIndex + GRID_MAPPING.startColumn;
}

/**
 * Floor & Column 기반 Zone ID 판별 (User Logic)
 * 1절(F1~F3): C(1-19), B2(20-32), B1(33-45), A1(46-60), A2(61-69)
 * 2절(F4~RF): C(1-18), B(19-41), A(42-69)
 * @param {number} col - 열 번호
 * @param {string} floorId - 층 ID (F1, F2...)
 * @returns {string} zone ID (zone_c, zone_b, zone_a)
 */
function getZoneId(col, floorId) {
    const floorNum = floorId === 'RF' ? 99 : parseInt(floorId.replace('F', ''));
    
    // 1절 (F1 ~ F3)
    if (floorNum <= 3) {
        if (col <= 19) return 'zone_c';      // C (1~19)
        if (col <= 32) return 'zone_b';      // B2 (20~32) -> ZONE B
        if (col <= 45) return 'zone_b';      // B1 (33~45) -> ZONE B
        return 'zone_a';                     // A1, A2 (46~69) -> ZONE A
    } 
    // 2절 (F4 ~ RF)
    else {
        if (col <= 18) return 'zone_c';      // C (1~18)
        if (col <= 41) return 'zone_b';      // B (19~41)
        return 'zone_a';                     // A (42~69)
    }
}

/**
 * 기둥 데이터 생성
 * ★ ELEMENT 섹션의 수직 부재(Column)와 연결된 노드만 기둥으로 식별
 * ★ MGT X좌표를 건축 그리드 열 번호로 매핑 (단순 인덱스 방식 제거)
 * @param {Object[]} nodes - 노드 배열
 * @param {Object} gridConfig - 그리드 설정
 * @param {Object[]} elements - 요소 배열 (수직 부재 식별용)
 * @returns {Object} 기둥 데이터 { uid: columnData }
 */
function generateColumns(nodes, gridConfig, elements) {
    const { zValues } = gridConfig;
    const columns = {};
    const rowLabels = ['A','B','C','D','E','F','G','H','I','J','K','L'];

    // ── Step 1: ELEMENT 기반 수직 부재(Column) 노드 식별 ──
    const nodeMap = new Map();
    for (const node of nodes) {
        nodeMap.set(node.id, node);
    }

    const columnNodeIds = new Set();
    if (elements && elements.length > 0) {
        for (const elem of elements) {
            const n1 = nodeMap.get(elem.nodes[0]);
            const n2 = nodeMap.get(elem.nodes[1]);
            if (!n1 || !n2) continue;
            const dz = Math.abs(n1.z - n2.z);
            const dx = Math.abs(n1.x - n2.x);
            const dy = Math.abs(n1.y - n2.y);
            // 수직 요소: Z 변화 크고, X/Y는 거의 같음
            if (dz > 1.0 && dx < 0.5 && dy < 0.5) {
                columnNodeIds.add(n1.id);
                columnNodeIds.add(n2.id);
            }
        }
        console.log(`[MGT Parser] Column node filtering: ${columnNodeIds.size} nodes from ${elements.length} elements`);
    }

    // ── Step 2: 모든 Z-level 기둥 노드 → 건축 그리드 매핑 ──
    const useElementFilter = columnNodeIds.size > 0;

    // Y좌표 → 행 인덱스 매핑 (기둥 노드의 Y 기준)
    const columnNodes = useElementFilter
        ? nodes.filter(n => columnNodeIds.has(n.id))
        : nodes;
    const colYValues = [...new Set(columnNodes.map(n => n.y))].sort((a, b) => a - b);

    // 모든 Z-level의 기둥 노드 (층별 컬럼 생성)
    const allColumnNodes = useElementFilter
        ? nodes.filter(n => columnNodeIds.has(n.id) && zValues.some(zv => Math.abs(n.z - zv) < 0.5))
        : nodes.filter(n => zValues.some(zv => Math.abs(n.z - zv) < 0.5));

    console.log(`[MGT Parser] All column nodes: ${allColumnNodes.length} across ${zValues.length} floors (element filter: ${useElementFilter})`);

    // Z값으로 층 ID 매핑 함수
    const getFloorIdFromZ = (z) => {
        const floorIndex = zValues.findIndex(zv => Math.abs(zv - z) < 0.5);
        if (floorIndex < 0) return 'F1';
        if (floorIndex === zValues.length - 1) return 'RF';
        return `F${floorIndex + 1}`;
    };

    // 층 ID로 절주(8개 층 그룹) 매핑 함수 - DashboardAPI.gs SSOT 기준
    const getJeoljuFromFloorId = (floorId) => {
        const floorNum = floorId === 'RF' ? 11 : parseInt(floorId.replace('F', ''));
        if (floorNum <= 2) return '1절주';   // F1~F2
        if (floorNum === 3) return '2절주';  // F3
        if (floorNum === 4) return '3절주';  // F4
        if (floorNum === 5) return '4절주';  // F5
        if (floorNum <= 7) return '5절주';   // F6~F7
        if (floorNum === 8) return '6절주';  // F8
        if (floorNum === 9) return '7절주';  // F9
        return '8절주';                      // F10, RF
    };

    let duplicateCount = 0;

    for (const node of allColumnNodes) {
        // ── Step 2a: X좌표 → 건축 그리드 열 번호 (tolerance 기반) ──
        const column = xToGridColumn(node.x);

        // 유효 범위 체크 (X1~X69)
        if (column < 1 || column > 69) continue;

        // ── Step 2b: Y좌표 -> 행 문자 (기둥 Y 기준) ──
        const rowIndex = colYValues.findIndex(y => Math.abs(y - node.y) < 0.5);
        const row = rowLabels[rowIndex] || '?';

        if (rowIndex < 0 || row === '?') continue;

        // 층 ID 계산
        const floorId = getFloorIdFromZ(node.z);

        // UID: F{floor}-{Row}-X{col} (e.g. F1-A-X36, RF-K-X3)
        const uid = `${floorId}-${row}-X${column}`;
        const legacyUid = `${row}-X${column}`;

        // 중복 UID 감지
        if (columns[uid]) {
            duplicateCount++;
            continue; // 첫 번째 노드 유지, 이후 중복은 스킵
        }

        // Zone 결정 (Multi-Floor Logic 적용)
        const zoneId = getZoneId(column, floorId);

        const jeolju = getJeoljuFromFloorId(floorId);

        columns[uid] = {
            uid,
            legacyUid,
            nodeId: node.id,
            location: {
                row: rowIndex,
                column: column,
                zoneId,
                floorId: floorId,
                jeolju: jeolju,
                x: node.x,
                y: node.y,
                z: node.z
            },
            status: {
                code: 'pending',
                source: 'mgt_import',
                isLocked: false,
                updatedAt: new Date().toISOString()
            },
            stages: {
                hmb_fab: 'pending',
                pre_assem: 'pending',
                main_assem: 'pending',
                hmb_psrc: 'pending',
                form: 'pending',
                embed: 'pending'
            }
        };
    }

    console.log(`[MGT Parser] Generated ${Object.keys(columns).length} columns from ${allColumnNodes.length} column nodes across ${zValues.length} floors (element filter: ${useElementFilter}, duplicates skipped: ${duplicateCount})`);
    console.log(`[MGT Parser] Z-levels: ${zValues.length}, Floor mapping: F1~F${zValues.length - 1}, RF`);
    
    return columns;
}

/**
 * 파싱 결과를 master_config.json 형식으로 변환
 * @param {Object} parsed - parseMGT 결과
 * @returns {Object} master_config.json 호환 구조
 */
function toMasterConfig(parsed) {
    return {
        zones: parsed.zones,
        gridConfig: {
            cols: parsed.gridConfig.cols,
            rows: parsed.gridConfig.rows,
            excludedColumns: parsed.gridConfig.excludedColumns
        },
        meta: {
            ...parsed.meta,
            source: 'mgt_import'
        }
    };
}

/**
 * 파싱 결과 요약 출력
 * @param {Object} parsed - parseMGT 결과
 * @returns {string} 요약 문자열
 */
function summarize(parsed) {
    const { gridConfig, meta } = parsed;
    return `
=== MGT 파싱 결과 ===
노드 수: ${meta.totalNodes}개
요소 수: ${meta.totalElements}개
그리드: ${gridConfig.cols}열 × ${gridConfig.rows}행
X 범위: ${gridConfig.xMin} ~ ${gridConfig.xMax} (간격: ${gridConfig.xSpacing}m)
Y 범위: ${gridConfig.yMin} ~ ${gridConfig.yMax} (간격: ${gridConfig.ySpacing}m)
제외 열: ${gridConfig.excludedColumns.join(', ') || '없음'}
파싱 시간: ${meta.parsedAt}
    `.trim();
}

// 전역 노출 (classic script 로딩용)
if (typeof window !== 'undefined') {
    window.parseMGT = parseMGT;
    window.generateStructureData = generateStructureData;
    window.getFloorStructure = getFloorStructure;
    window.elementToSvgCoords = elementToSvgCoords;
    window.toMasterConfig = toMasterConfig;
    window.summarize = summarize;
    console.log('[MGT Parser] Exposed to window object');
}
