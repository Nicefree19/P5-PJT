/**
 * Data Map View - Issue Data Mapper Phase 4
 * 그리드 기반 데이터 지도 시각화 컴포넌트 (Alpine.js)
 *
 * @module DataMapView
 * @requires Alpine.js
 * @requires UnifiedParser
 * @requires IssueMatcher
 * @requires UnifiedStore
 */

(function() {
    'use strict';

    /**
     * Alpine.js 컴포넌트: dataMapView
     */
    function createDataMapComponent() {
        return {
            // === 상태 ===
            viewMode: 'grid',        // 'grid' | 'cluster' | 'list' | 'timeline'
            isLoading: false,
            error: null,
            loadedCount: 0,          // 로드된 이슈 수 (반응성 트리거용)

            // 로컬 캐시 (반응성 보장)
            _cachedIssues: [],
            _cachedStats: {},
            _lastRefresh: 0,

            // 필터
            filters: {
                floor: '',
                zone: '',
                type: '',
                severity: '',
                status: '',
                source: '',
                meetingDate: ''
            },

            // 선택
            selectedIssue: null,
            selectedCluster: null,
            highlightedIssueIds: [],

            // 검색
            searchQuery: '',

            // 파일 업로드
            dragActive: false,

            // 타임라인 데이터
            timelineData: [],
            categoryHistory: [],

            // 그리드 설정
            gridConfig: {
                rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
                columns: 69,
                cellWidth: 28,
                cellHeight: 28
            },

            // === 스토어 접근 메서드 ===

            /**
             * 통합 스토어 가져오기
             * Alpine.js는 get 문법을 지원하지 않으므로 메서드로 구현
             */
            getStore() {
                // Alpine의 $store 매직 프로퍼티 사용 (반응형)
                if (this.$store && this.$store.unifiedData) {
                    return this.$store.unifiedData;
                }
                // 폴백: 직접 Alpine.store 호출
                if (typeof Alpine !== 'undefined') {
                    return Alpine.store('unifiedData') || { issues: [], clusters: [], stats: {} };
                }
                // 기본값
                return { issues: [], clusters: [], stats: {} };
            },

            /**
             * 캐시 새로고침 - 스토어에서 데이터 가져와 로컬 캐시 업데이트
             */
            refreshCache() {
                const store = this.getStore();
                this._cachedIssues = [...(store.issues || [])];
                this._cachedStats = { ...(store.stats || {}) };
                this._lastRefresh = Date.now();
                console.log('[DataMapView] Cache refreshed:', this._cachedIssues.length, 'issues');
            },

            /**
             * 필터링된 이슈 목록 가져오기 (메서드 방식)
             */
            getFilteredIssues() {
                // 로컬 캐시 사용 (loadedCount 변경 시 갱신됨)
                let issues = this._cachedIssues || [];

                // 캐시가 비어있으면 스토어에서 직접 가져옴
                if (issues.length === 0) {
                    const store = this.getStore();
                    issues = store.issues || [];
                }

                if (this.searchQuery) {
                    const query = this.searchQuery.toLowerCase();
                    issues = issues.filter(i =>
                        (i.description || '').toLowerCase().includes(query) ||
                        (i.id || '').toLowerCase().includes(query) ||
                        (i.issueType || '').toLowerCase().includes(query)
                    );
                }

                if (this.filters.floor) {
                    issues = issues.filter(i => i.location?.floor === this.filters.floor);
                }
                if (this.filters.zone) {
                    issues = issues.filter(i => i.location?.zone === this.filters.zone);
                }
                if (this.filters.type) {
                    issues = issues.filter(i => i.issueType === this.filters.type);
                }
                if (this.filters.severity) {
                    issues = issues.filter(i => i.severity === this.filters.severity);
                }
                if (this.filters.status) {
                    issues = issues.filter(i => i.status === this.filters.status);
                }
                if (this.filters.source) {
                    issues = issues.filter(i => i.source === this.filters.source);
                }
                if (this.filters.meetingDate) {
                    issues = issues.filter(i => i.meetingDate === this.filters.meetingDate);
                }

                return issues;
            },

            // Getter alias (backward compatibility) - triggers on loadedCount change
            get filteredIssues() {
                // Trigger reactivity via loadedCount
                const _ = this.loadedCount;
                return this.getFilteredIssues();
            },

            get meetingDates() {
                const byDate = this.stats?.byMeetingDate;
                if (!byDate || typeof byDate !== 'object') return [];
                return Object.keys(byDate)
                    .filter(k => typeof k === 'string' && k !== '')
                    .sort((a, b) => b.localeCompare(a));  // 최신 순
            },

            get majorCategories() {
                const byCategory = this.stats?.byMajorCategory;
                if (!byCategory || typeof byCategory !== 'object') return [];
                return Object.entries(byCategory)
                    .filter(([k, v]) => typeof k === 'string' && k !== '' && k !== 'undefined')
                    .sort((a, b) => b[1] - a[1])  // 이슈 수 순
                    .slice(0, 20)
                    .map(([k]) => k);
            },

            get filteredClusters() {
                const clusters = this.getStore().clusters || [];
                if (!this.filters.floor && !this.filters.zone && !this.filters.type) {
                    return clusters;
                }

                return clusters.filter(cluster => {
                    if (this.filters.floor && cluster.centerLocation?.floor !== this.filters.floor) return false;
                    if (this.filters.zone && cluster.centerLocation?.zone !== this.filters.zone) return false;
                    if (this.filters.type && cluster.primaryType !== this.filters.type) return false;
                    return true;
                });
            },

            get stats() {
                // Use cached stats if available, triggered by loadedCount
                const _ = this.loadedCount;
                if (Object.keys(this._cachedStats || {}).length > 0) {
                    return this._cachedStats;
                }
                return this.getStore().stats || {};
            },

            get issueTypes() {
                const byType = this.stats?.byType;
                if (!byType || typeof byType !== 'object') return [];
                return Object.keys(byType).filter(k => typeof k === 'string' && k !== '').sort();
            },

            get floors() {
                const byFloor = this.stats?.byFloor;
                if (!byFloor || typeof byFloor !== 'object') return [];
                return Object.keys(byFloor).filter(k => typeof k === 'string' && k !== '' && k !== 'Unknown').sort();
            },

            get zones() {
                const byZone = this.stats?.byZone;
                if (!byZone || typeof byZone !== 'object') return ['A', 'B', 'C'];
                const zoneKeys = Object.keys(byZone).filter(k => typeof k === 'string' && k !== '' && k !== 'Unknown');
                return zoneKeys.length > 0 ? zoneKeys.sort() : ['A', 'B', 'C'];
            },

            get sources() {
                const bySource = this.stats?.bySource;
                if (!bySource || typeof bySource !== 'object') return [];
                return Object.keys(bySource).filter(k => typeof k === 'string' && k !== '').sort();
            },

            get statuses() {
                const byStatus = this.stats?.byStatus;
                if (!byStatus || typeof byStatus !== 'object') {
                    return ['Completed', 'In Progress', 'Open', 'Review', 'On Hold', 'Delayed'];
                }
                return Object.keys(byStatus).filter(k => typeof k === 'string' && k !== '').sort();
            },

            // === 초기화 ===

            init() {
                console.log('[DataMapView] Initializing...');

                // 스토어 참조 캐시 (반응성 보장)
                if (this.$store && this.$store.unifiedData) {
                    this._storeRef = this.$store.unifiedData;
                    console.log('[DataMapView] Store reference cached via $store');
                } else if (typeof Alpine !== 'undefined') {
                    this._storeRef = Alpine.store('unifiedData');
                    console.log('[DataMapView] Store reference cached via Alpine.store()');
                }

                // 스토어 초기화 확인
                if (this.getStore().init && typeof this.getStore().init === 'function') {
                    this.getStore().init();
                }

                // 키보드 단축키
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.clearSelection();
                    }
                });

                // 초기 데이터 로드 확인 (localStorage에서 복구된 경우)
                const initialCount = this.getStore().issues?.length || 0;
                if (initialCount > 0) {
                    // 캐시 새로고침
                    this.refreshCache();
                    this.loadedCount = initialCount;
                    console.log('[DataMapView] Initial data found:', initialCount, 'issues');

                    // 타임라인 데이터도 업데이트
                    if (window.MeetingIssuesImport) {
                        this.updateTimelineData(this._cachedIssues);
                    }
                }

                // $watch를 사용하여 loadedCount 변경 시 캐시 갱신
                if (typeof this.$watch === 'function') {
                    this.$watch('loadedCount', (newCount) => {
                        if (newCount > 0 && newCount !== this._cachedIssues.length) {
                            this.refreshCache();
                        }
                    });
                }

                console.log('[DataMapView] Initialized, store issues:', initialCount);
            },

            // === 파일 처리 ===

            /**
             * 파일 드롭 핸들러
             */
            handleDrop(event) {
                event.preventDefault();
                this.dragActive = false;

                const files = event.dataTransfer?.files;
                if (files && files.length > 0) {
                    this.importFiles(Array.from(files));
                }
            },

            /**
             * 파일 입력 핸들러
             */
            handleFileInput(event) {
                const files = event.target.files;
                if (files && files.length > 0) {
                    this.importFiles(Array.from(files));
                    event.target.value = ''; // 초기화
                }
            },

            /**
             * 파일 임포트
             */
            async importFiles(files) {
                if (!window.UnifiedParser) {
                    this.showError('UnifiedParser 모듈이 로드되지 않았습니다');
                    return;
                }

                this.isLoading = true;
                this.error = null;

                try {
                    const result = await window.UnifiedParser.parseMultiple(files);

                    if (result.success || result.successCount > 0) {
                        this.getStore().addIssues(result.issues, 'file_import');

                        // 캐시 새로고침
                        this.refreshCache();
                        this.loadedCount = this._cachedIssues.length;

                        this.showToast(`${result.successCount}개 파일에서 ${result.issues.length}건 이슈 가져옴`, 'success');

                        if (result.errors.length > 0) {
                            console.warn('[DataMapView] Import errors:', result.errors);
                        }
                    } else {
                        this.showError('파일 처리 실패: ' + (result.errors[0]?.error || 'Unknown error'));
                    }

                } catch (err) {
                    console.error('[DataMapView] Import error:', err);
                    this.showError('파일 처리 중 오류: ' + err.message);
                } finally {
                    this.isLoading = false;
                }
            },

            // === 선택 및 하이라이트 ===

            /**
             * 이슈 선택
             */
            selectIssue(issue) {
                this.selectedIssue = issue;
                this.selectedCluster = this.getStore().getClusterByIssue?.(issue.id) || null;

                // 관련 이슈 하이라이트
                this.highlightRelatedIssues(issue.id);
            },

            /**
             * 클러스터 선택
             */
            selectCluster(cluster) {
                this.selectedCluster = cluster;
                this.selectedIssue = null;

                // 클러스터 이슈들 하이라이트
                this.highlightedIssueIds = cluster.issues.map(i => i.id);
            },

            /**
             * 선택 해제
             */
            clearSelection() {
                this.selectedIssue = null;
                this.selectedCluster = null;
                this.highlightedIssueIds = [];
            },

            /**
             * 관련 이슈 하이라이트
             */
            async highlightRelatedIssues(issueId) {
                if (!this.getStore().findRelated) {
                    return;
                }

                const related = await this.getStore().findRelated(issueId);
                this.highlightedIssueIds = [issueId, ...related.map(r => r.issueId)];
            },

            /**
             * 이슈가 하이라이트되어 있는지 확인
             */
            isHighlighted(issueId) {
                return this.highlightedIssueIds.includes(issueId);
            },

            // === 그리드 렌더링 ===

            /**
             * 그리드 셀에 해당하는 이슈 가져오기
             */
            getIssuesForCell(row, col) {
                const columnId = `${row}-X${col}`;
                return this.filteredIssues.filter(issue => {
                    const columns = issue.location?.columns || issue.linkedColumns || [];
                    return columns.includes(columnId);
                });
            },

            /**
             * 셀 클래스 계산
             */
            getCellClass(row, col) {
                const issues = this.getIssuesForCell(row, col);
                if (issues.length === 0) return '';

                const classes = ['has-issues'];

                // 심각도에 따른 색상
                const hasCritical = issues.some(i => i.severity === 'Critical');
                const hasHigh = issues.some(i => i.severity === 'High');

                if (hasCritical) classes.push('severity-critical');
                else if (hasHigh) classes.push('severity-high');

                // 하이라이트
                const highlighted = issues.some(i => this.isHighlighted(i.id));
                if (highlighted) classes.push('highlighted');

                // 다중 이슈
                if (issues.length > 1) classes.push('multiple-issues');

                return classes.join(' ');
            },

            /**
             * 셀 클릭 핸들러
             */
            handleCellClick(row, col) {
                const issues = this.getIssuesForCell(row, col);
                if (issues.length === 0) {
                    this.clearSelection();
                    return;
                }

                if (issues.length === 1) {
                    this.selectIssue(issues[0]);
                } else {
                    // 다중 이슈: 첫 번째 선택하거나 팝업 표시
                    this.selectIssue(issues[0]);
                    // TODO: 다중 이슈 선택 UI
                }
            },

            // === 클러스터 렌더링 ===

            /**
             * 클러스터 색상
             */
            getClusterColor(cluster, index) {
                const colors = [
                    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
                    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
                ];
                return colors[index % colors.length];
            },

            /**
             * 클러스터 크기 (시각화용)
             */
            getClusterSize(cluster) {
                const count = cluster.issues.length;
                const base = 60;
                return Math.min(base + (count * 10), 150);
            },

            // === 필터 ===

            /**
             * 필터 초기화
             */
            clearFilters() {
                this.filters = {
                    floor: '',
                    zone: '',
                    type: '',
                    severity: '',
                    status: '',
                    source: '',
                    meetingDate: ''
                };
                this.searchQuery = '';
            },

            /**
             * 활성 필터 수
             */
            get activeFilterCount() {
                return Object.values(this.filters).filter(v => v).length +
                    (this.searchQuery ? 1 : 0);
            },

            // === 액션 ===

            /**
             * 클러스터 재계산
             */
            recalculateClusters() {
                if (this.getStore().updateClusters) {
                    this.isLoading = true;
                    setTimeout(() => {
                        this.getStore().updateClusters();
                        this.isLoading = false;
                        this.showToast('클러스터 재계산 완료', 'success');
                    }, 100);
                }
            },

            /**
             * 데이터 내보내기 (JSON)
             */
            exportJSON() {
                if (this.getStore().toJSON) {
                    const json = this.getStore().toJSON();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `data-map-export-${new Date().toISOString().slice(0,10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    this.showToast('JSON 내보내기 완료', 'success');
                }
            },

            /**
             * 데이터 초기화
             */
            clearAllData() {
                if (confirm('모든 데이터를 삭제하시겠습니까?')) {
                    if (this.getStore().clearAll) {
                        this.getStore().clearAll();
                        this.clearSelection();
                        this.showToast('데이터 초기화 완료', 'info');
                    }
                }
            },

            /**
             * 메인 그리드와 동기화
             */
            syncToMainGrid() {
                if (this.getStore().syncToMainIssues) {
                    this.getStore().syncToMainIssues();
                    this.showToast('메인 그리드와 동기화 완료', 'success');
                }
            },

            /**
             * 회의록 이슈 로드
             */
            async loadMeetingIssues(options = {}) {
                if (!window.MeetingIssuesImport) {
                    this.showError('MeetingIssuesImport 모듈이 로드되지 않았습니다');
                    return;
                }

                this.isLoading = true;
                this.error = null;

                const {
                    maxIssues = 2000,     // 더 많은 이슈 로드
                    recentOnly = false,   // 전체 기간
                    recentDays = 365      // 1년
                } = options;

                try {
                    const result = await window.MeetingIssuesImport.loadIntoStore({
                        maxIssues,
                        recentOnly,
                        recentDays,
                        onProgress: (progress) => {
                            console.log(`[DataMapView] Loading... ${progress.percent}%`);
                        }
                    });

                    if (result.success) {
                        const summary = result.stats;
                        this.showToast(
                            `회의록 ${summary.totalLoaded}건 로드 완료 (전체 ${summary.totalAvailable}건 중)`,
                            'success'
                        );
                        console.log('[DataMapView] Meeting issues loaded:', summary);

                        // 캐시 새로고침 (스토어 데이터 반영)
                        this.refreshCache();

                        // 타임라인 및 히스토리 데이터 생성
                        this.updateTimelineData(result.issues);

                        // 반응성 트리거 (마지막에 설정)
                        this.loadedCount = this._cachedIssues.length;
                    } else {
                        this.showError('회의록 로드 실패: ' + result.error);
                    }

                } catch (err) {
                    console.error('[DataMapView] Load meeting issues error:', err);
                    this.showError('회의록 로드 중 오류: ' + err.message);
                } finally {
                    this.isLoading = false;
                }
            },

            /**
             * 전체 이슈 히스토리 로드
             */
            async loadAllHistory() {
                await this.loadMeetingIssues({
                    maxIssues: 5000,      // 5000개까지 로드
                    recentOnly: false     // 전체 기간
                });
            },

            /**
             * 타임라인 데이터 업데이트
             */
            updateTimelineData(issues) {
                if (!window.MeetingIssuesImport) return;

                this.timelineData = window.MeetingIssuesImport.getTimeline(issues);
                this.categoryHistory = window.MeetingIssuesImport.getHistoryByCategory(issues);

                console.log('[DataMapView] Timeline data updated:', {
                    meetings: this.timelineData.length,
                    categories: this.categoryHistory.length
                });
            },

            /**
             * 회의 날짜 포맷
             */
            formatMeetingDate(dateStr) {
                if (!window.MeetingIssuesImport) return dateStr;
                return window.MeetingIssuesImport.formatMeetingDate(dateStr);
            },

            // === 유틸리티 ===

            /**
             * 에러 표시
             */
            showError(message) {
                this.error = message;
                setTimeout(() => { this.error = null; }, 5000);
            },

            /**
             * 토스트 메시지 (부모 컴포넌트 연동)
             */
            showToast(message, type = 'info') {
                // 부모 Alpine 컴포넌트의 showToast 사용
                if (this.$root?.showToast) {
                    this.$root.showToast(message, type);
                } else {
                    console.log(`[Toast/${type}]`, message);
                }
            },

            /**
             * 심각도 색상
             */
            getSeverityColor(severity) {
                const colors = {
                    'Critical': '#EF4444',
                    'High': '#F59E0B',
                    'Medium': '#3B82F6',
                    'Low': '#10B981'
                };
                return colors[severity] || '#6B7280';
            },

            /**
             * 상태 아이콘
             */
            getStatusIcon(status) {
                const icons = {
                    'Completed': '✅',
                    'In Progress': '🔄',
                    'On Hold': '⏸️',
                    'Delayed': '⚠️',
                    'Open': '📋'
                };
                return icons[status] || '❓';
            },

            /**
             * 날짜 포맷
             */
            formatDate(date) {
                if (!date) return '-';
                const d = date instanceof Date ? date : new Date(date);
                if (isNaN(d.getTime())) return '-';
                return d.toLocaleDateString('ko-KR');
            },

            /**
             * 숫자 포맷
             */
            formatNumber(num) {
                return (num || 0).toLocaleString();
            }
        };
    }

    // Alpine.js 컴포넌트 등록
    function registerComponent() {
        if (typeof Alpine !== 'undefined' && typeof Alpine.data === 'function') {
            Alpine.data('dataMapView', createDataMapComponent);
            console.log('[DataMapView] Component registered');
            return true;
        }
        return false;
    }

    // 등록 시도
    if (!registerComponent()) {
        // Alpine이 아직 로드되지 않음 - alpine:init 이벤트 사용
        document.addEventListener('alpine:init', () => {
            Alpine.data('dataMapView', createDataMapComponent);
            console.log('[DataMapView] Component registered (via alpine:init)');
        });
    }

    // 전역 노출 (디버깅용)
    window.DataMapViewFactory = createDataMapComponent;
    window.DataMapView = { createComponent: createDataMapComponent };

})();

console.log('[DataMapView] Module loaded');
