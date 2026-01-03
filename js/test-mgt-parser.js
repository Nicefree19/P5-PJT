/**
 * MGT Parser Test Script
 * Node.js에서 실행하여 파서 동작 확인
 */
import fs from 'fs';
import path from 'path';
import { parseMGT, summarize, toMasterConfig } from './mgt-parser.js';

// MGT 파일 경로 (프로젝트 루트 기준)
const mgtPath = 'D:/00.Work_AI_Tool/11.P5_PJT/P5_복합동.mgt';

console.log('📂 MGT 파일 로딩:', mgtPath);

try {
    // 파일 읽기
    const content = fs.readFileSync(mgtPath, 'utf-8');
    console.log(`📄 파일 크기: ${(content.length / 1024).toFixed(1)} KB`);
    
    // 파싱 실행
    console.log('\n🔄 파싱 시작...');
    const startTime = Date.now();
    const parsed = parseMGT(content);
    const elapsed = Date.now() - startTime;
    
    // 결과 출력
    console.log(`\n✅ 파싱 완료 (${elapsed}ms)`);
    console.log(summarize(parsed));
    
    // 샘플 기둥 데이터 출력
    const columnKeys = Object.keys(parsed.columns);
    console.log(`\n=== 기둥 데이터 샘플 (총 ${columnKeys.length}개) ===`);
    columnKeys.slice(0, 5).forEach(uid => {
        const col = parsed.columns[uid];
        console.log(`  ${uid}: X=${col.location.x}, Y=${col.location.y}, Zone=${col.location.zoneId}`);
    });
    
    // Zone 정보 출력
    console.log('\n=== Zone 설정 ===');
    parsed.zones.forEach(z => {
        console.log(`  ${z.name} (${z.displayName}): Col ${z.range.startColumn}~${z.range.endColumn}`);
    });
    
    // master_config.json 형식으로 변환
    const masterConfig = toMasterConfig(parsed);
    const outputPath = 'D:/00.Work_AI_Tool/11.P5_PJT/src/dashboard/data/mgt_parsed_config.json';
    fs.writeFileSync(outputPath, JSON.stringify(masterConfig, null, 2));
    console.log(`\n💾 설정 파일 저장: ${outputPath}`);
    
} catch (err) {
    console.error('❌ 오류 발생:', err.message);
    process.exit(1);
}
