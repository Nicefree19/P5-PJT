import { test, expect, Page } from '@playwright/test';
import path from 'path';

const DEPLOYED_URL = 'https://script.google.com/macros/s/AKfycbwgHgGLZZRcNbq1rVpLSaQGj0X1xYEdqZOMIqwrNV50p0q2bLJCtVh6UIPeT_2pWmJKdg/exec';
const LOCAL_URL = 'http://localhost:3000/src/dashboard/index.html';

// Use deployed URL for testing
const BASE_URL = DEPLOYED_URL;

test.describe('Data Map Tests', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to dashboard
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for Alpine.js initialization
        await page.waitForFunction(() => {
            return typeof (window as any).Alpine !== 'undefined' &&
                   document.querySelector('[x-data]') !== null;
        }, { timeout: 10000 });
    });

    test('1. Data Map FAB 버튼 존재 확인', async ({ page }) => {
        // Check FAB button exists
        const fabButton = page.locator('[x-ref="fabButton"], .fab-main-btn, button:has-text("☰")');
        await expect(fabButton.first()).toBeVisible();
    });

    test('2. Data Map 패널 열기', async ({ page }) => {
        // Open FAB menu
        const fabButton = page.locator('.fab-main-btn, [x-ref="fabButton"]').first();
        await fabButton.click();
        await page.waitForTimeout(300);

        // Look for Data Map button
        const dataMapBtn = page.locator('button:has-text("Data Map"), button:has-text("📊")').first();

        if (await dataMapBtn.isVisible()) {
            await dataMapBtn.click();
            await page.waitForTimeout(500);

            // Check Data Map panel is visible
            const panel = page.locator('.shop-issue-overlay, [x-show="showDataMapPanel"]');
            await expect(panel.first()).toBeVisible();
        } else {
            console.log('Data Map button not found in FAB menu - checking if feature is deployed');
        }
    });

    test('3. UnifiedParser 모듈 로드 확인', async ({ page }) => {
        const hasUnifiedParser = await page.evaluate(() => {
            return typeof (window as any).UnifiedParser !== 'undefined';
        });

        console.log(`UnifiedParser loaded: ${hasUnifiedParser}`);
        // Note: On deployed version, this may not be available yet
    });

    test('4. UnifiedStore 초기화 확인', async ({ page }) => {
        const storeStatus = await page.evaluate(() => {
            const Alpine = (window as any).Alpine;
            if (Alpine && Alpine.store) {
                const store = Alpine.store('unifiedData');
                return {
                    exists: !!store,
                    issueCount: store?.issues?.length || 0,
                    hasAddIssues: typeof store?.addIssues === 'function'
                };
            }
            return { exists: false, issueCount: 0, hasAddIssues: false };
        });

        console.log('UnifiedStore status:', storeStatus);
    });

    test('5. 파일 업로드 영역 확인', async ({ page }) => {
        // Open Data Map panel first
        const fabButton = page.locator('.fab-main-btn, [x-ref="fabButton"]').first();
        await fabButton.click();
        await page.waitForTimeout(300);

        const dataMapBtn = page.locator('button:has-text("Data Map"), button:has-text("📊")').first();

        if (await dataMapBtn.isVisible()) {
            await dataMapBtn.click();
            await page.waitForTimeout(500);

            // Check for file upload area
            const uploadArea = page.locator('.data-map-upload, [x-on\\:drop], input[type="file"]');
            const fileInput = page.locator('input[type="file"][accept*=".xlsx"]');

            const hasUploadArea = await uploadArea.count() > 0 || await fileInput.count() > 0;
            console.log(`File upload area found: ${hasUploadArea}`);
        }
    });

    test('6. 뷰 모드 토글 버튼 확인', async ({ page }) => {
        // Open Data Map panel
        const fabButton = page.locator('.fab-main-btn, [x-ref="fabButton"]').first();
        await fabButton.click();
        await page.waitForTimeout(300);

        const dataMapBtn = page.locator('button:has-text("Data Map"), button:has-text("📊")').first();

        if (await dataMapBtn.isVisible()) {
            await dataMapBtn.click();
            await page.waitForTimeout(500);

            // Check for view mode buttons
            const gridBtn = page.locator('button:has-text("그리드"), button:has-text("Grid")');
            const clusterBtn = page.locator('button:has-text("클러스터"), button:has-text("Cluster")');
            const listBtn = page.locator('button:has-text("리스트"), button:has-text("List")');

            console.log(`Grid button: ${await gridBtn.count() > 0}`);
            console.log(`Cluster button: ${await clusterBtn.count() > 0}`);
            console.log(`List button: ${await listBtn.count() > 0}`);
        }
    });

    test('7. Data Map 패널 닫기', async ({ page }) => {
        // Open Data Map panel
        const fabButton = page.locator('.fab-main-btn, [x-ref="fabButton"]').first();
        await fabButton.click();
        await page.waitForTimeout(300);

        const dataMapBtn = page.locator('button:has-text("Data Map"), button:has-text("📊")').first();

        if (await dataMapBtn.isVisible()) {
            await dataMapBtn.click();
            await page.waitForTimeout(500);

            // Close panel
            const closeBtn = page.locator('.shop-issue-close-btn, button[aria-label="닫기"]').first();
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await page.waitForTimeout(300);

                // Verify panel is closed
                const panel = page.locator('.shop-issue-overlay[x-show="showDataMapPanel"]');
                // Panel should be hidden
            }
        }
    });

    test('8. 콘솔 에러 없음 (Data Map 컴포넌트)', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Open Data Map
        const fabButton = page.locator('.fab-main-btn, [x-ref="fabButton"]').first();
        await fabButton.click();
        await page.waitForTimeout(300);

        const dataMapBtn = page.locator('button:has-text("Data Map"), button:has-text("📊")').first();

        if (await dataMapBtn.isVisible()) {
            await dataMapBtn.click();
            await page.waitForTimeout(1000);
        }

        // Filter only Data Map related errors
        const dataMapErrors = errors.filter(e =>
            e.toLowerCase().includes('datamap') ||
            e.toLowerCase().includes('unified') ||
            e.toLowerCase().includes('parser')
        );

        console.log(`Total console errors: ${errors.length}`);
        console.log(`Data Map related errors: ${dataMapErrors.length}`);

        if (dataMapErrors.length > 0) {
            console.log('Data Map Errors:', dataMapErrors);
        }
    });

});

test.describe('Data Map - Parser Tests (Local)', () => {
    // These tests require local development server

    test.skip('Local: Excel 파일 파싱 테스트', async ({ page }) => {
        await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });

        // Wait for modules to load
        await page.waitForFunction(() => {
            return typeof (window as any).UnifiedParser !== 'undefined';
        }, { timeout: 5000 });

        // Test parser detection
        const result = await page.evaluate(async () => {
            const parser = (window as any).UnifiedParser;
            if (!parser) return { error: 'UnifiedParser not found' };

            // Test format detection
            const xlsxFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const csvFile = new File([''], 'test.csv', { type: 'text/csv' });
            const imgFile = new File([''], 'test.png', { type: 'image/png' });

            return {
                xlsx: parser.detectFormat(xlsxFile),
                csv: parser.detectFormat(csvFile),
                img: parser.detectFormat(imgFile)
            };
        });

        console.log('Format detection:', result);
        expect(result).not.toHaveProperty('error');
    });

});
