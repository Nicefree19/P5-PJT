/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - Gmail 필터링 모듈
 * ============================================================
 *
 * 파일: GmailFilter.gs
 * 목적: Gmail 검색, 메시지 추출, 중복 방지
 * 버전: 1.0.0
 * 작성일: 2025-12-29
 *
 * 주요 기능:
 *   - 키워드 + 참여자 기반 복합 검색 쿼리 생성
 *   - Gmail 스레드/메시지 파싱
 *   - 기존 처리 메일 중복 방지
 */

// ============================================================
// 검색 쿼리 빌더
// ============================================================

/**
 * 키워드 쿼리 생성
 * @returns {string} OR로 연결된 키워드 쿼리
 * @private
 */
function buildKeywordQuery_() {
  if (!CONFIG.KEYWORDS || CONFIG.KEYWORDS.length === 0) {
    return '';
  }
  return CONFIG.KEYWORDS.map(k => `"${k}"`).join(' OR ');
}

/**
 * 참여자 쿼리 생성 (발신자 + 수신자)
 * @returns {string} OR로 연결된 참여자 쿼리
 * @private
 */
function buildParticipantQuery_() {
  if (!CONFIG.PARTICIPANTS || CONFIG.PARTICIPANTS.length === 0) {
    return '';
  }

  const queries = CONFIG.PARTICIPANTS.map(p => {
    // 도메인인 경우 (@ 포함)
    if (p.startsWith('@')) {
      return `(from:${p} OR to:${p} OR cc:${p})`;
    }
    // 전체 이메일 주소인 경우
    return `(from:${p} OR to:${p} OR cc:${p})`;
  });

  return queries.join(' OR ');
}

/**
 * 날짜 범위 쿼리 생성
 * @returns {string} 날짜 범위 쿼리
 * @private
 */
function buildDateQuery_() {
  return `newer_than:${CONFIG.DATE_RANGE_DAYS}d`;
}

/**
 * 최종 복합 쿼리 조합
 * 구조: (키워드) AND (참여자) AND 날짜범위
 * @returns {string} 완성된 Gmail 검색 쿼리
 * @private
 */
function buildFullQuery_() {
  const keywords = buildKeywordQuery_();
  const participants = buildParticipantQuery_();
  const dateRange = buildDateQuery_();

  // 쿼리 조합
  const parts = [];

  if (keywords) {
    parts.push(`(${keywords})`);
  }

  if (participants) {
    parts.push(`(${participants})`);
  }

  parts.push(dateRange);

  return parts.join(' AND ');
}

// ============================================================
// Gmail 스레드 검색
// ============================================================

/**
 * Gmail 스레드 검색 (안전 버전)
 * @returns {GmailThread[]} 검색된 스레드 배열
 * @private
 */
function filterGmailThreads_() {
  const query = buildFullQuery_();

  debugLog_(`Gmail 검색 쿼리: ${query}`);

  try {
    const threads = GmailApp.search(query, 0, CONFIG.MAX_BATCH_SIZE);
    debugLog_(`검색 결과: ${threads.length}개 스레드`);
    return threads;
  } catch (e) {
    errorLog_('Gmail 검색 오류', e);
    return [];
  }
}

/**
 * Gmail 검색 (쿼리 직접 지정)
 * @param {string} customQuery - 커스텀 검색 쿼리
 * @param {number} maxResults - 최대 결과 수
 * @returns {GmailThread[]} 검색된 스레드 배열
 */
function searchGmailWithQuery(customQuery, maxResults) {
  maxResults = maxResults || CONFIG.MAX_BATCH_SIZE;

  try {
    return GmailApp.search(customQuery, 0, maxResults);
  } catch (e) {
    errorLog_('Gmail 검색 오류', e);
    return [];
  }
}

// ============================================================
// 메시지 추출 및 파싱
// ============================================================

/**
 * 스레드에서 메시지 추출
 * @param {GmailThread[]} threads - Gmail 스레드 배열
 * @returns {Object[]} 파싱된 메시지 객체 배열
 * @private
 */
function extractMessagesFromThreads_(threads) {
  const messages = [];

  threads.forEach(thread => {
    try {
      const threadMessages = thread.getMessages();
      const labels = thread.getLabels().map(l => l.getName()).join(', ');

      threadMessages.forEach(msg => {
        const messageData = {
          // 기본 식별자
          id: msg.getId(),
          threadId: thread.getId(),

          // 발신/수신 정보
          from: msg.getFrom(),
          to: msg.getTo() || '',
          cc: msg.getCc() || '',

          // 메일 내용
          subject: msg.getSubject() || '(제목 없음)',
          body: sanitizeEmailBody_(msg.getPlainBody() || ''),

          // 메타 정보
          date: msg.getDate(),
          attachments: msg.getAttachments().length,
          isStarred: msg.isStarred(),
          isUnread: msg.isUnread(),
          labels: labels
        };

        messages.push(messageData);
      });
    } catch (e) {
      errorLog_(`스레드 파싱 오류 (${thread.getId()})`, e);
    }
  });

  // 최신순 정렬
  messages.sort((a, b) => b.date - a.date);

  return messages;
}

/**
 * 메일 본문 정제 (서명, 인용 제거)
 * @param {string} body - 원본 본문
 * @returns {string} 정제된 본문
 * @private
 */
