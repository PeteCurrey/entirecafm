'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Fix Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MiniMapProps {
  lat: number;
  lng: number;
  popupText: string;
}

export default function MiniMap({ lat, lng, popupText }: MiniMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-[200px] bg-[#0F172A] animate-pulse rounded-lg border border-[#334155]" />;

  return (
    <div className="relative w-full h-[200px] rounded-lg overflow-hidden border border-[#334155] bg-[#0F172A]">
      <MapContainer 
        center={[lat, lng]} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />
        <Marker position={[lat, lng]}>
          <Popup>
             <div className="text-xs font-semibold p-1">{popupText}</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
