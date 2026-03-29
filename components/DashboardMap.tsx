'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Fix Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface EngineerLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
}

interface Job {
  id: string;
  lat: number | null;
  lng: number | null;
  priority: string;
  title: string;
}

export default function DashboardMap() {
  const supabase = createClient();
  const [engineers, setEngineers] = useState<EngineerLocation[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastPoll, setLastPoll] = useState<string>(new Date().toLocaleTimeString());

  // Fetch initial data
  const fetchData = async () => {
    // Fetch engineers
    const { data: engData } = await supabase
      .from('EngineerLocation')
      .select('userId, lat, lng, user(name)') as any;
    
    if (engData) {
      setEngineers(engData.map((e: any) => ({
        id: e.userId,
        name: e.user.name,
        lat: e.lat,
        lng: e.lng,
        status: 'active'
      })));
    }

    // Fetch active jobs with coordinates
    const { data: jobData } = await supabase
      .from('Job')
      .select('id, title, priority, site(lat, lng)')
      .not('status', 'in', 'COMPLETED,INVOICED,CANCELLED') as any;

    if (jobData) {
      setJobs(jobData.map((j: any) => ({
        id: j.id,
        title: j.title,
        priority: j.priority,
        lat: j.site?.lat,
        lng: j.site?.lng
      })));
    }
    setLastPoll(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    fetchData();

    // Setup Realtime subscriptions
    const channel = supabase
      .channel('dashboard-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'EngineerLocation' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Job' }, () => fetchData())
      .subscribe();

    // Fallback polling (30s)
    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative w-full h-[280px] rounded-lg overflow-hidden border border-[#334155] bg-[#0F172A]">
      {/* Polling Indicator */}
      <div className="absolute top-4 left-4 z-[1000] bg-[#1E293B]/80 backdrop-blur-sm border border-[#334155] rounded-full px-3 py-1.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
        <span className="text-[10px] text-[#94A3B8] font-medium tracking-wide">
          Polling (30s) • {lastPoll}
        </span>
      </div>

      <MapContainer 
        center={[51.505, -0.09]} 
        zoom={10} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Engineer Markers */}
        {engineers.map((eng) => (
          <Marker key={eng.id} position={[eng.lat, eng.lng]}>
            <Popup>
              <div className="text-xs font-semibold p-1">{eng.name} (Engineer)</div>
            </Popup>
          </Marker>
        ))}

        {/* Job Markers (Pulsing Circles) */}
        {jobs.map((job) => {
          if (!job.lat || !job.lng) return null;
          const isCritical = job.priority === 'CRITICAL';
          return (
            <Circle
              key={job.id}
              center={[job.lat, job.lng]}
              radius={isCritical ? 1500 : 1000}
              pathOptions={{
                color: isCritical ? '#EF4444' : '#E91E8C',
                fillColor: isCritical ? '#EF4444' : '#E91E8C',
                fillOpacity: 0.3,
                weight: 1
              }}
            >
              <Popup>
                 <div className="text-xs font-semibold p-1">{job.title} ({job.priority})</div>
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}
