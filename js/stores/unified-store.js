/**
 * Unified Store - Issue Data Mapper Phase 5
 * 통합 이슈 데이터 저장소 (Alpine.js Store 확장)
 *
 * @module UnifiedStore
 * @requires Alpine.js
 * @requires UnifiedParser
 * @requires IssueMatcher
 */

(function() {
    'use strict';

    /**
     * 스토어 초기화를 위한 팩토리 함수
     * @returns {Object} Alpine store 객체
     */
    function createUnifiedStore() {
        return {
            // === 상태 ===
            issues: [],
            clusters: [],
            importHistory: [],

            // === 인덱스 (성능 최적화) ===
            _issueIndex: new Map(),          // id → Issue
            _locationIndex: new Map(),       // floor-zone-column → Issue[]
            _sourceIndex: new Map(),         // sourceFile → Issue[]
            _typeIndex: new Map(),           // issueType → Issue[]
            _clusterIndex: new Map(),        // clusterId → Cluster

            // === 설정 ===
            config: {
                autoCluster: true,
                clusterThreshold: 0.5,
                maxIssues: 10000,
                persistToLocalStorage: true,
                storageKey: 'unified_issues_v1'
            },

            // === 통계 ===
            stats: {
                total: 0,
                byType: {},
                bySeverity: {},
                byStatus: {},
                bySource: {},
                byFloor: {},
                byZone: {},
                clusterCount: 0,
                lastUpdate: null
            },

            // === 초기화 ===
            init() {
                console.log('[UnifiedStore] Initializing...');

                // LocalStorage에서 복원
                if (this.config.persistToLocalStorage) {
                    this.loadFromStorage();
                }

                // 인덱스 재구축
                this.rebuildIndexes();

                console.log('[UnifiedStore] Initialized with', this.issues.length, 'issues');
            },

            // === CRUD 작업 ===

            /**
             * 이슈 추가
             * @param {Object|Object[]} issuesOrIssue - 단일 이슈 또는 이슈 배열
             * @param {string} source - 소스 식별자
             * @returns {number} 추가된 이슈 수
             */
            addIssues(issuesOrIssue, source = 'unknown') {
                const issueArray = Array.isArray(issuesOrIssue) ? issuesOrIssue : [issuesOrIssue];
                let addedCount = 0;

                issueArray.forEach(issue => {
                    // 용량 체크
                    if (this.issues.length >= this.config.maxIssues) {
                        console.warn('[UnifiedStore] Max issues limit reached');
                        return;
                    }

                    // 중복 체크
                    if (this._issueIndex.has(issue.id)) {
                        console.log('[UnifiedStore] Duplicate issue skipped:', issue.id);
                        return;
                    }

                    // 메타데이터 추가
                    const enrichedIssue = {
                        ...issue,
                        _addedAt: new Date().toISOString(),
                        _source: source
                    };

                    this.issues.push(enrichedIssue);
                    this._addToIndexes(enrichedIssue);
                    addedCount++;
                });

                // 자동 클러스터링
                if (this.config.autoCluster && addedCount > 0) {
                    this.updateClusters();
                }

                // 통계 업데이트
                this.updateStats();

                // 저장
                if (this.config.persistToLocalStorage) {
                    this.saveToStorage();
                }

                // Import 기록
                this.importHistory.push({
                    timestamp: new Date().toISOString(),
                    source,
                    count: addedCount
                });

                console.log('[UnifiedStore] Added', addedCount, 'issues from', source);
                return addedCount;
            },

            /**
             * 이슈 업데이트
             * @param {string} id - 이슈 ID
             * @param {Object} updates - 업데이트할 필드
             * @returns {boolean}
             */
            updateIssue(id, updates) {
                const issue = this._issueIndex.get(id);
                if (!issue) {
                    console.warn('[UnifiedStore] Issue not found:', id);
                    return false;
                }

                // 인덱스에서 제거
                this._removeFromIndexes(issue);

                // 업데이트 적용
                Object.assign(issue, updates, {
                    _updatedAt: new Date().toISOString()
                });

                // 인덱스에 다시 추가
                this._addToIndexes(issue);

                // 통계 업데이트
                this.updateStats();

                // 저장
                if (this.config.persistToLocalStorage) {
                    this.saveToStorage();
                }

                return true;
            },

            /**
             * 이슈 삭제
             * @param {string} id - 이슈 ID
             * @returns {boolean}
             */
            removeIssue(id) {
                const index = this.issues.findIndex(i => i.id === id);
                if (index === -1) return false;

                const issue = this.issues[index];
                this._removeFromIndexes(issue);
                this.issues.splice(index, 1);

                // 클러스터 업데이트
                if (this.config.autoCluster) {
                    this.updateClusters();
                }

                // 통계/저장
                this.updateStats();
                if (this.config.persistToLocalStorage) {
                    this.saveToStorage();
                }

                return true;
            },

            /**
             * 모든 이슈 삭제
             */
            clearAll() {
                this.issues = [];
                this.clusters = [];
                this._issueIndex.clear();
                this._locationIndex.clear();
                this._sourceIndex.clear();
                this._typeIndex.clear();
                this._clusterIndex.clear();

                this.updateStats();
                if (this.config.persistToLocalStorage) {
                    localStorage.removeItem(this.config.storageKey);
                }

                console.log('[UnifiedStore] Cleared all data');
            },

            // === 인덱스 관리 ===

            /**
             * 이슈를 인덱스에 추가
             * @private
             */
            _addToIndexes(issue) {
                // ID 인덱스
                this._issueIndex.set(issue.id, issue);

                // 위치 인덱스
                const floor = issue.location?.floor || 'unknown';
                const zone = issue.location?.zone || 'unknown';
                const columns = issue.location?.columns || issue.linkedColumns || [];

                columns.forEach(col => {
                    const key = `${floor}-${zone}-${col}`;
                    if (!this._locationIndex.has(key)) {
                        this._locationIndex.set(key, []);
                    }
                    this._locationIndex.get(key).push(issue);
                });

                // Floor-Zone 키
                const fzKey = `${floor}-${zone}`;
                if (!this._locationIndex.has(fzKey)) {
                    this._locationIndex.set(fzKey, []);
                }
                this._locationIndex.get(fzKey).push(issue);

                // 소스 인덱스
                const source = issue.sourceFile || issue._source || 'unknown';
                if (!this._sourceIndex.has(source)) {
                    this._sourceIndex.set(source, []);
                }
                this._sourceIndex.get(source).push(issue);

                // 유형 인덱스
                const type = issue.issueType || 'unknown';
                if (!this._typeIndex.has(type)) {
                    this._typeIndex.set(type, []);
                }
                this._typeIndex.get(type).push(issue);
            },

            /**
             * 이슈를 인덱스에서 제거
             * @private
             */
            _removeFromIndexes(issue) {
                this._issueIndex.delete(issue.id);

                // 위치 인덱스에서 제거
                this._locationIndex.forEach((arr, key) => {
                    const idx = arr.findIndex(i => i.id === issue.id);
                    if (idx !== -1) arr.splice(idx, 1);
                });

                // 소스 인덱스에서 제거
                const source = issue.sourceFile || issue._source || 'unknown';
                const sourceArr = this._sourceIndex.get(source);
                if (sourceArr) {
                    const idx = sourceArr.findIndex(i => i.id === issue.id);
                    if (idx !== -1) sourceArr.splice(idx, 1);
                }

                // 유형 인덱스에서 제거
                const type = issue.issueType || 'unknown';
                const typeArr = this._typeIndex.get(type);
                if (typeArr) {
                    const idx = typeArr.findIndex(i => i.id === issue.id);
                    if (idx !== -1) typeArr.splice(idx, 1);
                }
            },

            /**
             * 인덱스 재구축
             */
            rebuildIndexes() {
                this._issueIndex.clear();
                this._locationIndex.clear();
                this._sourceIndex.clear();
                this._typeIndex.clear();

                this.issues.forEach(issue => this._addToIndexes(issue));
                console.log('[UnifiedStore] Indexes rebuilt');
            },

            // === 쿼리 ===

            /**
             * ID로 이슈 조회
             * @param {string} id
             * @returns {Object|null}
             */
            getById(id) {
                return this._issueIndex.get(id) || null;
            },

            /**
             * 위치로 이슈 조회
             * @param {string} floor
             * @param {string} zone
             * @param {string[]} columns
             * @returns {Object[]}
             */
            findByLocation(floor, zone, columns = []) {
                const results = new Set();

                if (columns.length > 0) {
                    columns.forEach(col => {
                        const key = `${floor}-${zone}-${col}`;
                        const issues = this._locationIndex.get(key) || [];
                        issues.forEach(i => results.add(i));
                    });
                } else {
                    const key = `${floor}-${zone}`;
                    const issues = this._locationIndex.get(key) || [];
                    issues.forEach(i => results.add(i));
                }

                return Array.from(results);
            },

            /**
             * 소스로 이슈 조회
             * @param {string} sourceFile
             * @returns {Object[]}
             */
            findBySource(sourceFile) {
                return this._sourceIndex.get(sourceFile) || [];
            },

            /**
             * 유형으로 이슈 조회
             * @param {string} issueType
             * @returns {Object[]}
             */
            findByType(issueType) {
                return this._typeIndex.get(issueType) || [];
            },

            /**
             * 관련 이슈 찾기 (IssueMatcher 연동)
             * @param {string} issueId
             * @param {Object} options
             * @returns {Promise<Object[]>}
             */
            async findRelated(issueId, options = {}) {
                const issue = this.getById(issueId);
                if (!issue) return [];

                if (!window.IssueMatcher) {
                    console.warn('[UnifiedStore] IssueMatcher not loaded');
                    return [];
                }

                const matches = await window.IssueMatcher.findMatches(
                    issue,
                    this.issues.filter(i => i.id !== issueId),
                    options
                );

                return matches.filter(m => m.score > 0.3);
            },

            /**
             * 검색 (텍스트 기반)
             * @param {string} query
             * @returns {Object[]}
             */
            search(query) {
                if (!query) return [];

                const lower = query.toLowerCase();
                return this.issues.filter(issue => {
                    const searchText = [
                        issue.id,
                        issue.description,
                        issue.rawText,
                        issue.issueType,
                        issue.location?.floor,
                        issue.location?.zone,
                        ...(issue.location?.columns || [])
                    ].join(' ').toLowerCase();

                    return searchText.includes(lower);
                });
            },

            /**
             * 필터링
             * @param {Object} filters
             * @returns {Object[]}
             */
            filter(filters = {}) {
                return this.issues.filter(issue => {
                    if (filters.floor && issue.location?.floor !== filters.floor) return false;
                    if (filters.zone && issue.location?.zone !== filters.zone) return false;
                    if (filters.type && issue.issueType !== filters.type) return false;
                    if (filters.severity && issue.severity !== filters.severity) return false;
                    if (filters.status && issue.status !== filters.status) return false;
                    if (filters.source && issue.sourceFile !== filters.source) return false;
                    return true;
                });
            },

            // === 클러스터링 ===

            /**
             * 클러스터 업데이트
             */
            updateClusters() {
                if (!window.IssueMatcher) {
                    console.warn('[UnifiedStore] IssueMatcher not loaded, skipping clustering');
                    return;
                }

                this.clusters = window.IssueMatcher.clusterIssues(
                    this.issues,
                    { threshold: this.config.clusterThreshold }
                );

                // 클러스터 인덱스 업데이트
                this._clusterIndex.clear();
                this.clusters.forEach(cluster => {
                    this._clusterIndex.set(cluster.id, cluster);
                });

                this.stats.clusterCount = this.clusters.length;
                console.log('[UnifiedStore] Updated clusters:', this.clusters.length);
            },

            /**
             * 클러스터 조회
             * @param {string} clusterId
             * @returns {Object|null}
             */
            getCluster(clusterId) {
                return this._clusterIndex.get(clusterId) || null;
            },

            /**
             * 이슈의 클러스터 찾기
             * @param {string} issueId
             * @returns {Object|null}
             */
            getClusterByIssue(issueId) {
                return this.clusters.find(c =>
                    c.issues.some(i => i.id === issueId)
                ) || null;
            },

            // === 통계 ===

            /**
             * 통계 업데이트
             */
            updateStats() {
                this.stats = {
                    total: this.issues.length,
                    byType: {},
                    bySeverity: {},
                    byStatus: {},
                    bySource: {},
                    byFloor: {},
                    byZone: {},
                    clusterCount: this.clusters.length,
                    lastUpdate: new Date().toISOString()
                };

                this.issues.forEach(issue => {
                    const type = issue.issueType || 'Unknown';
                    this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;

                    const severity = issue.severity || 'Unknown';
                    this.stats.bySeverity[severity] = (this.stats.bySeverity[severity] || 0) + 1;

                    const status = issue.status || 'Unknown';
                    this.stats.byStatus[status] = (this.stats.byStatus[status] || 0) + 1;

                    const source = issue.source || 'unknown';
                    this.stats.bySource[source] = (this.stats.bySource[source] || 0) + 1;

                    const floor = issue.location?.floor || 'Unknown';
                    this.stats.byFloor[floor] = (this.stats.byFloor[floor] || 0) + 1;

                    const zone = issue.location?.zone || 'Unknown';
                    this.stats.byZone[zone] = (this.stats.byZone[zone] || 0) + 1;
                });
            },

            // === 동기화 ===

            /**
             * 메인 이슈 스토어와 동기화
             */
            syncToMainIssues() {
                // Alpine store 'issues'와 동기화
                if (window.Alpine?.store?.('issues')) {
                    const mainStore = window.Alpine.store('issues');
                    this.issues.forEach(issue => {
                        // 메인 스토어 형식으로 변환
                        const mainIssue = {
                            id: issue.id,
                            type: issue.issueType,
                            title: issue.description?.substring(0, 100),
                            description: issue.description,
                            location: `${issue.location?.floor || ''} ${issue.location?.zone || ''}`.trim(),
                            status: issue.status,
                            linkedColumns: issue.location?.columns || issue.linkedColumns || [],
                            source: 'unified',
                            sourceDate: issue.date
                        };

                        if (typeof mainStore.add === 'function') {
                            mainStore.add(mainIssue);
                        }
                    });
                    console.log('[UnifiedStore] Synced to main issues store');
                }
            },

            /**
             * Google Sheets로 내보내기
             * @param {string} apiUrl
             * @returns {Promise<Object>}
             */
            async exportToSheet(apiUrl) {
                if (!apiUrl) {
                    console.warn('[UnifiedStore] No API URL provided');
                    return { success: false, error: 'API URL required' };
                }

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'syncUnifiedIssues',
                            issues: this.issues.map(i => ({
                                id: i.id,
                                type: i.issueType,
                                description: i.description,
                                floor: i.location?.floor,
                                zone: i.location?.zone,
                                columns: (i.location?.columns || []).join(', '),
                                severity: i.severity,
                                status: i.status,
                                source: i.source,
                                sourceFile: i.sourceFile,
                                date: i.date ? new Date(i.date).toISOString() : '',
                                timestamp: new Date().toISOString()
                            })),
                            stats: this.stats
                        })
                    });

                    const result = await response.json();
                    console.log('[UnifiedStore] Export result:', result);
                    return result;

                } catch (err) {
                    console.error('[UnifiedStore] Export error:', err);
                    return { success: false, error: err.message };
                }
            },

            // === Persistence ===

            /**
             * LocalStorage에 저장
             */
            saveToStorage() {
                try {
                    const data = {
                        issues: this.issues,
                        clusters: this.clusters,
                        stats: this.stats,
                        importHistory: this.importHistory,
                        savedAt: new Date().toISOString()
                    };
                    localStorage.setItem(this.config.storageKey, JSON.stringify(data));
                    console.log('[UnifiedStore] Saved to localStorage');
                } catch (err) {
                    console.error('[UnifiedStore] Save error:', err);
                }
            },

            /**
             * LocalStorage에서 로드
             */
            loadFromStorage() {
                try {
                    const stored = localStorage.getItem(this.config.storageKey);
                    if (!stored) return;

                    const data = JSON.parse(stored);
                    this.issues = data.issues || [];
                    this.clusters = data.clusters || [];
                    this.importHistory = data.importHistory || [];

                    console.log('[UnifiedStore] Loaded from localStorage:', this.issues.length, 'issues');
                } catch (err) {
                    console.error('[UnifiedStore] Load error:', err);
                }
            },

            /**
             * JSON 내보내기
             * @returns {string}
             */
            toJSON() {
                return JSON.stringify({
                    issues: this.issues,
                    clusters: this.clusters,
                    stats: this.stats,
                    exportedAt: new Date().toISOString()
                }, null, 2);
            },

            /**
             * JSON 가져오기
             * @param {string} jsonString
             */
            fromJSON(jsonString) {
                try {
                    const data = JSON.parse(jsonString);
                    if (data.issues) {
                        this.addIssues(data.issues, 'json_import');
                    }
                } catch (err) {
                    console.error('[UnifiedStore] JSON import error:', err);
                }
            }
        };
    }

    // Alpine.js가 로드되면 스토어 등록
    function registerStore() {
        if (typeof Alpine !== 'undefined') {
            Alpine.store('unifiedData', createUnifiedStore());
            console.log('[UnifiedStore] Registered with Alpine.js');
        } else {
            // Alpine 로드 대기
            document.addEventListener('alpine:init', () => {
                Alpine.store('unifiedData', createUnifiedStore());
                console.log('[UnifiedStore] Registered with Alpine.js (deferred)');
            });
        }
    }

    // 즉시 실행 또는 지연 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerStore);
    } else {
        registerStore();
    }

    // 전역 노출 (테스트 및 직접 접근용)
    window.UnifiedStoreFactory = createUnifiedStore;

})();

console.log('[UnifiedStore] Module loaded');
