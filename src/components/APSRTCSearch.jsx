import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, ArrowRightLeft } from 'lucide-react';

function AutocompleteInput({ label, value, onChange, onSelect, placeholder, stations }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStations = value.trim()
    ? stations.filter(s => (s.placeName || '').toLowerCase().includes(value.toLowerCase())).slice(0, 50)
    : [];

  return (
    <div className="p-3 relative" ref={wrapperRef}>
      <label className="text-[10px] uppercase font-bold text-ticket-muted tracking-wider mb-1 block pl-1">{label}</label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
          <MapPin className="h-4 w-4 text-ticket-muted group-focus-within:text-ticket-coral transition-colors duration-200" />
        </div>
        <input
          type="text"
          className="block w-full pl-7 pr-3 py-1.5 border-none bg-transparent text-sm text-ticket-cream placeholder-ticket-muted/50 focus:outline-none focus:ring-0"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (value.trim()) setIsOpen(true);
          }}
        />
      </div>

      {isOpen && filteredStations.length > 0 && (
        <div className="absolute z-[100] left-0 right-0 mt-2 bg-ticket-card border border-ticket-border shadow-xl rounded-lg max-h-60 overflow-y-auto custom-scrollbar">
          {filteredStations.map((station) => (
            <button
              key={station.id}
              className="w-full text-left px-4 py-2 text-sm text-ticket-cream hover:bg-ticket-surface border-b border-ticket-border/50 last:border-0 truncate"
              onClick={() => {
                onSelect(station);
                setIsOpen(false);
              }}
            >
              {station.placeName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function APSRTCSearch({ onSearch, isSearching, hasResults, stations = [] }) {
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (hasResults) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [hasResults]);

  const handleSearch = () => {
    if (fromPlace && toPlace) {
      onSearch(fromPlace, toPlace);
    }
  };

  const handleSelectFrom = (place) => {
    setFromPlace(place);
    setFromQuery(place.placeName);
  };

  const handleSelectTo = (place) => {
    setToPlace(place);
    setToQuery(place.placeName);
  };

  return (
    <div className="w-full space-y-3">
      <div className="relative z-20">
        {isCollapsed && fromPlace && toPlace ? (
          <div className="flex items-center justify-between bg-ticket-card border border-ticket-border/60 rounded-lg shadow-sm p-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <MapPin className="w-4 h-4 text-ticket-coral flex-shrink-0" />
              <div className="flex items-center gap-2 truncate text-sm font-semibold text-ticket-cream">
                <span className="truncate">{fromPlace.placeName}</span>
                <span className="text-ticket-muted text-xs">→</span>
                <span className="truncate">{toPlace.placeName}</span>
              </div>
            </div>
            <button 
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 hover:bg-ticket-surface rounded-md text-ticket-muted hover:text-ticket-cream transition-colors flex-shrink-0"
              title="Edit Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0 bg-ticket-card/70 border border-ticket-border/50 rounded-lg shadow-inner overflow-visible">
            
            <AutocompleteInput 
              label="From City" 
              placeholder="e.g. KUPPAM" 
              value={fromQuery}
              onChange={(val) => {
                setFromQuery(val);
                setFromPlace(null);
              }}
              onSelect={handleSelectFrom}
              stations={stations}
            />

            <div className="flex items-center px-3 -my-2 relative z-10">
              <div className="h-[1px] bg-ticket-border/30 flex-1" />
              <div 
                className="mx-2 bg-ticket-bg p-1.5 rounded-full border border-ticket-border/60 shadow cursor-pointer hover:bg-ticket-surface transition-colors group flex-shrink-0"
                onClick={() => {
                  const tQuery = fromQuery;
                  const tPlace = fromPlace;
                  setFromQuery(toQuery);
                  setFromPlace(toPlace);
                  setToQuery(tQuery);
                  setToPlace(tPlace);
                }}
                title="Swap To and From"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-ticket-muted group-hover:text-ticket-cream rotate-90 transition-colors" />
              </div>
              <div className="h-[1px] bg-ticket-border/30 flex-1" />
            </div>

            <AutocompleteInput 
              label="To City" 
              placeholder="e.g. TIRUPATHI" 
              value={toQuery}
              onChange={(val) => {
                setToQuery(val);
                setToPlace(null);
              }}
              onSelect={handleSelectTo}
              stations={stations}
            />

          </div>

          <button
            onClick={handleSearch}
            disabled={isSearching || !fromPlace || !toPlace}
            className="w-full bg-ticket-coral hover:bg-ticket-coral/90 disabled:opacity-50 disabled:cursor-not-allowed text-ticket-bg font-bold py-3 px-4 rounded-lg shadow-md shadow-ticket-coral/10 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            {isSearching ? 'Searching Services...' : 'Search Services'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
