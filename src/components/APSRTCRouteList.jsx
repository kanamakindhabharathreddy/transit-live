import React from 'react';
import { motion } from 'framer-motion';
import { Bus, Clock, MapPin, Navigation } from 'lucide-react';

export default function APSRTCRouteList({ routes, onSelectRoute, selectedRoute }) {
  const getServiceColorClass = (serviceType) => {
    const s = serviceType?.toUpperCase() || '';
    if (s.includes('SUPER LUXURY')) return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    if (s.includes('EXPRESS')) return 'text-ticket-coral bg-ticket-coral/10 border-ticket-coral/30';
    if (s.includes('PALLEVELUGU') && !s.includes('ULTRA')) return 'text-green-400 bg-green-400/10 border-green-400/30';
    if (s.includes('METRO EXPRESS')) return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
    if (s.includes('ULTRA DELUXE')) return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    if (s.includes('ULTRA PALLEVELUGU')) return 'text-teal-400 bg-teal-400/10 border-teal-400/30';
    return 'text-ticket-cream bg-ticket-cream/10 border-ticket-cream/30'; // default
  };

  return (
    <div className="flex flex-col gap-3 px-1 pb-4">
      <div className="flex items-center justify-between mb-1 px-1">
        <h3 className="text-ticket-muted text-xs font-bold uppercase tracking-wider">
          {routes.length} Active Services Found
        </h3>
      </div>

      {routes.map((route, idx) => {
        const isSelected = selectedRoute && (selectedRoute.serviceDocId === route.serviceDocId);
        
        // Data from /services/all contains rich schedule information
        const docId = route.serviceDocId || '';
        const parts = docId.split('_');
        const depotName = parts.length > 0 ? parts[parts.length - 1] : 'Unknown';
        
        const vehicleNumber = route.oprsNo || 'Unknown Bus';
        const serviceType = route.serviceType || 'APSRTC Service';
        const routeName = (route.sourceName && route.destinationName) 
          ? `${route.sourceName} → ${route.destinationName}` 
          : `Towards ${depotName}`;
          
        let depTime = '--:--';
        if (route.serviceStartTime) {
          depTime = route.serviceStartTime;
        } else if (route.departureTimeNum) {
          const h = Math.floor(route.departureTimeNum / 100);
          const m = route.departureTimeNum % 100;
          depTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
        
        return (
          <motion.div
            key={docId || idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.2 }}
          >
            <button
              onClick={() => onSelectRoute(route)}
              className={`w-full flex p-4 rounded-xl border text-left transition-all duration-200 group relative overflow-hidden ${
                isSelected 
                  ? 'bg-ticket-surface border-ticket-coral/50 shadow-[0_0_15px_rgba(255,107,107,0.15)] ring-1 ring-ticket-coral/20' 
                  : 'bg-ticket-card border-ticket-border/60 hover:bg-ticket-surface hover:border-ticket-border'
              }`}
            >
              {/* LEFT SIDE: Service Type & Bus/Depot */}
              <div className="flex-1 flex flex-col justify-center pr-4 border-r border-ticket-border/30">
                <span className={`self-start text-[9px] font-bold px-2 py-0.5 rounded-sm border uppercase tracking-wide mb-2 ${getServiceColorClass(serviceType)}`}>
                  {serviceType}
                </span>
                
                <div className="font-semibold text-sm text-ticket-cream leading-tight mb-1.5">
                  {routeName}
                </div>
                
                <div className="flex items-center gap-1.5 mt-auto">
                  <Bus className="w-3.5 h-3.5 text-ticket-muted" />
                  <span className="text-[10px] font-mono font-medium text-ticket-muted uppercase tracking-wider">
                    {vehicleNumber} • {depotName}
                  </span>
                </div>
              </div>

              {/* RIGHT SIDE: Time & Track Button */}
              <div className="flex flex-col items-end justify-center pl-4 min-w-[80px]">
                <div className="text-2xl font-bold tabular-nums text-ticket-cream mb-1">
                  {depTime}
                </div>
                
                <div className={`mt-auto p-2 rounded-full border transition-all ${
                  isSelected 
                    ? 'bg-ticket-coral text-ticket-bg border-ticket-coral' 
                    : 'bg-ticket-bg/50 text-ticket-muted border-ticket-border/50 group-hover:text-ticket-cream group-hover:border-ticket-border'
                }`}>
                  <Navigation className={`w-4 h-4 ${isSelected ? 'animate-pulse' : ''}`} />
                </div>
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
