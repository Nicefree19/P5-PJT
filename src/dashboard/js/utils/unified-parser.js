/**
 * Unified Parser - Issue Data Mapper Phase 1
 * 다양한 형식(Excel, CSV, 이미지)의 설계 이슈 데이터를 통합 파싱
 *
 * @module UnifiedParser
 * @requires XLSX (SheetJS)
 * @requires VisionOCR (Phase 2)
 */

window.UnifiedParser = (function() {
    'use strict';

    /**
     * UUID v4 생성
     * @returns {string}
     */
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 파일 형식 자동 감지
     * @param {File} file - 입력 파일
     * @returns {'excel'|'csv'|'image'|'unknown'}
     */
    function detectFormat(file) {
        const name = file.name.toLowerCase();
        const type = file.type.toLowerCase();

        // Excel 형식
        if (name.endsWith('.xlsx') || name.endsWith('.xls') ||
            type.includes('spreadsheet') || type.includes('excel')) {
            return 'excel';
        }

        // CSV 형식
        if (name.endsWith('.csv') || type === 'text/csv') {
            return 'csv';
        }

        // 이미지 형식
        if (type.startsWith('image/') ||
            /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(name)) {
            return 'image';
        }

        return 'unknown';
    }

    /**
     * 소스 타입 추론
     * @param {string} filename - 파일명
     * @param {string} content - 파일 내용 일부
     * @returns {'design'|'meeting'|'production'|'image'}
     */
    function inferSourceType(filename, content = '') {
        const lower = filename.toLowerCase();
        const contentLower = (content || '').toLowerCase();

        if (/회의록|meeting|minutes/i.test(lower + contentLower)) {
            return 'meeting';
        }
        if (/제작|production|현황|status/i.test(lower + contentLower)) {
            return 'production';
        }
        if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lower)) {
            return 'image';
        }
        return 'design';
    }

    /**
     * 위치 정보 추출 (층, 구역, 기둥 ID)
     * @param {string} text - 분석할 텍스트
     * @returns {Object} location 객체
     */
    function extractLocation(text) {
        if (!text) return { floor: '', zone: '', columns: [] };

        const location = { floor: '', zone: '', columns: [] };

        // 층수 패턴: 1층, 3F, RF, 10FL, B1F
        const floorMatch = text.match(/(B?\d{1,2}|RF)\s*[Ff층]?/i);
        if (floorMatch) {
            location.floor = floorMatch[1].toUpperCase();
            if (!location.floor.includes('F') && location.floor !== 'RF') {
                location.floor += 'F';
            }
        }

        // 구역 패턴: Zone A, A구역, Zone-A
        const zoneMatch = text.match(/(?:zone|구역)[\s\-]?([A-C])/i);
        if (zoneMatch) {
            location.zone = zoneMatch[1].toUpperCase();
        }

        // 기둥 ID 패턴
        const columnIds = [];
        const addedIds = new Set();

        // 범위 패턴: C-X1~5, A-X10~15, A1~5
        const rangePattern = /([A-C])-?[Xx]?(\d{1,3})\s*[~\-~－까지]\s*[Xx]?(\d{1,3})/gi;
        let match;
        while ((match = rangePattern.exec(text)) !== null) {
            const zone = match[1].toUpperCase();
            const start = parseInt(match[2], 10);
            const end = parseInt(match[3], 10);
            for (let i = Math.min(start, end); i <= Math.max(start, end) && i <= 330; i++) {
                const id = `${zone}-X${i}`;
                if (!addedIds.has(id)) {
                    columnIds.push(id);
                    addedIds.add(id);
                    if (!location.zone) location.zone = zone;
                }
            }
        }

        // 단일 기둥 패턴: C-X15, A-X3, CX15
        const singlePattern = /([A-C])-?[Xx]?(\d{1,3})(?![~\-~－까지\d])/gi;
        while ((match = singlePattern.exec(text)) !== null) {
            const zone = match[1].toUpperCase();
            const num = parseInt(match[2], 10);
            if (num > 0 && num <= 330) {
                const id = `${zone}-X${num}`;
                if (!addedIds.has(id)) {
                    columnIds.push(id);
                    addedIds.add(id);
                    if (!location.zone) location.zone = zone;
                }
            }
        }

        location.columns = columnIds;
        return location;
    }

    /**
     * 이슈 유형 추출
     * @param {string} text - 분석할 텍스트
     * @returns {string}
     */
    function extractIssueType(text) {
        if (!text) return '';

        const typePatterns = {
            'PSRC': /PSRC|PS[Rr][Cc]|피에스알씨/i,
            'HMB': /HMB|에이치엠비|High Modulus Bar/i,
            'Embed': /[Ee]mbed|매입|매립|인서트/i,
            'Rebar': /철근|[Rr]ebar|배근/i,
            'Form': /거푸집|[Ff]orm|폼/i,
            'Concrete': /콘크리트|타설|[Cc]oncrete/i,
            'Steel': /철골|[Ss]teel|강재/i,
            'Safety': /안전|[Ss]afety/i,
            'QC': /품질|QC|[Qq]uality/i,
            'Design': /설계|[Dd]esign|도면/i
        };

        for (const [type, pattern] of Object.entries(typePatterns)) {
            if (pattern.test(text)) {
                return type;
            }
        }

        return '';
    }

    /**
     * 심각도 추출
     * @param {string} text - 분석할 텍스트
     * @returns {'Critical'|'High'|'Medium'|'Low'}
     */
    function extractSeverity(text) {
        if (!text) return 'Medium';

        const lower = text.toLowerCase();

        if (/긴급|critical|심각|위험|즉시|emergency/i.test(lower)) {
            return 'Critical';
        }
        if (/중요|high|높음|우선/i.test(lower)) {
            return 'High';
        }
        if (/경미|low|낮음|미미/i.test(lower)) {
            return 'Low';
        }

        return 'Medium';
    }

    /**
     * 상태 추출
     * @param {string} text - 상태 텍스트
     * @returns {string}
     */
    function extractStatus(text) {
        if (!text) return '';

        const lower = text.toLowerCase().trim();

        // 완료 상태
        if (/^o$|완료|done|complete|closed|해결/i.test(lower)) {
            return 'Completed';
        }
        // 진행중
        if (/진행|active|in[\s-]?progress|working/i.test(lower)) {
            return 'In Progress';
        }
        // 보류
        if (/보류|hold|pending|대기/i.test(lower)) {
            return 'On Hold';
        }
        // 지연
        if (/지연|delay|late|overdue/i.test(lower)) {
            return 'Delayed';
        }
        // 미해결
        if (/^x$|미해결|open|unresolved/i.test(lower)) {
            return 'Open';
        }

        return text.trim();
    }

    /**
     * 날짜 파싱
     * @param {string|Date} value - 날짜 값
     * @returns {Date|null}
     */
    function parseDate(value) {
        if (!value) return null;
        if (value instanceof Date) return value;

        const str = value.toString().trim();

        // YYYY-MM-DD, YYYY/MM/DD
        const isoMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (isoMatch) {
            return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        }

        // MM/DD/YYYY, MM-DD-YYYY
        const usMatch = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (usMatch) {
            return new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
        }

        // DD.MM.YYYY
        const euMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (euMatch) {
            return new Date(parseInt(euMatch[3]), parseInt(euMatch[2]) - 1, parseInt(euMatch[1]));
        }

        // Try native parsing
        const parsed = new Date(str);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    /**
     * UnifiedIssue 객체 생성
     * @param {Object} data - 원시 데이터
     * @param {string} source - 소스 타입
     * @param {string} sourceFile - 소스 파일명
     * @returns {Object} UnifiedIssue
     */
    function createUnifiedIssue(data, source, sourceFile) {
        const rawText = [
            data.title || '',
            data.description || '',
            data.location || ''
        ].join(' ').trim();

        const location = extractLocation(rawText);

        return {
            id: data.id || generateUUID(),
            source: source,
            sourceFile: sourceFile,
            rawText: rawText.substring(0, 500),

            location: {
                floor: data.floor || location.floor,
                zone: data.zone || location.zone,
                columns: data.columns || location.columns
            },

            issueType: data.issueType || extractIssueType(rawText),
            severity: data.severity || extractSeverity(rawText),
            status: extractStatus(data.status || ''),
            description: data.description || data.title || '',
            date: parseDate(data.date),

            // 메타데이터
            sourceSheet: data.sourceSheet || '',
            assignee: data.assignee || '',
            linkedColumns: data.linkedColumns || location.columns,

            // AI 분석 결과 (나중에 채워짐)
            aiAnalysis: null
        };
    }

    // === CSV 파서 ===

    /**
     * CSV 라인 파싱 (따옴표 처리 포함)
     * @param {string} line
     * @returns {string[]}
     */
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    }

    /**
     * CSV 파싱
     * @param {string} csvData - CSV 문자열
     * @param {string} filename - 파일명
     * @returns {Object} { success, issues, stats, error }
     */
    function parseCSV(csvData, filename) {
        try {
            const lines = csvData.split(/\r?\n/).filter(line => line.trim());
            if (lines.length < 2) {
                return { success: false, error: 'CSV 데이터가 비어있습니다', issues: [], stats: {} };
            }

            // 헤더 파싱
            const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());

            // 컬럼 인덱스 매핑
            const idxMap = {
                id: headers.findIndex(h => h.includes('no') || h.includes('id') || h === '#'),
                type: headers.findIndex(h => h.includes('type') || h.includes('유형') || h.includes('분류')),
                title: headers.findIndex(h => h.includes('title') || h.includes('제목') || h.includes('내용') || h.includes('description')),
                location: headers.findIndex(h => h.includes('location') || h.includes('위치') || h.includes('zone') || h.includes('구역')),
                status: headers.findIndex(h => h.includes('status') || h.includes('상태') || h.includes('반영')),
                date: headers.findIndex(h => h.includes('date') || h.includes('일자') || h.includes('날짜')),
                severity: headers.findIndex(h => h.includes('severity') || h.includes('심각') || h.includes('우선'))
            };

            const source = inferSourceType(filename, csvData.substring(0, 500));
            const issues = [];
            const stats = {
                total: 0,
                byType: {},
                bySeverity: {},
                byStatus: {}
            };

            // 데이터 행 파싱
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                if (values.length < 2 || !values.some(v => v)) continue;

                const issue = createUnifiedIssue({
                    id: idxMap.id >= 0 ? values[idxMap.id] : `CSV-${i}`,
                    issueType: idxMap.type >= 0 ? values[idxMap.type] : '',
                    title: idxMap.title >= 0 ? values[idxMap.title] : values[1] || '',
                    description: idxMap.title >= 0 ? values[idxMap.title] : '',
                    location: idxMap.location >= 0 ? values[idxMap.location] : '',
                    status: idxMap.status >= 0 ? values[idxMap.status] : '',
                    date: idxMap.date >= 0 ? values[idxMap.date] : '',
                    severity: idxMap.severity >= 0 ? values[idxMap.severity] : ''
                }, source, filename);

                issues.push(issue);
                stats.total++;

                // 통계 업데이트
                const type = issue.issueType || 'Unknown';
                stats.byType[type] = (stats.byType[type] || 0) + 1;

                stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;

                const status = issue.status || 'Unknown';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            }

            console.log('[UnifiedParser] CSV parsed:', stats.total, 'issues from', filename);
            return { success: true, issues, stats };

        } catch (err) {
            console.error('[UnifiedParser] CSV parse error:', err);
            return { success: false, error: err.message, issues: [], stats: {} };
        }
    }

    // === Excel 파서 ===

    /**
     * Excel 헤더 행 찾기
     * @param {Array} jsonData - 시트 데이터
     * @returns {number} 헤더 행 인덱스
     */
    function findExcelHeader(jsonData) {
        const keywords = ['발송일자', '발송', '분류', '내용', '반영', '구분', '번호', 'no', 'id', 'type', 'status'];
        for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
            const row = jsonData[i];
            if (!row) continue;
            const rowText = row.join(' ').toLowerCase();
            const matchCount = keywords.filter(kw => rowText.includes(kw.toLowerCase())).length;
            if (matchCount >= 3) return i;
        }
        return 0;
    }

    /**
     * Excel 헤더 컬럼 매핑
     * @param {Array} headers - 헤더 배열
     * @returns {Object}
     */
    function mapExcelHeaders(headers) {
        const h = headers.map(x => (x || '').toString().toLowerCase().trim());
        return {
            id: h.findIndex(x => x.includes('번호') || x.includes('no') || x.includes('id')),
            type: h.findIndex(x => x.includes('분류') || x.includes('유형') || x.includes('구분') || x.includes('type')),
            title: h.findIndex(x => x.includes('내용') || x.includes('제목') || x.includes('이슈') || x.includes('description')),
            location: h.findIndex(x => x.includes('위치') || x.includes('절주') || x.includes('zone') || x.includes('location')),
            status: h.findIndex(x => x.includes('반영') || x.includes('상태') || x.includes('완료') || x.includes('status')),
            date: h.findIndex(x => x.includes('일자') || x.includes('날짜') || x.includes('발송') || x.includes('date')),
            assignee: h.findIndex(x => x.includes('담당') || x.includes('처리') || x.includes('발송처')),
            severity: h.findIndex(x => x.includes('심각') || x.includes('우선') || x.includes('severity') || x.includes('priority'))
        };
    }

    /**
     * Excel 파싱
     * @param {File} file - Excel 파일
     * @returns {Promise<Object>} { success, issues, stats, error }
     */
    async function parseExcel(file) {
        try {
            // SheetJS 로드 확인
            if (typeof XLSX === 'undefined') {
                // 동적 로드 시도
                await new Promise((resolve, reject) => {
                    if (typeof XLSX !== 'undefined') {
                        resolve();
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

            const source = inferSourceType(file.name);
            const issues = [];
            const stats = {
                total: 0,
                byType: {},
                bySeverity: {},
                byStatus: {},
                bySheet: {}
            };

            let issueCounter = 1;

            // 모든 시트 순회
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: '',
                    raw: false
                });

                if (jsonData.length < 2) continue;

                const headerRowIdx = findExcelHeader(jsonData);
                const headers = jsonData[headerRowIdx] || [];
                const idxMap = mapExcelHeaders(headers);

                // 데이터 행 파싱
                for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length < 2) continue;

                    // 제목/내용 추출
                    const titleIdx = idxMap.title >= 0 ? idxMap.title : 1;
                    const title = (row[titleIdx] || '').toString().trim();
                    if (!title || title.length < 3) continue;

                    const issue = createUnifiedIssue({
                        id: idxMap.id >= 0 && row[idxMap.id] ? `${sheetName}-${row[idxMap.id]}` : `XL-${issueCounter}`,
                        issueType: idxMap.type >= 0 ? (row[idxMap.type] || '').toString().trim() : '',
                        title: title.substring(0, 200),
                        description: title,
                        location: idxMap.location >= 0 ? (row[idxMap.location] || '').toString().trim() : '',
                        status: idxMap.status >= 0 ? (row[idxMap.status] || '').toString().trim() : '',
                        date: idxMap.date >= 0 ? (row[idxMap.date] || '').toString().trim() : '',
                        assignee: idxMap.assignee >= 0 ? (row[idxMap.assignee] || '').toString().trim() : '',
                        severity: idxMap.severity >= 0 ? (row[idxMap.severity] || '').toString().trim() : '',
                        sourceSheet: sheetName
                    }, source, file.name);

                    issues.push(issue);
                    issueCounter++;
                    stats.total++;

                    // 통계
                    const type = issue.issueType || 'Unknown';
                    stats.byType[type] = (stats.byType[type] || 0) + 1;
                    stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
                    const status = issue.status || 'Unknown';
                    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
                    stats.bySheet[sheetName] = (stats.bySheet[sheetName] || 0) + 1;
                }
            }

            console.log('[UnifiedParser] Excel parsed:', stats.total, 'issues from', workbook.SheetNames.length, 'sheets');
            return { success: true, issues, stats };

        } catch (err) {
            console.error('[UnifiedParser] Excel parse error:', err);
            return { success: false, error: err.message, issues: [], stats: {} };
        }
    }

    // === 이미지 파서 (VisionOCR 연동) ===

    /**
     * 이미지 파싱 (VisionOCR 위임)
     * @param {File} file - 이미지 파일
     * @returns {Promise<Object>} { success, issues, stats, error }
     */
    async function parseImage(file) {
        try {
            // VisionOCR 모듈 확인
            if (typeof window.VisionOCR === 'undefined') {
                return {
                    success: false,
                    error: 'VisionOCR 모듈이 로드되지 않았습니다',
                    issues: [],
                    stats: {}
                };
            }

            // VisionOCR로 이미지 처리 위임
            const result = await window.VisionOCR.processImage(file);

            if (!result.success) {
                return result;
            }

            // UnifiedIssue 형식으로 변환
            const issues = result.issues.map(issue => createUnifiedIssue(issue, 'image', file.name));

            const stats = {
                total: issues.length,
                byType: {},
                bySeverity: {},
                byStatus: {}
            };

            issues.forEach(issue => {
                const type = issue.issueType || 'Unknown';
                stats.byType[type] = (stats.byType[type] || 0) + 1;
                stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
                const status = issue.status || 'Unknown';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            });

            console.log('[UnifiedParser] Image parsed:', stats.total, 'issues via VisionOCR');
            return { success: true, issues, stats, ocrConfidence: result.confidence };

        } catch (err) {
            console.error('[UnifiedParser] Image parse error:', err);
            return { success: false, error: err.message, issues: [], stats: {} };
        }
    }

    // === 통합 파싱 API ===

    /**
     * 파일 통합 파싱 (자동 형식 감지)
     * @param {File} file - 입력 파일
     * @returns {Promise<Object>} { success, issues, stats, format, error }
     */
    async function parse(file) {
        const format = detectFormat(file);

        console.log('[UnifiedParser] Parsing file:', file.name, 'format:', format);

        let result;

        switch (format) {
            case 'excel':
                result = await parseExcel(file);
                break;

            case 'csv':
                const text = await file.text();
                result = parseCSV(text, file.name);
                break;

            case 'image':
                result = await parseImage(file);
                break;

            default:
                result = {
                    success: false,
                    error: `지원하지 않는 파일 형식: ${file.type || file.name}`,
                    issues: [],
                    stats: {}
                };
        }

        result.format = format;
        result.filename = file.name;
        result.fileSize = file.size;
        result.parseDate = new Date().toISOString();

        return result;
    }

    /**
     * 여러 파일 일괄 파싱
     * @param {FileList|File[]} files - 파일 목록
     * @returns {Promise<Object>} 통합 결과
     */
    async function parseMultiple(files) {
        const results = {
            success: true,
            totalFiles: files.length,
            successCount: 0,
            errorCount: 0,
            issues: [],
            stats: {
                total: 0,
                byType: {},
                bySeverity: {},
                byStatus: {},
                bySource: {}
            },
            errors: [],
            details: []
        };

        for (const file of files) {
            const result = await parse(file);
            results.details.push({
                filename: file.name,
                success: result.success,
                issueCount: result.issues?.length || 0,
                error: result.error
            });

            if (result.success) {
                results.successCount++;
                results.issues.push(...result.issues);
                results.stats.total += result.stats.total || 0;

                // 통계 병합
                for (const [key, val] of Object.entries(result.stats.byType || {})) {
                    results.stats.byType[key] = (results.stats.byType[key] || 0) + val;
                }
                for (const [key, val] of Object.entries(result.stats.bySeverity || {})) {
                    results.stats.bySeverity[key] = (results.stats.bySeverity[key] || 0) + val;
                }
                for (const [key, val] of Object.entries(result.stats.byStatus || {})) {
                    results.stats.byStatus[key] = (results.stats.byStatus[key] || 0) + val;
                }
                // 소스별
                const source = result.issues[0]?.source || 'unknown';
                results.stats.bySource[source] = (results.stats.bySource[source] || 0) + result.issues.length;
            } else {
                results.errorCount++;
                results.errors.push({ filename: file.name, error: result.error });
            }
        }

        results.success = results.errorCount === 0;
        console.log('[UnifiedParser] Batch parse complete:', results.successCount, '/', results.totalFiles, 'files');

        return results;
    }

    // === Public API ===
    return {
        // 형식 감지
        detectFormat,

        // 통합 파싱
        parse,
        parseMultiple,

        // 개별 파서
        parseCSV,
        parseExcel,
        parseImage,

        // 유틸리티
        extractLocation,
        extractIssueType,
        extractSeverity,
        extractStatus,
        parseDate,
        createUnifiedIssue,
        generateUUID
    };
})();

console.log('[UnifiedParser] Module loaded');
