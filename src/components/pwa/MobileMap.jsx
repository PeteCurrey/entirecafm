import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Navigation, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const jobIcon = new L.DivIcon({
  className: 'custom-job-marker',
  html: `<div style="background: #E1467C; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
    <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
    </div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const currentLocationIcon = new L.DivIcon({
  className: 'current-location-marker',
  html: `<div style="background: #27B3F7; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 0 4px rgba(39,179,247,0.3), 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Component to recenter map
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
}

export default function MobileMap({ jobs = [], currentJob, onNavigate }) {
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Get user's current location
  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) return;
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      (error) => {
        console.error('Location error:', error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    getCurrentLocation();
    
    // Watch position changes
    const watchId = navigator.geolocation?.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      null,
      { enableHighAccuracy: true }
    );

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Calculate map center
  const getMapCenter = () => {
    if (currentJob?.site_lat && currentJob?.site_lng) {
      return [currentJob.site_lat, currentJob.site_lng];
    }
    if (userLocation) {
      return [userLocation.lat, userLocation.lng];
    }
    return [53.8008, -1.5491]; // Leeds default
  };

  const handleNavigateToJob = (job) => {
    if (job.site_lat && job.site_lng) {
      // Open in device's default maps app
      const url = `https://www.google.com/maps/dir/?api=1&destination=${job.site_lat},${job.site_lng}`;
      window.open(url, '_blank');
      if (onNavigate) onNavigate(job);
    }
  };

  const jobsWithLocation = jobs.filter(j => j.site_lat && j.site_lng);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      <MapContainer
        center={getMapCenter()}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Current location marker */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={currentLocationIcon}
          >
            <Popup className="dark-popup">
              <div className="text-center p-1">
                <p className="font-semibold">Your Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Job markers */}
        {jobsWithLocation.map((job) => (
          <Marker
            key={job.id}
            position={[job.site_lat, job.site_lng]}
            icon={jobIcon}
          >
            <Popup className="dark-popup" maxWidth={280}>
              <div className="p-2">
                <h3 className="font-bold text-sm mb-1">{job.title}</h3>
                <p className="text-xs text-gray-600 mb-2">{job.site_name || job.address}</p>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-xs ${
                    job.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                    job.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {job.priority || 'Normal'}
                  </Badge>
                  <Badge className="text-xs bg-gray-100 text-gray-800">
                    {job.status?.replace('_', ' ')}
                  </Badge>
                </div>

                <Button
                  onClick={() => handleNavigateToJob(job)}
                  size="sm"
                  className="w-full bg-[#E1467C] hover:bg-[#E1467C]/90 text-white text-xs"
                >
                  <Navigation className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  Navigate
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}

        <RecenterMap position={userLocation ? [userLocation.lat, userLocation.lng] : null} />
      </MapContainer>

      {/* Map controls overlay */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          onClick={getCurrentLocation}
          disabled={isLocating}
          size="sm"
          className="w-10 h-10 rounded-full bg-white text-gray-800 shadow-lg hover:bg-gray-100"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} strokeWidth={2} />
        </Button>
      </div>

      {/* Current job quick info */}
      {currentJob && (
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <div className="glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.1)] bg-[rgba(13,17,23,0.9)]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-[#CED4DA]">Current Job</p>
                <p className="text-sm font-semibold text-white truncate">{currentJob.title}</p>
                <p className="text-xs text-[#CED4DA] truncate">{currentJob.site_name || currentJob.address}</p>
              </div>
              <Button
                onClick={() => handleNavigateToJob(currentJob)}
                size="sm"
                className="ml-2 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                <Navigation className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .dark-popup .leaflet-popup-tip {
          background: white;
        }
        .leaflet-container {
          background: #0D1117;
        }
      `}</style>
    </div>
  );
}