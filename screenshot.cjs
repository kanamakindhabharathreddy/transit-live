const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('pageerror', error => console.log('ERROR:', error.message));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // 1. Empty state
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'shot_empty.png' });
  console.log('Shot 1: empty state');

  // 2. Search results
  await page.type('input[placeholder="Search route (e.g. 500D)..."]', '500', { delay: 80 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'shot_search.png' });
  console.log('Shot 2: search results');

  // 3. Click a route
  const routeCards = await page.$$('.cursor-pointer');
  if (routeCards.length > 0) {
    await routeCards[0].click();
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: 'shot_map.png' });
    console.log('Shot 3: map view');
  }

  await browser.close();
})();
