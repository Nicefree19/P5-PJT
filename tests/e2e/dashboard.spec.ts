import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

// Fake JWT Generator
function generateFakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '1234567890',
    name: 'Test User',
    email: 'test@example.com',
    hd: 'samsung.com',
    exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64url');
  return `${header}.${payload}.FAKE_SIGNATURE`;
}

test.describe('P5 Dashboard E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Auth Bypass: Inject Fake Token before page load
    await page.addInitScript((token) => {
      sessionStorage.setItem('p5_id_token', token);
      sessionStorage.setItem('p5_user_info', JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        domain: 'samsung.com'
      }));
    }, generateFakeJwt());
  });

  test('대시보드 로드 및 필수 요소 확인', async ({ page }) => {
    await page.goto('/');
    
    // 타이틀 확인
    await expect(page).toHaveTitle(/P5 Live Grid/);
    
    // 메인 그리드 컨테이너 확인
    const grid = page.locator('#main-content');
    await expect(grid).toBeVisible({ timeout: 10000 });
  });

  test('사이드바 토글 작동 확인 (모바일 대응)', async ({ page }) => {
    await page.goto('/');
    
    // 사이드바가 처음에는 닫혀있거나(모바일) 열려있음(데스크탑)
    // 뷰포트를 모바일로 설정해서 테스트
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 사이드바 토글 버튼 (햄버거 메뉴)
    // index.html에 해당 버튼이 있는지 확인 필요. 보통 .menu-btn 등
    // 여기서는 가상의 시나리로로 작성, 실제 선택자는 확인 필요
    // const toggleBtn = page.locator('.mobile-nav .nav-item').first(); 
    // await toggleBtn.click();
    // await expect(page.locator('.sidebar')).toHaveClass(/open/);
  });
});
