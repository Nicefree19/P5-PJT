/**
 * Data Map Test - Sample Data Generator and Parser Test
 *
 * Generates sample Excel/CSV data and tests UnifiedParser
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Sample issue data for testing
const sampleIssues = [
    {
        '일자': '2025-01-15',
        '층': '3F',
        'Zone': 'A',
        'Column': 'A-X15~20',
        '유형': 'PSRC',
        '제목': 'PSRC 부재 형상 간섭',
        '내용': 'X15~X20 라인 PSRC 부재와 HMB 간섭 발생. Shop Drawing 확인 필요.',
        '심각도': 'High',
        '상태': 'Open',
        '담당자': '구조팀'
    },
    {
        '일자': '2025-01-14',
        '층': '4F',
        'Zone': 'B',
        'Column': 'B-X30,B-X31,B-X32',
        '유형': 'HMB',
        '제목': 'HMB Embed 위치 오류',
        '내용': 'Embed plate 위치가 도면과 50mm 차이 발생. 현장 조정 완료.',
        '심각도': 'Medium',
        '상태': 'Completed',
        '담당자': '현장팀'
    },
    {
        '일자': '2025-01-13',
        '층': '5F',
        'Zone': 'C',
        'Column': 'C-X55~60',
        '유형': 'Design Change',
        '제목': 'Mega Truss 설계 변경',
        '내용': 'Complex Building Mega Truss 하중 변경으로 컬럼 사이즈 H-400에서 H-500으로 변경.',
        '심각도': 'Critical',
        '상태': 'In Progress',
        '담당자': '설계팀'
    },
    {
        '일자': '2025-01-12',
        '층': '3F',
        'Zone': 'A',
        'Column': 'A-X5~10',
        '유형': 'PSRC',
        '제목': 'PSRC 제작 완료',
        '내용': 'X5~X10 라인 PSRC 제작 완료. 운송 대기 중.',
        '심각도': 'Low',
        '상태': 'Completed',
        '담당자': '공장팀'
    },
    {
        '일자': '2025-01-11',
        '층': '6F',
        'Zone': 'B',
        'Column': 'B-X40~45',
        '유형': 'T/C Interference',
        '제목': 'T/C #3 간섭',
        '내용': '타워크레인 #3 작업반경 내 작업 불가. X40 라인 우선 시공 후 복귀 예정.',
        '심각도': 'High',
        '상태': 'On Hold',
        '담당자': '안전팀'
    }
];

// Meeting minutes format (multi-sheet)
const meetingMinutes = {
    '개요': [
        { '항목': '회의일자', '내용': '2025-01-15' },
        { '항목': '참석자', '내용': '구조팀, 현장팀, 설계팀' },
        { '항목': '주제', '내용': 'P5 골조 진행 현황 점검' }
    ],
    '이슈목록': sampleIssues.slice(0, 3),
    '조치사항': [
        { '번호': 1, '이슈': 'PSRC 부재 간섭', '조치': 'Shop Drawing 수정', '담당': '설계팀', '완료일': '2025-01-20' },
        { '번호': 2, '이슈': 'Embed 위치 오류', '조치': '현장 재시공', '담당': '현장팀', '완료일': '2025-01-18' },
        { '번호': 3, '이슈': 'Mega Truss 설계 변경', '조치': 'Rev.D 발행', '담당': '설계팀', '완료일': '2025-01-25' }
    ]
};

// Create output directory
const outputDir = path.join(__dirname, 'samples');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate single-sheet Excel (issue list)
function generateIssueListExcel() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleIssues);
    XLSX.utils.book_append_sheet(wb, ws, '이슈목록');

    const filePath = path.join(outputDir, 'sample_issues.xlsx');
    XLSX.writeFile(wb, filePath);
    console.log(`✅ Generated: ${filePath}`);
    return filePath;
}

// Generate multi-sheet Excel (meeting minutes)
function generateMeetingMinutesExcel() {
    const wb = XLSX.utils.book_new();

    for (const [sheetName, data] of Object.entries(meetingMinutes)) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    const filePath = path.join(outputDir, 'sample_meeting_minutes.xlsx');
    XLSX.writeFile(wb, filePath);
    console.log(`✅ Generated: ${filePath}`);
    return filePath;
}

// Generate CSV
function generateCSV() {
    const headers = Object.keys(sampleIssues[0]).join(',');
    const rows = sampleIssues.map(issue =>
        Object.values(issue).map(v => `"${v}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const filePath = path.join(outputDir, 'sample_issues.csv');
    fs.writeFileSync(filePath, csv, 'utf-8');
    console.log(`✅ Generated: ${filePath}`);
    return filePath;
}

// Test data validation
function validateSampleData() {
    console.log('\n📊 Sample Data Summary:');
    console.log(`  - Total Issues: ${sampleIssues.length}`);
    console.log(`  - Floors: ${[...new Set(sampleIssues.map(i => i['층']))].join(', ')}`);
    console.log(`  - Zones: ${[...new Set(sampleIssues.map(i => i['Zone']))].join(', ')}`);
    console.log(`  - Types: ${[...new Set(sampleIssues.map(i => i['유형']))].join(', ')}`);
    console.log(`  - Severities: ${[...new Set(sampleIssues.map(i => i['심각도']))].join(', ')}`);
    console.log(`  - Statuses: ${[...new Set(sampleIssues.map(i => i['상태']))].join(', ')}`);
}

// Main
console.log('🚀 Generating test sample files...\n');

try {
    generateIssueListExcel();
    generateMeetingMinutesExcel();
    generateCSV();
    validateSampleData();

    console.log('\n✅ All sample files generated successfully!');
    console.log(`📁 Output directory: ${outputDir}`);
} catch (error) {
    console.error('❌ Error generating samples:', error);
    process.exit(1);
}
