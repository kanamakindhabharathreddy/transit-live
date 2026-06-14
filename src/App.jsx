import React, { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import RouteList from './components/RouteList';
import MapView from './components/MapView';

function App() {
  const [indexData, setIndexData] = useState([]);
  const [stopsIndex, setStopsIndex] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchMode, setSearchMode] = useState('route');

  // Fetch data on mount
  useEffect(() => {
    Promise.all([
      fetch('/data/routes/_index.json').then(res => res.json()),
      fetch('/data/stops_index.json').then(res => res.json())
    ])
    .then(([routes, stops]) => {
      setIndexData(routes);
      setStopsIndex(stops);
      setIsDataLoaded(true);
    })
    .catch(err => console.error("Failed to load data", err));
  }, []);

  const handleSearchRoute = (query) => {
    setSelectedRoute(null); // Clear selection on new search
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const matches = indexData.filter(route => 
      route.route_short.toLowerCase().includes(q) || 
      route.long_name.toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 20));
  };

  const handleSearchFromTo = (fromQuery, toQuery) => {
    setSelectedRoute(null); // Clear selection on new search
    if (!fromQuery.trim() || !toQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const fromQ = fromQuery.toLowerCase();
    const toQ = toQuery.toLowerCase();

    // Find matching stops
    const allStopNames = Object.keys(stopsIndex);
    const fromStops = allStopNames.filter(name => name.toLowerCase().includes(fromQ));
    const toStops = allStopNames.filter(name => name.toLowerCase().includes(toQ));

    if (fromStops.length === 0 || toStops.length === 0) {
      setSearchResults([]);
      return;
    }

    // Accumulate valid routes
    // Set to avoid duplicates: "route_short_direction"
    const validRoutesSet = new Set();
    const validRoutesList = [];

    // Map route_short to its indexData entry for fast lookup
    const indexDataMap = {};
    for (let r of indexData) {
      indexDataMap[r.route_short] = r;
    }

    for (let fStop of fromStops) {
      const fRoutes = stopsIndex[fStop];
      
      for (let tStop of toStops) {
        if (fStop === tStop) continue; // Same stop doesn't make sense
        const tRoutes = stopsIndex[tStop];

        // Find intersections where route_short and direction match, and fSeq < tSeq
        for (let fR of fRoutes) {
          for (let tR of tRoutes) {
            if (fR.route_short === tR.route_short && fR.direction === tR.direction) {
              if (fR.stop_sequence < tR.stop_sequence) {
                const uniqueKey = `${fR.route_short}_${fR.direction}`;
                if (!validRoutesSet.has(uniqueKey)) {
                  validRoutesSet.add(uniqueKey);
                  const baseData = indexDataMap[fR.route_short];
                  if (baseData) {
                    validRoutesList.push({
                      ...baseData,
                      direction: fR.direction // Highlight the specific direction
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // Render max 20 matches to avoid lag
    setSearchResults(validRoutesList.slice(0, 20));
  };

  const handleModeChange = (mode) => {
    setSearchMode(mode);
    setSelectedRoute(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
      <header className="max-w-4xl mx-auto py-8 text-center">
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
          BMTC Bus Finder
        </h1>
        <p className="text-slate-400 text-lg">Find your bus routes and track them in real-time</p>
      </header>

      <main className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Left Panel: Search and List */}
        <div className="w-full md:w-1/3 flex flex-col h-[calc(100vh-200px)]">
          <SearchBar 
            onSearchRoute={handleSearchRoute} 
            onSearchFromTo={handleSearchFromTo} 
            allStops={Object.keys(stopsIndex)}
            onModeChange={handleModeChange}
          />
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {!isDataLoaded ? (
              <div className="text-center py-10 text-slate-500 animate-pulse">Loading transit data...</div>
            ) : searchResults.length > 0 ? (
              <RouteList 
                routes={searchResults} 
                onSelectRoute={setSelectedRoute} 
                selectedRoute={selectedRoute}
                emptyMessage={searchMode === 'fromTo' ? "No direct routes found between these stops." : "No routes found."}
              />
            ) : (
              <div className="text-center py-10 text-slate-500 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <p>Type a route number or select stops to begin</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Map View */}
        <div className="w-full md:w-2/3 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl relative">
          {selectedRoute ? (
            <div className="absolute inset-0">
              <MapView routeSummary={selectedRoute} />
            </div>
          ) : (
             <div className="absolute inset-0 flex items-center justify-center text-slate-500 flex-col space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <p>Select a route from the list to view it on the map</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
