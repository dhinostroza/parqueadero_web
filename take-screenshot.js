import { chromium } from 'playwright';

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173');

    // Login if necessary
    if (await page.locator('#login-form').isVisible()) {
      await page.fill('#username', 'gerencia');
      await page.fill('#password', '123');
      await page.click('button[type="submit"]');
    }

    // Navigate to Dashboard
    await page.click('a[data-page="dashboard"]');

    // Wait for map to load
    await page.waitForSelector('.leaflet-container');
    // Add a small delay for tiles to render
    await page.waitForTimeout(1500);

    const screenshotPath = '/Users/dhinostroza/.gemini/antigravity/brain/0319f57d-531a-49bb-a557-399f1e2ce504/dashboard_maps.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log("Screenshot saved at " + screenshotPath);
    
    await browser.close();
  } catch(e) {
    console.error("Error:", e);
    process.exit(1);
  }
})();
