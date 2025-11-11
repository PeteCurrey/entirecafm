import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { base44 } from "@/api/base44Client";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * LiveMap - Real-time engineer & job tracking with WebSocket updates
 * 
 * Features:
 * - Dark theme OpenStreetMap tiles
 * - WebSocket subscription with polling fallback
 * - Position interpolation (lerp) for smooth movement
 * - Rate-limited updates (max 1 per 5s unless >100m delta)
 */

// Custom marker icons
const createEngineerIcon = (initials, status) => {
  return L.divIcon({
    className: 'custom-engineer-marker',
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
        box-shadow: 0 4px 12px rgba(225, 70, 124, 0.4);
        cursor: pointer;
      ">${initials}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createJobIcon = (status, isAtRisk = false) => {
  const colors = {
    raised: '#6B7280',
    new: '#6B7280',
    assigned: '#3B82F6',
    on_route: '#14B8A6',
    on_site: '#EAB308',
    completed: '#10B981',
  };
  const color = colors[status] || '#6B7280';
  
  const pulseAnimation = isAtRisk ? 'animation: pulse 2s ease-in-out infinite;' : '';
  
  return L.divIcon({
    className: 'custom-job-marker',
    html: `
      <style>
        @keyframes pulse {
          0%, 100% { transform: rotate(45deg) scale(1); opacity: 1; }
          50% { transform: rotate(45deg) scale(1.2); opacity: 0.8; }
        }
      </style>
      <div style="
        width: 16px;
        height: 16px;
        background: ${color};
        border: 2px solid rgba(255, 255, 255, 0.8);
        transform: rotate(45deg);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        ${pulseAnimation}
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// Component to handle marker interpolation
function AnimatedMarker({ position, targetPosition, duration = 400, icon, children }) {
  const [currentPos, setCurrentPos] = useState(position);
  const startTime = useRef(Date.now());
  const startPos = useRef(position);

  useEffect(() => {
    if (!targetPosition) return;

    startPos.current = currentPos;
    startTime.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const newLat = startPos.current[0] + (targetPosition[0] - startPos.current[0]) * eased;
      const newLng = startPos.current[1] + (targetPosition[1] - startPos.current[1]) * eased;

      setCurrentPos([newLat, newLng]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [targetPosition, duration]);

  return (
    <Marker position={currentPos} icon={icon}>
      {children}
    </Marker>
  );
}

export default function LiveMap({ orgId, compact = false, onEngineerClick, onJobClick }) {
  const [engineers, setEngineers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef(null);
  const engineerPositions = useRef(new Map());

  // Calculate distance between coordinates (meters)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // WebSocket connection
  useEffect(() => {
    if (!orgId) return;

    const connectWebSocket = async () => {
      try {
        const user = await base44.auth.me();
        
        // Get token from Base44 auth (adjust based on implementation)
        const token = localStorage.getItem('base44_token') || user.token || 'dev-token';
        
        // WebSocket relay URL (will be configured)
        const wsUrl = `wss://ws.entirecafm.io?token=${token}&orgId=${orgId}`;
        
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('✅ WebSocket connected');
          setWsConnected(true);
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleRealtimeUpdate(data);
          } catch (err) {
            console.error('WebSocket message error:', err);
          }
        };

        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        };

        ws.current.onclose = () => {
          console.log('WebSocket disconnected, reconnecting in 5s...');
          setWsConnected(false);
          setTimeout(connectWebSocket, 5000);
        };

      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      ws.current?.close();
    };
  }, [orgId]);

  // Polling fallback (30s)
  useEffect(() => {
    if (wsConnected) return;

    const fetchMapState = async () => {
      try {
        const [locations, jobsList] = await Promise.all([
          base44.entities.EngineerLocation.list('-timestamp', 50),
          base44.entities.Job.filter({ 
            status: { $in: ['new', 'assigned', 'on_route', 'on_site'] } 
          }),
        ]);

        setEngineers(locations);
        setJobs(jobsList);
      } catch (error) {
        console.error('Failed to fetch map state:', error);
      }
    };

    fetchMapState();
    const interval = setInterval(fetchMapState, 30000);

    return () => clearInterval(interval);
  }, [wsConnected]);

  // Handle real-time updates
  const handleRealtimeUpdate = (data) => {
    if (data.type === 'engineer_location_update' && data.engineer) {
      setEngineers(prev => {
        const existing = prev.find(e => e.engineer_id === data.engineer.id);
        
        if (existing) {
          const delta = calculateDistance(
            existing.lat, existing.lng,
            data.engineer.lat, data.engineer.lng
          );
          
          const now = Date.now();
          const lastUpdate = engineerPositions.current.get(data.engineer.id) || 0;
          
          // Rate limit: skip if <5s and delta <100m
          if (now - lastUpdate < 5000 && delta < 100) {
            return prev;
          }

          engineerPositions.current.set(data.engineer.id, now);

          return prev.map(e => 
            e.engineer_id === data.engineer.id 
              ? { ...data.engineer, engineer_id: data.engineer.id }
              : e
          );
        } else {
          engineerPositions.current.set(data.engineer.id, Date.now());
          return [...prev, { ...data.engineer, engineer_id: data.engineer.id }];
        }
      });
    }

    if (data.type === 'job_status_update' && data.job) {
      setJobs(prev => {
        const existing = prev.find(j => j.id === data.job.id);
        if (existing) {
          return prev.map(j => j.id === data.job.id ? { ...j, ...data.job } : j);
        } else {
          return [...prev, data.job];
        }
      });
    }
  };

  const center = [51.5074, -0.1278]; // London

  return (
    <div className="relative h-full w-full">
      <style>{`
        .leaflet-container {
          background: #0D1117;
          height: 100%;
          width: 100%;
          border-radius: ${compact ? '16px' : '0'};
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
        .custom-engineer-marker,
        .custom-job-marker {
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
        {engineers.map((engineer) => {
          const initials = engineer.name?.[0] || 'E';
          const targetPos = [engineer.lat, engineer.lng];
          
          return (
            <AnimatedMarker
              key={engineer.engineer_id}
              position={targetPos}
              targetPosition={targetPos}
              icon={createEngineerIcon(initials, engineer.status)}
            >
              <Popup>
                <div className="p-2 text-sm">
                  <p className="font-semibold mb-1">{engineer.name || 'Engineer'}</p>
                  <p className="text-xs opacity-70">
                    Last update: {new Date(engineer.timestamp).toLocaleTimeString()}
                  </p>
                  {engineer.battery_level && (
                    <p className="text-xs opacity-70">
                      Battery: {engineer.battery_level}%
                    </p>
                  )}
                </div>
              </Popup>
            </AnimatedMarker>
          );
        })}

        {/* Job Markers */}
        {jobs.map((job) => {
          if (!job.lat || !job.lng) return null;
          
          const isAtRisk = job.sla_due_at && new Date(job.sla_due_at) < new Date();
          
          return (
            <Marker 
              key={job.id}
              position={[job.lat, job.lng]}
              icon={createJobIcon(job.status, isAtRisk)}
              eventHandlers={{
                click: () => onJobClick?.(job)
              }}
            >
              <Popup>
                <div className="p-2 text-sm">
                  <p className="font-semibold mb-1">
                    Job #{job.job_number || job.id.slice(0, 8)}
                  </p>
                  <p className="text-xs opacity-70 capitalize mb-1">
                    Status: {job.status?.replace('_', ' ')}
                  </p>
                  <p className="text-xs opacity-70">
                    Priority: {job.priority}
                  </p>
                  {isAtRisk && (
                    <p className="text-xs text-red-400 mt-1">⚠ SLA At Risk</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Connection Status */}
      <div className="absolute top-4 left-4 px-3 py-2 glass-panel rounded-lg border border-[rgba(255,255,255,0.08)] text-xs text-white flex items-center gap-2 z-[1000]">
        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
        <span>{wsConnected ? 'Live' : 'Polling (30s)'}</span>
      </div>
    </div>
  );
}