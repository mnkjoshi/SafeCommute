import { useNavigate } from "react-router-dom";
import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";

// Map container style
const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

// Default center - can be adjusted as needed
const center = {
    lat: 53.5461,
    lng: -113.4938, // Edmonton
};

// Map options
const options = {
  disableDefaultUI: false,
  zoomControl: true,
};

// Sample data for markers (Edmonton transit-focused)
const sampleIncidents = [
  { id: 1, position: { lat: 53.5415, lng: -113.4918 }, title: "Passenger Medical Emergency", type: "incident", details: { capture: "Passenger collapsed on platform, medical assistance on site" } },
  { id: 2, position: { lat: 53.5366, lng: -113.5149 }, title: "Service Disruption", type: "incident", details: { capture: "LRT train mechanical issue, shuttle service in effect" } },
  { id: 3, position: { lat: 53.5180, lng: -113.5132 }, title: "Security Incident", type: "incident", details: { capture: "Altercation between passengers at Whyte Ave station" } },
  { id: 4, position: { lat: 53.5942, lng: -113.4564 }, title: "Infrastructure Issue", type: "incident", details: { capture: "Signal malfunction near Clareview station" } },
  { id: 5, position: { lat: 53.5221, lng: -113.6230 }, title: "Transit Disturbance", type: "incident", details: { capture: "Disruptive passenger removed from bus near West Edmonton Mall" } },
];

const sampleTraffic = [
  { id: 6, position: { lat: 53.5461, lng: -113.5038 }, title: "Transit Delay", type: "traffic", details: { capture: "Buses experiencing 15-minute delays due to construction" } },
  { id: 7, position: { lat: 53.5232, lng: -113.5263 }, title: "Heavy Transit Congestion", type: "traffic", details: { capture: "Higher than usual passenger volume at University station" } },
  { id: 8, position: { lat: 53.5440, lng: -113.4895 }, title: "LRT Slowdown", type: "traffic", details: { capture: "Trains operating at reduced speed downtown due to track inspection" } },
  { id: 9, position: { lat: 53.5175, lng: -113.4590 }, title: "Bus Route Diversion", type: "traffic", details: { capture: "Route 9 diverted due to street festival" } },
  { id: 10, position: { lat: 53.4575, lng: -113.4835 }, title: "Transit Access Issue", type: "traffic", details: { capture: "Elevator out of service at Century Park station" } },
];

let currentMessage = 0;

