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

            // 필터
            filters: {
                floor: '',
                zone: '',
                type: '',
                severity: '',
                status: '',
                source: ''
            },

            // 선택
            selectedIssue: null,
            selectedCluster: null,
            highlightedIssueIds: [],

            // 검색
            searchQuery: '',

            // 파일 업로드
            dragActive: false,

            // 그리드 설정
            gridConfig: {
                rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
                columns: 69,
                cellWidth: 28,
                cellHeight: 28
            },

            // === 계산된 속성 ===

            get store() {
                return Alpine.store('unifiedData') || { issues: [], clusters: [], stats: {} };
            },

            get filteredIssues() {
                let issues = this.store.issues || [];

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

                return issues;
            },

            get filteredClusters() {
                const clusters = this.store.clusters || [];
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
                return this.store.stats || {};
            },

            get issueTypes() {
                return Object.keys(this.stats.byType || {}).sort();
            },

            get floors() {
                return Object.keys(this.stats.byFloor || {}).sort();
            },

            get zones() {
                return ['A', 'B', 'C'];
            },

            get sources() {
                return Object.keys(this.stats.bySource || {}).sort();
            },

            // === 초기화 ===

            init() {
                console.log('[DataMapView] Initializing...');

                // 스토어 초기화 확인
                if (this.store.init && typeof this.store.init === 'function') {
                    this.store.init();
                }

                // 키보드 단축키
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.clearSelection();
                    }
                });

                console.log('[DataMapView] Initialized');
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
                        this.store.addIssues(result.issues, 'file_import');
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
                this.selectedCluster = this.store.getClusterByIssue?.(issue.id) || null;

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
                if (!this.store.findRelated) {
                    return;
                }

                const related = await this.store.findRelated(issueId);
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
                    source: ''
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
                if (this.store.updateClusters) {
                    this.isLoading = true;
                    setTimeout(() => {
                        this.store.updateClusters();
                        this.isLoading = false;
                        this.showToast('클러스터 재계산 완료', 'success');
                    }, 100);
                }
            },

            /**
             * 데이터 내보내기 (JSON)
             */
            exportJSON() {
                if (this.store.toJSON) {
                    const json = this.store.toJSON();
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
                    if (this.store.clearAll) {
                        this.store.clearAll();
                        this.clearSelection();
                        this.showToast('데이터 초기화 완료', 'info');
                    }
                }
            },

            /**
             * 메인 그리드와 동기화
             */
            syncToMainGrid() {
                if (this.store.syncToMainIssues) {
                    this.store.syncToMainIssues();
                    this.showToast('메인 그리드와 동기화 완료', 'success');
                }
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
        if (typeof Alpine !== 'undefined') {
            Alpine.data('dataMapView', createDataMapComponent);
            console.log('[DataMapView] Component registered');
        } else {
            document.addEventListener('alpine:init', () => {
                Alpine.data('dataMapView', createDataMapComponent);
                console.log('[DataMapView] Component registered (deferred)');
            });
        }
    }

    // 등록
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerComponent);
    } else {
        registerComponent();
    }

    // 전역 노출
    window.DataMapViewFactory = createDataMapComponent;

})();

console.log('[DataMapView] Module loaded');
