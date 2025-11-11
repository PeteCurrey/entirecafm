import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { MapPin, User } from "lucide-react";
import "leaflet/dist/leaflet.css";

export default function LiveMap({ engineers = [], jobs = [], compact = false }) {
  // Default center (London, UK)
  const center = [51.5074, -0.1278];
  
  // Mock engineer locations for demo
  const engineerLocations = [
    { id: 1, name: "Ryan Mitchell", lat: 51.5074, lng: -0.1278, status: "on_site" },
    { id: 2, name: "Mia Chen", lat: 51.5155, lng: -0.1419, status: "en_route" },
    { id: 3, name: "James Foster", lat: 51.5200, lng: -0.1000, status: "available" },
  ];

  return (
    <div className={`relative ${compact ? 'h-64' : 'h-full'} rounded-xl overflow-hidden`}>
      <style>{`
        .leaflet-container {
          background: #0D1117;
          height: 100%;
          width: 100%;
        }
        .leaflet-tile {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        .engineer-marker {
          background: #E1467C;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
      
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={!compact}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {engineerLocations.map((engineer) => (
          <Marker 
            key={engineer.id}
            position={[engineer.lat, engineer.lng]}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{engineer.name}</p>
                <p className="text-xs text-gray-600 capitalize">{engineer.status.replace('_', ' ')}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {compact && (
        <div className="absolute bottom-4 left-4 glass-panel-strong rounded-lg px-3 py-2 text-xs text-white">
          <p className="font-semibold mb-1">Live Operations</p>
          <p className="text-body">{engineerLocations.length} engineers active</p>
        </div>
      )}
    </div>
  );
}