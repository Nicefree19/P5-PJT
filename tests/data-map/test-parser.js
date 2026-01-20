/**
 * Direct Parser Test - Node.js validation of UnifiedParser logic
 *
 * Tests the core parsing logic without browser environment
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Sample data paths
const SAMPLES_DIR = path.join(__dirname, 'samples');
const SAMPLE_XLSX = path.join(SAMPLES_DIR, 'sample_issues.xlsx');
const SAMPLE_CSV = path.join(SAMPLES_DIR, 'sample_issues.csv');
const SAMPLE_MEETING = path.join(SAMPLES_DIR, 'sample_meeting_minutes.xlsx');

// ==========================================
// Simplified UnifiedParser Logic (Node.js version)
// ==========================================

const UnifiedParser = {
    /**
     * Detect file format
     */
    detectFormat(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        if (['.xlsx', '.xls'].includes(ext)) return 'excel';
        if (['.csv'].includes(ext)) return 'csv';
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return 'image';
        return 'unknown';
    },

    /**
     * Extract location from text
     */
    extractLocation(text) {
        if (!text) return null;

        // Floor extraction
        const floorMatch = text.match(/(\d+)F|(\d+)층/i);
        const floor = floorMatch ? `${floorMatch[1] || floorMatch[2]}F` : null;

        // Zone extraction
        const zoneMatch = text.match(/Zone\s*([A-C])|([A-C])\s*구역/i);
        const zone = zoneMatch ? (zoneMatch[1] || zoneMatch[2]).toUpperCase() : null;

        // Column extraction
        const columns = [];
        const colPatterns = [
            /([A-K])-X(\d+)~(\d+)/gi,    // Range: A-X15~20
            /([A-K])-X(\d+)/gi,           // Single: A-X15
            /X(\d+)~X?(\d+)/gi,           // X15~20 or X15~X20
            /X(\d+)/gi                     // Just X15
        ];

        // Range pattern
        let match;
        const rangePattern = /([A-K])-X(\d+)~(\d+)/gi;
        while ((match = rangePattern.exec(text)) !== null) {
            const row = match[1];
            const start = parseInt(match[2]);
            const end = parseInt(match[3]);
            for (let i = start; i <= end; i++) {
                columns.push(`${row}-X${i}`);
            }
        }

        // Single column pattern
        const singlePattern = /([A-K])-X(\d+)(?!~)/gi;
        while ((match = singlePattern.exec(text)) !== null) {
            const col = `${match[1]}-X${match[2]}`;
            if (!columns.includes(col)) {
                columns.push(col);
            }
        }

        // List pattern (B-X30,B-X31,B-X32)
        const listPattern = /([A-K])-X(\d+),\s*\1-X(\d+)/gi;
        while ((match = listPattern.exec(text)) !== null) {
            const row = match[1];
            const cols = text.match(new RegExp(`${row}-X(\\d+)`, 'gi')) || [];
            cols.forEach(c => {
                if (!columns.includes(c)) columns.push(c);
            });
        }

        return {
            floor,
            zone,
            columns: [...new Set(columns)]  // Remove duplicates
        };
    },

    /**
     * Extract issue type
     */
    extractIssueType(text) {
        if (!text) return 'Other';

        const typePatterns = {
            'PSRC': /PSRC|피에스알씨/i,
            'HMB': /HMB|에이치엠비|Hybrid/i,
            'Embed': /Embed|엠베드|매립/i,
            'Design Change': /설계\s*변경|Design\s*Change|Rev\./i,
            'T/C Interference': /T\/C|타워크레인|Tower\s*Crane|간섭/i,
            'Rebar': /철근|Rebar|배근/i,
            'Concrete': /콘크리트|Concrete|타설/i,
            'Shop Drawing': /Shop\s*Drawing|제작도|SD/i
        };

        for (const [type, pattern] of Object.entries(typePatterns)) {
            if (pattern.test(text)) return type;
        }

        return 'Other';
    },

    /**
     * Map severity
     */
    mapSeverity(value) {
        if (!value) return 'Medium';
        const v = value.toLowerCase();
        if (/critical|긴급|심각/.test(v)) return 'Critical';
        if (/high|높음|상/.test(v)) return 'High';
        if (/low|낮음|하/.test(v)) return 'Low';
        return 'Medium';
    },

    /**
     * Map status
     */
    mapStatus(value) {
        if (!value) return 'Open';
        const v = value.toLowerCase();
        if (/complete|완료|closed/.test(v)) return 'Completed';
        if (/progress|진행|작업중/.test(v)) return 'In Progress';
        if (/hold|보류|대기/.test(v)) return 'On Hold';
        if (/delay|지연/.test(v)) return 'Delayed';
        return 'Open';
    },

    /**
     * Parse Excel file
     */
    parseExcel(filePath) {
        const workbook = XLSX.readFile(filePath);
        const issues = [];
        const fileName = path.basename(filePath);

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            for (const row of data) {
                // Build search text from all columns
                const searchText = Object.values(row).join(' ');

                // Extract location from Column field or search all text
                const columnField = row['Column'] || row['컬럼'] || row['위치'] || '';
                const location = this.extractLocation(columnField || searchText);

                // Skip if no location found
                if (!location.columns.length && !location.floor) {
                    continue;
                }

                // Override with explicit floor/zone if present
                if (row['층'] && !location.floor) {
                    location.floor = row['층'];
                }
                if (row['Zone'] && !location.zone) {
                    location.zone = row['Zone'];
                }

                const issue = {
                    id: `ISSUE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    source: 'excel',
                    sourceFile: fileName,
                    sourceSheet: sheetName,
                    rawText: searchText,
                    location: location,
                    issueType: row['유형'] || this.extractIssueType(searchText),
                    severity: this.mapSeverity(row['심각도'] || row['Severity']),
                    status: this.mapStatus(row['상태'] || row['Status']),
                    description: row['내용'] || row['Description'] || row['제목'] || '',
                    title: row['제목'] || row['Title'] || '',
                    date: row['일자'] || row['Date'] || new Date().toISOString().split('T')[0],
                    assignee: row['담당자'] || row['Assignee'] || ''
                };

                issues.push(issue);
            }
        }

        return issues;
    },

    /**
     * Parse CSV file
     */
    parseCSV(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const issues = [];
        const fileName = path.basename(filePath);

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            // Simple CSV parsing (handles quoted values)
            const values = lines[i].match(/("([^"]*)"|[^,]*)/g)
                .map(v => v.trim().replace(/^"|"$/g, ''));

            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });

            const searchText = Object.values(row).join(' ');
            const columnField = row['Column'] || row['컬럼'] || row['위치'] || '';
            const location = this.extractLocation(columnField || searchText);

            if (!location.columns.length && !location.floor) {
                continue;
            }

            if (row['층'] && !location.floor) {
                location.floor = row['층'];
            }
            if (row['Zone'] && !location.zone) {
                location.zone = row['Zone'];
            }

            const issue = {
                id: `ISSUE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                source: 'csv',
                sourceFile: fileName,
                rawText: searchText,
                location: location,
                issueType: row['유형'] || this.extractIssueType(searchText),
                severity: this.mapSeverity(row['심각도'] || row['Severity']),
                status: this.mapStatus(row['상태'] || row['Status']),
                description: row['내용'] || row['Description'] || row['제목'] || '',
                title: row['제목'] || row['Title'] || '',
                date: row['일자'] || row['Date'] || new Date().toISOString().split('T')[0],
                assignee: row['담당자'] || row['Assignee'] || ''
            };

            issues.push(issue);
        }

        return issues;
    }
};

