/**
 * P5 Dashboard - KPI Functions
 * 대시보드 상단 KPI 카드 및 우선 액션 리스트 관련 함수들
 */

// KPI 관련 함수들을 window 객체에 추가하여 Alpine.js에서 사용 가능하게 함
window.KPIFunctions = {
    
    /**
     * 긴급도별 이슈 개수 조회
     * @param {string} severity - critical, high, medium, low
     * @returns {number} 해당 긴급도의 이슈 개수
     */
    getIssueCount(issues, severity) {
        if (!issues || !Array.isArray(issues)) return 0;
        return issues.filter(issue => 
            issue.severity?.toLowerCase() === severity.toLowerCase()
        ).length;
    },

    /**
     * 전체 완료율 계산
     * @param {Object} columns - 기둥 데이터 객체
     * @returns {number} 완료율 (0-100)
     */
    getCompletionRate(columns) {
        if (!columns || Object.keys(columns).length === 0) return 0;
        const total = Object.keys(columns).length;
        const completed = Object.values(columns).filter(col => 
            col.status === 'completed' || 
            col.status === 'done' ||
            col.status === 'ok' ||
            col.statusCode === 'ok'
        ).length;
        return Math.round((completed / total) * 100);
    },

    /**
     * 지연된 이슈 개수 계산
     * @param {Array} issues - 이슈 배열
     * @returns {number} 지연된 이슈 개수
     */
    getDelayedCount(issues) {
        if (!issues || !Array.isArray(issues)) return 0;
        const now = new Date();
        return issues.filter(issue => {
            if (!issue.dueDate || issue.status === 'resolved') return false;
            const dueDate = new Date(issue.dueDate);
            return dueDate < now;
        }).length;
    },

    /**
     * 우선순위 이슈 목록 (Critical + High)
     * @param {Array} issues - 이슈 배열
     * @returns {Array} 우선순위 이슈 배열
     */
    getPriorityIssues(issues) {
        if (!issues || !Array.isArray(issues)) return [];
        return issues
            .filter(issue => 
                issue.severity?.toLowerCase() === 'critical' || 
                issue.severity?.toLowerCase() === 'high'
            )
            .sort((a, b) => {
                // Critical이 High보다 우선
                if (a.severity !== b.severity) {
                    return a.severity?.toLowerCase() === 'critical' ? -1 : 1;
                }
                // 같은 우선순위면 최신순
                return new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0);
            });
    },

    /**
     * 상대 시간 포맷팅 (N분 전, N시간 전)
     * @param {string|Date} dateString - 날짜 문자열 또는 Date 객체
     * @returns {string} 포맷된 상대 시간
     */
    formatTimeAgo(dateString) {
        if (!dateString) return '시간 미상';
        const now = new Date();
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '시간 미상';
        
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        return `${diffDays}일 전`;
    },

    /**
     * KPI 카드 클릭 시 필터링
     * @param {string} severity - 필터링할 긴급도
     */
    filterBySeverity(severity, dashboardContext) {
        if (!dashboardContext) return;
        
        // 해당 긴급도의 이슈들 찾기
        const filteredIssues = dashboardContext.issues.filter(issue =>
            issue.severity?.toLowerCase() === severity.toLowerCase()
        );
        
        // 관련 기둥들 선택
        const affectedColumns = [];
        filteredIssues.forEach(issue => {
            if (issue.affectedColumns) {
                affectedColumns.push(...issue.affectedColumns);
            }
        });
        
        dashboardContext.selectedCells = [...new Set(affectedColumns)];
        dashboardContext.showToast(`${severity.toUpperCase()} 이슈 ${filteredIssues.length}건 필터링됨`, 'info');
    },

    /**
     * 이슈 선택 및 하이라이트
     * @param {Object} issue - 선택할 이슈 객체
     */
    selectIssue(issue, dashboardContext) {
        if (!dashboardContext || !issue) return;
        
        // 해당 이슈와 관련된 기둥들 하이라이트
        if (issue.affectedColumns && Array.isArray(issue.affectedColumns)) {
            dashboardContext.selectedCells = [...issue.affectedColumns];
        }
        
        // 이슈 상세 정보 설정
        dashboardContext.selectedIssue = issue;
        dashboardContext.detailPanelOpen = true;
        
        // 해당 위치로 스크롤 (기둥 UID가 있는 경우)
        if (issue.location || (issue.affectedColumns && issue.affectedColumns.length > 0)) {
            const targetColumn = issue.location || issue.affectedColumns[0];
            dashboardContext.searchAndHighlight(targetColumn);
        }
        
        dashboardContext.showToast(`이슈 선택: ${issue.title || '제목 없음'}`, 'info');
    },

    /**
     * 완료율 상세 정보 표시
     */
    showProgressDetail(dashboardContext) {
        if (!dashboardContext) return;
        
        const total = Object.keys(dashboardContext.columns).length;
        const completed = Object.values(dashboardContext.columns).filter(col => 
            col.status === 'completed' || col.status === 'done' || col.status === 'ok'
        ).length;
        const inProgress = Object.values(dashboardContext.columns).filter(col => 
            col.status === 'in_progress' || col.status === 'active'
        ).length;
        
        const message = `전체 ${total}개 기둥 중 완료 ${completed}개 (${Math.round(completed/total*100)}%), 진행중 ${inProgress}개`;
        dashboardContext.showToast(message, 'info');
    },

    /**
     * 지연된 이슈들 필터링
     */
    filterDelayedIssues(dashboardContext) {
        if (!dashboardContext) return;
        
        const delayedIssues = dashboardContext.issues.filter(issue => {
            if (!issue.dueDate || issue.status === 'resolved') return false;
            const dueDate = new Date(issue.dueDate);
            return dueDate < new Date();
        });
        
        // 지연된 이슈와 관련된 기둥들 선택
        const affectedColumns = [];
        delayedIssues.forEach(issue => {
            if (issue.affectedColumns) {
                affectedColumns.push(...issue.affectedColumns);
            }
        });
        
        dashboardContext.selectedCells = [...new Set(affectedColumns)];
        dashboardContext.showToast(`지연 이슈 ${delayedIssues.length}건 필터링됨`, 'warning');
    },

    /**
     * 모든 우선순위 이슈 표시
     */
    showAllPriorityIssues(dashboardContext) {
        if (!dashboardContext) return;
        
        // 이슈 패널 열기 및 우선순위 필터 적용
        dashboardContext.showIssuePanel = true;
        dashboardContext.issueFilter = 'priority'; // 우선순위 필터
        dashboardContext.showToast('모든 우선순위 이슈를 표시합니다', 'info');
    }
};

