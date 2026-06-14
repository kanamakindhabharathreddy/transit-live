import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// Create a custom bus DivIcon using standard HTML/SVG so we don't need renderToString
const busIconHtml = `
  <div style="background-color: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
    </svg>
  </div>
`;

const customBusIcon = new L.divIcon({
  html: busIconHtml,
  className: '', // Prevents default leaflet white square background
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function BusMarker({ buses = [] }) {
  if (!buses || buses.length === 0) return null;

  return (
    <>
      {buses.map((bus) => (
        <Marker 
          key={bus.vehicleid || bus.vehiclenumber || Math.random()} 
          position={[bus.centerlat, bus.centerlong]} 
          icon={customBusIcon} 
          zIndexOffset={1000}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.9} className="font-bold text-slate-800">
            {bus.vehiclenumber}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
