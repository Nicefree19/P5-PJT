/**
 * Vision OCR - Issue Data Mapper Phase 2
 * Gemini Vision API를 사용한 이미지 OCR 및 구조화 데이터 추출
 *
 * @module VisionOCR
 * @requires UnifiedParser
 */

window.VisionOCR = (function() {
    'use strict';

    // 설정
    const CONFIG = {
        // Gemini API 엔드포인트 (클라이언트 사이드용 - 실제 운영에서는 프록시 사용 권장)
        API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

        // 최대 이미지 크기 (bytes)
        MAX_IMAGE_SIZE: 20 * 1024 * 1024, // 20MB

        // 지원 이미지 형식
        SUPPORTED_FORMATS: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],

        // 기본 타임아웃 (ms)
        TIMEOUT: 60000
    };

    /**
     * 이미지 파일을 Base64로 변환
     * @param {File} file - 이미지 파일
     * @returns {Promise<string>} Base64 인코딩된 이미지
     */
    async function imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // data:image/png;base64,xxxxx 형식에서 base64 부분만 추출
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * 이미지 MIME 타입 가져오기
     * @param {File} file
     * @returns {string}
     */
    function getImageMimeType(file) {
        const type = file.type.toLowerCase();
        if (CONFIG.SUPPORTED_FORMATS.includes(type)) {
            return type;
        }
        // 확장자 기반 추론
        const ext = file.name.split('.').pop().toLowerCase();
        const mimeMap = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };
        return mimeMap[ext] || 'image/jpeg';
    }

    /**
     * OCR 프롬프트 생성 (건설 프로젝트 문서 특화)
     * @returns {string}
     */
    function getOCRPrompt() {
        return `당신은 건설 프로젝트 문서 분석 전문가입니다.
이 이미지에서 다음 정보를 추출하여 JSON 형식으로 반환하세요.

## 추출 대상:
1. **테이블 구조**: 헤더와 데이터 행
2. **위치 정보**: 층(Floor), 구역(Zone A/B/C), 기둥 ID (예: C-X15, A-X1~5)
3. **이슈 정보**: 유형(PSRC, HMB, Embed 등), 상태(완료/진행중/지연), 심각도
4. **날짜 및 수치 데이터**

## 기둥 ID 패턴:
- 단일: C-X15, A-X3, B-X45
- 범위: C-X1~5, A-X10~15

## 상태 표시:
- O, ○, 완료 → Completed
- X, ×, 미완료 → Open
- 진행, → → In Progress
- 지연, delay → Delayed

## 반환 형식 (JSON):
{
    "tables": [
        {
            "name": "테이블 이름 또는 null",
            "headers": ["컬럼1", "컬럼2", ...],
            "rows": [
                {"컬럼1": "값1", "컬럼2": "값2", ...}
            ]
        }
    ],
    "issues": [
        {
            "id": "추출된 ID 또는 자동생성",
            "title": "이슈 제목/내용",
            "description": "상세 설명",
            "issueType": "PSRC|HMB|Embed|Rebar|Form|etc",
            "status": "Completed|Open|In Progress|Delayed",
            "severity": "Critical|High|Medium|Low",
            "floor": "3F|RF|etc",
            "zone": "A|B|C",
            "columns": ["C-X15", "C-X16"],
            "date": "YYYY-MM-DD 또는 null"
        }
    ],
    "metadata": {
        "documentType": "제작현황표|회의록|이슈목록|etc",
        "extractionConfidence": 0.0~1.0
    }
}

이미지에서 텍스트가 없거나 관련 정보가 없으면 빈 배열을 반환하세요.
반드시 유효한 JSON만 반환하세요. 설명이나 마크다운 없이 JSON만 출력하세요.`;
    }

    /**
     * Gemini Vision API 호출
     * @param {string} imageBase64 - Base64 이미지
     * @param {string} mimeType - MIME 타입
     * @param {string} apiKey - Gemini API 키
     * @returns {Promise<string>} API 응답 텍스트
     */
    async function callGeminiVision(imageBase64, mimeType, apiKey) {
        const url = `${CONFIG.API_URL}?key=${apiKey}`;

        const requestBody = {
            contents: [{
                parts: [
                    {
                        text: getOCRPrompt()
                    },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 1,
                topP: 0.95,
                maxOutputTokens: 8192
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `API 오류: ${response.status}`);
            }

            const data = await response.json();

            // 응답에서 텍스트 추출
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error('API 응답에 텍스트가 없습니다');
            }

            return text;

        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('API 요청 타임아웃');
            }
            throw err;
        }
    }

    /**
     * API 응답에서 JSON 파싱
     * @param {string} text - API 응답 텍스트
     * @returns {Object} 파싱된 JSON
     */
    function parseAPIResponse(text) {
        // JSON 블록 추출 (```json ... ``` 형식 처리)
        let jsonText = text;

        // 마크다운 코드 블록 제거
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1].trim();
        }

        // JSON 시작/끝 찾기
        const startIdx = jsonText.indexOf('{');
        const endIdx = jsonText.lastIndexOf('}');

        if (startIdx !== -1 && endIdx !== -1) {
            jsonText = jsonText.substring(startIdx, endIdx + 1);
        }

        try {
            return JSON.parse(jsonText);
        } catch (err) {
            console.error('[VisionOCR] JSON parse error:', err, '\nRaw text:', text);
            throw new Error('OCR 결과 파싱 실패');
        }
    }

    /**
     * 추출된 데이터를 UnifiedIssue 형식으로 변환
     * @param {Object} ocrResult - OCR 결과
     * @param {string} filename - 파일명
     * @returns {Object[]} UnifiedIssue 배열
     */
    function convertToUnifiedIssues(ocrResult, filename) {
        const issues = [];

        // 직접 추출된 이슈
        if (ocrResult.issues && Array.isArray(ocrResult.issues)) {
            ocrResult.issues.forEach((issue, idx) => {
                issues.push({
                    id: issue.id || `IMG-${idx + 1}`,
                    title: issue.title || issue.description || '',
                    description: issue.description || issue.title || '',
                    issueType: issue.issueType || issue.type || '',
                    status: issue.status || '',
                    severity: issue.severity || 'Medium',
                    floor: issue.floor || '',
                    zone: issue.zone || '',
                    columns: issue.columns || [],
                    date: issue.date || null,
                    sourceSheet: filename
                });
            });
        }

        // 테이블에서 이슈 추출
        if (ocrResult.tables && Array.isArray(ocrResult.tables)) {
            ocrResult.tables.forEach((table, tableIdx) => {
                if (!table.rows || !Array.isArray(table.rows)) return;

                table.rows.forEach((row, rowIdx) => {
                    // 행 데이터에서 이슈 추출
                    const rowText = Object.values(row).join(' ');
                    if (!rowText || rowText.length < 5) return;

                    // 기존 이슈와 중복 체크
                    const isDuplicate = issues.some(i =>
                        i.description === rowText || i.title === rowText
                    );
                    if (isDuplicate) return;

                    // 위치 정보 추출
                    const location = window.UnifiedParser ?
                        window.UnifiedParser.extractLocation(rowText) :
                        { floor: '', zone: '', columns: [] };

                    issues.push({
                        id: `TBL${tableIdx + 1}-${rowIdx + 1}`,
                        title: row['내용'] || row['제목'] || row['이슈'] || rowText.substring(0, 100),
                        description: rowText,
                        issueType: row['분류'] || row['유형'] || row['type'] || '',
                        status: row['상태'] || row['반영'] || row['status'] || '',
                        severity: row['심각도'] || row['우선순위'] || 'Medium',
                        floor: row['층'] || row['floor'] || location.floor,
                        zone: row['구역'] || row['zone'] || location.zone,
                        columns: location.columns,
                        date: row['일자'] || row['날짜'] || row['date'] || null,
                        sourceSheet: `${filename}/${table.name || `Table${tableIdx + 1}`}`
                    });
                });
            });
        }

        return issues;
    }

    /**
     * API 키 가져오기
     * @returns {string|null}
     */
    function getAPIKey() {
        // 1. 전역 설정에서
        if (window.GEMINI_API_KEY) {
            return window.GEMINI_API_KEY;
        }

        // 2. 환경 변수 스타일 설정에서
        if (window.ENV?.GEMINI_API_KEY) {
            return window.ENV.GEMINI_API_KEY;
        }

        // 3. localStorage에서
        const stored = localStorage.getItem('gemini_api_key');
        if (stored) {
            return stored;
        }

        // 4. Alpine store에서
        if (window.Alpine?.store?.('config')?.geminiApiKey) {
            return window.Alpine.store('config').geminiApiKey;
        }

        return null;
    }

    /**
     * 이미지 유효성 검사
     * @param {File} file
     * @returns {{valid: boolean, error?: string}}
     */
    function validateImage(file) {
        if (!file) {
            return { valid: false, error: '파일이 없습니다' };
        }

        if (file.size > CONFIG.MAX_IMAGE_SIZE) {
            return { valid: false, error: `파일 크기 초과 (최대 ${CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB)` };
        }

        const mimeType = getImageMimeType(file);
        if (!CONFIG.SUPPORTED_FORMATS.includes(mimeType)) {
            return { valid: false, error: `지원하지 않는 이미지 형식: ${mimeType}` };
        }

        return { valid: true };
    }

    /**
     * 이미지 처리 메인 함수
     * @param {File} file - 이미지 파일
     * @param {Object} options - 옵션
     * @returns {Promise<Object>} { success, issues, stats, confidence, error }
     */
    async function processImage(file, options = {}) {
        try {
            // 유효성 검사
            const validation = validateImage(file);
            if (!validation.valid) {
                return { success: false, error: validation.error, issues: [], stats: {} };
            }

            // API 키 확인
            const apiKey = options.apiKey || getAPIKey();
            if (!apiKey) {
                return {
                    success: false,
                    error: 'Gemini API 키가 설정되지 않았습니다. localStorage에 "gemini_api_key"를 설정하세요.',
                    issues: [],
                    stats: {}
                };
            }

            console.log('[VisionOCR] Processing image:', file.name);

            // 이미지를 Base64로 변환
            const imageBase64 = await imageToBase64(file);
            const mimeType = getImageMimeType(file);

            // Gemini Vision API 호출
            const responseText = await callGeminiVision(imageBase64, mimeType, apiKey);

            // 응답 파싱
            const ocrResult = parseAPIResponse(responseText);

            // UnifiedIssue로 변환
            const issues = convertToUnifiedIssues(ocrResult, file.name);

            // 통계 생성
            const stats = {
                total: issues.length,
                byType: {},
                bySeverity: {},
                byStatus: {},
                tablesFound: ocrResult.tables?.length || 0,
                directIssues: ocrResult.issues?.length || 0
            };

            issues.forEach(issue => {
                const type = issue.issueType || 'Unknown';
                stats.byType[type] = (stats.byType[type] || 0) + 1;

                const severity = issue.severity || 'Medium';
                stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;

                const status = issue.status || 'Unknown';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            });

            const confidence = ocrResult.metadata?.extractionConfidence || 0.8;

            console.log('[VisionOCR] Extraction complete:', stats.total, 'issues, confidence:', confidence);

            return {
                success: true,
                issues,
                stats,
                confidence,
                rawOCRResult: ocrResult,
                documentType: ocrResult.metadata?.documentType || 'unknown'
            };

        } catch (err) {
            console.error('[VisionOCR] Error:', err);
            return {
                success: false,
                error: err.message,
                issues: [],
                stats: {}
            };
        }
    }

    /**
     * 텍스트만 추출 (간단한 OCR)
     * @param {File} file - 이미지 파일
     * @returns {Promise<Object>} { success, text, error }
     */
    async function extractText(file) {
        try {
            const validation = validateImage(file);
            if (!validation.valid) {
                return { success: false, error: validation.error, text: '' };
            }

            const apiKey = getAPIKey();
            if (!apiKey) {
                return { success: false, error: 'API 키가 필요합니다', text: '' };
            }

            const imageBase64 = await imageToBase64(file);
            const mimeType = getImageMimeType(file);

            // 간단한 텍스트 추출 프롬프트
            const simplePrompt = '이 이미지에서 모든 텍스트를 추출하세요. 표 형식이 있다면 유지하세요.';

            const url = `${CONFIG.API_URL}?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: simplePrompt },
                            { inline_data: { mime_type: mimeType, data: imageBase64 } }
                        ]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            return { success: true, text };

        } catch (err) {
            return { success: false, error: err.message, text: '' };
        }
    }

    /**
     * API 키 설정
     * @param {string} key
     */
    function setAPIKey(key) {
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            console.log('[VisionOCR] API key saved to localStorage');
        } else {
            localStorage.removeItem('gemini_api_key');
        }
    }

    // === Public API ===
    return {
        // 메인 함수
        processImage,
        extractText,

        // 유틸리티
        imageToBase64,
        validateImage,
        getImageMimeType,

        // 설정
        setAPIKey,
        getAPIKey,

        // 내부 함수 노출 (테스트용)
        _parseAPIResponse: parseAPIResponse,
        _convertToUnifiedIssues: convertToUnifiedIssues,

        // 설정
        CONFIG
    };
})();

console.log('[VisionOCR] Module loaded');
