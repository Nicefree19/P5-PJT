/**
 * P5 Dashboard - API Client Module
 * 인증 토큰 자동 첨부 및 에러 처리
 *
 * WP-9-1: Circuit Breaker & Performance Monitoring Integration
 * @version 1.1.0
 */

const ApiClient = (function() {
    'use strict';

    const CONFIG = {
        BASE_URL: '', // Set via configure()
        TIMEOUT: 30000,
        RETRY_COUNT: 3,
        RETRY_DELAY: 1000,

        // WP-9-1: Circuit Breaker 설정
        CIRCUIT_BREAKER_ENABLED: true,
        CIRCUIT_NAME_PREFIX: 'api_'
    };

    // WP-9-1: ErrorHandler 통합 헬퍼
    const ErrorHelper = {
        canExecute(circuitName) {
            if (!CONFIG.CIRCUIT_BREAKER_ENABLED) return true;
            if (typeof ErrorHandler === 'undefined') return true;
            return ErrorHandler.circuit.canExecute(circuitName);
        },

        recordSuccess(circuitName) {
            if (!CONFIG.CIRCUIT_BREAKER_ENABLED) return;
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.circuit.recordSuccess(circuitName);
            }
        },

        recordFailure(circuitName) {
            if (!CONFIG.CIRCUIT_BREAKER_ENABLED) return;
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.circuit.recordFailure(circuitName);
            }
        },

        logError(error, source) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.log.add({
                    type: 'api',
                    message: error.message || String(error),
                    source: source,
                    stack: error.stack || null
                });
            }
        },

        markStart(name) {
            if (typeof ErrorHandler !== 'undefined') {
                return ErrorHandler.perf.markStart(name);
            }
            return null;
        },

        markEnd(name, startMark) {
            if (typeof ErrorHandler !== 'undefined') {
                return ErrorHandler.perf.markEnd(name, startMark);
            }
            return null;
        },

        notify(message, type) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.notify(message, type);
            }
        },

        getCircuitState(circuitName) {
            if (typeof ErrorHandler !== 'undefined') {
                return ErrorHandler.circuit.getState(circuitName);
            }
            return 'CLOSED';
        }
    };

    /**
     * API 클라이언트 설정
     * @param {Object} options
     */
    function configure(options) {
        if (options.baseUrl) CONFIG.BASE_URL = options.baseUrl;
        if (options.timeout) CONFIG.TIMEOUT = options.timeout;
        if (options.circuitBreakerEnabled !== undefined) {
            CONFIG.CIRCUIT_BREAKER_ENABLED = options.circuitBreakerEnabled;
        }
        console.log('[ApiClient] Configured with URL:', CONFIG.BASE_URL);
    }

    /**
     * GET 요청
     * @param {string} action - API 액션
     * @param {Object} params - 쿼리 파라미터
     */
    async function get(action, params = {}) {
        const url = new URL(CONFIG.BASE_URL);
        url.searchParams.append('action', action);

        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });

        // GAS Web App 호환: GET 요청 시 토큰을 query parameter로도 전달
        if (window.AuthModule && window.AuthModule.isAuthenticated()) {
            url.searchParams.append('token', window.AuthModule.getToken());
        }

        return request('GET', url.toString(), null, 0, action);
    }

    /**
     * POST 요청
     * @param {string} action - API 액션
     * @param {Object} payload - 요청 본문
     */
    async function post(action, payload = {}) {
        return request('POST', CONFIG.BASE_URL, {
            action,
            ...payload
        }, 0, action);
    }

    /**
     * 공통 요청 처리
     * @param {string} method - HTTP 메서드
     * @param {string} url - 요청 URL
     * @param {Object|null} body - 요청 본문
     * @param {number} retryCount - 현재 재시도 횟수
     * @param {string} actionName - API 액션명 (Circuit Breaker용)
     */
    async function request(method, url, body = null, retryCount = 0, actionName = 'unknown') {
        const circuitName = CONFIG.CIRCUIT_NAME_PREFIX + actionName;

        // WP-9-1: Circuit Breaker 체크
        if (!ErrorHelper.canExecute(circuitName)) {
            const circuitState = ErrorHelper.getCircuitState(circuitName);
            console.warn(`[ApiClient] Circuit breaker ${circuitState} for: ${actionName}`);

            // Circuit이 열려있으면 즉시 에러 반환
            const error = new ApiError(
                `Service temporarily unavailable (Circuit ${circuitState})`,
                503,
                { circuitState, action: actionName }
            );
            error.circuitOpen = true;

            // 사용자에게 알림 (첫 번째 시도에서만)
            if (retryCount === 0) {
                ErrorHelper.notify('서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.', 'warning');
            }

            throw error;
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        // 인증 토큰 가져오기
        let authToken = null;
        if (window.AuthModule && window.AuthModule.isAuthenticated()) {
            authToken = window.AuthModule.getToken();
            // GAS Web App 호환: X-Authorization 헤더 사용 (표준 Authorization 헤더는 GAS에서 접근 불가)
            headers['X-Authorization'] = 'Bearer ' + authToken;
        }

        const options = {
            method,
            headers,
            mode: 'cors'
        };

        if (body && method !== 'GET') {
            // POST body에도 토큰 포함 (GAS Web App 폴백용)
            const bodyWithAuth = authToken
                ? { ...body, authorization: 'Bearer ' + authToken }
                : body;
            options.body = JSON.stringify(bodyWithAuth);
        }

        // WP-9-1: Performance 측정 시작
        const perfMark = ErrorHelper.markStart(circuitName);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
            options.signal = controller.signal;

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            // Rate Limit 처리
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 60;
                throw new ApiError('Rate limit exceeded', 429, { retryAfter });
            }

            // 인증 실패 처리
            if (response.status === 401) {
                window.dispatchEvent(new CustomEvent('auth:expired'));
                throw new ApiError('Authentication required', 401);
            }

            // 권한 없음 처리
            if (response.status === 403) {
                throw new ApiError('Access denied', 403);
            }

            // 서버 에러 처리 (Circuit Breaker 트리거)
            if (response.status >= 500) {
                throw new ApiError(`Server error: ${response.status}`, response.status);
            }

            const data = await response.json();

            if (!data.success && data.error) {
                throw new ApiError(data.error, response.status, data);
            }

            // WP-9-1: 성공 기록
            ErrorHelper.recordSuccess(circuitName);
            ErrorHelper.markEnd(circuitName, perfMark);

            return data;

        } catch (error) {
            // WP-9-1: Performance 측정 종료 (실패 시에도)
            ErrorHelper.markEnd(circuitName, perfMark);

            // Circuit Breaker에서 이미 처리한 에러는 재시도하지 않음
            if (error.circuitOpen) {
                throw error;
            }

            // 네트워크 에러 시 재시도
            if (error.name === 'AbortError' || error.name === 'TypeError') {
                if (retryCount < CONFIG.RETRY_COUNT) {
                    console.warn(`[ApiClient] Retrying ${actionName}... (${retryCount + 1}/${CONFIG.RETRY_COUNT})`);
                    await sleep(CONFIG.RETRY_DELAY * (retryCount + 1));
                    return request(method, url, body, retryCount + 1, actionName);
                }
            }

            // 5xx 서버 에러 시 재시도
            if (error instanceof ApiError && error.status >= 500 && retryCount < CONFIG.RETRY_COUNT) {
                console.warn(`[ApiClient] Server error, retrying ${actionName}... (${retryCount + 1}/${CONFIG.RETRY_COUNT})`);
                await sleep(CONFIG.RETRY_DELAY * (retryCount + 1));
                return request(method, url, body, retryCount + 1, actionName);
            }

            // WP-9-1: 최종 실패 시 Circuit Breaker에 기록
            ErrorHelper.recordFailure(circuitName);
            ErrorHelper.logError(error, `ApiClient.${actionName}`);

            throw error;
        }
    }

    /**
     * API 에러 클래스
     */
    class ApiError extends Error {
        constructor(message, status, data = {}) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.data = data;
        }
    }

    /**
     * 대기 함수
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * WP-9-1: Circuit Breaker 상태 조회
     * @param {string} action - API 액션명
     */
    function getCircuitState(action) {
        const circuitName = CONFIG.CIRCUIT_NAME_PREFIX + action;
        return ErrorHelper.getCircuitState(circuitName);
    }

    /**
     * WP-9-1: Circuit Breaker 리셋
     * @param {string} action - API 액션명 (없으면 전체 리셋)
     */
    function resetCircuit(action) {
        if (typeof ErrorHandler === 'undefined') return;

        if (action) {
            const circuitName = CONFIG.CIRCUIT_NAME_PREFIX + action;
            ErrorHandler.circuit.reset(circuitName);
            console.log(`[ApiClient] Circuit reset for: ${action}`);
        } else {
            ErrorHandler.circuit.reset();
            console.log('[ApiClient] All circuits reset');
        }
    }

    /**
     * WP-9-1: 모든 Circuit 상태 조회
     */
    function getAllCircuitStates() {
        if (typeof ErrorHandler === 'undefined') return {};
        return ErrorHandler.getCircuitStates();
    }

    // Public API
    return {
        configure,
        get,
        post,
        ApiError,
        // WP-9-1: Circuit Breaker 관련 API
        getCircuitState,
        resetCircuit,
        getAllCircuitStates
    };
})();

// 전역 노출
window.ApiClient = ApiClient;