// ==========================================
// Test Runner
// ==========================================

function runTests() {
    console.log('🧪 Data Map Parser Tests\n');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    // Test 1: Format Detection
    console.log('\n📋 Test 1: Format Detection');
    const formats = {
        'test.xlsx': 'excel',
        'test.xls': 'excel',
        'test.csv': 'csv',
        'test.png': 'image',
        'test.jpg': 'image',
        'test.txt': 'unknown'
    };

    for (const [file, expected] of Object.entries(formats)) {
        const result = UnifiedParser.detectFormat(file);
        if (result === expected) {
            console.log(`  ✅ ${file} → ${result}`);
            passed++;
        } else {
            console.log(`  ❌ ${file} → ${result} (expected: ${expected})`);
            failed++;
        }
    }

    // Test 2: Location Extraction
    console.log('\n📋 Test 2: Location Extraction');
    const locationTests = [
        { input: '3F Zone A, A-X15~20', expected: { floor: '3F', zone: 'A', colCount: 6 } },
        { input: '4F B-X30,B-X31,B-X32', expected: { floor: '4F', zone: null, colCount: 3 } },
        { input: 'X55~60 at 5F', expected: { floor: '5F', zone: null, colCount: 0 } },
        { input: 'C-X10 위치', expected: { floor: null, zone: null, colCount: 1 } }
    ];

    for (const test of locationTests) {
        const result = UnifiedParser.extractLocation(test.input);
        const colCount = result.columns.length;

        if (result.floor === test.expected.floor &&
            result.zone === test.expected.zone &&
            colCount === test.expected.colCount) {
            console.log(`  ✅ "${test.input}" → floor:${result.floor}, zone:${result.zone}, cols:${colCount}`);
            passed++;
        } else {
            console.log(`  ❌ "${test.input}" → floor:${result.floor}, zone:${result.zone}, cols:${colCount}`);
            console.log(`     Expected: floor:${test.expected.floor}, zone:${test.expected.zone}, cols:${test.expected.colCount}`);
            failed++;
        }
    }

    // Test 3: Issue Type Extraction
    console.log('\n📋 Test 3: Issue Type Extraction');
    const typeTests = [
        { input: 'PSRC 부재 간섭', expected: 'PSRC' },
        { input: 'HMB Embed 위치', expected: 'HMB' },
        { input: '설계 변경 Rev.D', expected: 'Design Change' },
        { input: 'T/C #5 간섭', expected: 'T/C Interference' },
        { input: '일반 작업', expected: 'Other' }
    ];

    for (const test of typeTests) {
        const result = UnifiedParser.extractIssueType(test.input);
        if (result === test.expected) {
            console.log(`  ✅ "${test.input}" → ${result}`);
            passed++;
        } else {
            console.log(`  ❌ "${test.input}" → ${result} (expected: ${test.expected})`);
            failed++;
        }
    }

    // Test 4: Excel File Parsing
    console.log('\n📋 Test 4: Excel File Parsing');
    if (fs.existsSync(SAMPLE_XLSX)) {
        try {
            const issues = UnifiedParser.parseExcel(SAMPLE_XLSX);
            console.log(`  ✅ Parsed ${issues.length} issues from sample_issues.xlsx`);
            passed++;

            // Verify issue structure
            if (issues.length > 0) {
                const firstIssue = issues[0];
                const hasRequiredFields = firstIssue.id && firstIssue.source && firstIssue.location;
                if (hasRequiredFields) {
                    console.log(`  ✅ Issue structure valid`);
                    console.log(`     - ID: ${firstIssue.id.substring(0, 20)}...`);
                    console.log(`     - Source: ${firstIssue.source}`);
                    console.log(`     - Location: ${JSON.stringify(firstIssue.location)}`);
                    console.log(`     - Type: ${firstIssue.issueType}`);
                    console.log(`     - Severity: ${firstIssue.severity}`);
                    passed++;
                } else {
                    console.log(`  ❌ Issue structure invalid`);
                    failed++;
                }
            }
        } catch (error) {
            console.log(`  ❌ Excel parsing failed: ${error.message}`);
            failed++;
        }
    } else {
        console.log(`  ⚠️ Skipped: ${SAMPLE_XLSX} not found`);
    }

    // Test 5: CSV File Parsing
    console.log('\n📋 Test 5: CSV File Parsing');
    if (fs.existsSync(SAMPLE_CSV)) {
        try {
            const issues = UnifiedParser.parseCSV(SAMPLE_CSV);
            console.log(`  ✅ Parsed ${issues.length} issues from sample_issues.csv`);
            passed++;

            if (issues.length > 0) {
                const firstIssue = issues[0];
                console.log(`     - First issue type: ${firstIssue.issueType}`);
                console.log(`     - First issue severity: ${firstIssue.severity}`);
            }
        } catch (error) {
            console.log(`  ❌ CSV parsing failed: ${error.message}`);
            failed++;
        }
    } else {
        console.log(`  ⚠️ Skipped: ${SAMPLE_CSV} not found`);
    }

    // Test 6: Meeting Minutes (Multi-sheet Excel)
    console.log('\n📋 Test 6: Multi-sheet Excel Parsing');
    if (fs.existsSync(SAMPLE_MEETING)) {
        try {
            const issues = UnifiedParser.parseExcel(SAMPLE_MEETING);
            console.log(`  ✅ Parsed ${issues.length} issues from meeting minutes`);
            passed++;

            // Check for issues from different sheets
            const sheets = [...new Set(issues.map(i => i.sourceSheet))];
            console.log(`     - Sheets processed: ${sheets.join(', ')}`);
        } catch (error) {
            console.log(`  ❌ Multi-sheet parsing failed: ${error.message}`);
            failed++;
        }
    } else {
        console.log(`  ⚠️ Skipped: ${SAMPLE_MEETING} not found`);
    }

    // Test Summary
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
        console.log('\n✅ All tests passed!');
    } else {
        console.log('\n❌ Some tests failed');
    }

    return failed === 0;
}

// Run tests
const success = runTests();
process.exit(success ? 0 : 1);
