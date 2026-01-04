import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

/**
 * 디버그용 E2E 테스트
 * 대시보드의 실제 상태를 확인
 */

function generateFakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '1234567890', name: 'Test User', email: 'test@example.com',
    hd: 'samsung.com', exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64url');
  return `${header}.${payload}.FAKE_SIGNATURE`;
}

test.describe('Debug Dashboard State', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      sessionStorage.setItem('p5_id_token', token);
      sessionStorage.setItem('p5_user_info', JSON.stringify({
        email: 'test@example.com', name: 'Test User', domain: 'samsung.com'
      }));
    }, generateFakeJwt());
  });

  test('대시보드 상태 디버그', async ({ page }) => {
    // 콘솔 로그 캡처
    page.on('console', msg => {
      console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.log(`[Browser Error] ${err.message}`);
    });

    await page.goto('/');

    // 5초 대기
    await page.waitForTimeout(5000);

    // 스크린샷
    await page.screenshot({ path: 'test-results/debug-screenshot.png', fullPage: true });

    // Alpine.js 상태 확인
    const debugInfo = await page.evaluate(() => {
      const result: any = {
        alpineExists: typeof (window as any).Alpine !== 'undefined',
        bodyHasXData: document.body.hasAttribute('x-data'),
        gridCellCount: document.querySelectorAll('.grid-cell').length,
        headerCellCount: document.querySelectorAll('.grid-cell-header').length,
        mainContentVisible: !!document.querySelector('#main-content'),
        gridContainerVisible: !!document.querySelector('.grid-container'),
        searchInputVisible: !!document.querySelector('.search-input'),
      };

      if (result.alpineExists) {
        const alpine = (window as any).Alpine;
        try {
          const data = alpine.$data?.(document.body);
          if (data) {
            result.alpineDataExists = true;
            result.columnsCount = Object.keys(data.columns || {}).length;
            result.zonesCount = (data.zones || []).length;
            result.issuesCount = (data.issues || []).length;
            result.gridConfig = data.gridConfig;
            result.virtualScrollEnabled = data.virtualScroll?.enabled;
          } else {
            result.alpineDataExists = false;
            result.error = 'Alpine.$data returned null/undefined';
          }
        } catch (e) {
          result.alpineDataError = (e as Error).message;
        }
      }

      return result;
    });

    console.log('\n========== DEBUG INFO ==========');
    console.log(JSON.stringify(debugInfo, null, 2));
    console.log('================================\n');

    // HTML 스니펫 확인
    const bodyClasses = await page.evaluate(() => document.body.className);
    console.log('Body classes:', bodyClasses);

    const gridHtml = await page.evaluate(() => {
      const grid = document.querySelector('.grid-container');
      return grid ? grid.outerHTML.substring(0, 500) : 'Grid not found';
    });
    console.log('Grid HTML snippet:', gridHtml);

    // 실제 결과 검증
    expect(debugInfo.alpineExists).toBe(true);
    expect(debugInfo.columnsCount).toBeGreaterThan(0);
  });
});
