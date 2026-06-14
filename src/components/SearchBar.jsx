import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ArrowRightLeft } from 'lucide-react';

function AutocompleteInput({ value, onChange, onSelect, placeholder, icon: Icon, suggestions, iconColorClass }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className={`h-5 w-5 ${iconColorClass}`} />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-[500] mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              className="px-4 py-2 hover:bg-blue-600 cursor-pointer text-sm text-slate-200"
              onClick={() => {
                onSelect(s);
                setIsOpen(false);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchBar({ onSearchRoute, onSearchFromTo, allStops = [], onModeChange }) {
  const [mode, setMode] = useState('route'); // 'route' or 'fromTo'
  
  // Route mode state
  const [routeQuery, setRouteQuery] = useState('');

  // From-To mode state
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  
  // Track selected exact stops
  const [fromSelected, setFromSelected] = useState('');
  const [toSelected, setToSelected] = useState('');

  // Debounce for route search
  useEffect(() => {
    if (mode === 'route') {
      const timer = setTimeout(() => {
        onSearchRoute(routeQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeQuery, mode]);

  // Trigger fromTo search when exact stops change
  useEffect(() => {
    if (mode === 'fromTo') {
      if (fromSelected && toSelected) {
        onSearchFromTo(fromSelected, toSelected);
      } else {
        onSearchFromTo('', ''); // clear if not both selected
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSelected, toSelected, mode]);

  // Generate suggestions
  const getSuggestions = (query, selected) => {
    if (!query || query === selected) return [];
    const q = query.toLowerCase();
    return allStops.filter(s => s.toLowerCase().includes(q)).slice(0, 10);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-6 space-y-4">
      {/* Mode Toggle */}
      <div className="flex p-1 bg-slate-800 rounded-lg border border-slate-700">
        <button
          onClick={() => handleModeChange('route')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'route' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          By Route Number
        </button>
        <button
          onClick={() => handleModeChange('fromTo')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'fromTo' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          By Bus Stops
        </button>
      </div>

      {/* Inputs */}
      <div className="relative">
        {mode === 'route' ? (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-800 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-lg transition-colors shadow-lg"
              placeholder="Search route (e.g. 500D)..."
              value={routeQuery}
              onChange={(e) => setRouteQuery(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex flex-col space-y-3 p-4 bg-slate-800 border border-slate-700 rounded-xl shadow-lg">
            <AutocompleteInput
              icon={MapPin}
              iconColorClass="text-emerald-400"
              placeholder="From stop (e.g. Silk Board)..."
              value={fromQuery}
              onChange={(val) => { setFromQuery(val); setFromSelected(''); }}
              onSelect={(val) => { setFromQuery(val); setFromSelected(val); }}
              suggestions={getSuggestions(fromQuery, fromSelected)}
            />
            
            <div className="flex justify-center -my-2 relative z-10 pointer-events-none">
              <div className="bg-slate-700 p-1 rounded-full border border-slate-600">
                <ArrowRightLeft className="w-4 h-4 text-slate-400 rotate-90" />
              </div>
            </div>

            <AutocompleteInput
              icon={MapPin}
              iconColorClass="text-rose-400"
              placeholder="To stop (e.g. Hebbal)..."
              value={toQuery}
              onChange={(val) => { setToQuery(val); setToSelected(''); }}
              onSelect={(val) => { setToQuery(val); setToSelected(val); }}
              suggestions={getSuggestions(toQuery, toSelected)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
