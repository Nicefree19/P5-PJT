/**
 * P5 골조 전환설계 회의록 이슈 추출기 v3
 * 정확한 컬럼 매핑 및 이슈 히스토리 추적
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'C:\\Users\\user\\Downloads\\(P5) 골조 전환설계 회의록 (260119) R0.xlsx';
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'dashboard', 'data', 'meeting_issues.json');

// 이슈 유형 패턴 (우선순위 순)
const ISSUE_TYPE_PATTERNS = [
    { type: 'PSRC', patterns: [/PSRC/i, /PS[-_\s]?RC/i, /프리스트레스트/i] },
    { type: 'HMB', patterns: [/HMB/i, /하이브리드/i, /Hybrid.*Moment/i] },
    { type: 'PC Girder', patterns: [/PC\s*(거더|Girder)/i, /철골\s*Girder/i] },
    { type: 'PC Beam', patterns: [/PC\s*(보|Beam)/i, /PC\s*B[^r]/i] },
    { type: 'Embed', patterns: [/Embed/i, /매립/i, /앵커/i, /Anchor/i, /인서트/i] },
    { type: 'Deck', patterns: [/Deck/i, /데크/i, /슬래브.*지지/i] },
    { type: 'Connection', patterns: [/접합/i, /연결/i, /Connection/i, /Joint/i] },
    { type: 'Seismic', patterns: [/지진/i, /Seismic/i, /내진/i, /정모멘트/i, /부모멘트/i] },
    { type: 'Core', patterns: [/코어/i, /Core/i, /계단실/i, /ELEV/i, /Shaft/i] },
    { type: 'Column', patterns: [/기둥/i, /Column/i, /PSRC.*기둥/i] },
    { type: 'Rebar', patterns: [/철근/i, /Rebar/i, /배근/i] },
    { type: 'T/C', patterns: [/T\/C/i, /타워.*크레인/i, /Tower.*Crane/i, /양중/i] },
    { type: 'Shop Drawing', patterns: [/SHOP\s*도면/i, /Shop.*Drawing/i, /시공도/i, /dwg/i] },
    { type: 'Bracket', patterns: [/브라켓/i, /Bracket/i] },
    { type: 'Roof', patterns: [/ROOF/i, /지붕/i, /옥상/i] },
    { type: 'Wall', patterns: [/벽/i, /Wall/i, /전단벽/i] },
    { type: 'Foundation', patterns: [/기초/i, /Foundation/i, /Mat/i] },
    { type: 'Mock Up', patterns: [/Mock.*Up/i, /모형.*실험/i, /실험/i] }
];

// 상태 매핑 (엄격한 매칭)
function extractStatus(statusCell, noteCell, descCell) {
    const combined = `${statusCell || ''} ${noteCell || ''} ${descCell || ''}`.toLowerCase();

    // 명시적 상태 키워드
    if (/완료|done|closed|complete/i.test(statusCell)) return 'Completed';
    if (/진행.*중|in.*progress|ongoing/i.test(statusCell)) return 'In Progress';
    if (/검토.*중|review/i.test(statusCell)) return 'Review';
    if (/대기|hold|pending|보류/i.test(statusCell)) return 'On Hold';
    if (/지연|delayed|overdue/i.test(statusCell)) return 'Delayed';

    // 노트나 설명에서 상태 추론
    if (/완료|done|closed/i.test(combined)) return 'Completed';
    if (/검토.*요망|확인.*요망|송부.*요망/i.test(combined)) return 'Review';
    if (/진행|ongoing/i.test(combined)) return 'In Progress';

    return 'Open';
}

// 이슈 유형 감지
function detectIssueType(description, category) {
    const text = `${category || ''} ${description || ''}`;

    for (const { type, patterns } of ISSUE_TYPE_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return type;
            }
        }
    }
    return 'General';
}

// 심각도 결정
function determineSeverity(description, status) {
    const text = (description || '').toLowerCase();

    if (/긴급|urgent|critical|즉시|안전/i.test(text)) return 'Critical';
    if (/우선|priority|high|중요/i.test(text)) return 'High';
    if (status === 'Delayed') return 'High';
    if (/검토.*요망|확인.*필요/i.test(text)) return 'Medium';
    return 'Medium';
}

// 컬럼 ID 추출
function extractColumns(text) {
    if (!text) return [];
    const columns = new Set();

    // A-X15, B-X20~25 등의 패턴
    const pattern = /([A-K])-?X?(\d+)(?:[~-](\d+))?/gi;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const row = match[1].toUpperCase();
        const start = parseInt(match[2]);
        const end = match[3] ? parseInt(match[3]) : start;
        for (let col = start; col <= Math.min(end, start + 20); col++) {
            columns.add(`${row}-X${col}`);
        }
    }
    return [...columns];
}

// 층 추출
function extractFloor(text) {
    if (!text) return null;
    const match = text.match(/(\d+)F|(\d+)층|RF|B(\d+)/i);
    if (match) {
        if (/RF/i.test(match[0])) return 'RF';
        if (/B\d/i.test(match[0])) return `B${match[3]}F`;
        return `${match[1] || match[2]}F`;
    }
    return null;
}

// 날짜 변환
function parseDate(dateValue) {
    if (!dateValue) return null;

    // Excel 시리얼 넘버
    if (typeof dateValue === 'number') {
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }

    // 한국어 날짜 (4월 26일)
    const korMatch = String(dateValue).match(/(\d+)월\s*(\d+)일/);
    if (korMatch) {
        const year = 2024; // 현재 연도 기준
        return `${year}-${korMatch[1].padStart(2, '0')}-${korMatch[2].padStart(2, '0')}`;
    }

    return String(dateValue);
}

// 시트 파싱
function parseSheet(worksheet, sheetName) {
    const issues = [];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (json.length < 15) return issues;

    // 헤더 행 찾기 (Item No 또는 DESCRIPTION 포함)
    let headerRow = -1;
    for (let i = 0; i < 20; i++) {
        const row = json[i];
        if (row && row.some(c => /Item.*No|DESCRIPTION/i.test(String(c)))) {
            headerRow = i;
            break;
        }
    }

    if (headerRow === -1) return issues;

    // 컬럼 인덱스 찾기
    const headers = json[headerRow];
    let colMap = { itemNo: 1, desc: 2, dueDate: 3, actionBy: 4, status: 5, note: 6 };

    headers.forEach((h, idx) => {
        const header = String(h).toLowerCase();
        if (/item.*no/i.test(header)) colMap.itemNo = idx;
        if (/description/i.test(header)) colMap.desc = idx;
        if (/due.*date/i.test(header)) colMap.dueDate = idx;
        if (/action.*by/i.test(header)) colMap.actionBy = idx;
        if (/status/i.test(header)) colMap.status = idx;
        if (/note/i.test(header)) colMap.note = idx;
    });

    // 데이터 파싱
    let currentMajor = '';
    let currentSubItem = '';
    let issueIndex = 0;

    for (let i = headerRow + 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.every(c => !c)) continue;

        const itemNo = String(row[colMap.itemNo] || '').trim();
        const description = String(row[colMap.desc] || '').trim();
        const dueDate = row[colMap.dueDate];
        const actionBy = String(row[colMap.actionBy] || '').trim();
        const status = String(row[colMap.status] || '').trim();
        const note = String(row[colMap.note] || '').trim();

        if (!description) continue;

        // 아이템 유형 판별
        let itemType = 'sub-sub'; // 기본값: => 로 시작하는 세부 항목
        let cleanDesc = description;

        if (/^\d+$/.test(itemNo)) {
            // 대분류 (1, 2, 3...)
            itemType = 'major';
            currentMajor = description;
            currentSubItem = '';
        } else if (/^\d+-\d+/.test(itemNo)) {
            // 중분류 (1-1, 2-3...)
            itemType = 'sub';
            currentSubItem = itemNo;
            cleanDesc = description.replace(/^■\s*/, '');
        } else if (description.startsWith('=>')) {
            // 세부 항목
            itemType = 'sub-sub';
            cleanDesc = description.replace(/^=>\s*/, '').trim();
        } else if (description.startsWith('■')) {
            // ■ 로 시작하는 항목도 중분류
            itemType = 'sub';
            cleanDesc = description.replace(/^■\s*/, '');
        }

        // 이슈 타입 감지
        const issueType = detectIssueType(cleanDesc, currentMajor);
        const finalStatus = extractStatus(status, note, cleanDesc);
        const severity = determineSeverity(cleanDesc, finalStatus);

        issueIndex++;

        const issue = {
            id: `${sheetName}-${issueIndex}`,
            source: 'meeting',
            sourceFile: `회의록_${sheetName}`,
            meetingDate: sheetName,

            // 계층 구조
            itemNo: itemNo || null,
            itemType: itemType,
            majorCategory: currentMajor,
            parentItem: currentSubItem || null,

            // 내용
            description: cleanDesc,
            rawText: description,
            issueType: issueType,

            // 위치
            location: {
                floor: extractFloor(cleanDesc),
                zone: null,
                columns: extractColumns(cleanDesc)
            },

            // 상태
            status: finalStatus,
            severity: severity,

            // 추가 정보
            dueDate: parseDate(dueDate),
            actionBy: actionBy || null,
            note: note || null,

            // 메타데이터
            metadata: {
                rowIndex: i,
                sheetName: sheetName,
                originalItemNo: itemNo
            }
        };

        issues.push(issue);
    }

    return issues;
}

