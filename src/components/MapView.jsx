import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Clock, ChevronDown, ChevronUp, Sun, Moon, Bus, Map as MapIcon, List as ListIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BusMarker from './BusMarker';
import LiveBusesPanel from './LiveBusesPanel';
import RouteTimelineView from './RouteTimelineView';
import { getClosestPathIdx, getDistance } from '../utils/geo';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create a custom smaller icon for bus stops
const stopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [15, 24],
  iconAnchor: [7, 24],
  popupAnchor: [1, -20],
  shadowSize: [24, 24]
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [1, -28],
  shadowSize: [32, 32]
});

const dropIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [1, -28],
  shadowSize: [32, 32]
});

// Inner component to fit the map bounds to the route path
function MapBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

// Inner component to handle panning to a selected bus
function MapPanController({ selectedBus }) {
  const map = useMap();
  useEffect(() => {
    if (selectedBus && selectedBus.centerlat && selectedBus.centerlong) {
      map.flyTo([selectedBus.centerlat, selectedBus.centerlong], 16, { animate: true, duration: 1.2 });
    }
  }, [selectedBus, map]);
  return null;
}

export default function MapView({ routeSummary, appTheme, onBack }) {
  // ─── ALL HOOKS MUST BE AT THE TOP, BEFORE ANY EARLY RETURNS ───────────────
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDirectionIdx, setActiveDirectionIdx] = useState(0);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [liveBuses, setLiveBuses] = useState([]);
  const [liveError, setLiveError] = useState('');
  const [routeIdMap, setRouteIdMap] = useState({});
  const [schedulesMap, setSchedulesMap] = useState({});
  const [selectedBusToPan, setSelectedBusToPan] = useState(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  
  const routeCache = useRef({});

  useEffect(() => {
    Promise.all([
      fetch('/data/route_id_map.json').then(res => res.json()),
      fetch('/data/schedules.json').then(res => res.json()).catch(() => ({}))
    ]).then(([routeMap, schedules]) => {
      setRouteIdMap(routeMap);
      setSchedulesMap(schedules);
    }).catch(err => console.error('Failed to load map/schedule data:', err));
  }, []);

  useEffect(() => {
    if (!routeSummary) return;
    setDetailsExpanded(false);
    setSelectedBusToPan(null); // Reset selected bus on route change
    setIsMobileDrawerOpen(false);

    if (routeCache.current[routeSummary.filename]) {
      const data = routeCache.current[routeSummary.filename];
      setRouteData(data);
      let initialDirIdx = 0;
      if (routeSummary.direction) {
        const matchIdx = data.directions.findIndex(d => d.direction === routeSummary.direction);
        if (matchIdx !== -1) initialDirIdx = matchIdx;
      }
      setActiveDirectionIdx(initialDirIdx);
      return;
    }

    setLoading(true);
    fetch(`/data/routes/${routeSummary.filename}`)
      .then(res => res.json())
      .then(data => {
        routeCache.current[routeSummary.filename] = data;
        setRouteData(data);
        let initialDirIdx = 0;
        if (routeSummary.direction) {
          const matchIdx = data.directions.findIndex(d => d.direction === routeSummary.direction);
          if (matchIdx !== -1) initialDirIdx = matchIdx;
        }
        setActiveDirectionIdx(initialDirIdx);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch route data:', err);
        setLoading(false);
      });
  }, [routeSummary]);

  // Polling Live BMTC API
  useEffect(() => {
    if (!routeSummary || !routeData) return;

    const routeId = routeIdMap[routeSummary.route_short];
    if (!routeId) {
      setLiveError('Live tracking not yet available for this route');
      setLiveBuses([]);
      return;
    }

    setLiveError('');
    let active = true;
    const controller = new AbortController();

    const fetchLiveBuses = async () => {
      try {
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

        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const data = await res.json();
        if (!active) return;

        const directionKey = activeDirectionIdx === 0 ? 'up' : 'down';
        if (data[directionKey] && Array.isArray(data[directionKey].mapData)) {
          setLiveBuses(data[directionKey].mapData);
        } else {
          setLiveBuses([]);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch live buses:', err);
      }
    };

    fetchLiveBuses();
    const intervalId = setInterval(fetchLiveBuses, 15000);

    return () => {
      active = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [routeSummary, routeData, activeDirectionIdx, routeIdMap]);

  // Derived data — safe to compute even if routeData is null
  const directionData = routeData?.directions?.[activeDirectionIdx];
  const pathPositions = directionData?.path || [];
  const stops = directionData?.stops || [];
  const scheduleData = routeData ? schedulesMap[routeData.short_name] : null;
  const currentSchedule = scheduleData ? scheduleData[activeDirectionIdx === 0 ? 'up' : 'down'] : null;

  // Pre-calculate path indexes for stops for performance
  const stopsWithPathIdx = useMemo(() => {
    if (!stops.length || !pathPositions.length) return [];
    return stops.map(stop => ({
      ...stop,
      pathIdx: getClosestPathIdx(stop.lat, stop.lon, pathPositions)
    }));
  }, [stops, pathPositions]);

  // Enrich live buses with their next stop and ETA, and build a Set of next stop IDs
  const { enrichedBuses, nextStopsSet, pickupStopInfo, dropStopInfo } = useMemo(() => {
    const enriched = [];
    const set = new Set();

    if (!liveBuses.length || !stopsWithPathIdx.length) {
      return { enrichedBuses: enriched, nextStopsSet: set, pickupStopInfo: null, dropStopInfo: null };
    }

    let pInfo = null;
    let dInfo = null;
    
    // Calculate once for the whole hook
    if (routeSummary.pickup_stop) {
      const pIdx = stopsWithPathIdx.findIndex(s => s.name === routeSummary.pickup_stop.name);
      if (pIdx !== -1) pInfo = { stop: stopsWithPathIdx[pIdx], index: pIdx };
    }
    if (routeSummary.drop_stop) {
      const dIdx = stopsWithPathIdx.findIndex(s => s.name === routeSummary.drop_stop.name);
      if (dIdx !== -1) dInfo = { stop: stopsWithPathIdx[dIdx], index: dIdx };
    }

    for (const bus of liveBuses) {
      const busIdx = getClosestPathIdx(bus.centerlat, bus.centerlong, pathPositions);
      
      let immediateNextStopIdx = stopsWithPathIdx.length - 1;
      for (let i = 0; i < stopsWithPathIdx.length; i++) {
        if (stopsWithPathIdx[i].pathIdx >= busIdx) {
          immediateNextStopIdx = i;
          break;
        }
      }

      let targetStop = stopsWithPathIdx[immediateNextStopIdx];
      let stopsLeftToTarget = 0;
      let isTargetPickup = false;

      // Filter out buses that have already passed the pickup point
      if (pInfo && immediateNextStopIdx > pInfo.index) {
        continue;
      }

      if (pInfo && pInfo.index >= immediateNextStopIdx) {
        targetStop = pInfo.stop;
        stopsLeftToTarget = pInfo.index - immediateNextStopIdx;
        isTargetPickup = true;
      }
      
      // Calculate ETA
      let distanceKm = 0;
      let isArrivingNow = false;
      let etaMinutes = 0;
      
      if (targetStop) {
        distanceKm = getDistance(bus.centerlat, bus.centerlong, targetStop.lat, targetStop.lon);
        isArrivingNow = distanceKm < 0.1; // 100 meters
        etaMinutes = Math.round((distanceKm / 15) * 60);
      }
      
      enriched.push({ 
        ...bus, 
        nextStop: stopsWithPathIdx[immediateNextStopIdx],
        targetStop,
        distanceKm,
        isArrivingNow,
        etaMinutes,
        stopsLeftToTarget,
        isTargetPickup
      });
      
      if (targetStop?.id) set.add(targetStop.id);
    }

    enriched.sort((a, b) => {
      // Prioritize straight-line distance to target (which is pickup stop if applicable)
      return a.distanceKm - b.distanceKm;
    });

    return { enrichedBuses: enriched, nextStopsSet: set, pickupStopInfo: pInfo, dropStopInfo: dInfo };
  }, [liveBuses, stopsWithPathIdx, pathPositions, routeSummary.pickup_stop, routeSummary.drop_stop]);

  // Handlers
  const handleBusClick = (bus) => {
    setSelectedBusToPan(prev => prev && (prev.vehicleid || prev.vehiclenumber) === (bus.vehicleid || bus.vehiclenumber) ? null : bus);
    if (isMobileDrawerOpen) {
      setIsMobileDrawerOpen(false);
    }
  };

  // ─── EARLY RETURNS (after all hooks) ──────────────────────────────────────
  if (!routeSummary) return null;

  if (loading || !routeData) {
    return (
      <div className="relative h-full w-full flex flex-col bg-ticket-bg">
        <div className="absolute top-4 left-4 right-4 z-[400] max-w-sm">
          <div className="bg-ticket-surface/80 backdrop-blur-xl p-4 rounded-xl border border-ticket-border shadow-2xl animate-pulse">
            <div className="h-8 bg-ticket-border rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-ticket-border rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  const maxBusPathIdx = enrichedBuses.length > 0 
    ? Math.max(...enrichedBuses.map(bus => getClosestPathIdx(bus.centerlat, bus.centerlong, pathPositions))) 
    : -1;

  const busesToRender = selectedBusToPan 
    ? enrichedBuses.filter(b => (b.vehicleid || b.vehiclenumber) === (selectedBusToPan.vehicleid || selectedBusToPan.vehiclenumber))
    : enrichedBuses;

  // ─── FULL RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full flex flex-col lg:flex-row overflow-hidden rounded-xl">
      
      {/* ── DESKTOP LEFT DETAILS PANEL (Visible >= lg) ── */}
      <div className="hidden lg:flex w-[380px] flex-shrink-0 surface-l1 border-r border-ticket-border/60 z-10 flex-col overflow-hidden">
        {/* Route Header & Back Button */}
        <div className="p-5 border-b border-ticket-border/40 shrink-0 bg-ticket-card">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-ticket-muted hover:text-ticket-coral transition-colors text-sm font-bold mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Search
          </button>
          
          <h2 className="text-3xl font-fraunces font-black text-ticket-cream leading-none tracking-tight mb-1.5">
            {routeData.short_name}
          </h2>
          <p className="text-sm text-ticket-muted font-medium leading-snug">
            {directionData?.headsign ? `To ${directionData.headsign}` : 'Route Details'}
          </p>
        </div>

        {/* Live Buses Panel */}
        <div className="flex-1 overflow-hidden bg-ticket-bg">
          <LiveBusesPanel 
            buses={busesToRender}
            routeSummary={{ ...routeData, pickup_stop: routeSummary?.pickup_stop, drop_stop: routeSummary?.drop_stop }}
            liveError={liveError}
            onBusClick={handleBusClick}
            selectedBusToPan={selectedBusToPan}
            activeDirectionIdx={activeDirectionIdx}
            setActiveDirectionIdx={setActiveDirectionIdx}
            detailsExpanded={detailsExpanded}
            setDetailsExpanded={setDetailsExpanded}
            scheduleData={scheduleData}
            currentSchedule={currentSchedule}
          />
        </div>
      </div>

      {/* ── MAP / TIMELINE CONTAINER (flex-1) ── */}
      <div className="relative flex-1 flex flex-col min-h-[400px]">
        {/* Toggle Control Overlay */}
        <div className="absolute top-4 right-4 z-[450] pointer-events-auto">
          <div className="bg-ticket-surface/90 backdrop-blur-md p-1 rounded-xl border border-ticket-border shadow-lg flex items-center">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === 'map' ? 'bg-ticket-coral text-ticket-bg shadow-md' : 'text-ticket-muted hover:text-ticket-cream hover:bg-ticket-bg'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Map View</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === 'list' ? 'bg-ticket-coral text-ticket-bg shadow-md' : 'text-ticket-muted hover:text-ticket-cream hover:bg-ticket-bg'
              }`}
            >
              <ListIcon className="w-4 h-4" />
              <span className="hidden sm:inline">List View</span>
            </button>
          </div>
        </div>

        {/* Mobile: Back Button & Route Info */}
        <div className="lg:hidden absolute top-4 left-4 right-4 z-[400] pointer-events-none transition-all duration-300 flex items-start gap-2">
          
          <button 
            onClick={onBack}
            className="w-12 h-12 rounded-xl bg-ticket-surface/90 backdrop-blur-md border border-ticket-border shadow-lg flex items-center justify-center text-ticket-cream pointer-events-auto hover:bg-ticket-card transition-colors flex-shrink-0"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="bg-ticket-surface/80 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-ticket-border pointer-events-auto shadow-lg shadow-black/20 flex flex-col justify-center max-w-[calc(100%-3rem-0.5rem)]">
            <span className="text-xl font-fraunces font-black text-ticket-cream leading-none truncate">
              {routeData.short_name}
            </span>
            {selectedBusToPan && selectedBusToPan.targetStop ? (
              <span className="text-[11px] font-medium text-ticket-coral mt-1 leading-none truncate" title={`Next Stop: ${selectedBusToPan.targetStop.name}`}>
                Next: {selectedBusToPan.targetStop.name}
              </span>
            ) : directionData?.headsign ? (
              <span className="text-[11px] font-medium text-ticket-muted mt-1 leading-none truncate" title={`To ${directionData.headsign}`}>
                To {directionData.headsign}
              </span>
            ) : null}
          </div>
        </div>

        {/* Map or List Background */}
        <div className="flex-1 bg-ticket-bg relative z-0">
          {viewMode === 'map' ? (
            <MapContainer
              center={[12.9716, 77.5946]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
              />

              {pathPositions.length > 0 && (
                <>
                  {/* Base Uncovered Path (Gray) */}
                  <Polyline
                    positions={pathPositions}
                    color="#4b5563"
                    weight={4}
                    opacity={0.6}
                  />

                  {/* Covered Path (Bright Blue) */}
                  {maxBusPathIdx >= 0 && (
                    <Polyline
                      positions={pathPositions.slice(0, maxBusPathIdx + 1)}
                      color="#0ea5e9"
                      weight={4}
                      opacity={0.9}
                    />
                  )}

                  {/* User Journey Path (Coral) */}
                  {pickupStopInfo && dropStopInfo && (
                    <Polyline
                      positions={pathPositions.slice(pickupStopInfo.stop.pathIdx, dropStopInfo.stop.pathIdx + 1)}
                      color="#e8825c"
                      weight={7}
                      opacity={1}
                    />
                  )}
                  <MapBounds positions={pathPositions} />
                  <MapPanController selectedBus={selectedBusToPan} />
                </>
              )}

              {stops.map((stop, idx) => {
                const isNextStop = nextStopsSet.has(stop.id);
                const isPickup = pickupStopInfo && pickupStopInfo.stop.id === stop.id;
                const isDrop = dropStopInfo && dropStopInfo.stop.id === stop.id;
                const isCovered = stop.pathIdx <= maxBusPathIdx;
                
                let isUserJourney = false;
                if (pickupStopInfo && dropStopInfo) {
                  if (stop.pathIdx > pickupStopInfo.stop.pathIdx && stop.pathIdx < dropStopInfo.stop.pathIdx) {
                    isUserJourney = true;
                  }
                }

                // Dynamic icon creation
                let dotColor = '#4b5563'; // Uncovered (Gray)
                if (isUserJourney) dotColor = '#e8825c'; // User Journey (Coral)
                else if (isCovered) dotColor = '#0ea5e9'; // Covered (Blue)
                
                let dotHtml;
                if (isCovered) {
                  // Filled dot for covered routes
                  dotHtml = `<div style="width: 12px; height: 12px; background-color: ${dotColor}; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`;
                } else {
                  // Hollow dot for uncovered routes
                  dotHtml = `<div style="width: 12px; height: 12px; background-color: #ffffff; border: 3px solid ${dotColor}; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`;
                }

                const stopDotIcon = new L.divIcon({
                  html: dotHtml,
                  className: '',
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
                });
                
                let iconToUse = stopDotIcon;
                if (isPickup) iconToUse = pickupIcon;
                else if (isDrop) iconToUse = dropIcon;

                return (
                  <Marker key={stop.id + '_' + idx} position={[stop.lat, stop.lon]} icon={iconToUse} zIndexOffset={isPickup || isDrop ? 1000 : 0}>
                    <Tooltip
                      direction="top"
                      offset={[0, -10]}
                      permanent={isNextStop}
                      className={isNextStop
                        ? '!bg-ticket-surface/90 !text-ticket-cream !border-ticket-border !text-[12px] !px-2 !py-1 !rounded shadow-lg whitespace-nowrap'
                        : 'font-bold text-slate-800'}
                      opacity={0.95}
                    >
                      {stop.name}
                    </Tooltip>
                  </Marker>
                );
              })}

              {busesToRender.length > 0 && (
                <BusMarker buses={busesToRender} />
              )}
            </MapContainer>
          ) : (
            <RouteTimelineView 
              stops={stopsWithPathIdx}
              buses={busesToRender}
              userJourney={pickupStopInfo && dropStopInfo ? { start: pickupStopInfo.index, end: dropStopInfo.index } : null}
              onBusClick={(bus) => {
                setViewMode('map');
                handleBusClick(bus);
              }}
            />
          )}
        </div>
      </div>

      {/* ── MOBILE/TABLET FLOATING ACTION BUTTON (< lg) ── */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex items-center gap-2 bg-ticket-coral text-ticket-bg px-5 py-3 rounded-full font-bold shadow-lg shadow-ticket-coral/20 hover:scale-105 transition-transform"
        >
          <Bus className="w-5 h-5" />
          <span>Live Buses ({enrichedBuses.length})</span>
          {(!liveError && enrichedBuses.length > 0) && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ticket-bg opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-ticket-bg"></span>
            </span>
          )}
        </button>
      </div>

      {/* ── MOBILE/TABLET BOTTOM DRAWER (< lg) ── */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="lg:hidden absolute inset-0 bg-black/60 backdrop-blur-sm z-[450]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden absolute bottom-0 left-0 right-0 h-[60vh] bg-ticket-bg z-[500] rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-ticket-border/60 flex flex-col overflow-hidden"
            >
              {/* Drawer Pull Handle */}
              <div 
                className="w-full flex justify-center py-3 bg-ticket-card/50 border-b border-ticket-border/40 cursor-grab active:cursor-grabbing flex-shrink-0"
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                <div className="w-12 h-1.5 rounded-full bg-ticket-border"></div>
              </div>
              
              {/* Drawer Content */}
              <div className="flex-1 overflow-hidden">
                <LiveBusesPanel 
                  buses={enrichedBuses} 
                  routeSummary={{ ...routeData, pickup_stop: routeSummary?.pickup_stop, drop_stop: routeSummary?.drop_stop }} 
                  liveError={liveError} 
                  onBusClick={handleBusClick}
                  selectedBusToPan={selectedBusToPan}
                  activeDirectionIdx={activeDirectionIdx}
                  setActiveDirectionIdx={setActiveDirectionIdx}
                  detailsExpanded={detailsExpanded}
                  setDetailsExpanded={setDetailsExpanded}
                  scheduleData={scheduleData}
                  currentSchedule={currentSchedule}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
