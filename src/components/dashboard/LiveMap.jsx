import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { MapPin, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Custom icon for engineers (magenta circle with initials)
const createEngineerIcon = (initials, status) => {
  const color = status === 'on_site' ? '#E1467C' : status === 'en_route' ? '#FBBF24' : '#10B981';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255, 255, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      ">${initials}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Custom icon for jobs (diamond shape)
const createJobIcon = (status) => {
  const colors = {
    raised: '#60A5FA',
    assigned: '#A78BFA',
    en_route: '#FBBF24',
    on_site: '#FB923C',
  };
  const color = colors[status] || '#60A5FA';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: ${color};
        border: 2px solid rgba(255, 255, 255, 0.4);
        transform: rotate(45deg);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export default function LiveMap({ engineers = [], jobs = [], compact = false }) {
  const center = [51.5074, -0.1278];
  
  const engineerLocations = [
    { 
      id: 1, 
      name: "Ryan Mitchell", 
      initials: "RM",
      lat: 51.5074, 
      lng: -0.1278, 
      status: "on_site",
      job: "Job #3241 - Victoria Gate"
    },
    { 
      id: 2, 
      name: "Mia Chen", 
      initials: "MC",
      lat: 51.5155, 
      lng: -0.1419, 
      status: "en_route",
      job: "Job #3248 - NHS South Wing"
    },
    { 
      id: 3, 
      name: "James Foster", 
      initials: "JF",
      lat: 51.5200, 
      lng: -0.1000, 
      status: "available",
      job: "Not assigned"
    },
  ];

  const jobLocations = [
    { id: 1, lat: 51.5090, lng: -0.1280, status: "raised", title: "Boiler Service" },
    { id: 2, lat: 51.5180, lng: -0.1400, status: "assigned", title: "HVAC Inspection" },
  ];

  return (
    <div className={`relative ${compact ? 'h-80' : 'h-full'} rounded-xl overflow-hidden`}>
      <style>{`
        .leaflet-container {
          background: #0D1117;
          height: 100%;
          width: 100%;
        }
        .leaflet-tile {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        .leaflet-control-zoom {
          border: none !important;
          background: rgba(255, 255, 255, 0.06) !important;
          backdrop-filter: blur(24px);
        }
        .leaflet-control-zoom a {
          background: transparent !important;
          color: white !important;
          border: none !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={!compact}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Engineer Markers */}
        {engineerLocations.map((engineer) => (
          <Marker 
            key={engineer.id}
            position={[engineer.lat, engineer.lng]}
            icon={createEngineerIcon(engineer.initials, engineer.status)}
          >
            <Popup className="glass-popup">
              <div className="text-sm p-2">
                <p className="font-bold text-white mb-1">{engineer.name}</p>
                <p className="text-xs text-body capitalize mb-1">
                  {engineer.status.replace('_', ' ')}
                </p>
                <p className="text-xs text-white">{engineer.job}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Job Markers */}
        {jobLocations.map((job) => (
          <Marker 
            key={job.id}
            position={[job.lat, job.lng]}
            icon={createJobIcon(job.status)}
          >
            <Popup>
              <div className="text-sm p-2">
                <p className="font-bold text-white mb-1">{job.title}</p>
                <p className="text-xs text-body capitalize">Status: {job.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {compact && (
        <>
          <div className="absolute bottom-4 left-4 glass-panel-strong rounded-lg px-3 py-2 text-xs text-white">
            <p className="font-semibold mb-1">Live Operations</p>
            <p className="text-body">{engineerLocations.length} engineers active</p>
          </div>
          
          <Link to={createPageUrl("MapTracking")}>
            <div className="absolute bottom-4 right-4 glass-panel-strong rounded-lg px-3 py-2 text-xs text-white hover:glass-panel transition-all cursor-pointer flex items-center gap-2">
              <Navigation className="w-3 h-3" strokeWidth={1.5} />
              <span>View Full Map</span>
            </div>
          </Link>
        </>
      )}
    </div>
  );
}