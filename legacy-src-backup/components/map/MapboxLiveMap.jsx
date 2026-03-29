import React, { useEffect, useRef, useState } from 'react';
import { base44 } from "@/api/base44Client";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZW50aXJlY2FmbSIsImEiOiJjbTBkZXhhZmowMDFrMmtzYnN5eDR6cjR6In0.PLACEHOLDER'; // Replace with actual token

/**
 * MapboxLiveMap - Real-time engineer & job tracking with WebSocket updates
 * 
 * Features:
 * - Dark theme Mapbox style
 * - WebSocket subscription with polling fallback
 * - Position interpolation (lerp) for smooth movement
 * - Rate-limited updates (max 1 per 5s unless >100m delta)
 */

export default function MapboxLiveMap({ orgId, compact = false }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const ws = useRef(null);
  const [engineers, setEngineers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const interpolationTimers = useRef(new Map());

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-0.1278, 51.5074], // London
      zoom: 12,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!orgId) return;

    const connectWebSocket = async () => {
      try {
        const user = await base44.auth.me();
        const token = localStorage.getItem('base44_token'); // Adjust based on your auth storage
        
        // Replace with your WebSocket relay URL
        const wsUrl = `wss://ws.entirecafm.io?token=${token}&orgId=${orgId}`;
        
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('WebSocket connected');
          setWsConnected(true);
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleRealtimeUpdate(data);
          } catch (err) {
            console.error('WebSocket message parse error:', err);
          }
        };

        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        };

        ws.current.onclose = () => {
          console.log('WebSocket disconnected');
          setWsConnected(false);
          // Reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };

      } catch (error) {
        console.error('WebSocket connection error:', error);
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      ws.current?.close();
    };
  }, [orgId]);

  // Polling fallback (30s interval)
  useEffect(() => {
    if (wsConnected) return; // Skip if WebSocket is active

    const fetchMapState = async () => {
      try {
        const [engineerLocations, jobsList] = await Promise.all([
          base44.entities.EngineerLocation.list('-timestamp', 50),
          base44.entities.Job.filter({ 
            status: { $in: ['assigned', 'on_route', 'on_site'] } 
          }),
        ]);

        setEngineers(engineerLocations);
        setJobs(jobsList);
      } catch (error) {
        console.error('Failed to fetch map state:', error);
      }
    };

    fetchMapState();
    const interval = setInterval(fetchMapState, 30000); // 30s polling

    return () => clearInterval(interval);
  }, [wsConnected]);

  // Handle real-time updates from WebSocket
  const handleRealtimeUpdate = (data) => {
    if (data.type === 'engineer_location_update' && data.engineer) {
      setEngineers(prev => {
        const existing = prev.find(e => e.engineer_id === data.engineer.id);
        if (existing) {
          // Check delta distance
          const delta = calculateDistance(
            existing.lat, existing.lng,
            data.engineer.lat, data.engineer.lng
          );
          
          // Rate limit: skip if <5s since last update AND delta <100m
          const now = Date.now();
          const lastUpdate = existing._lastUpdate || 0;
          if (now - lastUpdate < 5000 && delta < 100) {
            return prev; // Skip update
          }

          return prev.map(e => 
            e.engineer_id === data.engineer.id 
              ? { ...data.engineer, engineer_id: data.engineer.id, _lastUpdate: now }
              : e
          );
        } else {
          return [...prev, { ...data.engineer, engineer_id: data.engineer.id, _lastUpdate: Date.now() }];
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

  // Calculate distance between two coordinates (in meters)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth radius in meters
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

  // Linear interpolation for smooth marker movement
  const lerp = (start, end, t) => start + (end - start) * t;

  // Update markers on map
  useEffect(() => {
    if (!map.current) return;

    // Update engineer markers with interpolation
    engineers.forEach(engineer => {
      const markerId = `engineer-${engineer.engineer_id}`;
      let marker = markers.current.get(markerId);

      if (!marker) {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'engineer-marker';
        el.innerHTML = `
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
          ">${engineer.name?.[0] || 'E'}</div>
        `;

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([engineer.lng, engineer.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 8px; color: #0D1117;">
                  <strong>${engineer.name || 'Engineer'}</strong><br/>
                  <small>Last update: ${new Date(engineer.timestamp).toLocaleTimeString()}</small>
                </div>
              `)
          )
          .addTo(map.current);

        markers.current.set(markerId, { marker, position: [engineer.lng, engineer.lat] });
      } else {
        // Interpolate to new position
        const currentPos = marker.position;
        const targetPos = [engineer.lng, engineer.lat];
        
        // Clear existing timer
        if (interpolationTimers.current.has(markerId)) {
          clearInterval(interpolationTimers.current.get(markerId));
        }

        // Smooth transition over 400ms
        const duration = 400;
        const steps = 20;
        const stepTime = duration / steps;
        let step = 0;

        const timer = setInterval(() => {
          step++;
          const t = step / steps;
          const newLng = lerp(currentPos[0], targetPos[0], t);
          const newLat = lerp(currentPos[1], targetPos[1], t);
          
          marker.marker.setLngLat([newLng, newLat]);
          marker.position = [newLng, newLat];

          if (step >= steps) {
            clearInterval(timer);
            interpolationTimers.current.delete(markerId);
          }
        }, stepTime);

        interpolationTimers.current.set(markerId, timer);
      }
    });

    // Update job markers (simpler, no interpolation)
    jobs.forEach(job => {
      const markerId = `job-${job.id}`;
      let marker = markers.current.get(markerId);

      if (!marker && job.site?.lat && job.site?.lng) {
        const el = document.createElement('div');
        el.className = 'job-marker';
        const statusColors = {
          assigned: '#3B82F6',
          on_route: '#14B8A6',
          on_site: '#EAB308',
        };
        const color = statusColors[job.status] || '#6B7280';

        el.innerHTML = `
          <div style="
            width: 16px;
            height: 16px;
            background: ${color};
            border: 2px solid rgba(255, 255, 255, 0.8);
            transform: rotate(45deg);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          "></div>
        `;

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([job.site.lng, job.site.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 15 })
              .setHTML(`
                <div style="padding: 8px; color: #0D1117;">
                  <strong>Job #${job.job_number || job.id.slice(0, 8)}</strong><br/>
                  <small>Status: ${job.status}</small><br/>
                  <small>Priority: ${job.priority}</small>
                </div>
              `)
          )
          .addTo(map.current);

        markers.current.set(markerId, { marker, position: [job.site.lng, job.site.lat] });
      }
    });

  }, [engineers, jobs]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Connection Status Indicator */}
      <div className="absolute top-4 left-4 px-3 py-2 glass-panel rounded-lg border border-[rgba(255,255,255,0.08)] text-xs text-white flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
        {wsConnected ? 'Live' : 'Polling'}
      </div>
    </div>
  );
}