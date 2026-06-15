import React, { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import RouteList from './RouteList';
import MapView from './MapView';
import { MapPin, Sun, Moon } from 'lucide-react';
import { getClosestPathIdx, getDistance } from '../utils/geo';

function BMTCTab({ indexData, stopsIndex, routeIdMap, stopsCoordinates, isDataLoaded, appTheme }) {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingBuses, setIsSearchingBuses] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchMode, setSearchMode] = useState('route');

  const handleSearchRoute = (query) => {
    setSelectedRoute(null);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const normalize = (str) => str.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const q = normalize(query);
    const qLower = query.toLowerCase();

    const matches = indexData.filter(route =>
      (route.route_short && normalize(route.route_short).includes(q)) ||
      (route.long_name && route.long_name.toLowerCase().includes(qLower))
    );
    setSearchResults(matches.slice(0, 20));
  };

  const handleSearchStop = async (stopName) => {
    setSelectedRoute(null);
    if (!stopName || !stopsIndex[stopName]) {
      setSearchResults([]);
      return;
    }

    setIsSearchingBuses(true);
    setSearchResults([]);

    const routesForStop = stopsIndex[stopName];
    // Deduplicate routes by route_short and direction
    const uniqueRoutes = [];
    const seen = new Set();
    const indexDataMap = {};
    for (let r of indexData) {
      indexDataMap[r.route_short] = r;
    }

    for (let r of routesForStop) {
      const key = `${r.route_short}_${r.direction}`;
      if (!seen.has(key)) {
        seen.add(key);
        const baseData = indexDataMap[r.route_short];
        if (baseData) {
          uniqueRoutes.push({
            ...baseData,
            direction: r.direction,
            pickup_stop: { name: stopName, sequence: r.stop_sequence }
          });
        }
      }
    }

    const limitedList = uniqueRoutes.slice(0, 15);

    if (limitedList.length === 0) {
      setIsSearchingBuses(false);
      return;
    }

    const promises = limitedList.map(async (route) => {
      const routeId = routeIdMap[route.route_short];
      if (!routeId) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch('/bmtc-api/WebAPI/SearchByRouteDetails_v4', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'deviceType': 'WEB',
            'lan': 'en'
          },
          body: JSON.stringify({ routeid: routeId, servicetypeid: 0 }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        if (!res.ok) return;
        const data = await res.json();
        
        const dir = route.direction?.toLowerCase();
        let mapDataToUse = [];
        if (dir === 'up') mapDataToUse = data.up?.mapData || [];
        else if (dir === 'down') mapDataToUse = data.down?.mapData || [];
        else mapDataToUse = [...(data.up?.mapData || []), ...(data.down?.mapData || [])];

        let hasBusForDir = false;
        let minDistanceKm = Infinity;

        if (mapDataToUse.length > 0) {
          try {
            const fileName = route.filename || `${route.route_short}.json`;
            const routeRes = await fetch(`/data/routes/${fileName}`, { signal: controller.signal });
            const rData = await routeRes.json();
            
            const dirData = rData.directions?.find(d => d.direction.toLowerCase() === dir);
            if (dirData && dirData.path && dirData.stops) {
              const pathPositions = dirData.path;
              const pInfoIndex = dirData.stops.findIndex(s => s.name === stopName);
              
              if (pInfoIndex !== -1) {
                const stopsWithPathIdx = dirData.stops.map(stop => ({
                  ...stop,
                  pathIdx: getClosestPathIdx(stop.lat, stop.lon, pathPositions)
                }));
                
                for (const bus of mapDataToUse) {
                  const busIdx = getClosestPathIdx(bus.centerlat, bus.centerlong, pathPositions);
                  
                  let immediateNextStopIdx = stopsWithPathIdx.length - 1;
                  for (let i = 0; i < stopsWithPathIdx.length; i++) {
                    if (stopsWithPathIdx[i].pathIdx >= busIdx) {
                      immediateNextStopIdx = i;
                      break;
                    }
                  }
                  
                  if (immediateNextStopIdx <= pInfoIndex) {
                    hasBusForDir = true;
                    const pStop = dirData.stops[pInfoIndex];
                    const d = getDistance(bus.centerlat, bus.centerlong, pStop.lat, pStop.lon);
                    if (d < minDistanceKm) {
                      minDistanceKm = d;
                    }
                  }
                }
              }
            }
          } catch(e) {}
        }

        if (hasBusForDir) {
          route.nearestBusDistance = minDistanceKm;
          setSearchResults(prev => {
            if (prev.some(r => r.route_short === route.route_short && r.direction === route.direction)) return prev;
            return [...prev, route].sort((a, b) => (a.nearestBusDistance || 0) - (b.nearestBusDistance || 0));
          });
        }
      } catch (err) {}
    });

    await Promise.allSettled(promises);
    setIsSearchingBuses(false);
  };

  const handleSearchFromTo = async (fromQuery, toQuery) => {
    setSelectedRoute(null);
    if (!fromQuery.trim() || !toQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const fromQ = fromQuery.toLowerCase();
    const toQ = toQuery.toLowerCase();

    const allStopNames = Object.keys(stopsIndex);
    const fromStops = allStopNames.filter(name => name.toLowerCase().includes(fromQ));
    const toStops = allStopNames.filter(name => name.toLowerCase().includes(toQ));

    if (fromStops.length === 0 || toStops.length === 0) {
      setSearchResults([]);
      return;
    }

    const validRoutesSet = new Set();
    const validRoutesList = [];

    const indexDataMap = {};
    for (let r of indexData) {
      indexDataMap[r.route_short] = r;
    }

    for (let fStop of fromStops) {
      const fRoutes = stopsIndex[fStop];
      for (let tStop of toStops) {
        if (fStop === tStop) continue;
        const tRoutes = stopsIndex[tStop];
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
                      direction: fR.direction,
                      pickup_stop: { name: fStop, sequence: fR.stop_sequence },
                      drop_stop: { name: tStop, sequence: tR.stop_sequence }
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    const limitedList = validRoutesList.slice(0, 15);
    
    if (limitedList.length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearchingBuses(true);
    setSearchResults([]); // Clear existing results while searching

    const promises = limitedList.map(async (route) => {
      const routeId = routeIdMap[route.route_short];
      if (!routeId) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch('/bmtc-api/WebAPI/SearchByRouteDetails_v4', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'deviceType': 'WEB',
            'lan': 'en'
          },
          body: JSON.stringify({ routeid: routeId, servicetypeid: 0 }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) return;
        const data = await res.json();
        
        const hasUp = data.up?.mapData && data.up.mapData.length > 0;
        const hasDown = data.down?.mapData && data.down.mapData.length > 0;
        
        const dir = route.direction?.toLowerCase();
        let mapDataToUse = [];
        if (dir === 'up') mapDataToUse = data.up?.mapData || [];
        else if (dir === 'down') mapDataToUse = data.down?.mapData || [];
        else mapDataToUse = [...(data.up?.mapData || []), ...(data.down?.mapData || [])];

        let hasBusForDir = false;

        if (mapDataToUse.length > 0) {
          try {
            const fileName = route.filename || `${route.route_short}.json`;
            const routeRes = await fetch(`/data/routes/${fileName}`, { signal: controller.signal });
            const rData = await routeRes.json();
            
            const dirData = rData.directions?.find(d => d.direction.toLowerCase() === dir);
            if (dirData && dirData.path && dirData.stops) {
              const pathPositions = dirData.path;
              const pInfoIndex = dirData.stops.findIndex(s => s.name === route.pickup_stop.name);
              
              if (pInfoIndex !== -1) {
                const stopsWithPathIdx = dirData.stops.map(stop => ({
                  ...stop,
                  pathIdx: getClosestPathIdx(stop.lat, stop.lon, pathPositions)
                }));
                
                let activeBusesBeforePickup = 0;
                let minDistanceKm = Infinity;
                
                for (const bus of mapDataToUse) {
                  const busIdx = getClosestPathIdx(bus.centerlat, bus.centerlong, pathPositions);
                  
                  let immediateNextStopIdx = stopsWithPathIdx.length - 1;
                  for (let i = 0; i < stopsWithPathIdx.length; i++) {
                    if (stopsWithPathIdx[i].pathIdx >= busIdx) {
                      immediateNextStopIdx = i;
                      break;
                    }
                  }
                  
                  if (immediateNextStopIdx <= pInfoIndex) {
                    activeBusesBeforePickup++;
                    const pStop = dirData.stops[pInfoIndex];
                    const d = getDistance(bus.centerlat, bus.centerlong, pStop.lat, pStop.lon);
                    if (d < minDistanceKm) {
                      minDistanceKm = d;
                    }
                  }
                }
                
                if (activeBusesBeforePickup > 0) {
                  hasBusForDir = true;
                  route.nearestBusDistance = minDistanceKm;
                }
              }
            }
          } catch(e) {
            // Error occurred during filtering, default to false
          }
        }

        if (hasBusForDir) {
          setSearchResults(prev => {
            if (prev.some(r => r.route_short === route.route_short && r.direction === route.direction)) {
              return prev;
            }
            const updated = [...prev, route];
            return updated.sort((a, b) => (a.nearestBusDistance || 0) - (b.nearestBusDistance || 0));
          });
        }
      } catch (err) {
        // Ignore timeout or network errors for individual routes to not block the rest
      }
    });

    await Promise.allSettled(promises);
    setIsSearchingBuses(false);
  };

  const handleModeChange = (mode) => {
    setSearchMode(mode);
    setSelectedRoute(null);
  };

  return (
      <main className="max-w-[1400px] mx-auto px-6 pb-6 flex flex-col md:flex-row gap-6 lg:h-[calc(100vh-170px)] min-h-[calc(100vh-170px)]">

        {/* ── CONDITIONAL LAYOUT: Search Panel vs MapView ── */}
        {/* ── CONDITIONAL LAYOUT: Search Panel vs MapView ── */}
        {/* ── LEFT PANEL: Search & Results ── */}
        <div className={`w-full md:w-[380px] flex-shrink-0 flex-col surface-l1 rounded-xl border border-ticket-border/60 overflow-hidden ${selectedRoute ? 'hidden' : 'flex'}`}>
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
                <SearchBar
                  onSearchRoute={handleSearchRoute}
                  onSearchFromTo={handleSearchFromTo}
                  onSearchStop={handleSearchStop}
                  allStops={Object.keys(stopsIndex)}
                  stopsCoordinates={stopsCoordinates}
                  onModeChange={handleModeChange}
                  hasResults={searchResults.length > 0 || isSearchingBuses}
                />
              </div>

              <div className="gradient-divider mx-4" />

              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
                {(!isDataLoaded || (isSearchingBuses && searchResults.length === 0)) ? (
                  <div className="flex flex-col gap-3 px-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-ticket-border/40">
                        <div className="skeleton-shimmer rounded-md w-16 h-10 flex-shrink-0" />
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="skeleton-shimmer rounded h-3 w-3/4" />
                          <div className="skeleton-shimmer rounded h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {searchResults.length > 0 ? (
                      <RouteList
                        routes={searchResults}
                        onSelectRoute={setSelectedRoute}
                        selectedRoute={selectedRoute}
                        emptyMessage=""
                      />
                    ) : (
                      !isSearchingBuses && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-10 gap-3">
                          <div className="w-12 h-12 rounded-full bg-ticket-card flex items-center justify-center border border-ticket-border/50">
                            <MapPin className="w-5 h-5 text-ticket-border" />
                          </div>
                          <p className="text-ticket-muted text-sm px-4">
                            {searchMode === 'fromTo'
                              ? 'No active live buses found between these stops right now. Try again later.' 
                              : 'Type a route number or\nselect stops to begin'}
                          </p>
                        </div>
                      )
                    )}
                    {isSearchingBuses && searchResults.length > 0 && (
                      <div className="mt-3 flex flex-col gap-3 px-1 opacity-60">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-ticket-border/40">
                           <div className="skeleton-shimmer rounded-md w-14 h-8 flex-shrink-0" />
                           <div className="skeleton-shimmer rounded h-2 w-1/2" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>


            {/* ── RIGHT PANEL: Placeholder Map ── */}
            <div className={`flex-1 surface-l1 rounded-xl border border-ticket-border/60 overflow-hidden relative min-h-[400px] ${selectedRoute ? 'hidden' : 'hidden md:flex'}`}>
              <div className="absolute inset-0 flex items-center justify-center text-ticket-muted flex-col gap-4">
                <div className="w-20 h-20 rounded-full bg-ticket-card border border-ticket-border/50 flex items-center justify-center shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-ticket-border" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-ticket-cream/60 font-medium text-sm">Select a route to view it on the map</p>
                  <p className="text-ticket-muted/50 text-xs mt-1">Live tracking available for most routes</p>
                </div>
              </div>
            </div>

            {/* ── FULL WIDTH MAP VIEW WHEN ROUTE SELECTED ── */}
            {selectedRoute && (
              <div className="flex-1 rounded-xl border border-ticket-border/60 overflow-hidden relative min-h-[400px] flex flex-col">
                <div className="absolute inset-0 bg-ticket-bg">
                  <MapView 
                    routeSummary={selectedRoute} 
                    appTheme={appTheme} 
                    onBack={() => setSelectedRoute(null)} 
                  />
                </div>
              </div>
            )}
      </main>
  );
}

export default BMTCTab;
