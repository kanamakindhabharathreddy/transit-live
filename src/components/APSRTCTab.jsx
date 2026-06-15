import React, { useState } from 'react';
import APSRTCSearch from './APSRTCSearch';
import APSRTCRouteList from './APSRTCRouteList';
import APSRTCMap from './APSRTCMap';
import { useAPSRTC } from '../hooks/useAPSRTC';
import { MapPin } from 'lucide-react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function APSRTCTab({ appTheme }) {
  const {
    isSearching,
    searchResults,
    searchServices,
    selectedRoute,
    setSelectedRoute,
    routeDetails,
    routePath,
    isFetchingDetails,
    stations
  } = useAPSRTC();

  const [activeTab, setActiveTab] = useState('general');

  const now = new Date();
  const currentTimeNum = now.getHours() * 100 + now.getMinutes();

  return (
    <main className="max-w-[1400px] mx-auto px-6 pb-6 flex flex-col md:flex-row gap-6 lg:h-[calc(100vh-170px)] min-h-[calc(100vh-170px)]">
      {/* ── LEFT PANEL: Search & Results ── */}
      <div className={`w-full md:w-[60%] flex-shrink-0 flex-col surface-l1 rounded-xl border border-ticket-border/60 overflow-hidden ${selectedRoute ? 'hidden' : 'flex'}`}>
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <APSRTCSearch onSearch={searchServices} isSearching={isSearching} hasResults={searchResults.length > 0} stations={stations} />
        </div>

        <div className="gradient-divider mx-4" />

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
          {isSearching ? (
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
                <div className="flex flex-col h-full">
                  <div className="flex bg-ticket-card p-1 rounded-lg mb-3 border border-ticket-border/30">
                    <button 
                      onClick={() => setActiveTab('general')}
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'general' ? 'bg-ticket-coral text-ticket-bg shadow-sm' : 'text-ticket-muted hover:text-ticket-cream'}`}
                    >
                      Schedule In General
                    </button>
                    <button 
                      onClick={() => setActiveTab('upcoming')}
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'upcoming' ? 'bg-ticket-coral text-ticket-bg shadow-sm' : 'text-ticket-muted hover:text-ticket-cream'}`}
                    >
                      Upcoming Trips
                    </button>
                  </div>
                  <APSRTCRouteList
                    routes={activeTab === 'upcoming' ? searchResults.filter(s => parseInt(s.departureTimeNum || 0, 10) > currentTimeNum) : searchResults}
                    onSelectRoute={setSelectedRoute}
                    selectedRoute={selectedRoute}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-10 gap-3">
                  <div className="w-12 h-12 rounded-full bg-ticket-card flex items-center justify-center border border-ticket-border/50">
                    <MapPin className="w-5 h-5 text-ticket-border" />
                  </div>
                  <p className="text-ticket-muted text-sm px-4">
                    Type 'From' and 'To' cities to find live APSRTC interstate buses
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Placeholder Map ── */}
      <div className={`w-full md:w-[40%] flex-shrink-0 flex-col surface-l1 rounded-xl border border-ticket-border/60 overflow-hidden relative min-h-[400px] ${selectedRoute ? 'hidden' : 'hidden md:flex'}`}>
        <MapContainer 
          center={[14.0, 78.5]} 
          zoom={6} 
          className="w-full h-full bg-ticket-bg"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url={appTheme === 'dark' ? 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}' : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'}
          />
          <div className="absolute inset-0 bg-ticket-bg/10 pointer-events-none z-[400]" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[400] flex-col gap-4">
            <div className="w-20 h-20 rounded-full bg-ticket-card/90 backdrop-blur-sm border border-ticket-border/50 flex items-center justify-center shadow-xl">
              <MapPin className="h-9 w-9 text-ticket-coral animate-bounce" />
            </div>
            <div className="text-center bg-ticket-card/90 backdrop-blur-sm px-6 py-3 rounded-lg border border-ticket-border/50 shadow-xl">
              <p className="text-ticket-cream font-bold text-sm tracking-wide">Transit Live Route Network</p>
              <p className="text-ticket-muted text-xs mt-1 font-medium">Select an APSRTC service to track</p>
            </div>
          </div>
        </MapContainer>
      </div>

      {/* ── FULL WIDTH MAP VIEW WHEN ROUTE SELECTED ── */}
      {selectedRoute && (
        <div className="flex-1 rounded-xl border border-ticket-border/60 overflow-hidden relative min-h-[400px] flex flex-col">
          <div className="absolute inset-0 bg-ticket-bg">
            <APSRTCMap 
              routeSummary={selectedRoute} 
              routeDetails={routeDetails}
              routePath={routePath}
              appTheme={appTheme} 
              onBack={() => setSelectedRoute(null)} 
            />
          </div>
        </div>
      )}
    </main>
  );
}
