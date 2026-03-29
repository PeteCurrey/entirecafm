'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, MapPin } from 'lucide-react';

export default function MobileMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    let watchId: number;

    import('leaflet').then(async L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(containerRef.current!, { center: [52.5, -1.5], zoom: 10, zoomControl: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Engineer self-location (blue dot)
      let selfMarker: any = null;
      const trackSelf = () => {
        navigator.geolocation.getCurrentPosition(pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
            iconSize: [18, 18], iconAnchor: [9, 9]
          });
          if (selfMarker) selfMarker.setLatLng([lat, lng]);
          else { selfMarker = L.marker([lat, lng], { icon }).addTo(map); map.setView([lat, lng], 13); }
          setLoading(false);
        }, () => setLoading(false), { enableHighAccuracy: true });
      };

      trackSelf();
      watchId = navigator.geolocation.watchPosition(pos => {
        if (selfMarker) selfMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
      }, undefined, { enableHighAccuracy: true, maximumAge: 30000 });

      // Load assigned job sites
      const res = await fetch('/api/mobile/jobs?filter=all');
      if (res.ok) {
        const data = await res.json();
        (data.jobs || []).forEach((job: any) => {
          if (!job.site?.lat || !job.site?.lng) return;
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;border-radius:50%;background:#E91E8C;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>`,
            iconSize: [28, 28], iconAnchor: [14, 14]
          });
          L.marker([job.site.lat, job.site.lng], { icon })
            .bindPopup(`<div style="background:#111827;color:white;border-radius:8px;padding:10px;font-family:Inter,sans-serif;">
              <p style="font-weight:900;font-size:13px;">${job.title}</p>
              <p style="color:#94a3b8;font-size:11px;">${job.client?.name}</p>
              <a href="/mobile/jobs/${job.id}" style="display:block;margin-top:6px;color:#E91E8C;font-weight:700;font-size:11px;">Open Job →</a>
            </div>`)
            .addTo(map);
        });
      }
    });

    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-64px)]">
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0D0D0D] gap-4">
          <MapPin className="w-10 h-10 text-[#E91E8C] animate-bounce" />
          <Loader2 className="w-6 h-6 text-[#E91E8C] animate-spin" />
          <p className="text-white text-sm font-bold">Getting your location...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