function sanitizeEmailBody_(body) {
  if (!body) return '';

  let cleaned = body;

  // 서명 패턴 제거 (-- 이후)
  cleaned = cleaned.replace(/--\s*\n[\s\S]*$/m, '');

  // 인용 메시지 제거 (> 시작 라인)
  cleaned = cleaned.replace(/^>.*$/gm, '');

  // 이전 메시지 헤더 제거
  cleaned = cleaned.replace(/On .+ wrote:[\s\S]*$/gm, '');
  cleaned = cleaned.replace(/-----Original Message-----[\s\S]*$/gm, '');
  cleaned = cleaned.replace(/보낸 사람:.*보낸 날짜:[\s\S]*$/gm, '');

  // 연속 공백/줄바꿈 정리
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // 최대 길이 제한 (Gemini 토큰 효율)
  const maxLength = 3000;
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '\n...(본문 생략)';
  }

  return cleaned.trim();
}

// ============================================================
// 중복 방지 메커니즘
// ============================================================

/**
 * 기존 처리된 메일ID 목록 조회
 * @returns {Set<string>} 기존 메일ID Set
 * @private
 */
function getExistingMessageIds_() {
  try {
    const sheet = SpreadsheetApp.openById(getSheetId_())
                               .getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      debugLog_('메인 시트 없음 - 빈 Set 반환');
      return new Set();
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      // 헤더만 있는 경우
      return new Set();
    }

    // 메일ID 컬럼 (6번째 = 인덱스 5)
    const idColumnIndex = CONFIG.COLUMN_HEADERS.indexOf('메일ID') + 1;
    const data = sheet.getRange(2, idColumnIndex, lastRow - 1, 1).getValues();

    const ids = new Set();
    data.forEach(row => {
      if (row[0]) {
        ids.add(row[0].toString());
      }
    });

    debugLog_(`기존 메일ID 로드: ${ids.size}개`);
    return ids;

  } catch (e) {
    errorLog_('기존 메일ID 조회 오류', e);
    return new Set();
  }
}

/**
 * 중복 메일 필터링
 * @param {Object[]} messages - 메시지 배열
 * @returns {Object[]} 중복 제외된 메시지 배열
 * @private
 */
function filterDuplicates_(messages) {
  const existingIds = getExistingMessageIds_();

  const filtered = messages.filter(msg => !existingIds.has(msg.id));

  const skipped = messages.length - filtered.length;
  if (skipped > 0) {
    debugLog_(`중복 스킵: ${skipped}건`);
  }

  return filtered;
}

// ============================================================
// 발생원 추론
// ============================================================

/**
 * 발신자 이메일로 발생원 추론
 * @param {string} fromEmail - 발신자 이메일 주소
 * @returns {string} 발생원 이름
 */
function inferOrigin_(fromEmail) {
  if (!fromEmail) return '미분류';

  const email = fromEmail.toLowerCase();

  // 정확한 이메일 매칭 우선
  for (const [pattern, origin] of Object.entries(CONFIG.ORIGIN_MAPPING)) {
    if (pattern.startsWith('@')) {
      // 도메인 매칭
      if (email.includes(pattern)) {
        return origin;
      }
    } else {
      // 전체 이메일 매칭
      if (email.includes(pattern.toLowerCase())) {
        return origin;
      }
    }
  }

  return '미분류';
}

// ============================================================
// 테스트 함수
// ============================================================

/**
 * 검색 쿼리 테스트
 */
function testBuildQuery() {
  Logger.log('=== Gmail 쿼리 빌더 테스트 ===\n');

  Logger.log('[키워드 쿼리]');
  Logger.log(buildKeywordQuery_());

  Logger.log('\n[참여자 쿼리]');
  Logger.log(buildParticipantQuery_());

  Logger.log('\n[날짜 범위 쿼리]');
  Logger.log(buildDateQuery_());

  Logger.log('\n[최종 복합 쿼리]');
  Logger.log(buildFullQuery_());
}

/**
 * Gmail 검색 테스트
 */
function testGmailSearch() {
  Logger.log('=== Gmail 검색 테스트 ===\n');

  const threads = filterGmailThreads_();
  Logger.log(`검색 결과: ${threads.length}개 스레드`);

  if (threads.length > 0) {
    Logger.log('\n[상위 5개 스레드]');
    threads.slice(0, 5).forEach((thread, idx) => {
      const firstMsg = thread.getMessages()[0];
      Logger.log(`${idx + 1}. ${firstMsg.getSubject()}`);
      Logger.log(`   From: ${firstMsg.getFrom()}`);
      Logger.log(`   Date: ${firstMsg.getDate()}`);
    });
  }
}

/**
 * 메시지 추출 테스트
 */
function testExtractMessages() {
  Logger.log('=== 메시지 추출 테스트 ===\n');

  const threads = filterGmailThreads_();
  if (threads.length === 0) {
    Logger.log('검색 결과 없음');
    return;
  }

  const messages = extractMessagesFromThreads_(threads.slice(0, 3));
  Logger.log(`추출된 메시지: ${messages.length}개`);

  if (messages.length > 0) {
    const sample = messages[0];
    Logger.log('\n[샘플 메시지]');
    Logger.log(`ID: ${sample.id}`);
    Logger.log(`제목: ${sample.subject}`);
    Logger.log(`발신: ${sample.from}`);
    Logger.log(`발생원: ${inferOrigin_(sample.from)}`);
    Logger.log(`본문 (100자): ${sample.body.substring(0, 100)}...`);
    Logger.log(`첨부파일: ${sample.attachments}개`);
  }
}