// Alpine.js에서 사용할 수 있도록 전역 함수로 등록
window.getIssueCount = function(severity) {
    const dashboardData = Alpine.$data(document.body);
    return KPIFunctions.getIssueCount(dashboardData.issues, severity);
};

window.getCompletionRate = function() {
    const dashboardData = Alpine.$data(document.body);
    return KPIFunctions.getCompletionRate(dashboardData.columns);
};

window.getDelayedCount = function() {
    const dashboardData = Alpine.$data(document.body);
    return KPIFunctions.getDelayedCount(dashboardData.issues);
};

window.getPriorityIssues = function() {
    const dashboardData = Alpine.$data(document.body);
    return KPIFunctions.getPriorityIssues(dashboardData.issues);
};

window.formatTimeAgo = function(dateString) {
    return KPIFunctions.formatTimeAgo(dateString);
};

window.filterBySeverity = function(severity) {
    const dashboardData = Alpine.$data(document.body);
    KPIFunctions.filterBySeverity(severity, dashboardData);
};

window.selectIssue = function(issue) {
    const dashboardData = Alpine.$data(document.body);
    KPIFunctions.selectIssue(issue, dashboardData);
};

window.showProgressDetail = function() {
    const dashboardData = Alpine.$data(document.body);
    KPIFunctions.showProgressDetail(dashboardData);
};

window.filterDelayedIssues = function() {
    const dashboardData = Alpine.$data(document.body);
    KPIFunctions.filterDelayedIssues(dashboardData);
};

