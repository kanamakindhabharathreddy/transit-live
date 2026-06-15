import React, { useEffect, useRef } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// Create a custom bus DivIcon using standard HTML/SVG so we don't need renderToString
const busIconHtml = `
  <div style="position: relative; width: 28px; height: 28px;">
    <!-- Smoke particles -->
    <div class="bus-smoke-particle"></div>
    <div class="bus-smoke-particle"></div>
    <div class="bus-smoke-particle"></div>
    
    <!-- Pulsing glow ring -->
    <div style="position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px; background-color: rgba(232,130,92,0.4); border-radius: 50%; animation: pulse 2s infinite;"></div>
    
    <!-- Shaking bus container -->
    <div class="animate-bus-shake" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2;">
      <!-- White border circle -->
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: white; border-radius: 50%; z-index: 1;"></div>
      <!-- Inner blue circle -->
      <div style="position: absolute; top: 3px; left: 3px; right: 3px; bottom: 3px; background-color: #e8825c; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 2;">
        <!-- Tiny bus icon SVG -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14">
          <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" />
        </svg>
      </div>
    </div>
  </div>
`;

const customBusIcon = new L.divIcon({
  html: busIconHtml,
  className: '', // Prevents default leaflet white square background
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Custom Animated Marker Component
function AnimatedMarker({ targetPos, icon, children }) {
  const markerRef = useRef(null);
  const animRef = useRef(null);
  
  // Store the initial position so React Leaflet doesn't instantly snap it
  // when targetPos changes in the parent
  const initialPos = useRef(targetPos);

  useEffect(() => {
    if (!markerRef.current) return;
    const marker = markerRef.current;
    
    const startPos = marker.getLatLng();
    const [targetLat, targetLng] = targetPos;
    
    // Check if it's the exact same position or a massive jump (e.g. initial load)
    const dLat = Math.abs(startPos.lat - targetLat);
    const dLng = Math.abs(startPos.lng - targetLng);
    
    if ((dLat === 0 && dLng === 0) || dLat > 0.05 || dLng > 0.05) {
       marker.setLatLng(targetPos);
       return;
    }
    
    let startTime = null;
    // Animate smoothly over 14.5 seconds (just under the 15s polling interval)
    const duration = 14500; 
    
    const animate = (time) => {
      if (!startTime) startTime = time;
      
      // Linear progress from 0 to 1
      const progress = Math.min((time - startTime) / duration, 1);
      
      const lat = startPos.lat + (targetLat - startPos.lat) * progress;
      const lng = startPos.lng + (targetLng - startPos.lng) * progress;
      
      marker.setLatLng([lat, lng]);
      
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetPos[0], targetPos[1]]);

  return (
    <Marker ref={markerRef} position={initialPos.current} icon={icon} zIndexOffset={1000}>
      {children}
    </Marker>
  );
}

export default function BusMarker({ buses = [] }) {
  if (!buses || buses.length === 0) return null;

  return (
    <>
      {buses.map((bus) => {
        const nextStop = bus.nextStop;

        return (
          <AnimatedMarker 
            key={bus.vehicleid || bus.vehiclenumber || Math.random()} 
            targetPos={[bus.centerlat, bus.centerlong]} 
            icon={customBusIcon}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="!bg-ticket-card !border-ticket-border !text-ticket-cream">
              <div className="text-center min-w-[120px] p-1">
                <div className="font-mono font-semibold bg-ticket-bg text-ticket-coral border-[1.5px] border-dashed border-ticket-coral px-2 py-1.5 rounded-md mb-2 shadow-inner text-sm">
                  🚌 {bus.vehiclenumber}
                </div>
                {nextStop ? (
                  <>
                    <div className="text-xs text-ticket-muted mb-0.5">Next stop: <span className="text-ticket-cream font-medium">{nextStop.name}</span></div>
                    <div className="text-sm font-bold text-ticket-coral mt-1">
                      {bus.isArrivingNow ? 'Arriving now' : `ETA: ~${bus.etaMinutes} min`}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-ticket-muted mt-1">Live position</div>
                )}
              </div>
            </Tooltip>
          </AnimatedMarker>
        );
      })}
    </>
  );
}
