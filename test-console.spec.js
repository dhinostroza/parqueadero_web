import { test, expect } from '@playwright/test';

test('capture console errors', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`PAGE ERROR: ${msg.text()}`);
      errors.push(msg.text());
    }
  });

  page.on('pageerror', exception => {
    console.log(`UNCAUGHT EXCEPTION: ${exception}`);
    errors.push(String(exception));
  });

  await page.goto('http://localhost:5173/dashboard');
  await page.waitForTimeout(3000);

  if (errors.length > 0) {
    throw new Error("Found console errors");
  }
});
