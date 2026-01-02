/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - Gemini AI 분석 모듈
 * ============================================================
 *
 * 파일: GeminiAnalyzer.gs
 * 목적: Gemini 1.5 Flash API 연동 및 메일 분석
 * 버전: 1.0.0
 * 작성일: 2025-12-29
 *
 * 주요 기능:
 *   - Gemini API 호출 (JSON 응답)
 *   - PSRC/HMB 공법 전문가 페르소나 프롬프트
 *   - 응답 파싱 및 검증
 */

// ============================================================
// 페르소나 프롬프트
// ============================================================

const PERSONA_PROMPT = `
# 역할 설정
당신은 **PSRC(프리캐스트 철근 콘크리트 기둥)** 및 **HMB(하프 슬래브 보)** 공법의
총괄 엔지니어이자, 대형 반도체 FAB 프로젝트 구조 설계를 검토하는 전문가입니다.

# 분석 목표
다음 메일을 분석하여:
1. 공법적 리스크를 식별
2. 접합부 간섭 이슈를 추출
3. 설계 변경 사항을 파악
4. 이해관계자 간 책임 경계를 명확히

# 발생원 추론 규칙
| 이메일 패턴 | 발생원 |
|------------|--------|
| @samoo.com | 삼우(원설계) |
| @samsung.com | ENA(시공/PM) |
| vickysong1@naver.com | 이앤디몰(PC설계) |
| dhkim2630@naver.com | 이앤디몰(PC설계) |
| @senkuzo.com | 센코어(전환설계) |
| @senvex.net | 센코어(전환설계) |

# 긴급도 평가 기준
| 조건 | 긴급도 |
|------|--------|
| Shop Drawing 제작 완료 후 변경 요청 | **Showstopper** |
| 0.75fpu 인장 강도 오류 발견 | **Showstopper** |
| 변단면 상세 설계 오류 | **Critical** |
| 접합부 간섭 우려 | **High** |
| 설계 문의/질의 | **Medium** |
| 일반 행정 연락 | **Low** |

# 공법 구분 카테고리
- PSRC-PC접합
- PSRC-Steel접합
- HMB-PC접합
- 변단면 이슈
- 하중 검토
- 접합부 간섭
- 기타

# 출력 형식 (JSON)
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드 블록 없이 순수 JSON만 출력:
{
  "발생원": "삼우(원설계)",
  "공법구분": "PSRC-PC접합",
  "긴급도": "Critical",
  "본문요약": "메일 내용을 2-3문장으로 요약",
  "AI분석": "공법적 관점에서 분석한 내용",
  "추천조치": "권장 후속 조치 사항",
  "키워드": ["PSRC", "접합부", "Shop Drawing"]
}
`;

// ============================================================
// Gemini API 호출
// ============================================================

/**
 * Gemini API 호출 (기본)
 * @param {string} prompt - 프롬프트 텍스트
 * @returns {Object} API 응답 객체
 * @private
 */
function callGeminiAPI_(prompt) {
  const apiKey = getGeminiApiKey_();
  const url = `${CONFIG.GEMINI_ENDPOINT}${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: CONFIG.GEMINI_TEMPERATURE,
      maxOutputTokens: CONFIG.GEMINI_MAX_TOKENS,
      responseMimeType: 'application/json'
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    throw new Error(`Gemini API 오류 (${responseCode}): ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText());
}

/**
 * Gemini API 호출 (재시도 로직 포함)
 * @param {string} prompt - 프롬프트 텍스트
 * @param {number} maxRetries - 최대 재시도 횟수
 * @returns {Object|null} API 응답 또는 null
 * @private
 */
function callGeminiWithRetry_(prompt, maxRetries) {
  maxRetries = maxRetries || CONFIG.RETRY_COUNT;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      debugLog_(`Gemini API 호출 시도 ${attempt}/${maxRetries}`);

      const response = callGeminiAPI_(prompt);

      // 유효한 응답 확인
      if (response.candidates && response.candidates.length > 0) {
        return response;
      }

      debugLog_('응답에 candidates 없음');

    } catch (e) {
      errorLog_(`API 호출 실패 (시도 ${attempt}/${maxRetries})`, e);

      if (attempt < maxRetries) {
        // 지수 백오프 대기
        const delay = Math.pow(2, attempt) * CONFIG.RETRY_DELAY_MS;
        debugLog_(`${delay}ms 후 재시도...`);
        Utilities.sleep(delay);
      }
    }
  }

  return null;
}

