import { useNavigate } from "react-router-dom";
import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";

// Map container style
const mapContainerStyle = {
  width: "100%",
  height: "70vh",
};


// Default center - can be adjusted as needed
const center = {
  lat: 40.7128,
  lng: -74.0060, // New York City
};

// Map options
const options = {
  disableDefaultUI: false,
  zoomControl: true,
};

// Sample data for markers
const sampleIncidents = [
  { id: 1, position: { lat: 40.7128, lng: -74.0060 + 0.01 }, title: "Traffic Accident", type: "incident" },
  { id: 2, position: { lat: 40.7128 + 0.02, lng: -74.0060 - 0.01 }, title: "Road Closure", type: "incident" },
  { id: 3, position: { lat: 40.7128 - 0.01, lng: -74.0060 + 0.02 }, title: "Construction Zone", type: "incident" },
];

const sampleTraffic = [
  { id: 4, position: { lat: 40.7128 + 0.01, lng: -74.0060 + 0.01 }, title: "Heavy Traffic", type: "traffic" },
  { id: 5, position: { lat: 40.7128 - 0.02, lng: -74.0060 - 0.02 }, title: "Slow Moving Traffic", type: "traffic" },
];

let currentMessage = 0;

export default function Dashboard() {
  const navigate = useNavigate();
  const mapRef = useRef();
  const [markers, setMarkers] = useState([...sampleIncidents, ...sampleTraffic]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({
    incidents: sampleIncidents.length,
    traffic: sampleTraffic.length
  });


  
  const getEnvVariable = (key) => {
    // For Vite
    if (import.meta && import.meta.env) {
      return import.meta.env[key] || import.meta.env[`VITE_${key}`];
    }
    
    // For Create React App and other environments that expose process.env
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || process.env[`REACT_APP_${key}`];
    }
    
    // Fallback (not recommended for production)
    console.warn(`Unable to access environment variable: ${key}`);
    return '';
  };

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    // googleMapsApiKey: getEnvVariable('GOOGLE_MAPS_API_KEY'),
    // AIzaSyCp2vo_WzQJ_9L1W7oYKEuEhF_5-4xxIWc
    googleMapsApiKey: "AIzaSyCp2vo_WzQJ_9L1W7oYKEuEhF_5-4xxIWc",
  });

  // Filter markers based on selection
  useEffect(() => {
    if (filter === "all") {
      setMarkers([...sampleIncidents, ...sampleTraffic]);
    } else if (filter === "incidents") {
      setMarkers([...sampleIncidents]);
    } else if (filter === "traffic") {
      setMarkers([...sampleTraffic]);
    }
  }, [filter]);

  // Map reference callback
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Try to get user's location
  useEffect(() => {
    if (isLoaded && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          if (mapRef.current) {
            mapRef.current.panTo(userLocation);
            mapRef.current.setZoom(12);
          }
        },
        () => {
          // Fall back to default location if geolocation is denied
          console.log("Geolocation permission denied, using default center.");
        }
      );
    }
  }, [isLoaded]);

  // Get marker icon based on type
  const getMarkerIcon = (type) => {
    switch (type) {
      case 'incident':
        return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
      case 'traffic':
        return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
      default:
        return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    }
  };

  // Refresh data handler
  const handleRefresh = () => {
    // In a real app, you would fetch fresh data here
    setSelectedMarker(null);
    // For demo, we'll just use the same data
    setMarkers([...sampleIncidents, ...sampleTraffic]);
    setStats({
      incidents: sampleIncidents.length,
      traffic: sampleTraffic.length
    });
  };

  // Render loading and error states
  if (loadError) return <div className="error-message">Error loading maps</div>;
  if (!isLoaded) return <div className="loading">Loading maps</div>;

  return (
    <div className="dashboard-main">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>SafeCommute Dashboard</h1>
          <div className="controls">
            <button onClick={handleRefresh}>Refresh Data</button>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-dropdown"
            >
              <option value="all">All Data</option>
              <option value="incidents">Incidents Only</option>
              <option value="traffic">Traffic Only</option>
            </select>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Google Map */}
          <div className="map-container">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={12}
              center={center}
              options={options}
              onLoad={onMapLoad}
            >
              {markers.map((marker) => (
                <Marker
                  key={marker.id}
                  position={marker.position}
                  icon={getMarkerIcon(marker.type)}
                  onClick={() => {
                    setSelectedMarker(marker);
                  }}
                />
              ))}

              {selectedMarker ? (
                <InfoWindow
                  position={selectedMarker.position}
                  onCloseClick={() => {
                    setSelectedMarker(null);
                  }}
                >
                  <div className="info-window">
                    <h3>{selectedMarker.title}</h3>
                    <p>Type: {selectedMarker.type}</p>
                  </div>
                </InfoWindow>
              ) : null}
            </GoogleMap>
          </div>

          {/* Dashboard Sidebar */}
          <div className="dashboard-sidebar">
            <div className="stats-container">
              <h2>Statistics</h2>
              <div className="stat-item">
                <span className="stat-label">Active Incidents:</span>
                <span className="stat-value">{stats.incidents}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Traffic Delays:</span>
                <span className="stat-value">{stats.traffic}</span>
              </div>
            </div>

            <div className="details-container">
              <h2>Details</h2>
              <div className="selection-details">
                {selectedMarker ? (
                  <div>
                    <h3>{selectedMarker.title}</h3>
                    <p>Type: {selectedMarker.type}</p>
                    <p>
                      Location: {selectedMarker.position.lat.toFixed(4)}, 
                      {selectedMarker.position.lng.toFixed(4)}
                    </p>
                    {selectedMarker.type === 'incident' && (
                      <p>Status: Active</p>
                    )}
                    {selectedMarker.type === 'traffic' && (
                      <p>Severity: Moderate</p>
                    )}
                  </div>
                ) : (
                  <p>Select a point on the map to see details.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}