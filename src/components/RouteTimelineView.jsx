import React from 'react';
import { Bus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RouteTimelineView({ stops, buses, userJourney, onBusClick }) {
  // Group buses by nextStop id
  const busesByStopId = {};
  buses.forEach(bus => {
    const stopId = bus.nextStop?.id;
    if (stopId) {
      if (!busesByStopId[stopId]) busesByStopId[stopId] = [];
      busesByStopId[stopId].push(bus);
    }
  });

  const getDistanceToNextBus = (segmentIndex) => {
    // We no longer need distance. We'll use maxBusIdx.
    return Infinity;
  };

  let maxBusIdx = -1;
  stops.forEach((stop, idx) => {
    if (busesByStopId[stop.id] && busesByStopId[stop.id].length > 0) {
      maxBusIdx = idx;
    }
  });

  if (!stops || stops.length === 0) return null;

  return (
    <div className="absolute inset-0 bg-ticket-bg overflow-y-auto pt-24 pb-32 px-4 md:px-8 md:pt-28 lg:pb-8 custom-scrollbar z-0">
      <div className="max-w-xl mx-auto">
        <div className="relative ml-2 md:ml-4 mt-4">
          
          {stops.map((stop, index) => {
            const busesHere = busesByStopId[stop.id] || [];
            const isLast = index === stops.length - 1;
            
            // 1. Is this inside the user's travel journey?
            const isUserJourney = userJourney && index >= userJourney.start && index < userJourney.end;
            const isUserJourneyDot = userJourney && index >= userJourney.start && index <= userJourney.end;
            
            // 2. Is this the bus approaching the pickup?
            let isApproachingPickup = false;
            let isApproachingPickupDot = false;
            if (userJourney && index < userJourney.start) {
               let hasBusBehind = false;
               for (let b = 0; b <= index; b++) {
                 if (busesByStopId[stops[b].id]?.length > 0) {
                   hasBusBehind = true; break;
                 }
               }
               if (hasBusBehind) isApproachingPickup = true;
            }
            if (userJourney && index <= userJourney.start) {
               let hasBusBehind = false;
               for (let b = 0; b <= index; b++) {
                 if (busesByStopId[stops[b].id]?.length > 0) {
                   hasBusBehind = true; break;
                 }
               }
               if (hasBusBehind) isApproachingPickupDot = true;
            }
            
            // --- SEGMENT STYLING ---
            let segmentClass = 'bg-ticket-border/50 w-[3px] opacity-40';
            if (isUserJourney) {
              segmentClass = 'bg-ticket-coral w-[5px] shadow-[0_0_12px_rgba(232,130,92,0.4)] opacity-100 z-10';
            } else if (isApproachingPickup) {
              segmentClass = 'bg-ticket-coral/90 w-[3px] shadow-[0_0_8px_rgba(232,130,92,0.4)] opacity-100 border-l-[3px] border-dashed border-ticket-bg z-0'; // Dashed appearance trick!
            }

            // --- DOT STYLING ---
            let dotClass = 'bg-ticket-bg border-[#4b5563] border-[3px] opacity-100'; // Default Hollow Gray
            let textClass = 'text-ticket-muted opacity-60';
            
            if (isUserJourneyDot) {
              dotClass = 'bg-ticket-coral border-[#ffffff] border-[2px] shadow-[0_0_8px_rgba(232,130,92,0.5)] opacity-100'; // Filled Coral
              textClass = 'text-ticket-cream font-bold opacity-100';
            } else if (isApproachingPickupDot) {
              dotClass = 'bg-[#e8825c] border-ticket-bg border-[3px] opacity-100'; // Filled Coral without shadow for approach
              textClass = 'text-ticket-cream/90 font-medium opacity-100';
            }
            
            // Special Label for Pickup/Drop
            const isPickupStop = userJourney && index === userJourney.start;
            const isDropStop = userJourney && index === userJourney.end;

            return (
              <div key={stop.id + '_' + index} className="relative pl-8 pb-8">
                {/* Timeline Line Segment to NEXT stop */}
                {!isLast && (
                  <div className={`absolute left-[3px] top-4 bottom-[-16px] ${segmentClass} transition-colors duration-500`} />
                )}

                {/* Timeline Dot or Bus Icon */}
                {busesHere.length > 0 ? (
                  <div className="absolute -left-[10.5px] -top-0.5 w-8 h-8 rounded-full bg-ticket-coral text-ticket-bg flex items-center justify-center z-20 shadow-lg shadow-ticket-coral/40 ring-4 ring-ticket-bg animate-bounce-subtle">
                    <Bus className="w-4 h-4" />
                  </div>
                ) : (
                  <div className={`absolute -left-[5.5px] top-1.5 w-5 h-5 rounded-full ${dotClass} z-10 transition-colors duration-500`} />
                )}
                
                {/* Stop Name & Labels */}
                <div className="pt-1.5 flex flex-col">
                  <div className="flex items-center gap-3">
                    <h4 className={`font-medium text-[15px] tracking-tight leading-none ${textClass} transition-colors duration-500`}>
                      {stop.name}
                    </h4>
                    {isPickupStop && (
                      <span className="text-[10px] font-black uppercase tracking-widest bg-ticket-cream text-ticket-bg px-2 py-0.5 rounded shadow-sm">Pickup</span>
                    )}
                    {isDropStop && (
                      <span className="text-[10px] font-black uppercase tracking-widest bg-ticket-cream/20 text-ticket-cream px-2 py-0.5 rounded border border-ticket-cream/40">Drop</span>
                    )}
                  </div>
                </div>
                
                {/* Buses approaching this stop */}
                {busesHere.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2.5">
                    {busesHere.map(bus => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={bus.vehicleid || bus.vehiclenumber}
                        onClick={() => onBusClick && onBusClick(bus)}
                        className="bg-ticket-surface border border-ticket-coral/40 rounded-xl p-3 flex items-center gap-3 w-fit pr-8 cursor-pointer hover:bg-ticket-coral/10 hover:border-ticket-coral transition-all shadow-lg shadow-black/20"
                      >
                        <div className="w-10 h-10 rounded-lg bg-ticket-coral/15 flex items-center justify-center flex-shrink-0">
                          <Bus className="w-5 h-5 text-ticket-coral" />
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-ticket-cream font-bold text-sm tracking-wide">{bus.vehiclenumber}</span>
                            <div className="w-1 h-1 rounded-full bg-ticket-border/60"></div>
                            {bus.isArrivingNow ? (
                              <span className="text-ticket-coral text-xs font-black animate-pulse uppercase tracking-wider">Arriving</span>
                            ) : (
                              <span className="text-ticket-coral text-xs font-black tracking-wide">~{bus.etaMinutes} MIN</span>
                            )}
                          </div>
                          {bus.isTargetPickup && bus.stopsLeftToTarget > 0 && (
                            <span className="text-ticket-muted text-[10px] uppercase tracking-wide mt-1">
                              {bus.stopsLeftToTarget} stops away
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