/**
 * API 응답에서 텍스트 추출
 * @param {Object} response - API 응답 객체
 * @returns {string|null} 응답 텍스트 또는 null
 * @private
 */
function extractResponseText_(response) {
  try {
    return response.candidates[0].content.parts[0].text;
  } catch (e) {
    errorLog_('응답 텍스트 추출 실패', e);
    return null;
  }
}

// ============================================================
// 프롬프트 빌더
// ============================================================

/**
 * 메일 분석용 프롬프트 생성
 * @param {Object} emailData - 메일 데이터 객체
 * @returns {string} 완성된 프롬프트
 * @private
 */
function buildAnalysisPrompt_(emailData) {
  return `${PERSONA_PROMPT}

---
## 분석 대상 메일

**발신자**: ${emailData.from}
**수신자**: ${emailData.to || '(없음)'}
**참조**: ${emailData.cc || '없음'}
**일시**: ${formatDate_(emailData.date)}
**제목**: ${emailData.subject}

**본문**:
${emailData.body}
`;
}

// ============================================================
// JSON 응답 파싱
// ============================================================

/**
 * JSON 응답 정제 (코드 블록 제거)
 * @param {string} text - 원본 응답 텍스트
 * @returns {string} 정제된 JSON 문자열
 * @private
 */
function cleanJsonResponse_(text) {
  if (!text) return '';

  let cleaned = text;

  // ```json ... ``` 패턴 제거
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // ``` 만 있는 경우
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  return cleaned.trim();
}

/**
 * 분석 응답 파싱 및 검증
 * @param {string} responseText - API 응답 텍스트
 * @returns {Object|null} 파싱된 분석 결과 또는 null
 * @private
 */
function parseAnalysisResponse_(responseText) {
  const cleaned = cleanJsonResponse_(responseText);

  try {
    const parsed = JSON.parse(cleaned);

    // 필수 필드 검증
    const requiredFields = ['발생원', '공법구분', '긴급도', '본문요약', 'AI분석', '추천조치', '키워드'];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`필수 필드 누락: ${field}`);
      }
    }

    // 키워드 배열 검증
    if (!Array.isArray(parsed.키워드)) {
      parsed.키워드 = [];
    }

    // 긴급도 검증
    const validUrgencies = Object.values(CONFIG.URGENCY_LEVELS);
    if (!validUrgencies.includes(parsed.긴급도)) {
      debugLog_(`알 수 없는 긴급도: ${parsed.긴급도}, Medium으로 대체`);
      parsed.긴급도 = 'Medium';
    }

    return parsed;

  } catch (e) {
    errorLog_('JSON 파싱 오류', e);
    debugLog_(`원본 응답: ${responseText}`);
    return null;
  }
}

/**
 * 파싱 실패 시 기본값 반환
 * @param {Object} emailData - 메일 데이터 객체
 * @returns {Object} 기본 분석 결과
 * @private
 */
function getDefaultAnalysis_(emailData) {
  return {
    발생원: inferOrigin_(emailData.from) || '미분류',
    공법구분: '기타',
    긴급도: 'Medium',
    본문요약: emailData.subject || '(분석 실패)',
    AI분석: 'AI 분석 실패 - 수동 검토 필요',
    추천조치: '담당자 수동 확인 필요',
    키워드: []
  };
}

// ============================================================
// 통합 분석 함수
// ============================================================

/**
 * 메일 1건 분석
 * @param {Object} emailData - 메일 데이터 객체
 * @returns {Object} 분석 결과
 * @private
 */
function analyzeEmail_(emailData) {
  debugLog_(`메일 분석 시작: ${emailData.subject}`);

  const prompt = buildAnalysisPrompt_(emailData);
  const response = callGeminiWithRetry_(prompt);

  if (!response) {
    debugLog_('API 응답 없음 - 기본값 사용');
    return getDefaultAnalysis_(emailData);
  }

  const text = extractResponseText_(response);

  if (!text) {
    debugLog_('응답 텍스트 없음 - 기본값 사용');
    return getDefaultAnalysis_(emailData);
  }

  const analysis = parseAnalysisResponse_(text);

  if (!analysis) {
    debugLog_('JSON 파싱 실패 - 기본값 사용');
    return getDefaultAnalysis_(emailData);
  }

  debugLog_(`분석 완료: 긴급도=${analysis.긴급도}, 발생원=${analysis.발생원}`);
  return analysis;
}

/**
 * 다건 메일 배치 분석
 * @param {Object[]} emails - 메일 데이터 배열
 * @returns {Object[]} 분석 결과 배열 [{email, analysis}, ...]
 * @private
 */
