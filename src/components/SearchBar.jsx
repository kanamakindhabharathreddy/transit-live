import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ArrowRightLeft, Clock, Navigation, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDistance } from '../utils/geo';

function AutocompleteInput({ value, onChange, onSelect, placeholder, icon: Icon, suggestions, iconColorClass }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative group" ref={wrapperRef}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Icon className={`h-4 w-4 transition-colors ${isOpen ? iconColorClass : 'text-ticket-muted'}`} />
      </div>
      <input
        type="text"
        className="block w-full pl-11 pr-4 py-3 border border-ticket-border/50 rounded-lg leading-5 bg-ticket-card/70 text-ticket-cream placeholder-ticket-muted/60 focus:outline-none focus:ring-1 focus:ring-ticket-coral/50 focus:border-ticket-coral/60 transition-all duration-200 text-sm shadow-inner"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setIsOpen(false);
            if (suggestions.length > 0 && !value) {
              onSelect(suggestions[0]);
            } else if (onSelect && value) {
              onSelect(value);
            }
          }
        }}
        onFocus={() => setIsOpen(true)}
      />

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-[500] mt-1.5 w-full bg-ticket-card border border-ticket-border/80 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.5)] max-h-48 overflow-y-auto custom-scrollbar py-1">
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              className="px-4 py-2.5 hover:bg-ticket-surface cursor-pointer text-sm text-ticket-cream transition-colors border-b border-ticket-border/20 last:border-0 flex items-center gap-2.5"
              onClick={() => {
                onSelect(s);
                setIsOpen(false);
              }}
            >
              <MapPin className="w-3.5 h-3.5 text-ticket-muted flex-shrink-0" />
              <span className="truncate">{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchBar({ onSearchRoute, onSearchFromTo, onSearchStop, allStops = [], stopsCoordinates = {}, onModeChange, hasResults = false }) {
  const [mode, setMode] = useState('route');

  const [routeQuery, setRouteQuery] = useState('');
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSelected, setFromSelected] = useState('');
  const [toSelected, setToSelected] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (hasResults) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [hasResults]);

  const [recentRoutes, setRecentRoutes] = useState([]);
  const [recentFromTo, setRecentFromTo] = useState([]);

  const [nearbyStops, setNearbyStops] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState(null);

  useEffect(() => {
    try {
      const savedRoutes = JSON.parse(localStorage.getItem('bmtc_recent_routes') || '[]');
      const savedFromTo = JSON.parse(localStorage.getItem('bmtc_recent_fromto') || '[]');
      setRecentRoutes(savedRoutes.slice(0, 3));
      setRecentFromTo(savedFromTo.slice(0, 3));
    } catch (e) {}
  }, []);

  const saveRecentRoute = (query) => {
    if (!query.trim()) return;
    const q = query.trim().toUpperCase();
    const updated = [q, ...recentRoutes.filter(r => r !== q)].slice(0, 3);
    setRecentRoutes(updated);
    localStorage.setItem('bmtc_recent_routes', JSON.stringify(updated));
  };

  const saveRecentFromTo = (from, to) => {
    if (!from || !to) return;
    if (!from.trim() || !to.trim()) return;
    const f = from.trim();
    const t = to.trim();
    const isDuplicate = (item) => item.from === f && item.to === t;
    const updated = [{from: f, to: t}, ...recentFromTo.filter(i => !isDuplicate(i))].slice(0, 3);
    setRecentFromTo(updated);
    localStorage.setItem('bmtc_recent_fromto', JSON.stringify(updated));
  };

  // Debounce for route search
  useEffect(() => {
    if (mode === 'route') {
      const timer = setTimeout(() => {
        onSearchRoute(routeQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeQuery, mode]);

  // Trigger fromTo search when exact stops change
  useEffect(() => {
    if (mode === 'fromTo') {
      if (fromSelected && toSelected) {
        saveRecentFromTo(fromSelected, toSelected);
        onSearchFromTo(fromSelected, toSelected);
      } else {
        onSearchFromTo('', '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSelected, toSelected, mode]);

  const getSuggestions = (query, selected) => {
    if (!query || query === selected) return [];
    const q = query.toLowerCase();
    return allStops.filter(s => s.toLowerCase().includes(q)).slice(0, 10);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  const handleFindNearby = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError('');
    setLocationAccuracy(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocationAccuracy(accuracy);
        findClosestStops(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        setLocationError('Unable to retrieve your location. Please check your browser permissions.');
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  };

  const findClosestStops = (lat, lon) => {
    if (!stopsCoordinates) return;
    
    const distances = [];
    for (const [stopName, coords] of Object.entries(stopsCoordinates)) {
      const d = getDistance(lat, lon, coords.lat, coords.lon);
      distances.push({ name: stopName, distance: d });
    }
    
    distances.sort((a, b) => a.distance - b.distance);
    setNearbyStops(distances.slice(0, 5));
  };

  return (
    <div className="w-full space-y-3">
      {/* ── Segmented Mode Toggle ── */}
      <div className="relative flex p-1 bg-ticket-card rounded-lg border border-ticket-border/50 shadow-inner">
        {/* Animated sliding indicator */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-md bg-ticket-bg shadow-md border border-ticket-border/80"
          initial={false}
          animate={{
            left: mode === 'route' ? '4px' : mode === 'fromTo' ? '33.33%' : '66.66%',
            right: mode === 'route' ? '66.66%' : mode === 'fromTo' ? '33.33%' : '4px',
          }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        />
        <button
          onClick={() => handleModeChange('route')}
          className={`relative flex-1 py-2 text-xs rounded-md z-10 font-semibold transition-colors duration-200 ${
            mode === 'route' ? 'text-ticket-cream' : 'text-ticket-muted hover:text-ticket-cream/80'
          }`}
        >
          By Route
        </button>
        <button
          onClick={() => handleModeChange('fromTo')}
          className={`relative flex-1 py-2 text-xs rounded-md z-10 font-semibold transition-colors duration-200 ${
            mode === 'fromTo' ? 'text-ticket-cream' : 'text-ticket-muted hover:text-ticket-cream/80'
          }`}
        >
          By Stops
        </button>
        <button
          onClick={() => handleModeChange('nearby')}
          className={`relative flex-1 py-2 text-xs rounded-md z-10 font-semibold transition-colors duration-200 ${
            mode === 'nearby' ? 'text-ticket-cream' : 'text-ticket-muted hover:text-ticket-cream/80'
          }`}
        >
          Nearby
        </button>
      </div>

      {/* ── Inputs ── */}
      <div className="relative z-20">
        {isCollapsed && (mode === 'route' && routeQuery ? (
          <div className="flex items-center justify-between bg-ticket-card border border-ticket-border/60 rounded-lg shadow-sm p-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <Search className="w-4 h-4 text-ticket-coral flex-shrink-0" />
              <div className="truncate text-sm font-semibold text-ticket-cream">
                Route: {routeQuery}
              </div>
            </div>
            <button 
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 hover:bg-ticket-surface rounded-md text-ticket-muted hover:text-ticket-cream transition-colors flex-shrink-0"
              title="Edit Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
          </div>
        ) : mode === 'fromTo' && (fromSelected || fromQuery) && (toSelected || toQuery) ? (
          <div className="flex items-center justify-between bg-ticket-card border border-ticket-border/60 rounded-lg shadow-sm p-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <MapPin className="w-4 h-4 text-ticket-coral flex-shrink-0" />
              <div className="flex items-center gap-2 truncate text-sm font-semibold text-ticket-cream">
                <span className="truncate">{fromSelected || fromQuery}</span>
                <span className="text-ticket-muted text-xs">→</span>
                <span className="truncate">{toSelected || toQuery}</span>
              </div>
            </div>
            <button 
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 hover:bg-ticket-surface rounded-md text-ticket-muted hover:text-ticket-cream transition-colors flex-shrink-0"
              title="Edit Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
          </div>
        ) : null)}

        {!isCollapsed && (mode === 'route' ? (
          <>
            <div className="flex gap-2">
            <div className="relative group flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-ticket-muted group-focus-within:text-ticket-coral transition-colors duration-200" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-3 border border-ticket-border/50 rounded-lg text-sm bg-ticket-card/70 text-ticket-cream placeholder-ticket-muted/60 focus:outline-none focus:ring-1 focus:ring-ticket-coral/50 focus:border-ticket-coral/60 transition-all duration-200 shadow-inner"
                placeholder="Search route (e.g. 500D)..."
                value={routeQuery}
                onChange={(e) => setRouteQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveRecentRoute(routeQuery);
                    onSearchRoute(routeQuery);
                  }
                }}
              />
            </div>
            <button 
              onClick={() => { saveRecentRoute(routeQuery); onSearchRoute(routeQuery); }}
              className="bg-ticket-coral hover:bg-ticket-coral/90 text-ticket-bg font-bold px-5 rounded-lg shadow-md shadow-ticket-coral/10 transition-colors flex-shrink-0"
            >
              Search
            </button>
          </div>
          {!hasResults && recentRoutes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-ticket-border/30">
              <div className="flex items-center gap-1.5 text-ticket-muted text-xs font-semibold mb-3 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                <span>Recent Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentRoutes.map((route, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setRouteQuery(route);
                      onSearchRoute(route);
                      saveRecentRoute(route);
                    }}
                    className="px-3 py-1.5 bg-ticket-card hover:bg-ticket-surface border border-ticket-border/60 rounded-full text-xs text-ticket-cream transition-colors"
                  >
                    {route}
                  </button>
                ))}
              </div>
            </div>
          )}
          </>
        ) : mode === 'fromTo' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0 bg-ticket-card/70 border border-ticket-border/50 rounded-lg shadow-inner overflow-visible">
              <div className="p-3">
                <AutocompleteInput
                  icon={MapPin}
                  iconColorClass="text-ticket-coral"
                  placeholder="From stop (e.g. Silk Board)..."
                  value={fromQuery}
                  onChange={(val) => { setFromQuery(val); setFromSelected(''); }}
                  onSelect={(val) => { setFromQuery(val); setFromSelected(val); }}
                  suggestions={getSuggestions(fromQuery, fromSelected)}
                />
              </div>

              {/* Swap divider */}
              <div className="flex items-center px-3">
                <div className="gradient-divider flex-1" />
                <div 
                  className="mx-2 bg-ticket-bg p-1.5 rounded-full border border-ticket-border/60 shadow cursor-pointer hover:bg-ticket-surface transition-colors group flex-shrink-0"
                  onClick={() => {
                    const tempQuery = fromQuery;
                    const tempSelected = fromSelected;
                    setFromQuery(toQuery);
                    setFromSelected(toSelected);
                    setToQuery(tempQuery);
                    setToSelected(tempSelected);
                  }}
                  title="Swap To and From"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-ticket-muted group-hover:text-ticket-cream rotate-90 transition-colors" />
                </div>
                <div className="gradient-divider flex-1" />
              </div>

              <div className="p-3">
                <AutocompleteInput
                  icon={MapPin}
                  iconColorClass="text-ticket-coral"
                  placeholder="To stop (e.g. Hebbal)..."
                  value={toQuery}
                  onChange={(val) => { setToQuery(val); setToSelected(''); }}
                  onSelect={(val) => { setToQuery(val); setToSelected(val); }}
                  suggestions={getSuggestions(toQuery, toSelected)}
                />
              </div>
            </div>
            
            <button 
              onClick={() => {
                const f = fromSelected || fromQuery;
                const t = toSelected || toQuery;
                saveRecentFromTo(f, t);
                onSearchFromTo(f, t);
              }}
              className="w-full bg-ticket-coral hover:bg-ticket-coral/90 text-ticket-bg font-bold py-3 rounded-lg shadow-md shadow-ticket-coral/10 transition-colors"
            >
              Search Buses
            </button>

            {!hasResults && recentFromTo.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ticket-border/30">
                <div className="flex items-center gap-1.5 text-ticket-muted text-xs font-semibold mb-3 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recent Searches</span>
                </div>
                <div className="flex flex-col gap-2">
                  {recentFromTo.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setFromQuery(item.from);
                        setFromSelected(item.from);
                        setToQuery(item.to);
                        setToSelected(item.to);
                        saveRecentFromTo(item.from, item.to);
                        onSearchFromTo(item.from, item.to);
                      }}
                      className="flex items-center gap-2 p-2.5 bg-ticket-card hover:bg-ticket-surface border border-ticket-border/60 rounded-lg text-xs text-ticket-cream transition-colors text-left group"
                    >
                      <div className="flex-1 truncate">
                        <span className="font-semibold">{item.from}</span>
                        <span className="text-ticket-muted mx-1.5 inline-block group-hover:text-ticket-cream/80 transition-colors">to</span>
                        <span className="font-semibold">{item.to}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleFindNearby}
              disabled={isLocating}
              className="w-full bg-ticket-coral hover:bg-ticket-coral/90 text-ticket-bg font-bold py-3 px-4 rounded-lg shadow-md shadow-ticket-coral/10 transition-colors flex items-center justify-center gap-2"
            >
              {isLocating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Navigation className="w-5 h-5" />
              )}
              {isLocating ? 'Finding location...' : 'Find My Location'}
            </button>
            
            {locationError && (
              <div className="text-red-400 text-xs text-center px-2 py-1 bg-red-400/10 rounded border border-red-400/20">
                {locationError}
              </div>
            )}

            {locationAccuracy > 1000 && !isLocating && !locationError && (
              <div className="text-ticket-coral/80 text-[11px] text-center px-2">
                Note: Browser location accuracy is low (~{(locationAccuracy/1000).toFixed(1)}km). This happens on PCs without GPS.
              </div>
            )}

            {nearbyStops.length > 0 && !hasResults && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="text-ticket-muted text-xs font-semibold mb-1 uppercase tracking-wider pl-1">
                  Closest Stops
                </div>
                {nearbyStops.map((stop, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSearchStop(stop.name)}
                    className="flex flex-col p-3 bg-ticket-card hover:bg-ticket-surface border border-ticket-border/60 rounded-lg text-ticket-cream transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{stop.name}</span>
                      <span className="text-xs text-ticket-coral bg-ticket-coral/10 px-2 py-1 rounded-full">
                        {stop.distance < 1 ? `${Math.round(stop.distance * 1000)}m` : `${stop.distance.toFixed(1)}km`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
