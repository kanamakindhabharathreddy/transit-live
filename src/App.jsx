import React, { useState, useEffect } from 'react';
import { MapPin, Sun, Moon } from 'lucide-react';
import BMTCTab from './components/BMTCTab';
import APSRTCTab from './components/APSRTCTab';

function App() {
  const [appTheme, setAppTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('bmtc');

  // Hoisted BMTC data
  const [indexData, setIndexData] = useState([]);
  const [stopsIndex, setStopsIndex] = useState({});
  const [routeIdMap, setRouteIdMap] = useState({});
  const [stopsCoordinates, setStopsCoordinates] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Sync theme with HTML document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
  }, [appTheme]);

  // Fetch BMTC data on mount
  useEffect(() => {
    Promise.all([
      fetch('/data/routes/_index.json').then(res => res.json()),
      fetch('/data/stops_index.json').then(res => res.json()),
      fetch('/data/route_id_map.json').then(res => res.json()),
      fetch('/data/stops_coordinates.json').then(res => res.json())
    ])
    .then(([routes, stops, rMap, sCoords]) => {
      setIndexData(routes);
      setStopsIndex(stops);
      setRouteIdMap(rMap);
      setStopsCoordinates(sCoords);
      setIsDataLoaded(true);
    })
    .catch(err => console.error('Failed to load BMTC data', err));
  }, []);

  return (
    <div className="min-h-screen text-ticket-cream transition-colors duration-300">
      {/* ── PAGE HEADER ── */}
      <header className="relative max-w-[1400px] mx-auto px-6 pt-10 pb-4 text-center">
        {/* Theme Switcher */}
        <div className="absolute top-6 right-6 flex items-center gap-1 bg-ticket-card border border-ticket-border/60 rounded-full p-1 shadow-lg">
          {[
            { id: 'dark', icon: Moon, label: 'Dark' },
            { id: 'light', icon: Sun, label: 'Light' }
          ].map(theme => (
            <button
              key={theme.id}
              onClick={() => setAppTheme(theme.id)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                appTheme === theme.id ? 'bg-ticket-surface shadow-inner border border-ticket-border/80 scale-105' : 'hover:bg-ticket-surface/50 opacity-70 hover:opacity-100'
              }`}
              title={`${theme.label} theme`}
            >
              {theme.icon && (
                <theme.icon className={`w-4 h-4 ${appTheme === theme.id ? 'text-ticket-coral' : 'text-ticket-muted'}`} />
              )}
            </button>
          ))}
        </div>

        {/* Logo / wordmark */}
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-ticket-coral/15 border border-ticket-coral/30 flex items-center justify-center shadow-lg shadow-ticket-coral/10">
            <MapPin className="w-5 h-5 text-ticket-coral" />
          </div>
          <h1 className="text-3xl md:text-4xl font-fraunces font-black text-ticket-cream tracking-tight">
            Transit Live
          </h1>
        </div>
        
        {/* ── TOP LEVEL TAB TOGGLE ── */}
        <div className="flex justify-center mb-2">
          <div className="flex p-1 bg-ticket-card rounded-lg border border-ticket-border/50 shadow-inner w-full max-w-[350px]">
            <button
              onClick={() => setActiveTab('bmtc')}
              className={`flex-1 py-2 text-sm rounded-md font-fraunces transition-colors duration-200 tracking-wide ${
                activeTab === 'bmtc' 
                  ? 'bg-ticket-surface text-ticket-coral shadow-md border border-ticket-border/80 font-bold' 
                  : 'text-ticket-muted hover:text-ticket-cream/80 font-semibold'
              }`}
            >
              BMTC City Buses
            </button>
            <button
              onClick={() => setActiveTab('apsrtc')}
              className={`flex-1 py-2 text-sm rounded-md font-fraunces transition-colors duration-200 tracking-wide ${
                activeTab === 'apsrtc' 
                  ? 'bg-ticket-surface text-ticket-coral shadow-md border border-ticket-border/80 font-bold' 
                  : 'text-ticket-muted hover:text-ticket-cream/80 font-semibold'
              }`}
            >
              APSRTC Interstate
            </button>
          </div>
        </div>

        <p className="text-ticket-muted text-sm mt-2">
          {activeTab === 'bmtc' 
            ? 'Find your BMTC city bus routes and track them live across Bengaluru'
            : 'Track APSRTC interstate buses between Andhra Pradesh and Bengaluru'}
        </p>

        {/* Gradient divider */}
        <div className="gradient-divider mt-4 mb-2" />
      </header>

      {/* ── TAB CONTENT ── */}
      {activeTab === 'bmtc' ? (
        <BMTCTab 
          indexData={indexData}
          stopsIndex={stopsIndex}
          routeIdMap={routeIdMap}
          stopsCoordinates={stopsCoordinates}
          isDataLoaded={isDataLoaded}
          appTheme={appTheme}
        />
      ) : (
        <APSRTCTab appTheme={appTheme} />
      )}
    </div>
  );
}

export default App;
