const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();

  page.on('pageerror', error => console.log('ERROR:', error.message));

  // --- MOBILE SHOT (FAB visible) ---
  await page.setViewport({ width: 400, height: 800 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await page.type('input[placeholder="Search route (e.g. 500D)..."]', '500', { delay: 50 });
  await new Promise(r => setTimeout(r, 500));
  const routeCards = await page.$$('.cursor-pointer');
  if (routeCards.length > 0) {
    await routeCards[0].click();
    await new Promise(r => setTimeout(r, 2000));
    
    // Evaluate scroll to bottom so the map is visible
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: 'shot_mobile.png' });
    console.log('Shot 2: mobile view (FAB)');

    // --- MOBILE SHOT (Drawer open) ---
    const fab = await page.$$('button');
    for (let btn of fab) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Live Buses')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'shot_mobile_drawer.png' });
    console.log('Shot 3: mobile drawer open');
  }

  await browser.close();
})();
