import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = '/api/apsrtc';
const HEADers = {
  'Content-Type': 'application/json',
  'deviceType': 'WEB'
};

export function useAPSRTC() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  
  const osrmCache = useRef({});
  
  const [stations, setStations] = useState([]);
  
  // Fetch stations on mount
  useEffect(() => {
    fetch(`${API_BASE}/places/all`, {
      method: 'POST',
      headers: HEADers,
      body: JSON.stringify({
        userId: "1363789069449",
        versionCode: "8",
        apiVersion: 1
      })
    })
    .then(res => res.json())
    .then(data => {
      // /places/all returns { status: 'success', placeInfos: [...] }
      if (data && data.status === 'success' && data.placeInfos) {
        // Filter out junk/minor stops to match official site behavior
        const filteredStations = data.placeInfos.filter(
          p => p.isTransPoint === '1' || p.isSector === 'Y'
        );
        setStations(filteredStations);
      }
    })
    .catch(err => console.error('Failed to load APSRTC stations:', err));
  }, []);
  
  const pollIntervalRef = useRef(null);

  // Search function
  const searchServices = async (fromPlace, toPlace) => {
    if (!fromPlace || !toPlace || !fromPlace.id || !toPlace.id) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedRoute(null);
    setRouteDetails(null);

    try {
      const res = await fetch(`${API_BASE}/services/all`, {
        method: 'POST',
        headers: HEADers,
        body: JSON.stringify({
          sourceLinkId: fromPlace.id,
          sourcePlaceId: fromPlace.id,
          destinationLinkId: toPlace.id,
          destinationPlaceId: toPlace.id,
          userId: "1363789069449",
          versionCode: "8",
          apiVersion: 1
        })
      });

      if (!res.ok) throw new Error('Failed to fetch services for route');
      
      const allServicesResponse = await res.json();
      const matches = allServicesResponse.data || [];
      
      // The original app filters client-side by exactMatch: true
      const exactMatches = matches
        .filter(s => s.exactMatch === true)
        .sort((a, b) => {
          const timeA = parseInt(a.departureTimeNum || 0, 10);
          const timeB = parseInt(b.departureTimeNum || 0, 10);
          return timeA - timeB;
        });
      
      setSearchResults(exactMatches);
    } catch (err) {
      console.error('APSRTC Search Error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchRouteDetails = useCallback(async (docId) => {
    try {
      const res = await fetch(`${API_BASE}/servicewaypointdetails/bydocid`, {
        method: 'POST',
        headers: HEADers,
        body: JSON.stringify({ docId })
      });
      if (!res.ok) return null;
      const resJson = await res.json();
      return resJson.data || [];
    } catch (err) {
      console.error('APSRTC Details Error:', err);
      return null;
    }
  }, []);

  // Poll route logic
  useEffect(() => {
    if (!selectedRoute) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const docId = selectedRoute.serviceDocId || selectedRoute.docId;
    if (!docId) return;

    let isMounted = true;

    const fetchOSRMRoute = async (stops) => {
      if (osrmCache.current[docId]) {
        setRoutePath(osrmCache.current[docId]);
        return;
      }
      try {
        const sorted = [...stops].sort((a,b) => (a.seqNo || 0) - (b.seqNo || 0));
        // Construct coordinate string lon,lat;lon,lat
        const coords = sorted.map(s => `${s.longitude},${s.latitude}`).join(';');
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            // map geojson [lon, lat] to leaflet [lat, lon]
            const pathGeo = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            osrmCache.current[docId] = pathGeo;
            if (isMounted) setRoutePath(pathGeo);
          }
        }
      } catch (err) {
        console.error('OSRM fetch error:', err);
      }
    };

    const poll = async () => {
      const details = await fetchRouteDetails(docId);
      if (isMounted && details) {
        setRouteDetails(details);
        setIsFetchingDetails(false);
        // Only fetch OSRM once if we don't have it yet for this docId
        if (!osrmCache.current[docId] && details.length > 0) {
          fetchOSRMRoute(details);
        } else if (osrmCache.current[docId]) {
          setRoutePath(osrmCache.current[docId]);
        }
      }
    };

    setIsFetchingDetails(true);
    poll(); // Initial fetch
    
    pollIntervalRef.current = setInterval(poll, 30000);

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedRoute, fetchRouteDetails]);

  return {
    isSearching,
    searchResults,
    searchServices,
    
    selectedRoute,
    setSelectedRoute,
    
    routeDetails,
    routePath,
    isFetchingDetails,
    stations
  };
}
