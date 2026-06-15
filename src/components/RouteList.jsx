import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const RouteList = React.memo(function RouteList({ routes, onSelectRoute, selectedRoute, emptyMessage = 'No routes found.' }) {
  if (!routes || routes.length === 0) {
    return (
      <div className="text-center py-8 text-ticket-muted text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {routes.map((route, idx) => {
        const isSelected = selectedRoute && selectedRoute.filename === route.filename;
        return (
          <motion.div
            key={route.route_short + '_' + (route.direction || 'base') + '_' + idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.2 }}
            className={`flex flex-row items-center p-3 rounded-lg cursor-pointer transition-all duration-150 group ${
              isSelected
                ? 'surface-l3-coral bg-gradient-to-r from-ticket-coral/10 to-ticket-surface/80 border-l-[3px] border-l-ticket-coral border-y border-r border-y-ticket-border/40 border-r-ticket-border/40'
                : 'bg-ticket-card/40 border border-transparent hover:bg-ticket-surface/50 hover:border-ticket-border/40'
            }`}
            onClick={() => onSelectRoute(route)}
          >
            {/* Route badge — Level 2 */}
            <div className={`flex-shrink-0 font-mono font-semibold px-2.5 py-1.5 rounded-md text-sm mr-3 border transition-colors ${
              isSelected
                ? 'bg-ticket-coral/15 text-ticket-coral border-ticket-coral/40'
                : 'bg-ticket-bg/60 text-ticket-coral border-ticket-coral/25 group-hover:border-ticket-coral/40'
            }`}>
              {route.route_short}
            </div>

            {/* Route name */}
            <div className="flex-grow overflow-hidden">
              <p
                className="text-ticket-cream/90 font-medium text-xs truncate leading-tight"
                title={route.long_name}
              >
                {route.direction ? `(${route.direction}) ` : ''}{route.long_name}
              </p>
            </div>

            {/* Chevron */}
            <div className={`flex-shrink-0 ml-2 transition-colors ${
              isSelected ? 'text-ticket-coral' : 'text-ticket-muted/50 group-hover:text-ticket-muted'
            }`}>
              <ChevronRight className="w-4 h-4" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

export default RouteList;
