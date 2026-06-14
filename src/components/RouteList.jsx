import React from 'react';
import { motion } from 'framer-motion';
import { Bus, ChevronRight } from 'lucide-react';

export default function RouteList({ routes, onSelectRoute, selectedRoute, emptyMessage = "No routes found." }) {
  if (!routes || routes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[600px] mx-auto flex flex-col gap-3 pb-4">
      {routes.map((route, idx) => {
        const isSelected = selectedRoute && selectedRoute.route_short === route.route_short && selectedRoute.direction === route.direction;
        return (
          <motion.div
            key={route.route_short + '_' + (route.direction || 'base') + '_' + idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: idx * 0.02 }}
            className={`flex flex-row items-center p-4 rounded-xl border cursor-pointer transition-all shadow-sm group text-left ${
              isSelected 
                ? 'bg-slate-700 border-emerald-500 ring-1 ring-emerald-500/50' 
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-blue-500/50'
            }`}
            onClick={() => onSelectRoute(route)}
          >
          {/* Icon on the left */}
          <div className="flex-shrink-0 bg-slate-700/50 text-blue-400 p-2.5 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors mr-4">
            <Bus className="w-6 h-6" />
          </div>
          
          {/* Text content (flex-grow) */}
          <div className="flex-grow flex flex-col items-start overflow-hidden">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-slate-100 leading-none">{route.route_short}</span>
            </div>
            <p className="text-slate-400 text-sm truncate w-full mt-1.5 leading-tight" title={route.long_name}>
              {route.direction ? `(${route.direction}) ` : ''}{route.long_name}
            </p>
          </div>
          
          {/* Chevron on the right */}
          <div className="flex-shrink-0 text-slate-600 group-hover:text-blue-400 ml-4 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </motion.div>
        );
      })}
    </div>
  );
}
