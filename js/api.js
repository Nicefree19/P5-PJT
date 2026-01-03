/**
 * P5 Dashboard - API Client Module
 * 인증 토큰 자동 첨부 및 에러 처리
 * @version 1.0.0
 */

const ApiClient = (function() {
    'use strict';
    
    const CONFIG = {
        BASE_URL: '', // Set via configure()
        TIMEOUT: 30000,
        RETRY_COUNT: 3,
        RETRY_DELAY: 1000
    };
    
    /**
     * API 클라이언트 설정
     * @param {Object} options
     */
    function configure(options) {
        if (options.baseUrl) CONFIG.BASE_URL = options.baseUrl;
        if (options.timeout) CONFIG.TIMEOUT = options.timeout;
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
        
        return request('GET', url.toString());
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
        });
    }
    
    /**
     * 공통 요청 처리
     */
    async function request(method, url, body = null, retryCount = 0) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 인증 토큰 추가
        if (window.AuthModule && window.AuthModule.isAuthenticated()) {
            headers['Authorization'] = 'Bearer ' + window.AuthModule.getToken();
        }
        
        const options = {
            method,
            headers,
            mode: 'cors'
        };
        
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }
        
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
            
            const data = await response.json();
            
            if (!data.success && data.error) {
                throw new ApiError(data.error, response.status, data);
            }
            
            return data;
            
        } catch (error) {
            // 네트워크 에러 시 재시도
            if (error.name === 'AbortError' || error.name === 'TypeError') {
                if (retryCount < CONFIG.RETRY_COUNT) {
                    console.warn(`[ApiClient] Retrying... (${retryCount + 1}/${CONFIG.RETRY_COUNT})`);
                    await sleep(CONFIG.RETRY_DELAY * (retryCount + 1));
                    return request(method, url, body, retryCount + 1);
                }
            }
            
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
    
    // Public API
    return {
        configure,
        get,
        post,
        ApiError
    };
})();

// 전역 노출
window.ApiClient = ApiClient;