window.showAllPriorityIssues = function() {
    const dashboardData = Alpine.$data(document.body);
    KPIFunctions.showAllPriorityIssues(dashboardData);
};

/**
 * Quick Filter Functions
 * 빠른 필터 기능 구현
 */
window.QuickFilterFunctions = {
    
    /**
     * 빠른 필터 적용
     * @param {string} filterType - 필터 타입 (today, my, urgent, zone-a, incomplete)
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    applyQuickFilter(filterType, dashboardContext) {
        if (!dashboardContext) return;
        
        let filteredColumns = [];
        let message = '';
        
        switch (filterType) {
            case 'today':
                // 오늘 발생한 이슈가 있는 기둥들
                const today = new Date().toDateString();
                const todayIssues = dashboardContext.issues.filter(issue => 
                    new Date(issue.createdAt || issue.timestamp || 0).toDateString() === today
                );
                todayIssues.forEach(issue => {
                    if (issue.affectedColumns) {
                        filteredColumns.push(...issue.affectedColumns);
                    }
                });
                message = `오늘 발생한 이슈 ${todayIssues.length}건 관련 기둥 필터링`;
                break;
                
            case 'my':
                // 내 담당 기둥들 (예시: 사용자별 담당 구역)
                // 실제 구현에서는 사용자 정보를 기반으로 필터링
                filteredColumns = Object.keys(dashboardContext.columns).filter(columnId => {
                    const column = dashboardContext.columns[columnId];
                    return column.assignee === dashboardContext.currentUser || 
                           column.zone === dashboardContext.userZone;
                });
                message = `내 담당 기둥 ${filteredColumns.length}개 필터링`;
                break;
                
            case 'urgent':
                // Critical + High 이슈가 있는 기둥들
                const urgentIssues = dashboardContext.issues.filter(issue => 
                    issue.severity?.toLowerCase() === 'critical' || 
                    issue.severity?.toLowerCase() === 'high'
                );
                urgentIssues.forEach(issue => {
                    if (issue.affectedColumns) {
                        filteredColumns.push(...issue.affectedColumns);
                    }
                });
                message = `긴급 이슈 ${urgentIssues.length}건 관련 기둥 필터링`;
                break;
                
            case 'zone-a':
                // Zone A 기둥들
                filteredColumns = Object.keys(dashboardContext.columns).filter(columnId => {
                    const column = dashboardContext.columns[columnId];
                    return column.zone === 'A' || columnId.startsWith('A-');
                });
                message = `Zone A 기둥 ${filteredColumns.length}개 필터링`;
                break;
                
            case 'incomplete':
                // 미완료 기둥들
                filteredColumns = Object.keys(dashboardContext.columns).filter(columnId => {
                    const column = dashboardContext.columns[columnId];
                    return column.status !== 'completed' && 
                           column.status !== 'done' && 
                           column.status !== 'ok';
                });
                message = `미완료 기둥 ${filteredColumns.length}개 필터링`;
                break;
        }
        
        // 중복 제거
        filteredColumns = [...new Set(filteredColumns)];
        
        // 필터 적용
        dashboardContext.selectedCells = filteredColumns;
        dashboardContext.quickFilter = filterType;
        
        // 토스트 메시지 표시
        dashboardContext.showToast(message, 'info');
        
        // 첫 번째 결과로 스크롤 (있는 경우)
        if (filteredColumns.length > 0) {
            dashboardContext.searchAndHighlight(filteredColumns[0]);
        }
    },
    
    /**
     * 빠른 필터 해제
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    clearQuickFilter(dashboardContext) {
        if (!dashboardContext) return;
        
        dashboardContext.selectedCells = [];
        dashboardContext.quickFilter = null;
        dashboardContext.showToast('필터가 해제되었습니다', 'info');
    }
};

// Alpine.js에서 사용할 수 있도록 전역 함수로 등록
window.applyQuickFilter = function(filterType) {
    const dashboardData = Alpine.$data(document.body);
    QuickFilterFunctions.applyQuickFilter(filterType, dashboardData);
};

window.clearQuickFilter = function() {
    const dashboardData = Alpine.$data(document.body);
    QuickFilterFunctions.clearQuickFilter(dashboardData);
};/**

 * Zone Functions
 * Zone별 상세 정보 및 상호작용 함수들
 */
window.ZoneFunctions = {
    
    /**
     * Zone별 완료된 기둥 수 계산
     * @param {string} zoneId - Zone ID
     * @param {Object} columns - 기둥 데이터
     * @param {Array} zones - Zone 설정
     * @returns {number} 완료된 기둥 수
     */
    getZoneCompletedCount(zoneId, columns, zones) {
        if (!columns || !zones) return 0;
        
        const zone = zones.find(z => z.id === zoneId);
        if (!zone) return 0;
        
        return Object.values(columns).filter(column => {
            const isInZone = this.isColumnInZone(column, zone);
            const isCompleted = column.status === 'completed' || 
                              column.status === 'done' || 
                              column.status === 'ok' ||
                              column.statusCode === 'ok';
            return isInZone && isCompleted;
        }).length;
    },
    
    /**
     * Zone별 진행중인 기둥 수 계산
     * @param {string} zoneId - Zone ID
     * @param {Object} columns - 기둥 데이터
     * @param {Array} zones - Zone 설정
     * @returns {number} 진행중인 기둥 수
     */
    getZoneInProgressCount(zoneId, columns, zones) {
        if (!columns || !zones) return 0;
        
        const zone = zones.find(z => z.id === zoneId);
        if (!zone) return 0;
        
        return Object.values(columns).filter(column => {
            const isInZone = this.isColumnInZone(column, zone);
            const isInProgress = column.status === 'in_progress' || 
                                column.status === 'active' ||
                                column.status === 'working';
            return isInZone && isInProgress;
        }).length;
    },
    
    /**
     * Zone별 이슈 수 계산
     * @param {string} zoneId - Zone ID
     * @param {Array} issues - 이슈 배열
     * @param {Array} zones - Zone 설정
     * @returns {number} Zone 내 이슈 수
     */
    getZoneIssueCount(zoneId, issues, zones) {
        if (!issues || !zones) return 0;
        
        const zone = zones.find(z => z.id === zoneId);
        if (!zone) return 0;
        
        return issues.filter(issue => {
            if (!issue.affectedColumns) return false;
            
            return issue.affectedColumns.some(columnId => {
                // Zone 범위 내 기둥인지 확인
                const match = columnId.match(/([A-Z]+)-?(\d+)/);
                if (!match) return false;
                
                const row = match[1];
                const col = parseInt(match[2]);
                
                const startCol = zone.range?.startColumn || zone.startColumn || 1;
                const endCol = zone.range?.endColumn || zone.endColumn || 10;
                
                return col >= startCol && col <= endCol;
            });
        }).length;
    },
    
    /**
     * 기둥이 특정 Zone에 속하는지 확인
     * @param {Object} column - 기둥 객체
     * @param {Object} zone - Zone 객체
     * @returns {boolean} Zone 포함 여부
     */
    isColumnInZone(column, zone) {
        if (!column || !zone) return false;
        
        // Zone ID로 직접 매칭
        if (column.zone === zone.id || column.zoneId === zone.id) {
            return true;
        }
        
        // 기둥 ID로 Zone 범위 확인
        const columnId = column.id || column.uid;
        if (!columnId) return false;
        
        const match = columnId.match(/([A-Z]+)-?(\d+)/);
        if (!match) return false;
        
        const row = match[1];
        const col = parseInt(match[2]);
        
        const startCol = zone.range?.startColumn || zone.startColumn || 1;
        const endCol = zone.range?.endColumn || zone.endColumn || 10;
        
        return col >= startCol && col <= endCol;
    },
    
    /**
     * Zone 선택 및 필터링
     * @param {string} zoneId - 선택할 Zone ID
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    selectZone(zoneId, dashboardContext) {
        if (!dashboardContext) return;
        
        const zone = dashboardContext.zones.find(z => z.id === zoneId);
        if (!zone) return;
        
        // Zone 내 모든 기둥 선택
        const zoneColumns = Object.keys(dashboardContext.columns).filter(columnId => {
            const column = dashboardContext.columns[columnId];
            return this.isColumnInZone(column, zone) || columnId.includes(zone.name);
        });
        
        dashboardContext.selectedCells = zoneColumns;
        dashboardContext.selectedZone = zoneId;
        
        // Zone 정보 토스트
        const completedCount = this.getZoneCompletedCount(zoneId, dashboardContext.columns, dashboardContext.zones);
        const totalCount = zoneColumns.length;
        const progressRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        dashboardContext.showToast(
            `${zone.name} 선택: ${totalCount}개 기둥, 완료율 ${progressRate}%`, 
            'info'
        );
        
        // 첫 번째 기둥으로 스크롤
        if (zoneColumns.length > 0) {
            dashboardContext.searchAndHighlight(zoneColumns[0]);
        }
    }
};

// Alpine.js에서 사용할 수 있도록 전역 함수로 등록
window.getZoneCompletedCount = function(zoneId) {
    const dashboardData = Alpine.$data(document.body);
    return ZoneFunctions.getZoneCompletedCount(zoneId, dashboardData.columns, dashboardData.zones);
};

window.getZoneInProgressCount = function(zoneId) {
    const dashboardData = Alpine.$data(document.body);
    return ZoneFunctions.getZoneInProgressCount(zoneId, dashboardData.columns, dashboardData.zones);
};

window.getZoneIssueCount = function(zoneId) {
    const dashboardData = Alpine.$data(document.body);
    return ZoneFunctions.getZoneIssueCount(zoneId, dashboardData.issues, dashboardData.zones);
};

window.selectZone = function(zoneId) {
    const dashboardData = Alpine.$data(document.body);
    ZoneFunctions.selectZone(zoneId, dashboardData);
};/**

 * Trend Chart Functions
 * 진행률 트렌드 및 차트 관련 함수들
 */
window.TrendChartFunctions = {
    
    /**
     * 이슈 발생 트렌드 데이터 생성
     * @param {Array} issues - 이슈 배열
     * @param {string} period - 기간 (7d, 30d, 90d)
     * @returns {Array} 주별 이슈 트렌드 데이터
     */
    getIssueTrendData(issues, period = '30d') {
        if (!issues || !Array.isArray(issues)) return [];
        
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const weeks = Math.ceil(days / 7);
        const trendData = [];
        
        const now = new Date();
        
        for (let i = weeks - 1; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (i + 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            const weekIssues = issues.filter(issue => {
                const issueDate = new Date(issue.createdAt || issue.timestamp || 0);
                return issueDate >= weekStart && issueDate <= weekEnd;
            });
            
            const weekData = {
                label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
                critical: weekIssues.filter(issue => issue.severity?.toLowerCase() === 'critical').length,
                high: weekIssues.filter(issue => issue.severity?.toLowerCase() === 'high').length,
                medium: weekIssues.filter(issue => issue.severity?.toLowerCase() === 'medium').length,
                total: weekIssues.length
            };
            
            trendData.push(weekData);
        }
        
        return trendData;
    },
    
    /**
     * 진행률 트렌드 데이터 생성 (시뮬레이션)
     * @param {string} period - 기간
     * @returns {Array} 진행률 트렌드 데이터
     */
    getProgressTrendData(period = '30d') {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const dataPoints = Math.min(days, 30); // 최대 30개 데이터 포인트
        const trendData = [];
        
        const now = new Date();
        const currentProgress = 80; // 현재 진행률
        
        for (let i = dataPoints - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            
            // 시뮬레이션된 진행률 (점진적 증가)
            const baseProgress = Math.max(0, currentProgress - (i * 2));
            const randomVariation = (Math.random() - 0.5) * 4; // ±2% 변동
            const progress = Math.min(100, Math.max(0, baseProgress + randomVariation));
            
            trendData.push({
                date: date.toISOString().split('T')[0],
                progress: Math.round(progress * 10) / 10,
                label: `${date.getMonth() + 1}/${date.getDate()}`
            });
        }
        
        return trendData;
    },
    
    /**
     * Zone별 진행률 비교 데이터
     * @param {Array} zones - Zone 배열
     * @param {Object} columns - 기둥 데이터
     * @returns {Array} Zone별 진행률 데이터
     */
    getZoneComparisonData(zones, columns) {
        if (!zones || !columns) return [];
        
        return zones.map(zone => {
            const zoneColumns = Object.values(columns).filter(column => 
                ZoneFunctions.isColumnInZone(column, zone)
            );
            
            const totalCount = zoneColumns.length;
            const completedCount = zoneColumns.filter(column => 
                column.status === 'completed' || 
                column.status === 'done' || 
                column.status === 'ok'
            ).length;
            
            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            return {
                zoneId: zone.id,
                zoneName: zone.name,
                progress: progress,
                completed: completedCount,
                total: totalCount,
                color: zone.style?.primaryColor || zone.color || '#238636'
            };
        });
    },
    
    /**
     * 트렌드 차트 업데이트
     * @param {string} period - 기간
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    updateTrendChart(period, dashboardContext) {
        if (!dashboardContext) return;
        
        // 트렌드 데이터 업데이트
        dashboardContext.trendPeriod = period;
        dashboardContext.issueTrendData = this.getIssueTrendData(dashboardContext.issues, period);
        dashboardContext.progressTrendData = this.getProgressTrendData(period);
        dashboardContext.zoneComparisonData = this.getZoneComparisonData(dashboardContext.zones, dashboardContext.columns);
        
        // 차트 업데이트 알림
        dashboardContext.showToast(`${period} 트렌드 차트가 업데이트되었습니다`, 'info');
    },
    
    /**
     * 실시간 데이터 업데이트 시뮬레이션
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    simulateRealTimeUpdate(dashboardContext) {
        if (!dashboardContext) return;
        
        // 랜덤하게 새로운 이슈 생성 (시뮬레이션)
        if (Math.random() < 0.1) { // 10% 확률
            const severities = ['critical', 'high', 'medium'];
            const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
            const randomColumn = `A-${Math.floor(Math.random() * 30) + 1}`;
            
            const newIssue = {
                id: `issue_${Date.now()}`,
                title: `자동 감지된 ${randomSeverity} 이슈`,
                severity: randomSeverity,
                location: randomColumn,
                affectedColumns: [randomColumn],
                createdAt: new Date().toISOString(),
                status: 'open'
            };
            
            dashboardContext.issues.push(newIssue);
            
            // 알림 표시
            dashboardContext.showNotification({
                type: randomSeverity === 'critical' ? 'error' : 'warning',
                title: '새로운 이슈 감지',
                message: `${randomColumn}에서 ${randomSeverity} 이슈가 발생했습니다`,
                action: () => dashboardContext.selectIssue(newIssue)
            });
        }
        
        // 진행률 업데이트 (시뮬레이션)
        if (Math.random() < 0.05) { // 5% 확률
            const randomColumnId = Object.keys(dashboardContext.columns)[
                Math.floor(Math.random() * Object.keys(dashboardContext.columns).length)
            ];
            
            if (randomColumnId && dashboardContext.columns[randomColumnId]) {
                const column = dashboardContext.columns[randomColumnId];
                if (column.status !== 'completed') {
                    column.status = 'completed';
                    column.completedAt = new Date().toISOString();
                    
                    dashboardContext.showToast(`${randomColumnId} 기둥 작업이 완료되었습니다`, 'success');
                }
            }
        }
    }
};

// Alpine.js에서 사용할 수 있도록 전역 함수로 등록
window.getIssueTrendData = function() {
    const dashboardData = Alpine.$data(document.body);
    return TrendChartFunctions.getIssueTrendData(dashboardData.issues, dashboardData.trendPeriod || '30d');
};

window.updateTrendChart = function() {
    const dashboardData = Alpine.$data(document.body);
    TrendChartFunctions.updateTrendChart(dashboardData.trendPeriod || '30d', dashboardData);
};

// 실시간 업데이트 시뮬레이션 (DISABLED - Causing performance issues)
/*
if (typeof window.trendUpdateInterval === 'undefined') {
    window.trendUpdateInterval = setInterval(() => {
        try {
            const dashboardData = Alpine.$data(document.body);
            if (dashboardData && !dashboardData.isLoading) {
                TrendChartFunctions.simulateRealTimeUpdate(dashboardData);
            }
        } catch (error) {
            console.log('Trend update simulation paused:', error.message);
        }
    }, 30000); // 30초마다
}
*//**

 * Personalization Functions
 * 개인화 설정 관련 함수들
 */
window.PersonalizationFunctions = {
    
    /**
     * 기본 사용자 설정
     */
    getDefaultUserSettings() {
        return {
            name: '',
            defaultZone: '',
            role: 'viewer',
            defaultView: 'overview',
            autoRefresh: false,
            refreshInterval: '60',
            theme: 'dark',
            notifications: {
                critical: true,
                high: true,
                myZone: false,
                dailySummary: false,
                weeklySummary: false,
                browser: true,
                sound: false,
                email: false
            },
            favoriteFilters: []
        };
    },
    
    /**
     * 사용자 설정 로드
     * @returns {Object} 사용자 설정
     */
    loadUserSettings() {
        try {
            const saved = localStorage.getItem('p5_user_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                return { ...this.getDefaultUserSettings(), ...settings };
            }
        } catch (error) {
            console.warn('Failed to load user settings:', error);
        }
        return this.getDefaultUserSettings();
    },
    
    /**
     * 사용자 설정 저장
     * @param {Object} settings - 저장할 설정
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    saveUserSettings(settings, dashboardContext) {
        try {
            localStorage.setItem('p5_user_settings', JSON.stringify(settings));
            
            // 설정 적용
            this.applyUserSettings(settings, dashboardContext);
            
            if (dashboardContext) {
                dashboardContext.showToast('개인화 설정이 저장되었습니다', 'success');
            }
        } catch (error) {
            console.error('Failed to save user settings:', error);
            if (dashboardContext) {
                dashboardContext.showToast('설정 저장에 실패했습니다', 'error');
            }
        }
    },
    
    /**
     * 사용자 설정 적용
     * @param {Object} settings - 적용할 설정
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    applyUserSettings(settings, dashboardContext) {
        if (!dashboardContext) return;
        
        // 기본 Zone 설정
        if (settings.defaultZone && dashboardContext.zones) {
            const defaultZone = dashboardContext.zones.find(z => z.id === settings.defaultZone);
            if (defaultZone) {
                dashboardContext.selectedZone = settings.defaultZone;
            }
        }
        
        // 자동 새로고침 설정
        if (settings.autoRefresh) {
            this.setupAutoRefresh(parseInt(settings.refreshInterval) * 1000, dashboardContext);
        } else {
            this.clearAutoRefresh();
        }
        
        // 테마 설정
        this.applyTheme(settings.theme);
        
        // 알림 권한 요청 (브라우저 알림이 활성화된 경우)
        if (settings.notifications.browser && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    },
    
    /**
     * 테마 적용
     * @param {string} theme - 테마 (dark, light, auto)
     */
    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'light') {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
        } else if (theme === 'dark') {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
        } else if (theme === 'auto') {
            // 시스템 설정에 따라 자동 적용
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark-theme');
                root.classList.remove('light-theme');
            } else {
                root.classList.add('light-theme');
                root.classList.remove('dark-theme');
            }
        }
    },
    
    /**
     * 자동 새로고침 설정
     * @param {number} interval - 새로고침 간격 (밀리초)
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    setupAutoRefresh(interval, dashboardContext) {
        this.clearAutoRefresh();
        
        window.autoRefreshInterval = setInterval(() => {
            if (dashboardContext && !dashboardContext.isLoading) {
                // 데이터 새로고침 로직
                dashboardContext.refreshData();
            }
        }, interval);
    },
    
    /**
     * 자동 새로고침 해제
     */
    clearAutoRefresh() {
        if (window.autoRefreshInterval) {
            clearInterval(window.autoRefreshInterval);
            window.autoRefreshInterval = null;
        }
    },
    
    /**
     * 즐겨찾는 필터 추가
     * @param {string} name - 필터 이름
     * @param {Object} filterConfig - 필터 설정
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    addFavoriteFilter(name, filterConfig, dashboardContext) {
        if (!dashboardContext || !dashboardContext.userSettings) return;
        
        const newFilter = {
            name: name,
            config: filterConfig,
            createdAt: new Date().toISOString()
        };
        
        dashboardContext.userSettings.favoriteFilters.push(newFilter);
        this.saveUserSettings(dashboardContext.userSettings, dashboardContext);
    },
    
    /**
     * 즐겨찾는 필터 제거
     * @param {number} index - 제거할 필터 인덱스
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    removeFavoriteFilter(index, dashboardContext) {
        if (!dashboardContext || !dashboardContext.userSettings) return;
        
        dashboardContext.userSettings.favoriteFilters.splice(index, 1);
        this.saveUserSettings(dashboardContext.userSettings, dashboardContext);
    },
    
    /**
     * 즐겨찾는 필터 적용
     * @param {Object} filter - 적용할 필터
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    applyFavoriteFilter(filter, dashboardContext) {
        if (!dashboardContext || !filter.config) return;
        
        // 필터 설정 적용
        Object.assign(dashboardContext, filter.config);
        dashboardContext.showToast(`"${filter.name}" 필터가 적용되었습니다`, 'info');
    },
    
    /**
     * 설정 내보내기
     * @param {Object} settings - 내보낼 설정
     */
    exportSettings(settings) {
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `p5_personalization_settings_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },
    
    /**
     * 설정 가져오기
     * @param {File} file - 가져올 설정 파일
     * @param {Object} dashboardContext - 대시보드 컨텍스트
     */
    importSettings(file, dashboardContext) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                const mergedSettings = { ...this.getDefaultUserSettings(), ...settings };
                
                if (dashboardContext) {
                    dashboardContext.userSettings = mergedSettings;
                    this.saveUserSettings(mergedSettings, dashboardContext);
                }
            } catch (error) {
                console.error('Failed to import settings:', error);
                if (dashboardContext) {
                    dashboardContext.showToast('설정 파일을 읽을 수 없습니다', 'error');
                }
            }
        };
        reader.readAsText(file);
    }
};

// Alpine.js에서 사용할 수 있도록 전역 함수로 등록
window.savePersonalizationSettings = function() {
    const dashboardData = Alpine.$data(document.body);
    PersonalizationFunctions.saveUserSettings(dashboardData.userSettings, dashboardData);
};

window.resetPersonalizationSettings = function() {
    const dashboardData = Alpine.$data(document.body);
    dashboardData.userSettings = PersonalizationFunctions.getDefaultUserSettings();
    PersonalizationFunctions.saveUserSettings(dashboardData.userSettings, dashboardData);
};

window.exportPersonalizationSettings = function() {
    const dashboardData = Alpine.$data(document.body);
    PersonalizationFunctions.exportSettings(dashboardData.userSettings);
};

window.importPersonalizationSettings = function(event) {
    const dashboardData = Alpine.$data(document.body);
    const file = event.target.files[0];
    if (file) {
        PersonalizationFunctions.importSettings(file, dashboardData);
    }
};

window.addFavoriteFilter = function(name, config) {
    const dashboardData = Alpine.$data(document.body);
    PersonalizationFunctions.addFavoriteFilter(name, config, dashboardData);
};

window.removeFavoriteFilter = function(index) {
    const dashboardData = Alpine.$data(document.body);
    PersonalizationFunctions.removeFavoriteFilter(index, dashboardData);
};

window.applyFavoriteFilter = function(filter) {
    const dashboardData = Alpine.$data(document.body);
    PersonalizationFunctions.applyFavoriteFilter(filter, dashboardData);
};

// 페이지 로드 시 사용자 설정 적용
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            const dashboardData = Alpine.$data(document.body);
            if (dashboardData) {
                const userSettings = PersonalizationFunctions.loadUserSettings();
                dashboardData.userSettings = userSettings;
                PersonalizationFunctions.applyUserSettings(userSettings, dashboardData);
            }
        } catch (error) {
            console.log('User settings initialization deferred');
        }
    }, 1000);
});