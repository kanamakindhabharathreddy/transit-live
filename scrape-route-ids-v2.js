import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAP_FILE = path.join(__dirname, 'public', 'data', 'route_id_map.json');

const searchTerms = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','J','K','L','M','N','P','R','S','T','V','W','X','Y','Z'];

async function scrapeRoutesV2() {
  const routeMap = {};
  
  console.log(`Starting to scrape ${searchTerms.length} terms...`);

  for (let i = 0; i < searchTerms.length; i++) {
    const term = searchTerms[i];
    console.log(`[${i + 1}/${searchTerms.length}] Searching for term: "${term}"...`);

    try {
      const res = await fetch('https://bmtcmobileapi.karnataka.gov.in/WebAPI/SearchRoute_v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'deviceType': 'WEB',
          'lan': 'en',
          'Origin': 'https://nammabmtcapp.karnataka.gov.in',
          'Referer': 'https://nammabmtcapp.karnataka.gov.in/',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36'
        },
        body: JSON.stringify({ routetext: term })
      });

      if (!res.ok) {
        console.error(`  -> HTTP Error: ${res.status}`);
        continue;
      }

      const responseData = await res.json();
      
      if (responseData.data && Array.isArray(responseData.data)) {
        let added = 0;
        responseData.data.forEach(route => {
          if (route.routeno && route.routeparentid) {
            routeMap[route.routeno] = route.routeparentid;
            added++;
          }
        });
        console.log(`  -> Found ${responseData.data.length} records in response`);
      } else {
        console.log(`  -> No data found for term: ${term}`);
      }
    } catch (err) {
      console.error(`  -> Exception fetching term ${term}: ${err.message}`);
    }

    if (i < searchTerms.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Save to file
  fs.writeFileSync(MAP_FILE, JSON.stringify(routeMap, null, 2));

  console.log('\n--- Scrape V2 Summary ---');
  console.log(`Total unique routes mapped: ${Object.keys(routeMap).length}`);
  console.log(`Saved to: ${MAP_FILE}`);
  console.log('Done.');
}

scrapeRoutesV2();
