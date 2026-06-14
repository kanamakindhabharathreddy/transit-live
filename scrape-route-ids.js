import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_FILE = path.join(__dirname, 'public', 'data', 'routes', '_index.json');
const MAP_FILE = path.join(__dirname, 'public', 'data', 'route_id_map.json');

async function scrapeRoutes() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`Index file not found: ${INDEX_FILE}`);
    return;
  }

  const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  const routes = indexData.map(r => r.route_short);
  const totalRoutes = routes.length;

  let routeIdMap = {};
  if (fs.existsSync(MAP_FILE)) {
    routeIdMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf-8'));
  }

  let newFound = 0;
  let skipped = 0;

  const BATCH_SIZE = 5;
  for (let i = 0; i < totalRoutes; i += BATCH_SIZE) {
    const batch = routes.slice(i, i + BATCH_SIZE);
    
    // Log progress
    console.log(`[${Math.min(i + BATCH_SIZE, totalRoutes)}/${totalRoutes}] Processing routes: ${batch.join(', ')}...`);
    
    const promises = batch.map(async (route_short) => {
      if (routeIdMap[route_short]) {
        // Already mapped
        return null;
      }
      
      const variations = new Set([route_short]);
      // Dash before any letter suffix (e.g., 500CA -> 500-CA)
      const suffixMatch = route_short.match(/^(\d+)([A-Za-z]+)$/);
      if (suffixMatch) {
        variations.add(`${suffixMatch[1]}-${suffixMatch[2]}`);
      }
      // Dash before the last letter (e.g., 500CA -> 500C-A, or 500C -> 500-C)
      const lastLetterMatch = route_short.match(/^(.*[^-])([A-Za-z])$/);
      if (lastLetterMatch) {
        variations.add(`${lastLetterMatch[1]}-${lastLetterMatch[2]}`);
      }
      // Also if it already has a dash, try without dash
      if (route_short.includes('-')) {
        variations.add(route_short.replace('-', ''));
      }

      for (const variant of variations) {
        try {
          const res = await fetch('https://bmtcmobileapi.karnataka.gov.in/WebAPI/SearchByRouteDetails_v4', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'deviceType': 'WEB',
              'lan': 'en',
              'Origin': 'https://nammabmtcapp.karnataka.gov.in',
              'Referer': 'https://nammabmtcapp.karnataka.gov.in/',
              'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36'
            },
            body: JSON.stringify({ routeid: 0, routeno: variant, servicetypeid: 0 })
          });

          if (!res.ok) continue;

          const data = await res.json();
          if (data.issuccess === true) {
            let routeId = null;
            if (data.up && data.up.data && data.up.data.length > 0) {
              routeId = data.up.data[0].routeid;
            } else if (data.down && data.down.data && data.down.data.length > 0) {
              routeId = data.down.data[0].routeid;
            }

            if (routeId) {
              routeIdMap[route_short] = routeId;
              newFound++;
              return { route_short, routeId };
            }
          }
        } catch (err) {
          // Continue to next variant
        }
      }
      
      console.error(`  -> Route ${route_short}: API returned issuccess=false for all variations`);
      skipped++;
      return null;
    });

    await Promise.all(promises);
    
    // Save progress incrementally to avoid data loss
    fs.writeFileSync(MAP_FILE, JSON.stringify(routeIdMap, null, 2));

    if (i + BATCH_SIZE < totalRoutes) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n--- Scrape Summary ---');
  console.log(`Total routes in index: ${totalRoutes}`);
  console.log(`Newly mapped in this run: ${newFound}`);
  console.log(`Total skipped or failed in this run: ${skipped}`);
  console.log(`Total currently mapped in file: ${Object.keys(routeIdMap).length}`);
  console.log('Done.');
}

scrapeRoutes();
