import { test, expect } from '@playwright/test';

test('capture dashboard map screenshot', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Login if necessary
  if (await page.locator('#login-form').isVisible()) {
    await page.fill('#cedula', 'admin');
    await page.fill('#password', 'admin123'); // Adjust based on your auth
    await page.click('button[type="submit"]');
  }

  // Navigate to Dashboard
  await page.click('a[data-page="dashboard"]');

  // Wait for map to load
  await page.waitForSelector('.leaflet-container');
  // Add a small delay for tiles to render
  await page.waitForTimeout(1500);

  // Take screenshot
  await page.screenshot({ path: '/Users/dhinostroza/.gemini/antigravity/brain/51102fdf-e769-4c6e-8ec9-3216d4b39e72/dashboard_map.png' });
  console.log("Screenshot saved at /Users/dhinostroza/.gemini/antigravity/brain/51102fdf-e769-4c6e-8ec9-3216d4b39e72/dashboard_map.png");
});
