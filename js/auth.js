/**
 * P5 Dashboard - Authentication Module (GIS)
 * Google Identity Services 기반 인증
 * @version 1.0.0
 */

const AuthModule = (function() {
    'use strict';
    
    const CONFIG = {
        CLIENT_ID: '', // Set via init()
        ALLOWED_DOMAINS: ['samsung.com', 'samoo.com'],
        TOKEN_KEY: 'p5_id_token',
        USER_KEY: 'p5_user_info'
    };
    
    let onAuthSuccess = null;
    let onAuthError = null;
    
    /**
     * GIS 초기화
     * @param {Object} options
     */
    function init(options) {
        if (options.clientId) CONFIG.CLIENT_ID = options.clientId;
        if (options.allowedDomains) CONFIG.ALLOWED_DOMAINS = options.allowedDomains;
        if (options.onSuccess) onAuthSuccess = options.onSuccess;
        if (options.onError) onAuthError = options.onError;
        
        // GIS 라이브러리 로드 확인
        if (typeof google === 'undefined' || !google.accounts) {
            console.error('[AuthModule] Google Identity Services not loaded');
            return;
        }
        
        google.accounts.id.initialize({
            client_id: CONFIG.CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: true
        });
        
        console.log('[AuthModule] Initialized with client:', CONFIG.CLIENT_ID.substring(0, 20) + '...');
    }
    
    /**
     * 로그인 버튼 렌더링
     * @param {string} elementId - 버튼을 렌더링할 요소 ID
     */
    function renderButton(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('[AuthModule] Element not found:', elementId);
            return;
        }
        
        google.accounts.id.renderButton(element, {
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular'
        });
    }
    
    /**
     * 인증 응답 처리
     */
    function handleCredentialResponse(response) {
        try {
            const idToken = response.credential;
            const payload = parseJwt(idToken);
            
            // 도메인 검증
            if (CONFIG.ALLOWED_DOMAINS.length > 0 && 
                !CONFIG.ALLOWED_DOMAINS.includes(payload.hd)) {
                throw new Error('Unauthorized domain: ' + payload.hd);
            }
            
            // 토큰 저장
            sessionStorage.setItem(CONFIG.TOKEN_KEY, idToken);
            sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify({
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                domain: payload.hd
            }));
            
            console.log('[AuthModule] Login success:', payload.email);
            
            if (onAuthSuccess) {
                onAuthSuccess({
                    token: idToken,
                    user: payload
                });
            }
            
            // 커스텀 이벤트 발생
            window.dispatchEvent(new CustomEvent('auth:success', { 
                detail: { email: payload.email, name: payload.name }
            }));
            
        } catch (error) {
            console.error('[AuthModule] Auth error:', error);
            if (onAuthError) onAuthError(error);
        }
    }
    
    /**
     * JWT 파싱 (Base64 디코딩)
     */
    function parseJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => 
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
        return JSON.parse(jsonPayload);
    }
    
    /**
     * 현재 토큰 가져오기
     */
    function getToken() {
        return sessionStorage.getItem(CONFIG.TOKEN_KEY);
    }
    
    /**
     * 현재 사용자 정보 가져오기
     */
    function getUser() {
        const userStr = sessionStorage.getItem(CONFIG.USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    }
    
    /**
     * 인증 상태 확인
     */
    function isAuthenticated() {
        const token = getToken();
        if (!token) return false;
        
        try {
            const payload = parseJwt(token);
            // 토큰 만료 확인 (exp는 초 단위)
            return payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    }
    
    /**
     * 로그아웃
     */
    function logout() {
        sessionStorage.removeItem(CONFIG.TOKEN_KEY);
        sessionStorage.removeItem(CONFIG.USER_KEY);
        
        if (google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }
        
        window.dispatchEvent(new CustomEvent('auth:logout'));
        console.log('[AuthModule] Logged out');
    }
    
    // Public API
    return {
        init,
        renderButton,
        getToken,
        getUser,
        isAuthenticated,
        logout
    };
})();

// 전역 노출 (Alpine.js에서 사용)
window.AuthModule = AuthModule;
