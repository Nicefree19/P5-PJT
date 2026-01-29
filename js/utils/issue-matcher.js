/**
 * Issue Matcher - Issue Data Mapper Phase 3
 * 이슈 간 관계 매칭, 클러스터링, AI 기반 연관성 분석
 *
 * @module IssueMatcher
 * @requires UnifiedParser
 */

window.IssueMatcher = (function() {
    'use strict';

    // 설정
    const CONFIG = {
        // 매칭 가중치
        WEIGHTS: {
            location: 0.4,  // 위치 기반 매칭
            type: 0.25,     // 유형 기반 매칭
            semantic: 0.2,  // 키워드/의미 기반 매칭
            temporal: 0.15  // 시간 기반 매칭
        },

        // 클러스터링 임계값
        CLUSTER_THRESHOLD: 0.5,

        // AI 매칭 임계값
        AI_CONFIDENCE_THRESHOLD: 0.7,

        // 최대 클러스터 크기
        MAX_CLUSTER_SIZE: 20
    };

    // === 위치 기반 매칭 ===

    /**
     * 기둥 ID를 숫자로 파싱
     * @param {string} columnId - 예: "C-X15"
     * @returns {{zone: string, num: number}|null}
     */
    function parseColumnId(columnId) {
        const match = columnId.match(/([A-C])-?[Xx]?(\d+)/i);
        if (!match) return null;
        return {
            zone: match[1].toUpperCase(),
            num: parseInt(match[2], 10)
        };
    }

    /**
     * 두 기둥 간 거리 계산
     * @param {string} col1 - 기둥 ID 1
     * @param {string} col2 - 기둥 ID 2
     * @returns {number} 거리 (같은 구역일 때만 유효)
     */
    function columnDistance(col1, col2) {
        const p1 = parseColumnId(col1);
        const p2 = parseColumnId(col2);
        if (!p1 || !p2) return Infinity;
        if (p1.zone !== p2.zone) return Infinity; // 다른 구역
        return Math.abs(p1.num - p2.num);
    }

    /**
     * 층 비교
     * @param {string} floor1
     * @param {string} floor2
     * @returns {number} 0: 같음, 1-n: 차이
     */
    function floorDistance(floor1, floor2) {
        if (!floor1 || !floor2) return 2;
        if (floor1 === floor2) return 0;

        const parseFloor = (f) => {
            if (f.toUpperCase() === 'RF') return 99;
            const num = parseInt(f.replace(/[^0-9]/g, ''), 10);
            return isNaN(num) ? 0 : num;
        };

        return Math.abs(parseFloor(floor1) - parseFloor(floor2));
    }

    /**
     * 위치 기반 매칭 점수
     * @param {Object} issue - 대상 이슈
     * @param {Object} candidate - 후보 이슈
     * @returns {Object} ScoredMatch
     */
    function matchByLocation(issue, candidate) {
        let score = 0;
        const reasons = [];

        // 같은 층
        if (issue.location?.floor && candidate.location?.floor) {
            const fDist = floorDistance(issue.location.floor, candidate.location.floor);
            if (fDist === 0) {
                score += 0.3;
                reasons.push('같은 층');
            } else if (fDist <= 2) {
                score += 0.1;
                reasons.push('인접 층');
            }
        }

        // 같은 구역
        if (issue.location?.zone && candidate.location?.zone) {
            if (issue.location.zone === candidate.location.zone) {
                score += 0.25;
                reasons.push('같은 구역');
            }
        }

        // 기둥 ID 비교
        const cols1 = issue.location?.columns || issue.linkedColumns || [];
        const cols2 = candidate.location?.columns || candidate.linkedColumns || [];

        if (cols1.length > 0 && cols2.length > 0) {
            // 교집합 확인
            const overlap = cols1.filter(c => cols2.includes(c));
            if (overlap.length > 0) {
                score += 0.4;
                reasons.push(`${overlap.length}개 기둥 일치`);
            } else {
                // 인접 기둥 확인
                let minDist = Infinity;
                for (const c1 of cols1) {
                    for (const c2 of cols2) {
                        const dist = columnDistance(c1, c2);
                        if (dist < minDist) minDist = dist;
                    }
                }
                if (minDist <= 3) {
                    score += 0.2;
                    reasons.push(`인접 기둥 (거리 ${minDist})`);
                } else if (minDist <= 10) {
                    score += 0.1;
                    reasons.push('근처 기둥');
                }
            }
        }

        return {
            issueId: candidate.id,
            score: Math.min(score, 1.0),
            matchType: 'location',
            reason: reasons.join(', ') || '위치 정보 없음'
        };
    }

    // === 유형 기반 매칭 ===

    /**
     * 유형 기반 매칭 점수
     * @param {Object} issue
     * @param {Object} candidate
     * @returns {Object} ScoredMatch
     */
    function matchByType(issue, candidate) {
        let score = 0;
        const reasons = [];

        // 이슈 유형 비교
        if (issue.issueType && candidate.issueType) {
            if (issue.issueType === candidate.issueType) {
                score += 0.6;
                reasons.push(`동일 유형: ${issue.issueType}`);
            } else {
                // 관련 유형 그룹
                const relatedGroups = [
                    ['PSRC', 'HMB', 'Rebar'],  // 철근류
                    ['Form', 'Concrete'],      // 타설류
                    ['Embed', 'Steel'],        // 강재류
                    ['Safety', 'QC']           // 관리류
                ];

                for (const group of relatedGroups) {
                    if (group.includes(issue.issueType) && group.includes(candidate.issueType)) {
                        score += 0.3;
                        reasons.push('관련 유형 그룹');
                        break;
                    }
                }
            }
        }

        // 심각도 비교
        if (issue.severity && candidate.severity) {
            if (issue.severity === candidate.severity) {
                score += 0.2;
                reasons.push(`동일 심각도: ${issue.severity}`);
            }
        }

        // 상태 비교
        if (issue.status && candidate.status) {
            if (issue.status === candidate.status) {
                score += 0.15;
                reasons.push(`동일 상태: ${issue.status}`);
            }
        }

        return {
            issueId: candidate.id,
            score: Math.min(score, 1.0),
            matchType: 'type',
            reason: reasons.join(', ') || '유형 정보 없음'
        };
    }

    // === 의미 기반 매칭 ===

    /**
     * 텍스트에서 키워드 추출
     * @param {string} text
     * @returns {Set<string>}
     */
    function extractKeywords(text) {
        if (!text) return new Set();

        const keywords = new Set();
        const lower = text.toLowerCase();

        // 기술 키워드
        const techPatterns = [
            /PSRC|HMB|철근|콘크리트|거푸집|매입|embed|rebar|form|concrete/gi,
            /타설|양생|배근|인서트|앵커|볼트|슬리브/gi,
            /설계변경|도면|시방서|specification/gi,
            /안전|품질|QC|검사|inspection/gi
        ];

        // 문제 키워드
        const issuePatterns = [
            /지연|delay|문제|issue|오류|error|간섭|충돌|conflict/gi,
            /누락|missing|부족|shortage|변경|change|수정|modify/gi,
            /파손|damage|균열|crack|불량|defect/gi
        ];

        [...techPatterns, ...issuePatterns].forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(m => keywords.add(m.toLowerCase()));
            }
        });

        return keywords;
    }

    /**
     * 의미 기반 매칭 점수 (키워드)
     * @param {Object} issue
     * @param {Object} candidate
     * @returns {Object} ScoredMatch
     */
    function matchBySemantic(issue, candidate) {
        const text1 = (issue.description || issue.rawText || '').toLowerCase();
        const text2 = (candidate.description || candidate.rawText || '').toLowerCase();

        const keywords1 = extractKeywords(text1);
        const keywords2 = extractKeywords(text2);

        if (keywords1.size === 0 || keywords2.size === 0) {
            return {
                issueId: candidate.id,
                score: 0,
                matchType: 'semantic',
                reason: '키워드 없음'
            };
        }

        // Jaccard 유사도
        const intersection = [...keywords1].filter(k => keywords2.has(k));
        const union = new Set([...keywords1, ...keywords2]);
        const jaccard = intersection.length / union.size;

        // 공통 키워드 비율
        const commonRatio = intersection.length / Math.min(keywords1.size, keywords2.size);

        const score = (jaccard * 0.4) + (commonRatio * 0.6);

        return {
            issueId: candidate.id,
            score: Math.min(score, 1.0),
            matchType: 'semantic',
            reason: intersection.length > 0 ? `공통 키워드: ${intersection.join(', ')}` : '일치 없음',
            keywords: intersection
        };
    }

    // === 시간 기반 매칭 ===

    /**
     * 시간 기반 매칭 점수
     * @param {Object} issue
     * @param {Object} candidate
     * @returns {Object} ScoredMatch
     */
    function matchByTemporal(issue, candidate) {
        const date1 = issue.date instanceof Date ? issue.date : new Date(issue.date);
        const date2 = candidate.date instanceof Date ? candidate.date : new Date(candidate.date);

        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
            return {
                issueId: candidate.id,
                score: 0,
                matchType: 'temporal',
                reason: '날짜 정보 없음'
            };
        }

        const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);

        let score = 0;
        let reason = '';

        if (daysDiff === 0) {
            score = 1.0;
            reason = '같은 날';
        } else if (daysDiff <= 3) {
            score = 0.8;
            reason = '3일 이내';
        } else if (daysDiff <= 7) {
            score = 0.6;
            reason = '1주일 이내';
        } else if (daysDiff <= 30) {
            score = 0.3;
            reason = '1개월 이내';
        } else {
            score = 0.1;
            reason = '1개월 초과';
        }

        return {
            issueId: candidate.id,
            score,
            matchType: 'temporal',
            reason
        };
    }

    // === AI 기반 매칭 ===

    /**
     * AI 기반 매칭 (Gemini API 사용)
     * @param {Object} issue - 대상 이슈
     * @param {Object[]} candidates - 후보 이슈들
     * @param {Object} options - 옵션
     * @returns {Promise<Object[]>} ScoredMatch 배열
     */
    async function matchByAI(issue, candidates, options = {}) {
        const apiKey = options.apiKey || window.VisionOCR?.getAPIKey?.();
        if (!apiKey) {
            console.warn('[IssueMatcher] AI matching skipped: no API key');
            return candidates.map(c => ({
                issueId: c.id,
                score: 0,
                matchType: 'ai',
                reason: 'API 키 없음'
            }));
        }

        // 후보가 많으면 사전 필터링
        const topCandidates = candidates.slice(0, 10);

        const prompt = `건설 프로젝트 이슈 관계 분석:

대상 이슈:
- ID: ${issue.id}
- 유형: ${issue.issueType || 'N/A'}
- 설명: ${issue.description || issue.rawText || 'N/A'}
- 위치: ${issue.location?.floor || ''} ${issue.location?.zone || ''} ${issue.location?.columns?.join(', ') || ''}

후보 이슈들:
${topCandidates.map((c, i) => `${i + 1}. ID: ${c.id}, 유형: ${c.issueType || 'N/A'}, 설명: ${(c.description || c.rawText || '').substring(0, 100)}`).join('\n')}

각 후보가 대상 이슈와 얼마나 관련있는지 0.0~1.0 점수로 평가하세요.
JSON 형식으로 반환: [{"id": "이슈ID", "score": 0.X, "reason": "관련 이유"}]`;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
                })
            });

            if (!response.ok) throw new Error('API 오류');

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // JSON 파싱
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const results = JSON.parse(jsonMatch[0]);
                return results.map(r => ({
                    issueId: r.id,
                    score: Math.min(Math.max(r.score || 0, 0), 1),
                    matchType: 'ai',
                    reason: r.reason || 'AI 분석'
                }));
            }

            throw new Error('응답 파싱 실패');

        } catch (err) {
            console.error('[IssueMatcher] AI matching error:', err);
            return topCandidates.map(c => ({
                issueId: c.id,
                score: 0,
                matchType: 'ai',
                reason: `오류: ${err.message}`
            }));
        }
    }

    // === 종합 매칭 ===

    /**
     * 종합 매칭 점수 계산
     * @param {Object[]} matches - 각 유형별 ScoredMatch 배열
     * @returns {number} 0.0 ~ 1.0
     */
    function calculateMatchScore(matches) {
        if (!matches || matches.length === 0) return 0;

        let totalScore = 0;
        let totalWeight = 0;

        matches.forEach(match => {
            const weight = CONFIG.WEIGHTS[match.matchType] || 0.25;
            totalScore += match.score * weight;
            totalWeight += weight;
        });

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    /**
     * 이슈 매칭 실행
     * @param {Object} issue - 대상 이슈
     * @param {Object[]} candidates - 후보 이슈들
     * @param {Object} options - 옵션
     * @returns {Promise<Object[]>} 정렬된 ScoredMatch 배열
     */
    async function findMatches(issue, candidates, options = {}) {
        const results = [];

        for (const candidate of candidates) {
            if (candidate.id === issue.id) continue; // 자기 자신 제외

            const locationMatch = matchByLocation(issue, candidate);
            const typeMatch = matchByType(issue, candidate);
            const semanticMatch = matchBySemantic(issue, candidate);
            const temporalMatch = matchByTemporal(issue, candidate);

            const overallScore = calculateMatchScore([
                locationMatch,
                typeMatch,
                semanticMatch,
                temporalMatch
            ]);

            results.push({
                issueId: candidate.id,
                issue: candidate,
                score: overallScore,
                details: {
                    location: locationMatch,
                    type: typeMatch,
                    semantic: semanticMatch,
                    temporal: temporalMatch
                },
                reasons: [
                    locationMatch.reason,
                    typeMatch.reason,
                    semanticMatch.reason,
                    temporalMatch.reason
                ].filter(r => r && r !== '없음')
            });
        }

        // AI 매칭 (옵션)
        if (options.useAI) {
            const aiMatches = await matchByAI(issue, candidates, options);
            results.forEach(r => {
                const aiMatch = aiMatches.find(m => m.issueId === r.issueId);
                if (aiMatch) {
                    r.details.ai = aiMatch;
                    r.score = (r.score * 0.7) + (aiMatch.score * 0.3);
                    if (aiMatch.reason) r.reasons.push(`AI: ${aiMatch.reason}`);
                }
            });
        }

        // 점수순 정렬
        return results.sort((a, b) => b.score - a.score);
    }

    // === 클러스터링 ===

    /**
     * 이슈 클러스터링
     * @param {Object[]} issues - 이슈 배열
     * @param {Object} options - 옵션
     * @returns {Object[]} IssueCluster 배열
     */
    function clusterIssues(issues, options = {}) {
        const threshold = options.threshold || CONFIG.CLUSTER_THRESHOLD;
        const maxSize = options.maxSize || CONFIG.MAX_CLUSTER_SIZE;

        const clusters = [];
        const assigned = new Set();

        // 유사도 매트릭스 계산 (간소화)
        const similarities = {};
        for (let i = 0; i < issues.length; i++) {
            for (let j = i + 1; j < issues.length; j++) {
                const locationMatch = matchByLocation(issues[i], issues[j]);
                const typeMatch = matchByType(issues[i], issues[j]);
                const similarity = (locationMatch.score * 0.6) + (typeMatch.score * 0.4);

                const key = `${issues[i].id}:${issues[j].id}`;
                similarities[key] = similarity;
            }
        }

        // 계층적 클러스터링 (단순 구현)
        for (const issue of issues) {
            if (assigned.has(issue.id)) continue;

            const cluster = {
                id: `cluster-${clusters.length + 1}`,
                issues: [issue],
                centerLocation: {
                    floor: issue.location?.floor || '',
                    zone: issue.location?.zone || '',
                    columns: [...(issue.location?.columns || [])]
                },
                primaryType: issue.issueType || 'Unknown',
                matchScore: 1.0
            };

            assigned.add(issue.id);

            // 유사한 이슈 찾아서 클러스터에 추가
            for (const candidate of issues) {
                if (assigned.has(candidate.id)) continue;
                if (cluster.issues.length >= maxSize) break;

                const key1 = `${issue.id}:${candidate.id}`;
                const key2 = `${candidate.id}:${issue.id}`;
                const similarity = similarities[key1] || similarities[key2] || 0;

                if (similarity >= threshold) {
                    cluster.issues.push(candidate);
                    assigned.add(candidate.id);

                    // 클러스터 중심 업데이트
                    if (candidate.location?.columns) {
                        cluster.centerLocation.columns.push(...candidate.location.columns);
                    }
                }
            }

            // 중복 제거
            cluster.centerLocation.columns = [...new Set(cluster.centerLocation.columns)];

            // 클러스터 점수 계산
            if (cluster.issues.length > 1) {
                let totalSim = 0;
                let count = 0;
                for (let i = 0; i < cluster.issues.length; i++) {
                    for (let j = i + 1; j < cluster.issues.length; j++) {
                        const key1 = `${cluster.issues[i].id}:${cluster.issues[j].id}`;
                        const key2 = `${cluster.issues[j].id}:${cluster.issues[i].id}`;
                        totalSim += similarities[key1] || similarities[key2] || 0;
                        count++;
                    }
                }
                cluster.matchScore = count > 0 ? totalSim / count : 0;
            }

            clusters.push(cluster);
        }

        console.log('[IssueMatcher] Clustered', issues.length, 'issues into', clusters.length, 'clusters');
        return clusters;
    }

    /**
     * 클러스터에서 관련 이슈 찾기
     * @param {string} issueId
     * @param {Object[]} clusters
     * @returns {Object|null} 해당 클러스터
     */
    function findClusterByIssue(issueId, clusters) {
        return clusters.find(c => c.issues.some(i => i.id === issueId)) || null;
    }

    /**
     * 클러스터 통계 생성
     * @param {Object[]} clusters
     * @returns {Object}
     */
    function getClusterStats(clusters) {
        const stats = {
            totalClusters: clusters.length,
            totalIssues: 0,
            avgClusterSize: 0,
            maxClusterSize: 0,
            byType: {},
            byFloor: {},
            byZone: {}
        };

        clusters.forEach(cluster => {
            stats.totalIssues += cluster.issues.length;
            stats.maxClusterSize = Math.max(stats.maxClusterSize, cluster.issues.length);

            const type = cluster.primaryType || 'Unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;

            const floor = cluster.centerLocation?.floor || 'Unknown';
            stats.byFloor[floor] = (stats.byFloor[floor] || 0) + 1;

            const zone = cluster.centerLocation?.zone || 'Unknown';
            stats.byZone[zone] = (stats.byZone[zone] || 0) + 1;
        });

        stats.avgClusterSize = stats.totalClusters > 0 ?
            (stats.totalIssues / stats.totalClusters).toFixed(1) : 0;

        return stats;
    }

    // === Public API ===
    return {
        // 개별 매칭
        matchByLocation,
        matchByType,
        matchBySemantic,
        matchByTemporal,
        matchByAI,

        // 종합 매칭
        findMatches,
        calculateMatchScore,

        // 클러스터링
        clusterIssues,
        findClusterByIssue,
        getClusterStats,

        // 유틸리티
        extractKeywords,
        parseColumnId,
        columnDistance,
        floorDistance,

        // 설정
        CONFIG
    };
})();

console.log('[IssueMatcher] Module loaded');
