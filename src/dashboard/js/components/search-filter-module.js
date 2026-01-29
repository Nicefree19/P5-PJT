/**
 * Search & Filter Module - 검색/필터 엔진
 * index.html dashboard()에 mixin-spread 패턴으로 통합
 *
 * @module SearchFilterModule
 * @version 2.5.0
 */
(function() {
    'use strict';

    window.SearchFilterModule = {

        performSearchDebounced() {
            if (this._searchTimeout) {
                clearTimeout(this._searchTimeout);
            }

            if (!this.searchQuery.trim()) {
                this.searchResults = [];
                this.searchDropdownOpen = false;
                return;
            }

            this._searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        },

        performSearch() {
            const query = this.searchQuery.trim().toLowerCase();

            if (!query) {
                this.searchResults = [];
                this.searchDropdownOpen = false;
                return;
            }

            const results = [];

            // 1. 기둥 UID 검색
            const uidPattern = query.replace(/[^a-z0-9\-]/gi, '');
            for (const uid in this.columns) {
                if (uid.toLowerCase().includes(uidPattern)) {
                    const column = this.columns[uid];
                    results.push({
                        id: uid,
                        type: 'column',
                        uid,
                        icon: '📍',
                        text: uid,
                        hint: this.statusCodes[column.status.code]?.label || column.status.code
                    });
                }
                if (results.length >= 10) break;
            }

            // 2. Zone 검색
            for (const zone of this.zones) {
                if (zone.name.toLowerCase().includes(query) ||
                    zone.id.toLowerCase().includes(query)) {
                    results.push({
                        id: zone.id,
                        type: 'zone',
                        zoneId: zone.id,
                        icon: '🏗️',
                        text: zone.name,
                        hint: `Zone ID: ${zone.id}`
                    });
                }
            }

            // 3. 상태 검색
            for (const [code, status] of Object.entries(this.statusCodes)) {
                if (status.label.toLowerCase().includes(query) ||
                    code.toLowerCase().includes(query)) {
                    results.push({
                        id: code,
                        type: 'status',
                        statusCode: code,
                        icon: '🔵',
                        text: status.label,
                        hint: `상태 코드: ${code}`
                    });
                }
            }

            // 4. 이슈 검색
            for (const issue of this.issues) {
                if (issue.title?.toLowerCase().includes(query) ||
                    issue.id?.toLowerCase().includes(query)) {
                    results.push({
                        id: issue.id || 'issue-'+Math.random(),
                        type: 'issue',
                        issueId: issue.id,
                        icon: '🚨',
                        text: issue.title || issue.id,
                        hint: issue.status
                    });
                }
            }

            this.searchResults = results.slice(0, 15);
            this.searchDropdownOpen = results.length > 0;
        },

        addToRecentSearches(query) {
            if (!query.trim()) return;

            this.recentSearches = this.recentSearches.filter(s => s !== query);
            this.recentSearches.unshift(query);

            if (this.recentSearches.length > 5) {
                this.recentSearches = this.recentSearches.slice(0, 5);
            }

            try {
                localStorage.setItem('p5_recent_searches', JSON.stringify(this.recentSearches));
            } catch (e) {
                // 저장 실패 무시
            }
        },

        selectSearchResult(result) {
            this.addToRecentSearches(this.searchQuery);
            this.searchDropdownOpen = false;

            switch (result.type) {
                case 'column':
                    this.selectedCells = [result.uid];
                    this.scrollToColumn(result.uid);
                    this.showToast(`${result.uid} 기둥으로 이동`, 'success');
                    break;

                case 'zone':
                    this.addFilter('zone', result.zoneId, result.text);
                    break;

                case 'status':
                    this.addFilter('status', result.statusCode, result.text);
                    break;

                case 'issue':
                    this.selectedIssue = this.issues.find(i => i.id === result.issueId);
                    this.issuePanelOpen = true;
                    break;
            }

            this.searchQuery = '';
        },

        scrollToColumn(uid) {
            const match = uid.match(/([A-L])-X(\d+)/);
            if (!match) return;

            const rowLetter = match[1];
            const col = parseInt(match[2]);

            const cell = document.querySelector(`[data-row="${rowLetter}"][data-col="${col}"]`);
            if (cell) {
                cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        },

        addFilter(type, value, label) {
            const exists = this.activeFilters.find(f => f.type === type && f.value === value);
            if (exists) {
                this.showToast('이미 적용된 필터입니다', 'info');
                return;
            }

            this.activeFilters.push({ type, value, label });
            this.applyFilters();
            this.showToast(`${label} 필터 적용됨`, 'success');
            this.announce('필터 적용됨');
        },

        removeFilter(index) {
            const removed = this.activeFilters.splice(index, 1)[0];
            this.applyFilters();
            this.showToast(`${removed.label} 필터 해제됨`, 'info');
            this.announce('필터 해제됨');
        },

        applyFilters() {
            console.log('[Search] Applying filters:', this.activeFilters);
        },

        clearAllFilters() {
            this.activeFilters = [];
            this.applyFilters();
            this.showToast('모든 필터가 해제되었습니다', 'info');
        },

        clearSearch() {
            this.searchQuery = '';
            this.searchResults = [];
            this.searchDropdownOpen = false;
        },

        handleSearchKeydown(event) {
            if (event.key === 'Enter' && this.searchResults.length > 0) {
                this.selectSearchResult(this.searchResults[0]);
            } else if (event.key === 'Escape') {
                this.clearSearch();
            }
        }
    };
})();
