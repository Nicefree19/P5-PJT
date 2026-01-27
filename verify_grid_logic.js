const fs = require('fs');
const path = require('path');

// 1. Load mgt-parser.js manually (since it's not a standard module)
const parserCode = fs.readFileSync('src/dashboard/js/mgt-parser.js', 'utf8');
eval(parserCode); // Exposes parseMGT, etc. to global scope

// 2. Load MGT File
const mgtPath = path.join(__dirname, 'src/dashboard/data/P5_복합동.mgt');
console.log(`Reading MGT file: ${mgtPath}`);
const mgtContent = fs.readFileSync(mgtPath, 'utf8');

// 3. Parse
console.log('Parsing MGT...');
const result = parseMGT(mgtContent);

console.log('---------------------------------------------------');
console.log(`Total Columns Generated: ${Object.keys(result.columns).length}`);
console.log(`Grid Config: ${result.gridConfig.cols} cols x ${result.gridConfig.rows} rows`);
console.log('---------------------------------------------------');

// 4. Floor distribution
const validCols = Object.values(result.columns);
const floorDist = {};
for (const c of validCols) {
    const f = c.location.floorId;
    floorDist[f] = (floorDist[f] || 0) + 1;
}
console.log('Floor Distribution:');
Object.entries(floorDist).sort((a, b) => {
    const na = a[0] === 'RF' ? 99 : parseInt(a[0].replace('F', ''));
    const nb = b[0] === 'RF' ? 99 : parseInt(b[0].replace('F', ''));
    return na - nb;
}).forEach(([f, cnt]) => {
    console.log(`  ${f}: ${cnt} columns`);
});

// 5. Column range
const minCol = Math.min(...validCols.map(c => c.location.column));
const maxCol = Math.max(...validCols.map(c => c.location.column));
console.log(`Column Range: X${minCol} ~ X${maxCol} (Expect 1 ~ 69)`);

// 6. UID format check
const sampleUids = validCols.slice(0, 5).map(c => c.uid);
console.log(`Sample UIDs: ${sampleUids.join(', ')}`);
const sampleLegacy = validCols.slice(0, 5).map(c => c.legacyUid);
console.log(`Sample Legacy UIDs: ${sampleLegacy.join(', ')}`);

// 7. Zoning Logic Checks (getZoneId exposed via column data)
const samples = [
    { floor: 'F2', col: 10, expect: 'zone_c' },
    { floor: 'F2', col: 30, expect: 'zone_b' },
    { floor: 'F2', col: 40, expect: 'zone_b' },
    { floor: 'F2', col: 50, expect: 'zone_a' },
    { floor: 'F2', col: 65, expect: 'zone_a' },
    { floor: 'F5', col: 10, expect: 'zone_c' },
    { floor: 'F5', col: 30, expect: 'zone_b' },
    { floor: 'F5', col: 50, expect: 'zone_a' },
    { floor: 'RF', col: 15, expect: 'zone_c' },
    { floor: 'RF', col: 35, expect: 'zone_b' },
    { floor: 'RF', col: 60, expect: 'zone_a' }
];

console.log('\nZoning Logic Checks:');
let failCount = 0;
samples.forEach(s => {
    const col = validCols.find(c => c.location.floorId === s.floor && c.location.column === s.col);
    if (!col) {
        // Indirect check via getZoneId (exposed to global scope by eval)
        if (typeof getZoneId === 'function') {
            const got = getZoneId(s.col, s.floor);
            const pass = got === s.expect;
            console.log(`[${pass ? 'PASS' : 'FAIL'}] ${s.floor} X${s.col}: Got ${got}, Expected ${s.expect} (via getZoneId)`);
            if (!pass) failCount++;
        } else {
            console.log(`[?] ${s.floor} X${s.col} not found in MGT data & getZoneId unavailable. Skipping.`);
        }
        return;
    }
    const pass = col.location.zoneId === s.expect;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${s.floor} X${s.col}: Got ${col.location.zoneId}, Expected ${s.expect}`);
    if (!pass) failCount++;
});

// 8. Summary
console.log('\n---------------------------------------------------');
if (failCount === 0) {
    console.log('Verification SUCCESS');
} else {
    console.log(`Verification FAILED (${failCount} failures)`);
}
