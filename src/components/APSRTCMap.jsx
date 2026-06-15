import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getClosestPathIdx } from '../utils/geo';
import { ArrowLeft, Map as MapIcon, Clock } from 'lucide-react';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers
const visitedStopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [15, 24], iconAnchor: [7, 24], popupAnchor: [1, -20], shadowSize: [24, 24]
});

const upcomingStopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [15, 24], iconAnchor: [7, 24], popupAnchor: [1, -20], shadowSize: [24, 24]
});

const currentStopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 32], iconAnchor: [10, 32], popupAnchor: [1, -28], shadowSize: [32, 32]
});

// Create custom bus icon
const createBusIcon = () => {
  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div class="relative w-8 h-8 -ml-4 -mt-4 drop-shadow-xl z-[9999] group">
        <div class="absolute inset-0 bg-ticket-coral rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
        <div class="absolute inset-0 bg-ticket-card rounded-full border-2 border-ticket-coral flex items-center justify-center shadow-[0_0_15px_rgba(255,107,107,0.5)] transition-transform duration-300 group-hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-ticket-coral group-hover:animate-bounce">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function MapBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

export default function APSRTCMap({ routeSummary, routeDetails, routePath, appTheme, onBack }) {
  const [now, setNow] = useState(Date.now());

  // Force re-calc every minute for ETA
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { pathPositions, markers, busPosition, nextStopETA } = useMemo(() => {
    if (!routeDetails || !Array.isArray(routeDetails)) return { pathPositions: [], markers: [], busPosition: null, nextStopETA: null };

    // Sort by sequence just in case
    const stops = [...routeDetails].sort((a, b) => (a.seqNo || 0) - (b.seqNo || 0));

    const positions = stops.map(s => [parseFloat(s.latitude), parseFloat(s.longitude)]);
    
    let busPos = null;
    let nextStop = null;

    // Separate past stops and future stops based on ETA
    const pastStops = stops.filter(s => s.ETA && s.ETA <= now);
    const futureStops = stops.filter(s => s.ETA && s.ETA > now);

    const actualLastVisited = pastStops.length > 0 ? pastStops[pastStops.length - 1] : null;
    nextStop = futureStops.length > 0 ? futureStops[0] : null;

    if (actualLastVisited && nextStop) {
      const departed = actualLastVisited.ETA;
      const arriving = nextStop.ETA;
      
      if (arriving > departed) {
        let progress = (now - departed) / (arriving - departed);
        progress = Math.max(0, Math.min(1, progress)); // clamp between 0 and 1
        
        if (routePath && routePath.length > 0) {
          // Interpolate along the curved OSRM road
          const startIdx = getClosestPathIdx(actualLastVisited.latitude, actualLastVisited.longitude, routePath);
          const endIdx = getClosestPathIdx(nextStop.latitude, nextStop.longitude, routePath);
          
          const currentIdx = Math.floor(startIdx + (endIdx - startIdx) * progress);
          const safeIdx = Math.max(0, Math.min(routePath.length - 1, currentIdx));
          const busPosGeo = routePath[safeIdx];
          busPos = { lat: busPosGeo[0], lng: busPosGeo[1] };
        } else {
          // Fallback to straight line interpolation if OSRM failed
          const lat = parseFloat(actualLastVisited.latitude) + (parseFloat(nextStop.latitude) - parseFloat(actualLastVisited.latitude)) * progress;
          const lng = parseFloat(actualLastVisited.longitude) + (parseFloat(nextStop.longitude) - parseFloat(actualLastVisited.longitude)) * progress;
          busPos = { lat, lng };
        }
      } else {
        busPos = { lat: parseFloat(nextStop.latitude), lng: parseFloat(nextStop.longitude) };
      }
    } else if (actualLastVisited && !nextStop) {
      // Trip completed
      busPos = { lat: parseFloat(actualLastVisited.latitude), lng: parseFloat(actualLastVisited.longitude) };
    } else if (!actualLastVisited && nextStop) {
      // Trip hasn't started
      busPos = { lat: parseFloat(nextStop.latitude), lng: parseFloat(nextStop.longitude) };
    }

    const marks = stops.map((s, idx) => {
      // If the stop's ETA is in the past, it's visited
      const isVisited = s.ETA && s.ETA <= now;
      const isCurrent = actualLastVisited && s.placeId === actualLastVisited.placeId;
      
      let icon = upcomingStopIcon;
      if (isCurrent) icon = currentStopIcon;
      else if (isVisited) icon = visitedStopIcon;

      return {
        ...s,
        position: [parseFloat(s.latitude), parseFloat(s.longitude)],
        icon,
        isVisited,
        isCurrent
      };
    });

    return { pathPositions: routePath && routePath.length > 0 ? routePath : positions, markers: marks, busPosition: busPos, nextStopETA: nextStop };
  }, [routeDetails, routePath, now]); // re-calc smoothly

  const mapUrl = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  const attribution = '&copy; Google Maps';

  const routeName = routeSummary?.routeName || (routeSummary?.sourceName + ' → ' + routeSummary?.destinationName) || 'Loading...';

  const boardingStop = routeDetails?.find(s => s.placeName?.toUpperCase() === routeSummary?.sourceName?.toUpperCase());
  const dropStop = routeDetails?.find(s => s.placeName?.toUpperCase() === routeSummary?.destinationName?.toUpperCase());

  // Determine what to show on the floating card
  let targetStop = nextStopETA;
  let stopLabel = "Next Stop:";
  
  if (boardingStop && (!boardingStop.isVisited && !boardingStop.vtsDepartureTime)) {
    targetStop = boardingStop;
    stopLabel = "ETA at Boarding:";
  } else if (dropStop && (!dropStop.isVisited && !dropStop.vtsArrivalTime)) {
    targetStop = dropStop;
    stopLabel = "ETA at Destination:";
  }

  return (
    <div className="w-full h-full relative flex flex-col">
      {/* Top Bar overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none flex justify-between">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 bg-ticket-card/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-ticket-border/60 text-ticket-cream shadow-lg hover:bg-ticket-surface transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-ticket-muted" />
          <span className="font-bold text-sm tracking-wide">Back</span>
        </button>
      </div>

      {/* Floating Info Card */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none w-[90%] max-w-[400px]">
        <div className="bg-ticket-card/95 backdrop-blur-md border border-ticket-coral/40 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] pointer-events-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-ticket-coral/20 flex items-center justify-center shrink-0">
              <MapIcon className="w-5 h-5 text-ticket-coral" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-ticket-cream leading-tight">{routeName}</h3>
              <p className="text-xs text-ticket-muted flex items-center gap-1 mt-0.5">
                {routeSummary?.serviceType || 'Service'} • {routeSummary?.vehicleNumber || 'Bus'}
              </p>
            </div>
          </div>
          
          <div className="bg-ticket-bg/50 rounded-lg p-3 border border-ticket-border/50">
            {targetStop ? (
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-ticket-muted uppercase tracking-wider">{stopLabel}</span>
                <span className="font-bold text-ticket-coral truncate ml-2 text-right">{targetStop.placeName}</span>
              </div>
            ) : (
              <div className="text-xs text-ticket-muted text-center">Status not available</div>
            )}
            
            {targetStop && targetStop.ETA && (
              <div className="flex items-center gap-1.5 mt-2 justify-end text-ticket-cream">
                <Clock className="w-3.5 h-3.5 text-ticket-coral" />
                <span className="text-xs font-semibold">
                  {new Date(targetStop.ETA).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 z-0 relative">
        <MapContainer center={[13.0, 77.6]} zoom={10} className="w-full h-full" zoomControl={false}>
          <TileLayer url={mapUrl} attribution={attribution} />
          
          {pathPositions.length > 0 && <MapBounds positions={pathPositions} />}
          
          {pathPositions.length > 0 && (
            <Polyline
              positions={pathPositions}
              pathOptions={{ color: '#FF6B6B', weight: 5, opacity: 0.8, lineJoin: 'round', lineCap: 'round' }}
            />
          )}

          {markers.map((stop, idx) => (
            <Marker key={idx} position={stop.position} icon={stop.icon}>
              <Tooltip direction="top" offset={[0, -20]} opacity={1} className="custom-tooltip">
                <div className="font-bold text-ticket-bg px-1 text-sm">{stop.placeName}</div>
                <div className="text-ticket-bg/80 text-xs px-1">
                  Sch: {stop.scheduleArrTime || stop.scheduleDepTime}
                  {stop.ETA && !stop.isVisited && <><br/>ETA: {new Date(stop.ETA).toLocaleTimeString()}</>}
                </div>
              </Tooltip>
            </Marker>
          ))}

          {busPosition && (
            <Marker position={[busPosition.lat, busPosition.lng]} icon={createBusIcon()} zIndexOffset={1000}>
              <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent className="bus-tooltip">
                <div className="font-bold text-ticket-bg text-xs px-1 whitespace-nowrap">
                  {routeSummary?.vehicleNumber || 'Live Bus'}
                </div>
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
