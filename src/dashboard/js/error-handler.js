/**
 * P5 Dashboard - Global Error Handler & Circuit Breaker
 * Phase 9 WP-9-1: Error Handling & Monitoring
 *
 * Features:
 * - Global Error Boundary (window.onerror, unhandledrejection)
 * - Error Logging to LocalStorage
 * - Circuit Breaker Pattern for API resilience
 * - Performance Monitoring via Performance API
 */

const ErrorHandler = (function() {
    'use strict';

    // ==================== Configuration ====================
    const CONFIG = {
        // Error Logging
        LOG_KEY: 'p5_error_log',
        MAX_LOG_ENTRIES: 100,
        LOG_RETENTION_DAYS: 7,

        // Circuit Breaker
        CIRCUIT_BREAKER: {
            FAILURE_THRESHOLD: 5,      // failures before opening circuit
            SUCCESS_THRESHOLD: 3,      // successes before closing circuit
            TIMEOUT_MS: 30000,         // time before half-open state
            HALF_OPEN_MAX_CALLS: 3     // max calls in half-open state
        },

        // Performance Monitoring
        PERF_SAMPLE_RATE: 0.1,  // 10% sampling for performance metrics
        SLOW_THRESHOLD_MS: 3000  // mark as slow if > 3s
    };

    // ==================== Error Log Storage ====================
    const ErrorLog = {
        _cache: null,

        getAll() {
            if (this._cache === null) {
                try {
                    const stored = localStorage.getItem(CONFIG.LOG_KEY);
                    this._cache = stored ? JSON.parse(stored) : [];
                } catch (e) {
                    this._cache = [];
                }
            }
            return this._cache;
        },

        add(error) {
            const logs = this.getAll();
            const entry = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                timestamp: new Date().toISOString(),
                type: error.type || 'unknown',
                message: error.message || 'Unknown error',
                source: error.source || 'unknown',
                line: error.line || null,
                column: error.column || null,
                stack: error.stack || null,
                url: window.location.href,
                userAgent: navigator.userAgent.substring(0, 100)
            };

            logs.unshift(entry);

            // Limit log size
            if (logs.length > CONFIG.MAX_LOG_ENTRIES) {
                logs.splice(CONFIG.MAX_LOG_ENTRIES);
            }

            // Remove old entries
            const cutoff = Date.now() - (CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
            const filtered = logs.filter(log => new Date(log.timestamp).getTime() > cutoff);

            this._cache = filtered;
            this._persist();

            return entry;
        },

        _persist() {
            try {
                localStorage.setItem(CONFIG.LOG_KEY, JSON.stringify(this._cache));
            } catch (e) {
                // Storage full - remove oldest entries
                if (e.name === 'QuotaExceededError') {
                    this._cache = this._cache.slice(0, Math.floor(this._cache.length / 2));
                    localStorage.setItem(CONFIG.LOG_KEY, JSON.stringify(this._cache));
                }
            }
        },

        clear() {
            this._cache = [];
            localStorage.removeItem(CONFIG.LOG_KEY);
        },

        getRecent(count = 10) {
            return this.getAll().slice(0, count);
        },

        getByType(type) {
            return this.getAll().filter(log => log.type === type);
        },

        getStats() {
            const logs = this.getAll();
            const now = Date.now();
            const hourAgo = now - 3600000;
            const dayAgo = now - 86400000;

            const stats = {
                total: logs.length,
                lastHour: 0,
                lastDay: 0,
                byType: {}
            };

            logs.forEach(log => {
                const time = new Date(log.timestamp).getTime();
                if (time > hourAgo) stats.lastHour++;
                if (time > dayAgo) stats.lastDay++;
                stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
            });

            return stats;
        }
    };

    // ==================== Circuit Breaker ====================
    const CircuitBreaker = {
        circuits: new Map(),

        getOrCreate(name) {
            if (!this.circuits.has(name)) {
                this.circuits.set(name, {
                    state: 'CLOSED',        // CLOSED, OPEN, HALF_OPEN
                    failures: 0,
                    successes: 0,
                    lastFailure: null,
                    halfOpenCalls: 0
                });
            }
            return this.circuits.get(name);
        },

        canExecute(name) {
            const circuit = this.getOrCreate(name);
            const cfg = CONFIG.CIRCUIT_BREAKER;

            switch (circuit.state) {
                case 'CLOSED':
                    return true;

                case 'OPEN':
                    // Check if timeout has passed
                    if (Date.now() - circuit.lastFailure > cfg.TIMEOUT_MS) {
                        circuit.state = 'HALF_OPEN';
                        circuit.halfOpenCalls = 0;
                        console.log(`[CircuitBreaker] ${name}: OPEN → HALF_OPEN`);
                        return true;
                    }
                    return false;

                case 'HALF_OPEN':
                    return circuit.halfOpenCalls < cfg.HALF_OPEN_MAX_CALLS;

                default:
                    return true;
            }
        },

        recordSuccess(name) {
            const circuit = this.getOrCreate(name);
            const cfg = CONFIG.CIRCUIT_BREAKER;

            if (circuit.state === 'HALF_OPEN') {
                circuit.successes++;
                if (circuit.successes >= cfg.SUCCESS_THRESHOLD) {
                    circuit.state = 'CLOSED';
                    circuit.failures = 0;
                    circuit.successes = 0;
                    console.log(`[CircuitBreaker] ${name}: HALF_OPEN → CLOSED`);
                }
            } else if (circuit.state === 'CLOSED') {
                // Reset failure count on success
                circuit.failures = Math.max(0, circuit.failures - 1);
            }
        },

        recordFailure(name) {
            const circuit = this.getOrCreate(name);
            const cfg = CONFIG.CIRCUIT_BREAKER;

            circuit.failures++;
            circuit.lastFailure = Date.now();

            if (circuit.state === 'HALF_OPEN') {
                circuit.state = 'OPEN';
                circuit.successes = 0;
                console.log(`[CircuitBreaker] ${name}: HALF_OPEN → OPEN (failure)`);
            } else if (circuit.state === 'CLOSED' && circuit.failures >= cfg.FAILURE_THRESHOLD) {
                circuit.state = 'OPEN';
                console.log(`[CircuitBreaker] ${name}: CLOSED → OPEN (threshold reached)`);
            }
        },

        getState(name) {
            return this.getOrCreate(name).state;
        },

        reset(name) {
            if (name) {
                this.circuits.delete(name);
            } else {
                this.circuits.clear();
            }
        },

        getAllStates() {
            const states = {};
            this.circuits.forEach((circuit, name) => {
                states[name] = {
                    state: circuit.state,
                    failures: circuit.failures,
                    lastFailure: circuit.lastFailure
                };
            });
            return states;
        }
    };

    // ==================== Performance Monitor ====================
    const PerfMonitor = {
        metrics: {
            apiCalls: [],
            renders: [],
            resources: []
        },

        markStart(name) {
            if (Math.random() > CONFIG.PERF_SAMPLE_RATE) return null;

            const markName = `p5_${name}_start_${Date.now()}`;
            try {
                performance.mark(markName);
                return markName;
            } catch (e) {
                return null;
            }
        },

        markEnd(name, startMark) {
            if (!startMark) return null;

            const endMark = `p5_${name}_end_${Date.now()}`;
            try {
                performance.mark(endMark);
                const measure = performance.measure(`p5_${name}`, startMark, endMark);

                const metric = {
                    name,
                    duration: measure.duration,
                    timestamp: Date.now(),
                    slow: measure.duration > CONFIG.SLOW_THRESHOLD_MS
                };

                this.metrics.apiCalls.push(metric);

                // Keep only last 100 metrics
                if (this.metrics.apiCalls.length > 100) {
                    this.metrics.apiCalls.shift();
                }

                // Clean up marks
                performance.clearMarks(startMark);
                performance.clearMarks(endMark);
                performance.clearMeasures(`p5_${name}`);

                if (metric.slow) {
                    console.warn(`[PerfMonitor] Slow operation: ${name} took ${metric.duration.toFixed(0)}ms`);
                }

                return metric;
            } catch (e) {
                return null;
            }
        },

        getResourceTiming() {
            try {
                const entries = performance.getEntriesByType('resource');
                return entries.slice(-50).map(e => ({
                    name: e.name.split('/').pop(),
                    type: e.initiatorType,
                    duration: e.duration,
                    size: e.transferSize
                }));
            } catch (e) {
                return [];
            }
        },

        getNavigationTiming() {
            try {
                const nav = performance.getEntriesByType('navigation')[0];
                if (!nav) return null;

                return {
                    dns: nav.domainLookupEnd - nav.domainLookupStart,
                    tcp: nav.connectEnd - nav.connectStart,
                    ttfb: nav.responseStart - nav.requestStart,
                    download: nav.responseEnd - nav.responseStart,
                    domReady: nav.domContentLoadedEventEnd - nav.startTime,
                    load: nav.loadEventEnd - nav.startTime
                };
            } catch (e) {
                return null;
            }
        },

        getMemoryInfo() {
            if (performance.memory) {
                return {
                    usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576),
                    totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576),
                    jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                };
            }
            return null;
        },

        getSummary() {
            const apiMetrics = this.metrics.apiCalls;
            const slowCount = apiMetrics.filter(m => m.slow).length;
            const avgDuration = apiMetrics.length > 0
                ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length
                : 0;

            return {
                apiCalls: {
                    total: apiMetrics.length,
                    slow: slowCount,
                    avgDuration: Math.round(avgDuration)
                },
                navigation: this.getNavigationTiming(),
                memory: this.getMemoryInfo(),
                resources: this.getResourceTiming().length
            };
        }
    };

    // ==================== Toast Integration ====================
    let showToastFn = null;

    function setToastHandler(fn) {
        showToastFn = fn;
    }

    function notifyUser(message, type = 'error') {
        if (showToastFn) {
            showToastFn(message, type);
        } else {
            console.log(`[ErrorHandler] ${type}: ${message}`);
        }
    }

    // ==================== Global Error Handlers ====================
    function setupGlobalHandlers() {
        // Synchronous errors
        window.onerror = function(message, source, line, column, error) {
            const errorData = {
                type: 'javascript',
                message: message,
                source: source,
                line: line,
                column: column,
                stack: error?.stack || null
            };

            ErrorLog.add(errorData);

            // Notify user for critical errors
            if (isCriticalError(message)) {
                notifyUser('시스템 오류가 발생했습니다. 페이지를 새로고침해 주세요.', 'error');
            }

            console.error('[GlobalError]', errorData);

            // Return false to allow default error handling
            return false;
        };

        // Promise rejections
        window.onunhandledrejection = function(event) {
            const error = event.reason;
            const errorData = {
                type: 'promise',
                message: error?.message || String(error),
                stack: error?.stack || null,
                source: 'unhandledrejection'
            };

            ErrorLog.add(errorData);

            // Notify user for network errors
            if (isNetworkError(error)) {
                notifyUser('네트워크 연결을 확인해 주세요.', 'warning');
            }

            console.error('[UnhandledRejection]', errorData);
        };

        // Resource loading errors
        window.addEventListener('error', function(event) {
            if (event.target && (event.target.src || event.target.href)) {
                const errorData = {
                    type: 'resource',
                    message: `Failed to load: ${event.target.src || event.target.href}`,
                    source: event.target.tagName,
                    line: null,
                    column: null
                };

                ErrorLog.add(errorData);
                console.warn('[ResourceError]', errorData);
            }
        }, true);

        console.log('[ErrorHandler] Global error handlers initialized');
    }

    function isCriticalError(message) {
        const criticalPatterns = [
            /out of memory/i,
            /maximum call stack/i,
            /script error/i,
            /syntax error/i
        ];
        return criticalPatterns.some(pattern => pattern.test(message));
    }

    function isNetworkError(error) {
        if (!error) return false;
        const message = error.message || String(error);
        return /network|fetch|timeout|abort|connection/i.test(message);
    }

    // ==================== API Error Wrapper ====================
    async function withErrorHandling(fn, options = {}) {
        const {
            name = 'api_call',
            notify = true,
            rethrow = true,
            fallback = null
        } = options;

        // Check circuit breaker
        if (!CircuitBreaker.canExecute(name)) {
            const error = new Error(`Circuit breaker OPEN for: ${name}`);
            error.circuitOpen = true;

            if (notify) {
                notifyUser('서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.', 'warning');
            }

            if (fallback !== null) return fallback;
            if (rethrow) throw error;
            return null;
        }

        const startMark = PerfMonitor.markStart(name);

        try {
            const result = await fn();
            CircuitBreaker.recordSuccess(name);
            PerfMonitor.markEnd(name, startMark);
            return result;

        } catch (error) {
            CircuitBreaker.recordFailure(name);
            PerfMonitor.markEnd(name, startMark);

            ErrorLog.add({
                type: 'api',
                message: error.message,
                source: name,
                stack: error.stack
            });

            if (notify) {
                const userMessage = getUserFriendlyMessage(error);
                notifyUser(userMessage, 'error');
            }

            if (fallback !== null) return fallback;
            if (rethrow) throw error;
            return null;
        }
    }

    function getUserFriendlyMessage(error) {
        const message = error.message || '';

        if (/timeout|abort/i.test(message)) {
            return '요청 시간이 초과되었습니다. 다시 시도해 주세요.';
        }
        if (/network|fetch|connection/i.test(message)) {
            return '네트워크 연결을 확인해 주세요.';
        }
        if (/401|unauthorized/i.test(message)) {
            return '인증이 필요합니다. 다시 로그인해 주세요.';
        }
        if (/403|forbidden/i.test(message)) {
            return '접근 권한이 없습니다.';
        }
        if (/404/i.test(message)) {
            return '요청한 리소스를 찾을 수 없습니다.';
        }
        if (/500|server/i.test(message)) {
            return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        }

        return '오류가 발생했습니다. 다시 시도해 주세요.';
    }

    // ==================== Initialization ====================
    let initialized = false;

    function init(toastFn) {
        if (initialized) return;

        if (toastFn) {
            setToastHandler(toastFn);
        }

        setupGlobalHandlers();
        initialized = true;

        // Log performance metrics on page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                const nav = PerfMonitor.getNavigationTiming();
                if (nav) {
                    console.log('[Performance] Page load metrics:', nav);
                }
            }, 100);
        });

        return {
            ErrorLog,
            CircuitBreaker,
            PerfMonitor
        };
    }

    // ==================== Public API ====================
    return {
        init,
        setToastHandler,

        // Error logging
        log: ErrorLog,
        getRecentErrors: () => ErrorLog.getRecent(),
        getErrorStats: () => ErrorLog.getStats(),
        clearErrors: () => ErrorLog.clear(),

        // Circuit breaker
        circuit: CircuitBreaker,
        isCircuitOpen: (name) => CircuitBreaker.getState(name) === 'OPEN',
        getCircuitStates: () => CircuitBreaker.getAllStates(),
        resetCircuit: (name) => CircuitBreaker.reset(name),

        // Performance
        perf: PerfMonitor,
        getPerfSummary: () => PerfMonitor.getSummary(),

        // Error wrapper
        withErrorHandling,

        // Direct notification
        notify: notifyUser
    };
})();

// Auto-initialize if document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Will be properly initialized from Alpine.js with showToast
        console.log('[ErrorHandler] Waiting for Alpine.js initialization');
    });
} else {
    console.log('[ErrorHandler] Module loaded');
}

// Export for ES modules if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
