/**
 * MGT Parser Module for P5 Dashboard
 * MIDAS Gen/Civil 해석모델 파일을 파싱하여 대시보드 그리드 구조 생성
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * MGT 파일 파싱 메인 함수
 * @param {string} fileContent - MGT 파일 전체 텍스트
 * @returns {Object} 파싱된 구조 { nodes, elements, gridConfig, zones }
 */
export function parseMGT(fileContent) {
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
    
    // 기둥 데이터 생성
    const columns = generateColumns(nodes, gridConfig);
    
    return {
        nodes,
        elements,
        gridConfig,
        zones,
        columns,
        meta: {
            totalNodes: nodes.length,
            totalElements: elements.length,
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
 * ELEMENT 섹션 파싱
 * 형식: iEL, TYPE, iMAT, iPRO, iN1, iN2, ...
 * @param {string[]} elementLines - ELEMENT 데이터 줄들
 * @returns {Object[]} 요소 배열 [{id, type, nodes}]
 */
function parseElements(elementLines) {
    const elements = [];
    
    for (const line of elementLines) {
        if (!/^\s*\d+/.test(line)) continue;
        
        const parts = line.split(',').map(p => p.trim());
        
        if (parts.length >= 6) {
            const id = parseInt(parts[0]);
            const type = parts[1].replace(/\s+/g, ''); // BEAM, COLUMN 등
            const n1 = parseInt(parts[4]);
            const n2 = parseInt(parts[5]);
            
            if (!isNaN(id) && !isNaN(n1) && !isNaN(n2)) {
                elements.push({ id, type, nodes: [n1, n2] });
            }
        }
    }
    
    return elements;
}

/**
 * 그리드 설정 계산
 * @param {Object[]} nodes - 노드 배열
 * @returns {Object} 그리드 설정 { cols, rows, xSpacing, ySpacing, xValues, yValues }
 */
function calculateGridConfig(nodes) {
    // X, Y 좌표 고유값 추출 및 정렬
    const xValues = [...new Set(nodes.map(n => n.x))].sort((a, b) => a - b);
    const yValues = [...new Set(nodes.map(n => n.y))].sort((a, b) => a - b);
    const zValues = [...new Set(nodes.map(n => n.z))].sort((a, b) => a - b);
    
    // 간격 계산 (첫 두 값의 차이 사용)
    const xSpacing = xValues.length > 1 ? xValues[1] - xValues[0] : 10.8;
    const ySpacing = yValues.length > 1 ? yValues[1] - yValues[0] : 12.3;
    
    // ⚠️ 1~2열 제외: X 최소값 확인
    const minX = xValues[0] || 0;
    const excludedColumns = [];
    
    // X=0, X=10.8이 없으면 1~2열이 없는 것
    if (minX > 15) {
        excludedColumns.push(1, 2);
    }
    
    return {
        cols: xValues.length,
        rows: yValues.length,
        floors: zValues.length,
        xSpacing,
        ySpacing,
        xValues,
        yValues,
        zValues,
        excludedColumns,
        xMin: xValues[0],
        xMax: xValues[xValues.length - 1],
        yMin: yValues[0],
        yMax: yValues[yValues.length - 1]
    };
}

/**
 * Zone 자동 생성
 * X 좌표 범위를 기준으로 Zone 분할
 * @param {Object[]} nodes - 노드 배열
 * @param {Object} gridConfig - 그리드 설정
 * @returns {Object[]} Zone 배열
 */
function generateZones(nodes, gridConfig) {
    const { xValues, xSpacing } = gridConfig;
    
    // X 범위를 3등분하여 Zone A, B, C 생성
    const totalCols = xValues.length;
    const zoneSize = Math.ceil(totalCols / 3);
    
    const zones = [
        {
            id: 'zone_a',
            name: 'ZONE A',
            displayName: 'FAB',
            description: 'Utility Support',
            range: {
                startColumn: 3, // 1~2열 제외 반영
                endColumn: Math.min(3 + zoneSize - 1, 3 + zoneSize),
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
            description: 'Main Link',
            range: {
                startColumn: 3 + zoneSize,
                endColumn: 3 + zoneSize * 2 - 1,
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
            description: 'Office/Amenity - 복합동',
            range: {
                startColumn: 3 + zoneSize * 2,
                endColumn: totalCols + 2, // 1~2열 제외 반영
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
 * 기둥 데이터 생성
 * 노드 좌표를 그리드 위치로 변환
 * ★ 모든 층의 노드를 처리하고, Z값 기반으로 절주(층 그룹) 할당
 * @param {Object[]} nodes - 노드 배열
 * @param {Object} gridConfig - 그리드 설정
 * @returns {Object} 기둥 데이터 { uid: columnData }
 */
function generateColumns(nodes, gridConfig) {
    const { xValues, yValues, zValues } = gridConfig;
    const columns = {};
    const rowLabels = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    
    // Z값으로 층 ID 매핑 함수
    const getFloorIdFromZ = (z) => {
        const floorIndex = zValues.indexOf(z);
        if (floorIndex < 0) return 'F1';
        if (floorIndex === zValues.length - 1) return 'RF';
        return `F${floorIndex + 1}`;
    };
    
    // 층 ID로 절주(8개 층 그룹) 매핑 함수 - floor_jeolju_implementation_plan.md 기준
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
    
    // 기저층(가장 낮은 Z) 노드만 기둥 위치로 사용
    // (다른 층의 동일 X,Y 위치에도 기둥이 있지만, 평면도 표시용으로 기저층만 사용)
    const baseZ = zValues[0];
    const baseNodes = nodes.filter(n => Math.abs(n.z - baseZ) < 0.5);
    
    for (const node of baseNodes) {
        // X → 열 번호 (1~2열 제외 → 3부터 시작)
        const colIndex = xValues.indexOf(node.x);
        const column = colIndex + 3; // 1~2열 제외 반영
        
        // Y → 행 문자
        const rowIndex = yValues.indexOf(node.y);
        const row = rowLabels[rowIndex] || '?';
        
        // 유효하지 않은 인덱스 스킵
        if (colIndex < 0 || rowIndex < 0 || row === '?') continue;
        
        // UID 생성 (production_status_import.js와 일치하는 형식)
        const uid = `${row}-X${column}`;
        
        // Zone 결정
        let zoneId = 'zone_c';
        if (column <= 25) zoneId = 'zone_a';
        else if (column <= 47) zoneId = 'zone_b';
        
        // 층 ID 계산
        const floorId = getFloorIdFromZ(node.z);
        const jeolju = getJeoljuFromFloorId(floorId);
        
        columns[uid] = {
            uid,
            nodeId: node.id,
            location: {
                row: rowIndex,
                column: column,
                zoneId,
                floorId: floorId,
                jeolju: jeolju, // 절주 정보 추가
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
    
    console.log(`[MGT Parser] Generated ${Object.keys(columns).length} columns from ${baseNodes.length} base nodes`);
    console.log(`[MGT Parser] Z-levels: ${zValues.length}, Floor mapping: F1~F${zValues.length - 1}, RF`);
    
    return columns;
}

/**
 * 파싱 결과를 master_config.json 형식으로 변환
 * @param {Object} parsed - parseMGT 결과
 * @returns {Object} master_config.json 호환 구조
 */
export function toMasterConfig(parsed) {
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
export function summarize(parsed) {
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
