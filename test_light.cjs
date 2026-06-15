const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // Click the light theme button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const lightBtn = buttons.find(b => b.title === 'Light theme');
    if (lightBtn) lightBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 500)); // wait for transition
  await page.screenshot({ path: 'shot_light.png' });

  await browser.close();
})();
