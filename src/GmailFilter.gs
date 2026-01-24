/**
 * ============================================================
 * P5 복합동 메일 분석 시스템 - Gmail 필터링 모듈
 * ============================================================
 *
 * 파일: GmailFilter.gs
 * 목적: Gmail 검색, 메시지 추출, 중복 방지
 * 버전: 2.4.0
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
 * Gmail 스레드 검색 (안전 버전) - 단일 배치
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
 * Gmail 스레드 검색 (Pagination 지원)
 * 50개씩 반복 조회하여 MAX_TOTAL_THREADS까지 모든 스레드 수집
 * @returns {GmailThread[]} 검색된 전체 스레드 배열
 * @private
 */
function filterGmailThreadsWithPagination_() {
  const query = buildFullQuery_();
  const pageSize = CONFIG.PAGINATION_SIZE || 50;
  const maxTotal = CONFIG.MAX_TOTAL_THREADS || 500;

  debugLog_(`Gmail 검색 쿼리 (Pagination): ${query}`);
  debugLog_(`페이지 크기: ${pageSize}, 최대 수집: ${maxTotal}`);

  const allThreads = [];
  let start = 0;
  let pageCount = 0;

  try {
    while (start < maxTotal) {
      pageCount++;
      const threads = GmailApp.search(query, start, pageSize);

      debugLog_(`[Page ${pageCount}] offset=${start}, 조회=${threads.length}개`);

      if (threads.length === 0) {
        debugLog_(`페이지 ${pageCount}: 더 이상 결과 없음. 검색 종료.`);
        break;
      }

      allThreads.push(...threads);
      start += threads.length;

      // 결과가 pageSize보다 적으면 마지막 페이지
      if (threads.length < pageSize) {
        debugLog_(`페이지 ${pageCount}: 마지막 페이지 (${threads.length} < ${pageSize})`);
        break;
      }

      // API 쿼터 보호를 위한 짧은 대기
      if (start < maxTotal) {
        Utilities.sleep(100);
      }
    }

    debugLog_(`Pagination 완료: 총 ${allThreads.length}개 스레드 (${pageCount}페이지)`);
    return allThreads;

  } catch (e) {
    errorLog_('Gmail Pagination 검색 오류', e);
    // 부분 결과라도 반환
    if (allThreads.length > 0) {
      debugLog_(`오류 발생 전까지 수집된 ${allThreads.length}개 스레드 반환`);
      return allThreads;
    }
    return [];
  }
}

/**
 * Incremental 검색을 위한 마지막 처리 시점 조회
 * @returns {Date|null} 마지막 처리된 메일 일시
 * @private
 */
function getLastProcessedDate_() {
  try {
    const props = PropertiesService.getScriptProperties();
    const lastProcessed = props.getProperty('LAST_PROCESSED_DATE');

    if (lastProcessed) {
      const date = new Date(lastProcessed);
      debugLog_(`마지막 처리 시점: ${date.toLocaleString('ko-KR')}`);
      return date;
    }

    debugLog_('마지막 처리 시점 없음 - 전체 검색 수행');
    return null;
  } catch (e) {
    errorLog_('마지막 처리 시점 조회 오류', e);
    return null;
  }
}

/**
 * 마지막 처리 시점 저장
 * @param {Date} date - 저장할 일시
 * @private
 */
function setLastProcessedDate_(date) {
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('LAST_PROCESSED_DATE', date.toISOString());
    debugLog_(`마지막 처리 시점 저장: ${date.toLocaleString('ko-KR')}`);
  } catch (e) {
    errorLog_('마지막 처리 시점 저장 오류', e);
  }
}

/**
 * Incremental 쿼리 생성 (마지막 처리 이후 메일만)
 * @returns {string} after: 조건이 포함된 검색 쿼리
 * @private
 */
function buildIncrementalQuery_() {
  const baseQuery = buildFullQuery_();
  const lastProcessed = getLastProcessedDate_();

  if (!lastProcessed) {
    return baseQuery;
  }

  // Gmail 검색에서 after: 는 YYYY/MM/DD 형식 사용
  const year = lastProcessed.getFullYear();
  const month = String(lastProcessed.getMonth() + 1).padStart(2, '0');
  const day = String(lastProcessed.getDate()).padStart(2, '0');
  const afterDate = `${year}/${month}/${day}`;

  const incrementalQuery = `${baseQuery} after:${afterDate}`;
  debugLog_(`Incremental 쿼리: after:${afterDate}`);

  return incrementalQuery;
}

/**
 * Gmail 스레드 Incremental 검색 (Pagination + 마지막 처리 시점 이후만)
 * @param {boolean} useIncremental - Incremental 모드 사용 여부 (기본: true)
 * @returns {GmailThread[]} 검색된 스레드 배열
 * @private
 */
