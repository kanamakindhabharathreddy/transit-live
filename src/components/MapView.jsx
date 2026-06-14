import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BusMarker from './BusMarker';

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

// Component to automatically fit map bounds to the polyline
function MapBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    // Force a resize calculation to fix grey tile glitches
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  return null;
}

export default function MapView({ routeSummary }) {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDirectionIdx, setActiveDirectionIdx] = useState(0);
  const [liveBuses, setLiveBuses] = useState([]);
  const [liveError, setLiveError] = useState('');
  const [routeIdMap, setRouteIdMap] = useState({});

  useEffect(() => {
    fetch('/data/route_id_map.json')
      .then(res => res.json())
      .then(data => setRouteIdMap(data))
      .catch(err => console.error("Failed to load route id map:", err));
  }, []);

  useEffect(() => {
    if (!routeSummary) return;

    setLoading(true);
    fetch(`/data/routes/${routeSummary.filename}`)
      .then(res => res.json())
      .then(data => {
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
        console.error("Failed to fetch route data:", err);
        setLoading(false);
      });
  }, [routeSummary]);

  // Polling Live BMTC API
  useEffect(() => {
    if (!routeSummary || !routeData) return;

    // Check if we have an ID for this route
    const routeId = routeIdMap[routeSummary.route_short];
    if (!routeId) {
      setLiveError('Live tracking not yet available for this route');
      setLiveBuses([]);
      return;
    }
    
    setLiveError('');

    const fetchLiveBuses = async () => {
      try {
        const res = await fetch('/bmtc-api/WebAPI/SearchByRouteDetails_v4', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'deviceType': 'WEB',
            'lan': 'en'
          },
          body: JSON.stringify({ routeid: routeId, servicetypeid: 0 })
        });
        
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        
        const data = await res.json();
        // Assuming activeDirectionIdx 0 is UP, 1 is DOWN
        const directionKey = activeDirectionIdx === 0 ? 'up' : 'down';
        
        if (data[directionKey] && Array.isArray(data[directionKey].mapData)) {
          setLiveBuses(data[directionKey].mapData);
        } else {
          setLiveBuses([]);
        }
      } catch (err) {
        console.error("Failed to fetch live buses:", err);
      }
    };

    fetchLiveBuses();
    const intervalId = setInterval(fetchLiveBuses, 15000);

    return () => clearInterval(intervalId);
  }, [routeSummary, routeData, activeDirectionIdx, routeIdMap]);

  if (!routeSummary) return null;

  if (loading || !routeData) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-800">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-400">Loading map data...</p>
        </div>
      </div>
    );
  }

  const directionData = routeData.directions[activeDirectionIdx];
  const pathPositions = directionData?.path || [];
  const stops = directionData?.stops || [];

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Map Overlay Controls */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl pointer-events-auto max-w-sm">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400">{routeData.short_name}</span>
          </h2>
          <p className="text-slate-300 text-sm mt-1">{routeData.long_name}</p>
          
          {liveError && (
            <div className="mt-3 bg-amber-900/40 border border-amber-700/50 rounded p-2">
              <p className="text-amber-400 text-xs font-medium">{liveError}</p>
            </div>
          )}

          {!liveError && liveBuses.length === 0 && (
            <div className="mt-3 bg-blue-900/40 border border-blue-700/50 rounded p-2">
              <p className="text-blue-300 text-xs font-medium">No active buses on this route right now. Try during 6 AM - 10 PM.</p>
            </div>
          )}
          
          {routeData.directions.length > 1 && (
            <div className="mt-4 flex bg-slate-800 p-1 rounded-lg">
              {routeData.directions.map((dir, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveDirectionIdx(idx)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeDirectionIdx === idx 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {dir.direction} {dir.headsign ? `to ${dir.headsign}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-slate-800 relative z-0">
        <MapContainer 
          center={[12.9716, 77.5946]} // Bangalore center
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          {/* Dark themed map tiles */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {pathPositions.length > 0 && (
            <>
              <Polyline 
                positions={pathPositions} 
                color="#3b82f6" 
                weight={5} 
                opacity={0.8}
              />
              <MapBounds positions={pathPositions} />
            </>
          )}

          {stops.map((stop, idx) => (
            <Marker key={stop.id + '_' + idx} position={[stop.lat, stop.lon]} icon={stopIcon}>
              <Popup className="custom-popup">
                <div className="font-semibold text-slate-800">{stop.name}</div>
                <div className="text-xs text-slate-500">Stop Sequence: {stop.sequence}</div>
              </Popup>
            </Marker>
          ))}

          {/* Real-time Bus Markers */}
          {liveBuses.length > 0 && (
            <BusMarker buses={liveBuses} />
          )}

        </MapContainer>
      </div>
    </div>
  );
}
