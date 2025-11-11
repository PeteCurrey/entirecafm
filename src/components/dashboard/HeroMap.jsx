import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Navigation, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Engineer marker - circular with magenta ring and initials
const createEngineerIcon = (initials) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="engineer-marker">
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #0D1117;
          border: 2px solid #E1467C;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'Montserrat', sans-serif;
          font-weight: 600;
          font-size: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        ">${initials}</div>
      </div>
      <style>
        .engineer-marker:hover > div {
          box-shadow: 0 0 8px rgba(225, 70, 124, 0.35);
          transform: scale(1.1);
        }
      </style>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Job marker - diamond shape with status colors
const createJobIcon = (status, isAtRisk = false) => {
  const colors = {
    raised: '#6B7280',      // grey for New
    assigned: '#3B82F6',    // blue for Assigned
    en_route: '#14B8A6',    // teal for En Route
    on_site: '#F59E0B',     // amber for On Site
    completed: '#6B7280',   // neutral for Completed
  };
  const color = colors[status] || '#6B7280';
  
  const pulseStyle = isAtRisk ? `
    border-color: #E1467C !important;
    animation: softPulse 1.8s ease-in-out infinite;
  ` : '';
  
  return L.divIcon({
    className: 'custom-marker job-marker',
    html: `
      <style>
        @keyframes softPulse {
          0%, 100% { 
            opacity: 1;
            transform: rotate(45deg) scale(1);
          }
          50% { 
            opacity: 0.8;
            transform: rotate(45deg) scale(1.15);
          }
        }
      </style>
      <div style="
        width: 12px;
        height: 12px;
        background: ${color};
        border: 1px solid rgba(255, 255, 255, 0.7);
        transform: rotate(45deg);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        ${pulseStyle}
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

export default function HeroMap() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const center = [51.5074, -0.1278]; // London center
  
  const quickFilters = ['All', 'SLA Risk', 'Unassigned', 'Today Only', 'Traffic'];
  
  const engineerLocations = [
    { 
      id: 'E001', 
      name: "Ryan Mitchell", 
      initials: "RM",
      lat: 51.5074, 
      lng: -0.1278, 
      status: "on_site",
      nextJob: "Job #3241 - Victoria Gate"
    },
    { 
      id: 'E002', 
      name: "Mia Chen", 
      initials: "MC",
      lat: 51.5155, 
      lng: -0.1419, 
      status: "en_route",
      nextJob: "Job #3248 - NHS South Wing"
    },
    { 
      id: 'E003', 
      name: "James Foster", 
      initials: "JF",
      lat: 51.5200, 
      lng: -0.1000, 
      status: "available",
      nextJob: "Not assigned"
    },
    { 
      id: 'E004', 
      name: "Sophie Turner", 
      initials: "ST",
      lat: 51.5130, 
      lng: -0.1350, 
      status: "on_site",
      nextJob: "Job #3256 - Kings Cross"
    },
  ];

  const jobLocations = [
    { id: 'J001', lat: 51.5090, lng: -0.1280, status: "raised", title: "Boiler Service", client: "Starbucks", atRisk: false },
    { id: 'J002', lat: 51.5180, lng: -0.1400, status: "assigned", title: "HVAC Inspection", client: "NHS Trust", atRisk: false },
    { id: 'J003', lat: 51.5050, lng: -0.1100, status: "on_site", title: "Emergency Repair", client: "Royal Hospital", atRisk: true },
    { id: 'J004', lat: 51.5220, lng: -0.1180, status: "en_route", title: "PPM Check", client: "Acme Ltd", atRisk: false },
    { id: 'J005', lat: 51.5110, lng: -0.1450, status: "raised", title: "Lighting Fault", client: "RetailCo", atRisk: false },
  ];

  const handleMarkerClick = (type, id) => {
    // Deep-link to Map & Tracking with preserved state
    navigate(`${createPageUrl("MapTracking")}?type=${type}&id=${id}`);
  };

  return (
    <div className="relative rounded-2xl border border-[rgba(255,255,255,0.08)] backdrop-blur-[14px] overflow-hidden" style={{ height: 560 }}>
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
        .leaflet-control-attribution {
          display: none;
        }
      `}</style>
      
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Engineer Markers */}
        {engineerLocations.map((engineer) => (
          <Marker 
            key={engineer.id}
            position={[engineer.lat, engineer.lng]}
            icon={createEngineerIcon(engineer.initials)}
            eventHandlers={{
              click: () => handleMarkerClick('engineer', engineer.id)
            }}
          >
            <Popup>
              <div className="text-sm p-2">
                <p className="font-semibold text-white mb-1">{engineer.name}</p>
                <p className="text-xs text-[#CED4DA] capitalize mb-2">
                  {engineer.status.replace('_', ' ')}
                </p>
                <p className="text-xs text-white mb-3">{engineer.nextJob}</p>
                <Button 
                  size="sm" 
                  className="w-full bg-[#E1467C] hover:bg-[#E1467C]/90 text-white text-xs h-7"
                  onClick={() => handleMarkerClick('engineer', engineer.id)}
                >
                  Open in Dispatch
                  <ChevronRight className="w-3 h-3 ml-1" strokeWidth={1.5} />
                </Button>
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
            eventHandlers={{
              click: () => handleMarkerClick('job', job.id)
            }}
          >
            <Popup>
              <div className="text-sm p-2">
                <p className="font-semibold text-white mb-1">{job.title}</p>
                <p className="text-xs text-[#CED4DA] mb-1">{job.client}</p>
                <p className="text-xs text-[#CED4DA] capitalize mb-2">
                  Status: {job.status.replace('_', ' ')}
                </p>
                {job.atRisk && (
                  <p className="text-xs text-[#E1467C] font-medium mb-3">⚠ SLA At Risk</p>
                )}
                <Button 
                  size="sm" 
                  className="w-full bg-[#E1467C] hover:bg-[#E1467C]/90 text-white text-xs h-7"
                  onClick={() => handleMarkerClick('job', job.id)}
                >
                  Open in Dispatch
                  <ChevronRight className="w-3 h-3 ml-1" strokeWidth={1.5} />
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Quick Filter Chips - Top Right */}
      <div className="absolute right-6 top-6 flex gap-2 z-[400]">
        {quickFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter.toLowerCase())}
            className={`px-3 py-1.5 rounded-full text-xs transition-all backdrop-blur-[14px] border ${
              activeFilter === filter.toLowerCase()
                ? 'bg-[#E1467C]/20 border-[#E1467C]/50 text-white'
                : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Legend - Bottom Left */}
      <div className="absolute left-6 bottom-6 text-xs bg-black/40 backdrop-blur-[14px] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 z-[400]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full ring-2 ring-[#E1467C] bg-transparent" />
          <span className="text-[#CED4DA]">Engineer</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rotate-45 bg-white/70 inline-block" />
          <span className="text-[#CED4DA]">Job</span>
        </div>
      </div>

      {/* Full Map Link - Bottom Right */}
      <Link to={createPageUrl("MapTracking")}>
        <div className="absolute bottom-6 right-6 glass-panel rounded-lg px-3 py-2 text-xs text-white hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer flex items-center gap-2 border border-[rgba(255,255,255,0.08)] backdrop-blur-[14px] z-[400]">
          <Navigation className="w-3 h-3" strokeWidth={1.5} />
          <span>Open Full Map</span>
        </div>
      </Link>
    </div>
  );
}