function filterGmailThreadsIncremental_(useIncremental) {
  useIncremental = useIncremental !== false; // 기본값 true

  const query = useIncremental ? buildIncrementalQuery_() : buildFullQuery_();
  const pageSize = CONFIG.PAGINATION_SIZE || 50;
  const maxTotal = CONFIG.MAX_TOTAL_THREADS || 500;

  debugLog_(`Gmail Incremental 검색 (mode=${useIncremental ? 'incremental' : 'full'})`);
  debugLog_(`쿼리: ${query}`);

  const allThreads = [];
  let start = 0;
  let pageCount = 0;

  try {
    while (start < maxTotal) {
      pageCount++;
      const threads = GmailApp.search(query, start, pageSize);

      if (threads.length === 0) {
        break;
      }

      allThreads.push(...threads);
      start += threads.length;

      debugLog_(`[Page ${pageCount}] +${threads.length}개, 누적 ${allThreads.length}개`);

      if (threads.length < pageSize) {
        break;
      }

      Utilities.sleep(100);
    }

    debugLog_(`Incremental 검색 완료: ${allThreads.length}개 스레드`);
    return allThreads;

  } catch (e) {
    errorLog_('Gmail Incremental 검색 오류', e);
    return allThreads.length > 0 ? allThreads : [];
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

/**
 * Pagination 검색 테스트
 */
function testPaginationSearch() {
  Logger.log('=== Pagination 검색 테스트 ===\n');

  const startTime = Date.now();
  const threads = filterGmailThreadsWithPagination_();
  const elapsed = Date.now() - startTime;

  Logger.log(`\n[결과 요약]`);
  Logger.log(`총 스레드: ${threads.length}개`);
  Logger.log(`소요 시간: ${elapsed}ms`);
  Logger.log(`페이지 크기: ${CONFIG.PAGINATION_SIZE}개`);
  Logger.log(`최대 수집: ${CONFIG.MAX_TOTAL_THREADS}개`);

  if (threads.length > 0) {
    Logger.log('\n[최신 5개 스레드]');
    threads.slice(0, 5).forEach((thread, idx) => {
      const firstMsg = thread.getMessages()[0];
      Logger.log(`${idx + 1}. ${firstMsg.getSubject()}`);
      Logger.log(`   Date: ${firstMsg.getDate()}`);
    });
  }
}

/**
 * Incremental 검색 테스트
 */
function testIncrementalSearch() {
  Logger.log('=== Incremental 검색 테스트 ===\n');

  // 현재 마지막 처리 시점 확인
  const lastProcessed = getLastProcessedDate_();
  if (lastProcessed) {
    Logger.log(`마지막 처리 시점: ${lastProcessed.toLocaleString('ko-KR')}`);
  } else {
    Logger.log('마지막 처리 시점: 없음 (전체 검색)');
  }

  // Incremental 쿼리 확인
  Logger.log(`\n[Incremental 쿼리]`);
  Logger.log(buildIncrementalQuery_());

  // Incremental 검색 실행
  const startTime = Date.now();
  const threads = filterGmailThreadsIncremental_(true);
  const elapsed = Date.now() - startTime;

  Logger.log(`\n[결과 요약]`);
  Logger.log(`검색된 스레드: ${threads.length}개`);
  Logger.log(`소요 시간: ${elapsed}ms`);

  if (threads.length > 0) {
    Logger.log('\n[최신 3개 스레드]');
    threads.slice(0, 3).forEach((thread, idx) => {
      const firstMsg = thread.getMessages()[0];
      Logger.log(`${idx + 1}. ${firstMsg.getSubject()}`);
      Logger.log(`   From: ${firstMsg.getFrom()}`);
      Logger.log(`   Date: ${firstMsg.getDate()}`);
    });
  }
}

/**
 * 전체 검색 vs Incremental 검색 비교 테스트
 */
function testCompareSearchModes() {
  Logger.log('=== 검색 모드 비교 테스트 ===\n');

  // 전체 검색
  Logger.log('[1] 전체 검색 (Pagination)');
  const fullStart = Date.now();
  const fullThreads = filterGmailThreadsWithPagination_();
  const fullElapsed = Date.now() - fullStart;
  Logger.log(`   결과: ${fullThreads.length}개, ${fullElapsed}ms`);

  // 짧은 대기
  Utilities.sleep(500);

  // Incremental 검색
  Logger.log('\n[2] Incremental 검색');
  const incStart = Date.now();
  const incThreads = filterGmailThreadsIncremental_(true);
  const incElapsed = Date.now() - incStart;
  Logger.log(`   결과: ${incThreads.length}개, ${incElapsed}ms`);

  // 비교 결과
  Logger.log('\n[비교 결과]');
  Logger.log(`전체 검색: ${fullThreads.length}개 (${fullElapsed}ms)`);
  Logger.log(`Incremental: ${incThreads.length}개 (${incElapsed}ms)`);

  if (fullThreads.length > 0) {
    const reduction = Math.round((1 - incThreads.length / fullThreads.length) * 100);
    Logger.log(`스레드 감소율: ${reduction}%`);
  }
}
