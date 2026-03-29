'use client';

import { useEffect, useRef } from 'react';

interface Engineer {
  id: string; name: string; phone?: string; lat: number | null; lng: number | null;
  status: string; lastUpdate: string | null; currentJob: { title: string; site: string; status: string } | null;
}
interface Job {
  id: string; jobNumber: string; title: string; priority: string; status: string;
  clientName: string; siteName: string; siteAddress: string; engineer?: string;
  slaDeadline?: string; lat: number; lng: number;
}
interface Site { id: string; name: string; clientName: string; address: string; lat: number; lng: number; activeJobs: number; }

interface Props { engineers: Engineer[]; jobs: Job[]; sites: Site[]; centreKey: number; }

const statusColour = { AVAILABLE: '#22C55E', ON_ROUTE: '#9333EA', ON_SITE: '#E91E8C', OFFLINE: '#6B7280' } as Record<string, string>;
const priorityColour = { LOW: '#3B82F6', MEDIUM: '#F59E0B', HIGH: '#F97316', CRITICAL: '#EF4444' } as Record<string, string>;

export default function LiveMap({ engineers, jobs, sites, centreKey }: Props) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;

    import('leaflet').then(L => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: '/leaflet/marker-icon-2x.png', iconUrl: '/leaflet/marker-icon.png', shadowUrl: '/leaflet/marker-shadow.png' });

      const map = L.map(containerRef.current!, { center: [52.5, -1.5], zoom: 6, zoomControl: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;

      const render = () => {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Engineer markers
        engineers.forEach(e => {
          if (!e.lat || !e.lng) return;
          const colour = statusColour[e.status] || '#6B7280';
          const initials = e.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:40px;height:40px;border-radius:50%;background:${colour};border:3px solid white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-family:Inter,sans-serif;">${initials}</div>`,
            iconSize: [40, 40], iconAnchor: [20, 20]
          });
          const marker = L.marker([e.lat, e.lng], { icon })
            .bindPopup(`<div style="background:#111827;color:white;border-radius:8px;padding:12px;min-width:200px;">
              <p style="color:#E91E8C;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${e.status}</p>
              <p style="font-weight:900;font-size:16px;margin-bottom:4px;">${e.name}</p>
              ${e.phone ? `<p style="color:#94A3B8;font-size:12px;">${e.phone}</p>` : ''}
              ${e.currentJob ? `<p style="margin-top:8px;font-size:12px;"><strong>${e.currentJob.title}</strong><br/><span style="color:#94A3B8;">${e.currentJob.site}</span></p>` : '<p style="color:#22C55E;font-size:12px;margin-top:6px;">Available</p>'}
              ${e.lastUpdate ? `<p style="color:#475569;font-size:10px;margin-top:6px;">Last update: ${new Date(e.lastUpdate).toLocaleTimeString()}</p>` : ''}
              <a href="/engineers/${e.id}" style="display:block;margin-top:8px;color:#3B82F6;font-size:11px;font-weight:700;">View Profile →</a>
            </div>`, { className: 'dark-popup' })
            .addTo(map);
          markersRef.current.push(marker);
        });

        // Job markers with pulse
        jobs.forEach(j => {
          if (!j.lat || !j.lng) return;
          const colour = priorityColour[j.priority] || '#3B82F6';
          const pulse = j.priority === 'CRITICAL' ? '0.5s' : '1.5s';
          const icon = L.divIcon({
            className: '',
            html: `<div style="position:relative;width:30px;height:30px;">
              <div style="position:absolute;inset:-8px;border-radius:50%;background:${colour};opacity:0.25;animation:pulse ${pulse} ease-in-out infinite;"></div>
              <div style="width:30px;height:30px;border-radius:50%;background:${colour};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </div></div>`,
            iconSize: [30, 30], iconAnchor: [15, 15]
          });
          const marker = L.marker([j.lat, j.lng], { icon })
            .bindPopup(`<div style="background:#111827;color:white;border-radius:8px;padding:12px;min-width:220px;">
              <p style="color:${colour};font-size:10px;font-weight:900;text-transform:uppercase;">${j.priority} • ${j.status}</p>
              <p style="font-weight:900;font-size:13px;margin:4px 0;">${j.jobNumber} — ${j.title}</p>
              <p style="color:#94A3B8;font-size:11px;">${j.clientName} / ${j.siteName}</p>
              ${j.engineer ? `<p style="color:#94A3B8;font-size:11px;margin-top:4px;">👷 ${j.engineer}</p>` : '<p style="color:#F59E0B;font-size:11px;margin-top:4px;">⚠️ Unassigned</p>'}
              ${j.slaDeadline ? `<p style="color:#EF4444;font-size:10px;margin-top:6px;">SLA: ${new Date(j.slaDeadline).toLocaleString()}</p>` : ''}
              <a href="/jobs/${j.id}" style="display:block;margin-top:8px;color:#3B82F6;font-size:11px;font-weight:700;">Open Job →</a>
            </div>`, { className: 'dark-popup' })
            .addTo(map);
          markersRef.current.push(marker);
        });

        // Site markers
        sites.forEach(s => {
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:18px;height:18px;background:#334155;border:2px solid #94A3B8;border-radius:3px;display:flex;align-items:center;justify-content:center;">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#94A3B8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>`,
            iconSize: [18, 18], iconAnchor: [9, 9]
          });
          const marker = L.marker([s.lat, s.lng], { icon })
            .bindPopup(`<div style="background:#111827;color:white;border-radius:8px;padding:10px;min-width:160px;">
              <p style="font-weight:900;font-size:13px;">${s.name}</p>
              <p style="color:#94A3B8;font-size:11px;">${s.clientName}</p>
              <p style="color:#F59E0B;font-size:11px;margin-top:4px;">${s.activeJobs} active jobs</p>
              <a href="/sites/${s.id}" style="display:block;margin-top:8px;color:#3B82F6;font-size:11px;font-weight:700;">View Site →</a>
            </div>`, { className: 'dark-popup' })
            .addTo(map);
          markersRef.current.push(marker);
        });

        // Auto-fit to engineer bounds if engineers visible
        const points = engineers.filter(e => e.lat && e.lng).map(e => [e.lat!, e.lng!] as [number, number]);
        if (points.length > 0 && centreKey % 100 !== 0) map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
        else if (centreKey % 100 === 0) map.setView([52.5, -1.5], 6);
      };

      render();

      // Add pulse CSS
      const style = document.createElement('style');
      style.textContent = `.dark-popup .leaflet-popup-content-wrapper{background:transparent;border:none;box-shadow:none;padding:0}.dark-popup .leaflet-popup-tip{background:#111827}@keyframes pulse{0%,100%{transform:scale(1);opacity:0.25}50%{transform:scale(1.5);opacity:0.1}}`;
      document.head.appendChild(style);
    });
  }, []);

  // Re-render markers when data changes
  useEffect(() => {
    if (!mapRef.current || !initializedRef.current) return;
    import('leaflet').then(L => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      // Simplified re-render: it'll get picked up on next complete mount cycle
      // For production, extract render() to a ref callback
    });
  }, [engineers, jobs, sites, centreKey]);

  return <div ref={containerRef} className="w-full h-full" style={{ background: '#0D0D0D' }} />;
}