export default function Dashboard() {
  const navigate = useNavigate();
  const mapRef = useRef();
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({
    incidents: 0,
    traffic: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyCp2vo_WzQJ_9L1W7oYKEuEhF_5-4xxIWc",
  });

  // Format incident data from API to match our marker format
  const formatIncidentData = (incidents) => {
    if (!incidents || typeof incidents !== 'object') {
      console.error("Invalid incident data received:", incidents);
      return [];
    }
  
    const formattedData = [];
    
    // Loop through each incident key
    Object.keys(incidents).forEach(key => {
      try {
        const incident = incidents[key];
        
        // Check if incident has the expected structure
        if (!incident || !incident.location) {
          console.warn(`Incident ${key} missing required data, skipping`);
          return; // Skip this incident
        }
        
        // Parse location from string format "latitude,longitude"
        let lat = center.lat;
        let lng = center.lng;
        
        if (typeof incident.location === 'string') {
          const [latitude, longitude] = incident.location.split(',').map(coord => parseFloat(coord.trim()));
          
          if (!isNaN(latitude) && !isNaN(longitude)) {
            lat = latitude;
            lng = longitude;
          } else {
            console.warn(`Could not parse location for incident ${key}: ${incident.location}`);
          }
        }
        
        // Create formatted marker object
        formattedData.push({
          id: key,
          position: { lat, lng },
          title: incident.type ? `${incident.type.charAt(0).toUpperCase() + incident.type.slice(1)} Incident` : "Unknown Incident",
          type: incident.type?.toLowerCase().includes('traffic') ? "traffic" : "incident",
          details: {
            ...incident,
            // If you need to decode the base64 capture data, do it here
            // capture: incident.capture ? atob(incident.capture) : null
          }
        });
      } catch (err) {
        console.error(`Error processing incident ${key}:`, err);
      }
    });
    
    return formattedData;
  };

  // Fetch incidents data from API
  const fetchIncidents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get authentication data from localStorage
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('token');
  
      // Make API request with authentication data
      const response = await fetch('https://safecommute.onrender.com/retrieve', {
        method: 'POST', // Changed to POST since server expects data in request body
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: user,
          token: token
        })
      });
  
      // Handle response
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
  
      // Check for authentication failure response
      const responseData = await response.json();
      console.log("API Response:", responseData);
      
      // If authentication failed
      if (responseData === "UNV") {
        throw new Error("Authentication failed. Please log in again.");
      }
      
      // Process successful response data
      let formattedData;
      
      // Check if the data has the incidents property
      if (responseData && responseData.incidents) {
        formattedData = formatIncidentData(responseData.incidents);
      } else {
        // If there's no incidents property, try to format the data directly
        formattedData = formatIncidentData(responseData);
      }
      
      if (formattedData.length === 0) {
        throw new Error("No valid incident data found");
      }
      
      // Update markers and stats
      setMarkers(formattedData);
      
      // Calculate stats
      const incidents = formattedData.filter(m => m.type === "incident").length;
      const traffic = formattedData.filter(m => m.type === "traffic").length;
      
      setStats({
        incidents,
        traffic
      });
      
      return formattedData;
    } catch (err) {
      console.error("Error fetching incident data:", err);
      
      // Check if this is an authentication error
      if (err.message.includes("Authentication failed")) {
        setError("Authentication failed. Please log in to see real data. Using sample data instead.");
        // Optionally redirect to login
        // navigate('/login');
      } else {
        setError("Failed to load incident data. Using sample data instead.");
      }
      
      // Fall back to sample data in all error cases
      const fallbackData = [...sampleIncidents, ...sampleTraffic];
      setMarkers(fallbackData);
      setStats({
        incidents: sampleIncidents.length,
        traffic: sampleTraffic.length
      });
      
      return fallbackData;
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchIncidents();
  }, []);

  // Filter markers based on selection
  useEffect(() => {
    if (!markers.length) return;

    if (filter === "all") {
      // No filtering needed
    } else if (filter === "incidents") {
      setMarkers(prevMarkers => prevMarkers.filter(marker => marker.type === "incident"));
    } else if (filter === "traffic") {
      setMarkers(prevMarkers => prevMarkers.filter(marker => marker.type === "traffic"));
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
    setSelectedMarker(null);
    fetchIncidents();
  };

  // Render loading and error states
  if (loadError) return <div className="error-message">Error loading maps</div>;
  if (!isLoaded) return <div className="loading">Loading maps</div>;

  return (
    <div className="dashboard-main">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="gradient">SafeCommute</h1>
          <div className="controls">
            <button 
              className="bg-purple-500 px-3 py-1 hover:bg-purple-700 rounded" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Refresh Data"}
            </button>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-dropdown"
              disabled={isLoading}
            >
              <option value="all">All Data</option>
              <option value="incidents">Incidents Only</option>
              <option value="traffic">Traffic Only</option>
            </select>
          </div>
        </header>

        {error && (
          <div className="error-banner bg-red-100 border border-red-400 text-red-700 px-4 py-2 mb-4 rounded">
            {error}
          </div>
        )}

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
                    {selectedMarker.details && selectedMarker.details.capture && (
                      <p>Additional notes: {selectedMarker.details.capture}</p>
                    )}
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
                    {selectedMarker.details && selectedMarker.details.capture && (
                      <p>Notes: {selectedMarker.details.capture}</p>
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