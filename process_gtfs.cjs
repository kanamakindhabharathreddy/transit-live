const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const GTFS_DIR = path.join(__dirname, 'data', 'gtfs');
const OUT_ROUTES_DIR = path.join(__dirname, 'public', 'data', 'routes');
const OUT_DATA_DIR = path.join(__dirname, 'public', 'data');

if (!fs.existsSync(OUT_ROUTES_DIR)) {
  fs.mkdirSync(OUT_ROUTES_DIR, { recursive: true });
}

// Maps and lookups
const stops = {}; // stop_id -> { name, lat, lon }
const routes = {}; // route_id -> { short_name, long_name }
const trips = {}; // trip_id -> { route_id, direction_id, shape_id, headsign }
const shapes = {}; // shape_id -> [ {lat, lon} ]
const tripStops = {}; // trip_id -> [ {stop_id, sequence} ]

// Output structured
const routeVariations = {}; // route_short_name -> { long_name, directions: [] }
const stopsIndex = {}; // stop_name -> [ { route_short, direction, stop_sequence, route_file } ]

async function parseCSV(file, onRow) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path.join(GTFS_DIR, file))) {
        console.log(`Warning: ${file} not found. Skipping.`);
        resolve();
        return;
    }
    fs.createReadStream(path.join(GTFS_DIR, file))
      .pipe(csv())
      .on('data', onRow)
      .on('end', resolve)
      .on('error', reject);
  });
}

async function main() {
  console.log('Parsing stops...');
  await parseCSV('stops.txt', row => {
    stops[row.stop_id] = {
      name: row.stop_name,
      lat: parseFloat(row.stop_lat),
      lon: parseFloat(row.stop_lon)
    };
  });

  console.log('Parsing routes...');
  await parseCSV('routes.txt', row => {
    routes[row.route_id] = {
      short_name: row.route_short_name,
      long_name: row.route_long_name
    };
  });

  console.log('Parsing trips...');
  // Only keep one trip per route_id + direction_id combination for simplicity
  const routeDirTrips = new Set();
  await parseCSV('trips.txt', row => {
    const key = `${row.route_id}_${row.direction_id}`;
    if (!routeDirTrips.has(key)) {
      trips[row.trip_id] = {
        route_id: row.route_id,
        direction_id: row.direction_id,
        shape_id: row.shape_id,
        headsign: row.trip_headsign
      };
      routeDirTrips.add(key);
    }
  });

  console.log(`Kept ${Object.keys(trips).length} representative trips.`);

  console.log('Parsing shapes... (this might take a bit)');
  const validShapeIds = new Set(Object.values(trips).map(t => t.shape_id));
  await parseCSV('shapes.txt', row => {
    if (!validShapeIds.has(row.shape_id)) return;
    if (!shapes[row.shape_id]) shapes[row.shape_id] = [];
    shapes[row.shape_id].push({
      lat: parseFloat(row.shape_pt_lat),
      lon: parseFloat(row.shape_pt_lon),
      seq: parseInt(row.shape_pt_sequence, 10)
    });
  });

  for (let s in shapes) {
    shapes[s].sort((a, b) => a.seq - b.seq);
    shapes[s] = shapes[s].map(p => [p.lat, p.lon]);
  }

  console.log('Parsing stop_times... (this will take a while)');
  await parseCSV('stop_times.txt', row => {
    if (!trips[row.trip_id]) return;
    if (!tripStops[row.trip_id]) tripStops[row.trip_id] = [];
    tripStops[row.trip_id].push({
      stop_id: row.stop_id,
      seq: parseInt(row.stop_sequence, 10)
    });
  });

  for (let t in tripStops) {
    tripStops[t].sort((a, b) => a.seq - b.seq);
  }

  console.log('Building per-route JSON and indexes...');
  const indexJson = [];
  
  for (let trip_id in trips) {
    const trip = trips[trip_id];
    const route = routes[trip.route_id];
    if (!route) continue;
    let short_name = route.short_name;
    const long_name = route.long_name;
    
    // some short_names might have invalid characters for filenames, clean it
    short_name = short_name.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (!routeVariations[short_name]) {
      routeVariations[short_name] = {
        short_name: route.short_name, // keep original
        long_name: long_name,
        directions: []
      };
    }
    
    const shape = shapes[trip.shape_id] || [];
    const tStops = tripStops[trip_id] || [];
    const stopDetails = tStops.map(s => {
      const stopInfo = stops[s.stop_id];
      return {
        id: s.stop_id,
        name: stopInfo ? stopInfo.name : 'Unknown Stop',
        lat: stopInfo ? stopInfo.lat : 0,
        lon: stopInfo ? stopInfo.lon : 0,
        sequence: s.seq
      };
    });

    const directionName = trip.direction_id === "0" ? "UP" : "DOWN";

    routeVariations[short_name].directions.push({
      direction: directionName,
      headsign: trip.headsign,
      path: shape,
      stops: stopDetails
    });

    stopDetails.forEach(s => {
      if (!stopsIndex[s.name]) stopsIndex[s.name] = [];
      const exists = stopsIndex[s.name].find(x => x.route_short === short_name && x.direction === directionName);
      if (!exists) {
         stopsIndex[s.name].push({
           route_short: short_name,
           direction: directionName,
           stop_sequence: s.sequence,
           route_file: `${short_name}.json`
         });
      }
    });
  }

  for (let short_name in routeVariations) {
    const data = routeVariations[short_name];
    fs.writeFileSync(path.join(OUT_ROUTES_DIR, `${short_name}.json`), JSON.stringify(data));
    
    indexJson.push({
      route_short: data.short_name,
      long_name: data.long_name,
      direction_count: data.directions.length,
      filename: `${short_name}.json`
    });
  }

  fs.writeFileSync(path.join(OUT_ROUTES_DIR, '_index.json'), JSON.stringify(indexJson));
  fs.writeFileSync(path.join(OUT_DATA_DIR, 'stops_index.json'), JSON.stringify(stopsIndex));

  console.log(`Done! Created ${indexJson.length} route files.`);
  console.log(`Created stops_index.json with ${Object.keys(stopsIndex).length} stops.`);
}

main().catch(console.error);
