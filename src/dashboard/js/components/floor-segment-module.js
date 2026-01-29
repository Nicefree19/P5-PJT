/**
 * Floor & Segment Module - 층/구간 관리
 * index.html dashboard()에 mixin-spread 패턴으로 통합
 *
 * @module FloorSegmentModule
 * @version 2.5.0
 */
(function() {
    'use strict';

    window.FloorSegmentModule = {

        initFloorJeoljuData() {
            this.floors = [
                { floorId: 'F1', label: '1F (기초)', order: 1, level: 0.3, hasVariation: false },
                { floorId: 'F2', label: '2F', order: 2, level: 7.8, hasVariation: false },
                { floorId: 'F3', label: '3F', order: 3, level: 14.3, hasVariation: false },
                { floorId: 'F4', label: '4F', order: 4, level: 21.3, hasVariation: false },
                { floorId: 'F5', label: '5F', order: 5, level: 28.3, hasVariation: false },
                { floorId: 'F6', label: '6F', order: 6, level: 35.3, hasVariation: false },
                { floorId: 'F7', label: '7F', order: 7, level: 42.3, hasVariation: false },
                { floorId: 'F8', label: '8F', order: 8, level: 49.3, hasVariation: false },
                { floorId: 'F9', label: '9F', order: 9, level: 56.3, hasVariation: false },
                { floorId: 'F10', label: '10F', order: 10, level: 63.3, hasVariation: false },
                { floorId: 'RF', label: 'RF (지붕)', order: 11, level: 99.4, hasVariation: true, variationNote: '지붕층' }
            ];

            this.jeoljuConfig = [
                { jeoljuId: '1절주', label: '1절주', floors: ['F1', 'F2'], heightRange: '0.3m ~ 7.8m', length: 7.5, columnSize: '1600x1600', description: '1절주 (1~2F)' },
                { jeoljuId: '2절주', label: '2절주', floors: ['F3'], heightRange: '14.3m', length: 6.5, columnSize: '1600x1600', description: '2절주 (3F)' },
                { jeoljuId: '3절주', label: '3절주', floors: ['F4'], heightRange: '21.3m', length: 7.0, columnSize: '1500x1500', description: '3절주 (4F)' },
                { jeoljuId: '4절주', label: '4절주', floors: ['F5'], heightRange: '28.3m', length: 7.0, columnSize: '1500x1500', description: '4절주 (5F)' },
                { jeoljuId: '5절주', label: '5절주', floors: ['F6', 'F7'], heightRange: '35.3m ~ 42.3m', length: 7.0, columnSize: '1300x1300', description: '5절주 (6~7F)' },
                { jeoljuId: '6절주', label: '6절주', floors: ['F8'], heightRange: '49.3m', length: 7.0, columnSize: '1300x1300', description: '6절주 (8F)' },
                { jeoljuId: '7절주', label: '7절주', floors: ['F9'], heightRange: '56.3m', length: 7.0, columnSize: '1300x1300', description: '7절주 (9F)' },
                { jeoljuId: '8절주', label: '8절주', floors: ['F10', 'RF'], heightRange: '63.3m ~ 99.4m', length: 36.1, columnSize: '1200x1200', description: '8절주 (10F~RF)' }
            ];

            this.columnSegments = [
                { segmentId: 'S1', label: '1구간', startColumn: 1, endColumn: 9, columnCount: 9, priority: 1 },
                { segmentId: 'S2', label: '2구간', startColumn: 10, endColumn: 18, columnCount: 9, priority: 2 },
                { segmentId: 'S3', label: '3구간', startColumn: 19, endColumn: 27, columnCount: 9, priority: 3 },
                { segmentId: 'S4', label: '4구간', startColumn: 28, endColumn: 36, columnCount: 9, priority: 4 },
                { segmentId: 'S5', label: '5구간', startColumn: 37, endColumn: 45, columnCount: 9, priority: 5 },
                { segmentId: 'S6', label: '6구간', startColumn: 46, endColumn: 54, columnCount: 9, priority: 6 },
                { segmentId: 'S7', label: '7구간', startColumn: 55, endColumn: 62, columnCount: 8, priority: 7 },
                { segmentId: 'S8', label: '8구간', startColumn: 63, endColumn: 69, columnCount: 7, priority: 8 }
            ];

            this.segmentList = this.columnSegments;

            console.log('[Phase 7] Floor-Segment data initialized:', this.floors.length, 'floors,', this.jeoljuConfig.length, 'jeolju(수직/8절주),', this.columnSegments.length, 'segments(수평)');

            this.floorStats = {};
            this.floors.forEach(f => {
                this.floorStats[f.floorId] = { progress: 0, columnCount: 0, issueCount: 0 };
            });

            if (this.syncEnabled && this.apiUrl) {
                this.loadAllFloorStats();
            }
        },

        async loadAllFloorStats() {
            try {
                const apiUrl = this.apiUrl || this.apiBase;
                if (!apiUrl) return;

                const response = await fetch(`${apiUrl}?action=getFloorStats`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const result = await response.json();
                if (result.success && result.floors) {
                    this.floorStats = result.floors;
                    console.log('[Phase 9] Floor stats loaded:', Object.keys(this.floorStats).length, 'floors');
                }
            } catch (error) {
                console.warn('[Phase 9] Floor stats load failed (using defaults):', error.message);
            }
        },

        normalizeFloorId(id) {
            if (!id || id === 'RF') return id;
            const nfMatch = id.match(/^(\d+)F$/);
            if (nfMatch) return `F${nfMatch[1]}`;
            const f0Match = id.match(/^F0(\d)$/);
            if (f0Match) return `F${f0Match[1]}`;
            return id;
        },

        toApiFloorId(id) {
            if (!id || id === 'RF') return id;
            const m = id.match(/^F(\d)$/);
            return m ? `F0${m[1]}` : id;
        },

        selectFloor(floorId) {
            const previousFloor = this.selectedFloor;
            this.selectedFloor = floorId;
            this.floorSelectorOpen = false;
            console.log('[Phase 7] Floor selected:', floorId);

            if (typeof Alpine !== 'undefined') {
                Alpine.store('structure')?.setFloor?.(floorId);
            }

            if (previousFloor !== floorId) {
                this.loadFloorData(floorId);
            }
        },

        async loadFloorData(floorId) {
            console.log('[Phase 7] Loading floor data:', floorId);
            this.showLoading(`${floorId} 층 데이터 로딩 중...`);

            try {
                this.showNotification('층 데이터 로딩',
                    `${floorId} 층 데이터를 불러오는 중...`,
                    'info', { duration: 2000 });

                const apiUrl = this.apiUrl || this.apiBase;
                if (!apiUrl) {
                    throw new Error('API URL not configured');
                }

                const apiFloorId = this.toApiFloorId(floorId);
                const response = await fetch(`${apiUrl}?action=getFloorData&floorId=${apiFloorId}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    console.log('[Phase 7] Floor data loaded:', {
                        floor: result.floor,
                        columnCount: result.columnCount,
                        issueCount: result.issueCount
                    });

                    if (result.columns) {
                        this.columns = result.columns;
                        console.log(`[Phase 7] Columns updated: ${Object.keys(this.columns).length} columns`);
                    }

                    const segmentStats = result.stats?.bySegment || result.stats?.byJeolju;
                    if (segmentStats) {
                        this.segmentList = this.segmentList.map(s => {
                            const stats = segmentStats[s.segmentId];
                            if (stats) {
                                return {
                                    ...s,
                                    issueCount: stats.hold || 0,
                                    total: stats.total || 0,
                                    pending: stats.pending || 0,
                                    active: stats.active || 0,
                                    installed: stats.installed || 0
                                };
                            }
                            return s;
                        });
                    }

                    if (result.issues) {
                        this.issues = result.issues;
                        console.log(`[Phase 7] Issues updated: ${this.issues.length} issues`);
                    }

                    this.updateGridData();

                    this.showNotification('층 데이터 로드 완료',
                        `${result.floor?.label || floorId}: ${result.columnCount || 0}개 기둥, ${result.issueCount || 0}개 이슈`,
                        'success', { duration: 3000 });

                    this.lastFloorLoad = {
                        floorId,
                        timestamp: result.timestamp,
                        columnCount: result.columnCount
                    };

                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (error) {
                console.warn('[Phase 7] Floor data load error (using local data):', error.message);

                this.showNotification('층 데이터 로드 실패',
                    `${floorId}: ${error.message}. 로컬 데이터 사용 중.`,
                    'warning', { duration: 5000 });
            } finally {
                this.hideLoading();
            }
        },

        updateGridData() {
            this.grid = this.rowLabels.map((rowLabel, rowIndex) => {
                const cells = [];
                for (let col = 1; col <= this.gridConfig.cols; col++) {
                    const simpleUid = `${rowLabel}-X${col}`;
                    const floorUid = `${this.selectedFloor}-${rowLabel}-X${col}`;

                    const column = this.columns[floorUid] || this.columns[simpleUid];

                    cells.push({
                        row: rowIndex,
                        col: col,
                        uid: column?.uid || simpleUid,
                        status: column?.status?.code || 'pending',
                        stages: column?.stages || {},
                        issueId: column?.issueId || null,
                        isLocked: column?.status?.isLocked || false
                    });
                }
                return { label: rowLabel, cells };
            });

            console.log('[Phase 7+] Grid data updated:', this.grid.length, 'rows');
        },

        getElevationCellClass(floorId, segmentId) {
            const classes = [];

            if (this.selectedFloor === floorId && this.selectedSegment === segmentId) {
                classes.push('selected');
            }

            const progress = this.getFloorSegmentProgress(floorId, segmentId);
            if (progress >= 100) {
                classes.push('complete');
            } else if (progress > 0) {
                classes.push('in-progress');
            }

            const hasIssue = this.issues.some(issue =>
                issue.status === 'open' &&
                issue.affectedColumns?.some(uid => {
                    const segment = this.getSegmentForColumn(parseInt(uid.split('-X')[1]) || 1);
                    return segment?.segmentId === segmentId;
                })
            );
            if (hasIssue) {
                classes.push('has-issue');
            }

            return classes.join(' ');
        },

        selectFloorAndSegment(floorId, segmentId) {
            const previousFloor = this.selectedFloor;

            if (this.selectedFloor === floorId && this.selectedSegment === segmentId) {
                this.selectedSegment = null;
            } else {
                this.selectedFloor = floorId;
                this.selectedSegment = segmentId;
            }

            if (previousFloor !== floorId) {
                if (typeof Alpine !== 'undefined') {
                    Alpine.store('structure')?.setFloor?.(floorId);
                }
                this.loadFloorData(floorId);
            }

            const floorLabel = this.floors.find(f => f.floorId === floorId)?.label || floorId;
            const segmentLabel = this.segmentList.find(s => s.segmentId === segmentId)?.label || segmentId;
            this.showToast(`${floorLabel} / ${segmentLabel} 선택됨`, 'info');
        },

        getFloorSegmentProgress(floorId, segmentId) {
            if (this.selectedFloor === floorId && this.columns) {
                const segment = this.segmentList.find(s => s.segmentId === segmentId);
                if (!segment) return 0;

                let total = 0, installed = 0;

                Object.values(this.columns).forEach(col => {
                    const colNum = parseInt(col.location?.column) || 0;
                    if (colNum >= segment.startColumn && colNum <= segment.endColumn) {
                        total++;
                        if (col.status?.code === 'installed') {
                            installed++;
                        }
                    }
                });

                return total > 0 ? Math.round((installed / total) * 100) : 0;
            }

            if (this.floorStats && this.floorStats[floorId]) {
                return this.floorStats[floorId].progress || 0;
            }

            return 0;
        },

        filterBySegment(segmentId) {
            if (this.selectedSegment === segmentId) {
                this.selectedSegment = null;
                this.showToast('구간 필터 해제', 'info');
            } else {
                this.selectedSegment = segmentId;
                const segment = this.segmentList.find(s => s.segmentId === segmentId);
                this.showToast(`${segment?.label || segmentId} 필터 적용`, 'info');
            }
        },

        getSegmentForColumn(colNum) {
            return this.segmentList.find(s => colNum >= s.startColumn && s.endColumn >= colNum);
        },

        navigateFloor(direction) {
            if (!this.floors || this.floors.length === 0) return;

            const currentIndex = this.floors.findIndex(f => f.floorId === this.selectedFloor);
            if (currentIndex === -1) return;

            const newIndex = Math.max(0, Math.min(this.floors.length - 1, currentIndex + direction));
            if (newIndex !== currentIndex) {
                this.selectFloor(this.floors[newIndex].floorId);
                this.showToast(`${this.floors[newIndex].label} 선택됨`, 'info');
            }
        },

        cycleSegmentFilter() {
            if (!this.segmentList || this.segmentList.length === 0) return;

            if (!this.selectedSegment) {
                this.selectedSegment = this.segmentList[0].segmentId;
            } else {
                const currentIndex = this.segmentList.findIndex(s => s.segmentId === this.selectedSegment);
                if (currentIndex === this.segmentList.length - 1) {
                    this.selectedSegment = null;
                    this.showToast('구간 필터 해제', 'info');
                    return;
                } else {
                    this.selectedSegment = this.segmentList[currentIndex + 1].segmentId;
                }
            }

            const segment = this.segmentList.find(s => s.segmentId === this.selectedSegment);
            if (segment) {
                this.showToast(`${segment.label} 필터 적용`, 'info');
            }
        },

        isInSelectedSegment(columnNumber) {
            if (!this.selectedSegment) return true;
            const segment = this.segmentList.find(s => s.segmentId === this.selectedSegment);
            if (!segment) return true;
            return columnNumber >= segment.startColumn && columnNumber <= segment.endColumn;
        },

        getSegmentIssueCount(segmentId) {
            if (!segmentId) return 0;
            const segment = this.segmentList.find(s => s.segmentId === segmentId);
            if (!segment) return 0;

            return this.issues.filter(issue => {
                if (issue.status === 'resolved') return false;
                const affected = issue.affectedColumns || [];
                return affected.some(uid => {
                    const match = uid.match(/X(\d+)/);
                    if (!match) return false;
                    const colNum = parseInt(match[1]);
                    return colNum >= segment.startColumn && colNum <= segment.endColumn;
                });
            }).length;
        },

        getSegmentProgressPercent(segmentId) {
            if (!segmentId) return 0;
            const segment = this.segmentList.find(s => s.segmentId === segmentId);
            if (!segment) return 0;

            let total = 0;
            let completed = 0;

            Object.values(this.columns).forEach(col => {
                const colNum = col.location?.column;
                if (colNum >= segment.startColumn && colNum <= segment.endColumn) {
                    total++;
                    const lastStage = col.stages?.embed || col.stages?.form;
                    if (lastStage === 'installed') {
                        completed++;
                    } else if (col.status?.code === 'installed') {
                        completed++;
                    }
                }
            });

            return total > 0 ? Math.round((completed / total) * 100) : 0;
        },

        getSelectedSegmentLabel() {
            if (!this.selectedSegment) return '';
            const segment = this.segmentList.find(s => s.segmentId === this.selectedSegment);
            return segment ? `${segment.label} (X${segment.startColumn}~X${segment.endColumn})` : '';
        },

        getSegmentColumnCount(segmentId) {
            if (!segmentId) return 0;
            const segment = this.segmentList.find(s => s.segmentId === segmentId);
            if (!segment) return 0;

            let count = 0;
            Object.values(this.columns).forEach(col => {
                const colNum = col.location?.column;
                if (colNum >= segment.startColumn && colNum <= segment.endColumn) {
                    count++;
                }
            });
            return count;
        }
    };
})();