// 메인 함수
function extractAllIssues() {
    console.log('=== P5 Meeting Issues Extractor v3 ===');
    console.log('Reading:', INPUT_FILE);

    const workbook = XLSX.readFile(INPUT_FILE);
    const sheetNames = workbook.SheetNames;

    console.log(`Found ${sheetNames.length} sheets`);

    const allIssues = [];
    const stats = {
        totalSheets: sheetNames.length,
        processedSheets: 0,
        totalIssues: 0,
        byType: {},
        byStatus: {},
        bySeverity: {},
        byMeetingDate: {},
        byMajorCategory: {}
    };

    // 시트별 처리 (날짜 역순으로 정렬 - 최신 먼저)
    const dateSheets = sheetNames
        .filter(name => /^\d{6}/.test(name))
        .sort((a, b) => b.localeCompare(a));

    console.log(`\nProcessing ${dateSheets.length} date sheets...`);

    for (const sheetName of dateSheets) {
        const worksheet = workbook.Sheets[sheetName];
        const issues = parseSheet(worksheet, sheetName);

        if (issues.length > 0) {
            allIssues.push(...issues);
            stats.processedSheets++;
            stats.byMeetingDate[sheetName] = issues.length;

            for (const issue of issues) {
                stats.byType[issue.issueType] = (stats.byType[issue.issueType] || 0) + 1;
                stats.byStatus[issue.status] = (stats.byStatus[issue.status] || 0) + 1;
                stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;

                if (issue.majorCategory) {
                    const cat = issue.majorCategory.substring(0, 30);
                    stats.byMajorCategory[cat] = (stats.byMajorCategory[cat] || 0) + 1;
                }
            }

            console.log(`  ${sheetName}: ${issues.length} issues`);
        }
    }

    stats.totalIssues = allIssues.length;

    // 출력
    const output = {
        metadata: {
            version: '3.0',
            sourceFile: INPUT_FILE,
            extractedAt: new Date().toISOString(),
            stats: stats
        },
        issues: allIssues
    };

    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

    // 요약 출력
    console.log('\n========================================');
    console.log('           EXTRACTION COMPLETE');
    console.log('========================================');
    console.log(`Sheets processed: ${stats.processedSheets}`);
    console.log(`Total issues: ${stats.totalIssues}`);
    console.log(`Output: ${OUTPUT_FILE}`);

    console.log('\n=== By Issue Type ===');
    Object.entries(stats.byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([t, c]) => console.log(`  ${t}: ${c}`));

    console.log('\n=== By Status ===');
    Object.entries(stats.byStatus)
        .sort((a, b) => b[1] - a[1])
        .forEach(([s, c]) => console.log(`  ${s}: ${c}`));

    console.log('\n=== By Major Category ===');
    Object.entries(stats.byMajorCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([cat, c]) => console.log(`  ${cat}: ${c}`));

    return output;
}

extractAllIssues();
