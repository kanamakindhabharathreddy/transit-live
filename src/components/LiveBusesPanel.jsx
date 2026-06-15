import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Navigation, ChevronUp, ChevronDown } from 'lucide-react';

export default function LiveBusesPanel({ 
  buses, 
  routeSummary, 
  liveError, 
  onBusClick, 
  selectedBusToPan,
  activeDirectionIdx,
  setActiveDirectionIdx,
  detailsExpanded,
  setDetailsExpanded,
  scheduleData,
  currentSchedule
}) {
  return (
    <div className="h-full w-full flex flex-col">
      {/* Route Info Section */}
      <div className="p-4 border-b border-ticket-border/60 bg-ticket-card/50 flex-shrink-0">
        <h2 className="text-3xl font-fraunces font-black text-ticket-cream flex items-center gap-2">
          <span>{routeSummary?.short_name}</span>
        </h2>
        <p className="text-ticket-muted text-sm mt-1 font-normal truncate w-full" title={routeSummary?.long_name}>
          {routeSummary?.long_name}
        </p>

        {routeSummary?.directions?.length > 1 && !routeSummary.pickup_stop && (
          <div className="mt-4 flex bg-ticket-bg/80 p-1 rounded-lg gap-1 border border-ticket-border shrink-0">
            {routeSummary.directions.map((dir, idx) => (
              <button
                key={idx}
                onClick={() => setActiveDirectionIdx(idx)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all overflow-hidden ${
                  activeDirectionIdx === idx
                    ? 'bg-ticket-coral text-ticket-bg shadow-md shadow-ticket-coral/20'
                    : 'bg-ticket-bg text-ticket-muted border border-ticket-border hover:text-ticket-cream'
                }`}
              >
                <div className="truncate px-2" title={`${dir.direction} ${dir.headsign ? `to ${dir.headsign}` : ''}`}>
                  {dir.direction} {dir.headsign ? `to ${dir.headsign}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}

        {currentSchedule && (
          <>
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm font-medium text-ticket-muted hover:text-ticket-cream transition-colors mx-auto shrink-0"
            >
              {detailsExpanded ? (
                <><ChevronUp className="w-4 h-4" /> Hide details</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> Show details</>
              )}
            </button>

            {detailsExpanded && (
              <div className="mt-3 space-y-4 shrink-0">
                {/* Schedule Card */}
                <div className="bg-ticket-card border border-ticket-border rounded-lg p-3 shadow-inner">
                  <h3 className="text-ticket-cream text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <span className="text-lg">📅</span> Schedule
                  </h3>
                  <div className="space-y-1.5">
                    <p className="text-ticket-muted text-xs">
                      First bus: <span className="font-medium text-ticket-cream">{currentSchedule.first_bus}</span> · Last bus: <span className="font-medium text-ticket-cream">{currentSchedule.last_bus}</span>
                    </p>
                    <p className="text-ticket-muted text-xs">
                      <span className="font-bold text-ticket-coral">{currentSchedule.frequency_label}</span>
                    </p>
                    {scheduleData?.notes && (
                      <p className="text-ticket-muted text-[11px] mt-2 flex items-start gap-1">
                        <span className="font-bold">ⓘ</span> {scheduleData.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Live Buses Header */}
      <div className="px-4 py-3 border-b border-ticket-border/60 bg-ticket-card/95 backdrop-blur-md flex-shrink-0 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-3 h-3">
            {(!liveError && buses.length > 0) && (
              <span className="absolute w-full h-full rounded-full bg-ticket-coral opacity-75 animate-ping"></span>
            )}
            <span className={`relative rounded-full w-2 h-2 ${liveError || buses.length === 0 ? 'bg-ticket-muted/50' : 'bg-ticket-coral'}`}></span>
          </div>
          <h3 className="text-base font-fraunces font-bold text-ticket-cream">Live Buses</h3>
        </div>
        {selectedBusToPan && (
          <button 
            onClick={() => onBusClick(selectedBusToPan)}
            className="text-xs font-semibold text-ticket-muted hover:text-ticket-cream transition-colors bg-ticket-bg px-2.5 py-1 rounded-md border border-ticket-border/60 hover:border-ticket-coral/50"
          >
            Show All
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {liveError ? (
          <div className="mt-2 bg-ticket-coral/10 border border-ticket-coral/30 rounded-lg p-3 text-center">
            <p className="text-ticket-coral text-sm font-medium">{liveError}</p>
          </div>
        ) : buses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-80">
            <Clock className="w-8 h-8 text-ticket-muted mb-3 opacity-50" />
            <p className="text-ticket-muted text-sm px-4">
              No active buses right now.<br/>Try during 6 AM - 10 PM.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <AnimatePresence>
              {buses.map((bus) => {
                const isSelected = selectedBusToPan && selectedBusToPan.vehicleid === bus.vehicleid;
                
                return (
                  <motion.div
                    key={bus.vehicleid || bus.vehiclenumber}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onBusClick(bus)}
                    className={`surface-l2 p-3 rounded-lg border cursor-pointer transition-all duration-200 group flex flex-col gap-2 ${
                      isSelected 
                        ? 'border-ticket-coral bg-ticket-coral/5 shadow-md shadow-ticket-coral/10' 
                        : 'border-ticket-border/40 hover:border-ticket-coral/50 hover:bg-ticket-surface/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm font-semibold text-ticket-cream bg-ticket-bg px-2 py-0.5 rounded border border-ticket-border/50">
                        {bus.vehiclenumber}
                      </div>
                      <div className={`text-sm font-bold ${bus.isArrivingNow ? 'text-ticket-coral animate-pulse' : 'text-ticket-coral'}`}>
                        {bus.isArrivingNow ? 'Arriving now' : `~${bus.etaMinutes} min`}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-0.5 mt-1">
                      <div className="flex items-start gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-ticket-muted mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-ticket-muted leading-tight">
                          {bus.isTargetPickup ? 'Pickup at: ' : 'Next stop: '} 
                          <span className="text-ticket-cream/90 font-medium">{bus.targetStop ? bus.targetStop.name : 'Unknown'}</span>
                          {bus.isTargetPickup && bus.stopsLeftToTarget > 0 && (
                            <span className="text-ticket-coral/80 font-medium ml-1">({bus.stopsLeftToTarget} stops away)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