function analyzeEmails_(emails) {
  const results = [];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    Logger.log(`[${i + 1}/${emails.length}] 분석 중: ${truncateString_(email.subject, 40)}`);

    try {
      const analysis = analyzeEmail_(email);

      results.push({
        email: email,
        analysis: analysis
      });

    } catch (e) {
      errorLog_(`메일 분석 실패: ${email.id}`, e);

      results.push({
        email: email,
        analysis: getDefaultAnalysis_(email)
      });
    }

    // API Rate Limit 대응 (1초 대기)
    if (i < emails.length - 1) {
      Utilities.sleep(1000);
    }
  }

  return results;
}

// ============================================================
// 테스트 함수
// ============================================================

/**
 * Gemini API 연결 테스트
 */
function testGeminiConnection() {
  Logger.log('=== Gemini API 연결 테스트 ===\n');

  try {
    const testPrompt = '안녕하세요. 테스트입니다. "OK"라고만 응답하세요.';

    const response = callGeminiAPI_(testPrompt);
    const text = extractResponseText_(response);

    Logger.log(`✅ API 연결 성공`);
    Logger.log(`응답: ${text}`);

  } catch (e) {
    Logger.log(`❌ API 연결 실패: ${e.message}`);
  }
}

/**
 * JSON 파싱 테스트
 */
function testJsonParsing() {
  Logger.log('=== JSON 파싱 테스트 ===\n');

  // 정상 케이스
  const validJson = `{
    "발생원": "삼우(원설계)",
    "공법구분": "PSRC-PC접합",
    "긴급도": "High",
    "본문요약": "테스트 요약",
    "AI분석": "테스트 분석",
    "추천조치": "테스트 조치",
    "키워드": ["PSRC", "테스트"]
  }`;

  const result1 = parseAnalysisResponse_(validJson);
  Logger.log(`[정상 JSON] ${result1 ? '✅ 파싱 성공' : '❌ 파싱 실패'}`);

  // 코드 블록 포함 케이스
  const withCodeBlock = '```json\n' + validJson + '\n```';
  const result2 = parseAnalysisResponse_(withCodeBlock);
  Logger.log(`[코드 블록 포함] ${result2 ? '✅ 파싱 성공' : '❌ 파싱 실패'}`);

  // 필드 누락 케이스
  const missingField = '{"발생원": "삼우"}';
  const result3 = parseAnalysisResponse_(missingField);
  Logger.log(`[필드 누락] ${result3 ? '❌ 파싱 성공 (예상: 실패)' : '✅ 파싱 실패 (예상대로)'}`);
}

/**
 * 샘플 메일 분석 테스트
 */
function testAnalyzeEmail() {
  Logger.log('=== 샘플 메일 분석 테스트 ===\n');

  const sampleEmail = {
    id: 'test_001',
    threadId: 'thread_001',
    from: 'engineer@samoo.com',
    to: 'pm@samsung.com',
    cc: 'designer@senkuzo.com',
    subject: '[P5 복합동] PSRC 기둥-PC보 접합부 간섭 검토 요청',
    body: `
    안녕하세요, 삼우종합건축 구조팀입니다.

    P5 복합동 X23~X30열 구간의 PSRC 기둥과 PC보 접합부에서
    철근 간섭이 우려되어 검토 요청드립니다.

    현재 상황:
    - 기둥 주근 D32 8EA 배치
    - 보 주근 D25 6EA 배치
    - 접합부 내 철근 밀집으로 콘크리트 타설 우려

    검토 요청사항:
    1. 접합부 철근 간섭 해소 방안
    2. Shop Drawing 수정 필요 여부
    3. 대안 상세 검토

    회신 부탁드립니다.
    감사합니다.
    `,
    date: new Date(),
    attachments: 2,
    isStarred: false,
    isUnread: true,
    labels: ''
  };

  const analysis = analyzeEmail_(sampleEmail);

  Logger.log('[분석 결과]');
  Logger.log(`  발생원: ${analysis.발생원}`);
  Logger.log(`  공법구분: ${analysis.공법구분}`);
  Logger.log(`  긴급도: ${analysis.긴급도}`);
  Logger.log(`  본문요약: ${analysis.본문요약}`);
  Logger.log(`  AI분석: ${analysis.AI분석}`);
  Logger.log(`  추천조치: ${analysis.추천조치}`);
  Logger.log(`  키워드: ${analysis.키워드.join(', ')}`);
}
