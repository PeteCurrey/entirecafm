import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Custom icon for engineers (magenta ring with initials)
const createEngineerIcon = (initials, status) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #0D1117;
        border: 3px solid #E1467C;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(225, 70, 124, 0.3);
        transition: all 0.3s ease;
      ">${initials}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Custom icon for jobs (diamond shape with status colors)
const createJobIcon = (status, isAtRisk = false) => {
  const colors = {
    raised: '#6B7280',      // grey for New
    assigned: '#3B82F6',    // blue for Assigned
    en_route: '#14B8A6',    // teal for En Route
    on_site: '#EAB308',     // yellow for On Site
  };
  const color = colors[status] || '#6B7280';
  
  const pulseAnimation = isAtRisk ? `
    animation: subtlePulse 2s ease-in-out infinite;
    border-color: #E1467C !important;
  ` : '';
  
  return L.divIcon({
    className: 'custom-marker job-marker',
    html: `
      <style>
        @keyframes subtlePulse {
          0%, 100% { 
            transform: rotate(45deg) scale(1);
            opacity: 1;
          }
          50% { 
            transform: rotate(45deg) scale(1.1);
            opacity: 0.9;
          }
        }
      </style>
      <div style="
        width: 16px;
        height: 16px;
        background: ${color};
        border: 2px solid rgba(255, 255, 255, 0.6);
        transform: rotate(45deg);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        ${pulseAnimation}
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

export default function LiveMap({ compact = false }) {
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
    { id: 1, lat: 51.5090, lng: -0.1280, status: "raised", title: "Boiler Service", atRisk: false },
    { id: 2, lat: 51.5180, lng: -0.1400, status: "assigned", title: "HVAC Inspection", atRisk: false },
    { id: 3, lat: 51.5050, lng: -0.1100, status: "on_site", title: "Emergency Repair", atRisk: true },
  ];

  return (
    <div className={`relative h-full rounded-2xl overflow-hidden`}>
      <style>{`
        .leaflet-container {
          background: #0D1117;
          height: 100%;
          width: 100%;
          border-radius: 16px;
        }
        .leaflet-tile {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        .leaflet-control-zoom {
          border: none !important;
          background: rgba(255, 255, 255, 0.06) !important;
          backdrop-filter: blur(14px);
          border-radius: 8px;
        }
        .leaflet-control-zoom a {
          background: transparent !important;
          color: #CED4DA !important;
          border: none !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          color: white !important;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(13, 17, 23, 0.95) !important;
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: white;
        }
        .leaflet-popup-tip {
          background: rgba(13, 17, 23, 0.95) !important;
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
            <Popup>
              <div className="text-sm p-2">
                <p className="font-semibold text-white mb-1">{engineer.name}</p>
                <p className="text-xs text-[#CED4DA] capitalize mb-1">
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
            icon={createJobIcon(job.status, job.atRisk)}
          >
            <Popup>
              <div className="text-sm p-2">
                <p className="font-semibold text-white mb-1">{job.title}</p>
                <p className="text-xs text-[#CED4DA] capitalize mb-1">
                  Status: {job.status.replace('_', ' ')}
                </p>
                {job.atRisk && (
                  <p className="text-xs text-[#E1467C] font-medium">⚠ SLA At Risk</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {compact && (
        <Link to={createPageUrl("MapTracking")}>
          <div className="absolute bottom-4 right-4 glass-panel rounded-lg px-3 py-2 text-xs text-white hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer flex items-center gap-2 border border-[rgba(255,255,255,0.08)]">
            <Navigation className="w-3 h-3" strokeWidth={1.5} />
            <span>Full Map</span>
          </div>
        </Link>
      )}
    </div>
  );
}