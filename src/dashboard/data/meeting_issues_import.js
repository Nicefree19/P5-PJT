/**
 * Meeting Issues Import Module
 * P5 골조 전환설계 회의록 이슈 데이터 로더
 *
 * @module MeetingIssuesImport
 * @requires UnifiedStore (Alpine.store)
 */

(function() {
    'use strict';

    // Excel serial number to JS Date conversion
    function excelDateToJS(serial) {
        if (!serial) return null;
        if (typeof serial === 'string') {
            // Already a string date format (e.g., "4월 26일", "5월 8일")
            const koreanMatch = serial.match(/(\d+)월\s*(\d+)일/);
            if (koreanMatch) {
                const year = new Date().getFullYear();
                return new Date(year, parseInt(koreanMatch[1]) - 1, parseInt(koreanMatch[2]));
            }
            return null;
        }
        if (typeof serial === 'number') {
            // Excel serial number (days since 1900-01-01)
            const utcDays = serial - 25569;
            return new Date(utcDays * 86400 * 1000);
        }
        return null;
    }

    // Format date for display
    function formatDate(date) {
        if (!date) return null;
        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        return null;
    }

    /**
     * Transform meeting issue to unified schema (v3 compatible)
     */
    function transformToUnifiedSchema(meetingIssue) {
        const dueDate = meetingIssue.dueDate ? parseDate(meetingIssue.dueDate) : null;

        return {
            id: meetingIssue.id,
            source: meetingIssue.source || 'meeting',
            sourceFile: meetingIssue.sourceFile,

            // Description
            description: meetingIssue.description,
            rawText: meetingIssue.rawText,

            // Classification (v3 enhanced)
            issueType: meetingIssue.issueType,
            category: meetingIssue.majorCategory || meetingIssue.category || '',
            majorCategory: meetingIssue.majorCategory,
            itemType: meetingIssue.itemType,  // 'major' | 'sub' | 'sub-sub'
            parentItem: meetingIssue.parentItem,

            // Location
            location: {
                floor: meetingIssue.location?.floor || null,
                zone: meetingIssue.location?.zone || null,
                columns: meetingIssue.location?.columns || []
            },

            // Status & Severity
            status: meetingIssue.status || 'Open',
            severity: meetingIssue.severity || 'Medium',

            // Dates
            date: dueDate,
            dueDate: dueDate,
            meetingDate: meetingIssue.meetingDate,

            // Responsibility
            actionBy: meetingIssue.actionBy,

            // Additional info
            note: meetingIssue.note,
            itemNo: meetingIssue.itemNo,

            // Metadata (v3 enhanced)
            metadata: {
                ...meetingIssue.metadata,
                itemNo: meetingIssue.itemNo,
                itemType: meetingIssue.itemType,
                parentItem: meetingIssue.parentItem,
                majorCategory: meetingIssue.majorCategory
            },

            // Linked columns for grid mapping
            linkedColumns: meetingIssue.location?.columns || []
        };
    }

    /**
     * Parse date string to ISO format
     */
    function parseDate(dateValue) {
        if (!dateValue) return null;
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
            return dateValue;
        }
        return null;
    }

    /**
     * Load meeting issues from JSON file
     */
    async function loadMeetingIssues(options = {}) {
        const {
            maxIssues = 1000,   // Limit for performance
            recentOnly = true,  // Load only recent meetings
            recentDays = 180,   // Load meetings from last N days
            onProgress = null   // Progress callback
        } = options;

        console.log('[MeetingIssuesImport] Loading meeting issues...');

        try {
            // Fetch the JSON data
            const response = await fetch('./data/meeting_issues.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch meeting issues: ${response.status}`);
            }

            const data = await response.json();
            console.log(`[MeetingIssuesImport] Loaded ${data.issues?.length || 0} raw issues`);

            let issues = data.issues || [];

            // Filter by recent meetings if requested
            if (recentOnly) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - recentDays);

                issues = issues.filter(issue => {
                    // Parse meeting date (YYMMDD format)
                    const meetingDate = issue.meetingDate;
                    if (!meetingDate) return false;

                    const match = meetingDate.match(/^(\d{2})(\d{2})(\d{2})/);
                    if (match) {
                        const year = 2000 + parseInt(match[1]);
                        const month = parseInt(match[2]) - 1;
                        const day = parseInt(match[3]);
                        const date = new Date(year, month, day);
                        return date >= cutoffDate;
                    }
                    return false;
                });

                console.log(`[MeetingIssuesImport] Filtered to ${issues.length} recent issues`);
            }

            // Limit number of issues for performance
            if (issues.length > maxIssues) {
                issues = issues.slice(0, maxIssues);
                console.log(`[MeetingIssuesImport] Limited to ${maxIssues} issues`);
            }

            // Transform to unified schema
            const transformedIssues = [];
            for (let i = 0; i < issues.length; i++) {
                const transformed = transformToUnifiedSchema(issues[i]);
                transformedIssues.push(transformed);

                // Report progress
                if (onProgress && i % 100 === 0) {
                    onProgress({
                        current: i,
                        total: issues.length,
                        percent: Math.round((i / issues.length) * 100)
                    });
                }
            }

            console.log(`[MeetingIssuesImport] Transformed ${transformedIssues.length} issues`);

            return {
                success: true,
                issues: transformedIssues,
                metadata: data.metadata,
                stats: {
                    totalLoaded: transformedIssues.length,
                    totalAvailable: data.issues?.length || 0,
                    byType: countBy(transformedIssues, 'issueType'),
                    byStatus: countBy(transformedIssues, 'status'),
                    bySeverity: countBy(transformedIssues, 'severity')
                }
            };

        } catch (error) {
            console.error('[MeetingIssuesImport] Error loading issues:', error);
            return {
                success: false,
                error: error.message,
                issues: []
            };
        }
    }

    /**
     * Load meeting issues into unified store
     */
    async function loadIntoStore(options = {}) {
        const result = await loadMeetingIssues(options);

        if (!result.success) {
            console.error('[MeetingIssuesImport] Failed to load:', result.error);
            return result;
        }

        // Get the unified store
        let store;
        if (typeof Alpine !== 'undefined' && Alpine.store) {
            store = Alpine.store('unifiedData');
        }

        if (!store) {
            console.warn('[MeetingIssuesImport] Unified store not available');
            return {
                ...result,
                storeUpdated: false
            };
        }

        // Add issues to store
        if (store.addIssues) {
            store.addIssues(result.issues, 'meeting_import');
            console.log(`[MeetingIssuesImport] Added ${result.issues.length} issues to store`);
        }

        return {
            ...result,
            storeUpdated: true
        };
    }

    /**
     * Helper: Count items by property
     */
    function countBy(items, property) {
        return items.reduce((acc, item) => {
            const key = item[property] || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * Get summary statistics
     */
    function getSummary(issues) {
        return {
            total: issues.length,
            byType: countBy(issues, 'issueType'),
            byStatus: countBy(issues, 'status'),
            bySeverity: countBy(issues, 'severity'),
            bySource: countBy(issues, 'source'),
            byMeetingDate: countBy(issues, 'meetingDate'),
            byMajorCategory: countBy(issues, 'majorCategory'),
            withLocation: issues.filter(i => i.location?.floor || i.location?.columns?.length > 0).length,
            recentIssues: issues.filter(i => {
                const meeting = i.meetingDate;
                return meeting && meeting >= '251201';  // Dec 2025+
            }).length
        };
    }

    /**
     * Get timeline data (issue count by meeting date)
     */
    function getTimeline(issues) {
        const byDate = {};

        issues.forEach(issue => {
            const date = issue.meetingDate;
            if (!date) return;

            if (!byDate[date]) {
                byDate[date] = {
                    date: date,
                    total: 0,
                    byStatus: {},
                    byType: {}
                };
            }

            byDate[date].total++;
            byDate[date].byStatus[issue.status] = (byDate[date].byStatus[issue.status] || 0) + 1;
            byDate[date].byType[issue.issueType] = (byDate[date].byType[issue.issueType] || 0) + 1;
        });

        // Sort by date
        return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Get issue history grouped by major category
     */
    function getHistoryByCategory(issues) {
        const byCategory = {};

        issues.forEach(issue => {
            const cat = issue.majorCategory || 'Unknown';
            if (!byCategory[cat]) {
                byCategory[cat] = {
                    category: cat,
                    issues: [],
                    timeline: {}
                };
            }

            byCategory[cat].issues.push(issue);

            const date = issue.meetingDate;
            if (date) {
                if (!byCategory[cat].timeline[date]) {
                    byCategory[cat].timeline[date] = { total: 0, completed: 0, open: 0 };
                }
                byCategory[cat].timeline[date].total++;
                if (issue.status === 'Completed') {
                    byCategory[cat].timeline[date].completed++;
                } else {
                    byCategory[cat].timeline[date].open++;
                }
            }
        });

        return Object.values(byCategory).sort((a, b) => b.issues.length - a.issues.length);
    }

    /**
     * Format meeting date (YYMMDD) to readable format
     */
    function formatMeetingDate(dateStr) {
        if (!dateStr || dateStr.length < 6) return dateStr;
        const year = '20' + dateStr.substring(0, 2);
        const month = dateStr.substring(2, 4);
        const day = dateStr.substring(4, 6);
        return `${year}-${month}-${day}`;
    }

    // Export module
    window.MeetingIssuesImport = {
        load: loadMeetingIssues,
        loadIntoStore: loadIntoStore,
        transformToUnifiedSchema: transformToUnifiedSchema,
        getSummary: getSummary,
        getTimeline: getTimeline,
        getHistoryByCategory: getHistoryByCategory,
        formatMeetingDate: formatMeetingDate
    };

    console.log('[MeetingIssuesImport] Module loaded v3');

})();
