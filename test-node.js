import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('PAGE ERROR:', msg.text());
        } else {
            console.log('PAGE LOG:', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('UNCAUGHT EXCEPTION:', error.message);
    });

    try {
        await page.goto('http://localhost:5173');
        await page.waitForTimeout(2000);
    } catch (err) {
        console.error("Navigation error:", err);
    } finally {
        await browser.close();
    }
})();
