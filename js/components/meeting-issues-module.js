/**
 * Meeting Issues Module - 회의록 이슈 관리
 * index.html dashboard()에 mixin-spread 패턴으로 통합
 *
 * @module MeetingIssuesModule
 * @version 2.5.0
 */
(function() {
    'use strict';

    window.MeetingIssuesModule = {

        async loadMeetingIssuesData() {
            if (typeof MeetingIssuesImport === 'undefined') {
                console.warn('[Meeting Issues] meeting_issues_import.js not loaded');
                return;
            }

            try {
                console.log('[Meeting Issues] Loading meeting issues...');
                const result = await MeetingIssuesImport.load({
                    maxIssues: null,
                    recentOnly: false
                });

                if (result.success) {
                    this.meetingIssues = result.issues;
                    console.log(`[Meeting Issues] Loaded ${this.meetingIssues.length} issues`);
                    console.log('[Meeting Issues] Stats:', result.stats);
                } else {
                    console.error('[Meeting Issues] Failed to load:', result.error);
                }
            } catch (error) {
                console.error('[Meeting Issues] Error loading:', error);
            }
        },

        getFilteredMeetingIssues() {
            let filtered = this.meetingIssues;

            if (this.meetingFilter.status !== 'all') {
                filtered = filtered.filter(i => i.status === this.meetingFilter.status);
            }

            if (this.meetingFilter.type !== 'all') {
                filtered = filtered.filter(i => i.issueType === this.meetingFilter.type);
            }

            if (this.meetingFilter.search) {
                const q = this.meetingFilter.search.toLowerCase();
                filtered = filtered.filter(i =>
                    i.description?.toLowerCase().includes(q) ||
                    i.majorCategory?.toLowerCase().includes(q) ||
                    i.issueType?.toLowerCase().includes(q)
                );
            }

            const start = (this.meetingPage - 1) * this.meetingPageSize;
            return filtered.slice(start, start + this.meetingPageSize);
        },

        getTotalFilteredMeetingIssues() {
            let filtered = this.meetingIssues;

            if (this.meetingFilter.status !== 'all') {
                filtered = filtered.filter(i => i.status === this.meetingFilter.status);
            }
            if (this.meetingFilter.type !== 'all') {
                filtered = filtered.filter(i => i.issueType === this.meetingFilter.type);
            }
            if (this.meetingFilter.search) {
                const q = this.meetingFilter.search.toLowerCase();
                filtered = filtered.filter(i =>
                    i.description?.toLowerCase().includes(q) ||
                    i.majorCategory?.toLowerCase().includes(q)
                );
            }

            return filtered.length;
        },

        formatMeetingDateDisplay(dateStr) {
            if (!dateStr || dateStr.length < 6) return dateStr || 'N/A';
            const year = '20' + dateStr.substring(0, 2);
            const month = dateStr.substring(2, 4);
            const day = dateStr.substring(4, 6);
            return `${year}-${month}-${day}`;
        },

        selectMeetingIssue(issue) {
            console.log('[Meeting Issues] Selected:', issue.id);
        },

        openMappingModal(issue) {
            this.mappingIssue = issue;
            this.mappingColumns = [...(issue.location?.columns || [])];
            this.mappingMode = 'select';
            this.mappingRange = { startRow: 'A', endRow: 'A', startCol: 1, endCol: 1 };
            this.mappingManualInput = '';
            this.mappingModalOpen = true;
            console.log('[Mapping] Modal opened for issue:', issue.id);
        },

        closeMappingModal() {
            this.mappingModalOpen = false;
            this.mappingIssue = null;
            this.mappingColumns = [];
        },

        removeMappingColumn(col) {
            this.mappingColumns = this.mappingColumns.filter(c => c !== col);
        },

        applyRangeMapping() {
            const startRowIdx = this.rowLabels.indexOf(this.mappingRange.startRow);
            const endRowIdx = this.rowLabels.indexOf(this.mappingRange.endRow);
            const startCol = Math.min(this.mappingRange.startCol, this.mappingRange.endCol);
            const endCol = Math.max(this.mappingRange.startCol, this.mappingRange.endCol);

            const newColumns = [];
            for (let r = Math.min(startRowIdx, endRowIdx); r <= Math.max(startRowIdx, endRowIdx); r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const uid = `${this.rowLabels[r]}-X${c}`;
                    if (!this.mappingColumns.includes(uid)) {
                        newColumns.push(uid);
                    }
                }
            }

            this.mappingColumns = [...this.mappingColumns, ...newColumns];
            this.showToast(`${newColumns.length}개 기둥 추가됨`, 'success');
        },

        parseManualInput() {
            const input = this.mappingManualInput.trim();
            if (!input) return;

            const parts = input.split(',').map(p => p.trim()).filter(Boolean);
            const newColumns = [];

            for (const part of parts) {
                const rangeMatch = part.match(/^([A-L])?-?X(\d+)~(\d+)$/i);
                if (rangeMatch) {
                    const row = rangeMatch[1] ? rangeMatch[1].toUpperCase() : null;
                    const startCol = parseInt(rangeMatch[2]);
                    const endCol = parseInt(rangeMatch[3]);

                    if (row) {
                        for (let c = startCol; c <= endCol; c++) {
                            const uid = `${row}-X${c}`;
                            if (!this.mappingColumns.includes(uid) && !newColumns.includes(uid)) {
                                newColumns.push(uid);
                            }
                        }
                    } else {
                        for (const r of this.rowLabels) {
                            for (let c = startCol; c <= endCol; c++) {
                                const uid = `${r}-X${c}`;
                                if (!this.mappingColumns.includes(uid) && !newColumns.includes(uid)) {
                                    newColumns.push(uid);
                                }
                            }
                        }
                    }
                    continue;
                }

                const singleMatch = part.match(/^([A-L])-X(\d+)$/i);
                if (singleMatch) {
                    const uid = `${singleMatch[1].toUpperCase()}-X${singleMatch[2]}`;
                    if (!this.mappingColumns.includes(uid) && !newColumns.includes(uid)) {
                        newColumns.push(uid);
                    }
                }
            }

            if (newColumns.length > 0) {
                this.mappingColumns = [...this.mappingColumns, ...newColumns];
                this.mappingManualInput = '';
                this.showToast(`${newColumns.length}개 기둥 추가됨`, 'success');
            } else {
                this.showToast('입력 형식을 확인하세요', 'warning');
            }
        },

        saveMappingAndCreateIssue() {
            if (!this.mappingIssue || this.mappingColumns.length === 0) {
                this.showToast('매핑할 기둥을 선택하세요', 'warning');
                return;
            }

            const typeMap = {
                'HMB': 'tc',
                'PSRC': 'design',
                'PC': 'material',
                'Steel': 'material',
                'Joint': 'design',
                'General': 'material'
            };

            const dashboardIssue = {
                id: `MTG-${this.mappingIssue.meetingDate}-${this.mappingIssue.id}`,
                type: typeMap[this.mappingIssue.issueType] || 'material',
                title: (this.mappingIssue.description || '').substring(0, 100),
                severity: (this.mappingIssue.severity || 'medium').toLowerCase(),
                affectedColumns: [...this.mappingColumns],
                description: this.mappingIssue.description,
                status: this.mappingIssue.status === 'Open' ? 'open' : 'resolved',
                reportedAt: this.formatMeetingDateDisplay(this.mappingIssue.meetingDate),
                source: 'meeting',
                meetingIssueId: this.mappingIssue.id,
                overlay: {
                    show: true,
                    label: `📋 ${this.mappingIssue.issueType || ''}\n${this.formatMeetingDateDisplay(this.mappingIssue.meetingDate)}`
                }
            };

            this.issues.push(dashboardIssue);

            if (typeof IssueStore !== 'undefined' && IssueStore.buildIndex) {
                IssueStore.buildIndex(this.issues);
            }

            const meetingIssueIdx = this.meetingIssues.findIndex(i => i.id === this.mappingIssue.id);
            if (meetingIssueIdx >= 0) {
                this.meetingIssues[meetingIssueIdx].location = {
                    ...this.meetingIssues[meetingIssueIdx].location,
                    columns: [...this.mappingColumns]
                };
                this.meetingIssues[meetingIssueIdx].mappedToDashboard = true;
            }

            this.saveToLocalStorage();

            this.showToast(`이슈가 ${this.mappingColumns.length}개 기둥에 매핑되었습니다`, 'success');
            this.showNotification('이슈 매핑 완료',
                `${dashboardIssue.title.substring(0, 50)}... → ${this.mappingColumns.length}개 기둥`,
                'success', { duration: 5000 });

            this.closeMappingModal();
        },

        findMeetingIssueHeader(jsonData) {
            const keywords = ['발송일자', '발송', '분류', '내용', '반영', '구분', '번호'];
            for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
                const row = jsonData[i];
                if (!row) continue;
                const rowText = row.join(' ').toLowerCase();
                const matchCount = keywords.filter(kw => rowText.includes(kw.toLowerCase())).length;
                if (matchCount >= 3) return i;
            }
            return -1;
        },

        mapMeetingExcelHeaders(headers) {
            const h = headers.map(x => (x || '').toString().toLowerCase().trim());
            return {
                id: h.findIndex(x => x.includes('번호') || x.includes('no') || x.includes('id')),
                type: h.findIndex(x => x.includes('분류') || x.includes('유형') || x.includes('구분')),
                title: h.findIndex(x => x.includes('내용') || x.includes('제목') || x.includes('이슈')),
                location: h.findIndex(x => x.includes('위치') || x.includes('절주') || x.includes('zone')),
                status: h.findIndex(x => x.includes('반영') || x.includes('상태') || x.includes('완료')),
                date: h.findIndex(x => x.includes('일자') || x.includes('날짜') || x.includes('발송')),
                assignee: h.findIndex(x => x.includes('담당') || x.includes('처리') || x.includes('발송처'))
            };
        },

        extractMeetingIssue(row, idxMap, sheetName, counter) {
            const titleIdx = idxMap.title >= 0 ? idxMap.title : 1;
            const title = (row[titleIdx] || '').toString().trim();
            if (!title || title.length < 3) return null;
            if (title.includes('내용') && title.length < 10) return null;

            return {
                id: idxMap.id >= 0 && row[idxMap.id] ? `${sheetName}-${row[idxMap.id]}` : `MI-${counter}`,
                type: idxMap.type >= 0 ? (row[idxMap.type] || '').toString().trim() : '',
                title: title.substring(0, 200),
                description: title,
                location: idxMap.location >= 0 ? (row[idxMap.location] || '').toString().trim() : '',
                status: idxMap.status >= 0 ? (row[idxMap.status] || '').toString().trim().toUpperCase() : '',
                date: idxMap.date >= 0 ? (row[idxMap.date] || '').toString().trim() : '',
                assignee: idxMap.assignee >= 0 ? (row[idxMap.assignee] || '').toString().trim() : '',
                sourceSheet: sheetName,
                linkedColumns: []
            };
        }
    };
})();
