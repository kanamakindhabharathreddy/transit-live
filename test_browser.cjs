const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  console.log('Page loaded');
  
  // Wait for the search input
  await page.waitForSelector('input[placeholder="Search route (e.g. 500D)..."]');
  console.log('Found search input');
  
  // Type '25a'
  await page.type('input[placeholder="Search route (e.g. 500D)..."]', '25a', { delay: 100 });
  console.log('Typed 25a');
  
  // Wait a bit for React to update and any errors to trigger
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Done');
  await page.screenshot({path: 'test.png'}); await browser.close();
})();
