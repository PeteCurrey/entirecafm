'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, MapPin, RefreshCw, Crosshair, Globe, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Dynamic import — no SSR for Leaflet
const MapContainer = dynamic(() => import('@/components/LiveMap'), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center bg-[#0D0D0D]">
    <Loader2 className="w-10 h-10 text-[#E91E8C] animate-spin" />
  </div>
) });

export default function MapPage() {
  const [engineers, setEngineers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState({ engineers: true, jobs: true, sites: true });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all');
  const [centreKey, setCentreKey] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [eRes, jRes, sRes] = await Promise.all([
        fetch('/api/map/engineers'),
        fetch('/api/map/jobs'),
        fetch('/api/map/sites'),
      ]);
      if (eRes.ok) setEngineers(await eRes.json());
      if (jRes.ok) setJobs(await jRes.json());
      if (sRes.ok) setSites(await sRes.json());
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Supabase realtime for engineer locations
    const supabase = createClient();
    const channel = supabase.channel('map-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engineer_locations' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 30000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  const displayedEngineers = selectedEngineer === 'all' ? engineers : engineers.filter(e => e.id === selectedEngineer);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] -m-6">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0D0D0D]">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-[#E91E8C] mx-auto mb-4 animate-bounce" />
            <p className="text-white font-bold">Loading Live Operations Map...</p>
          </div>
        </div>
      )}

      {/* Floating Control Panel */}
      <div className="absolute top-4 right-4 z-[1000] w-72 bg-[#111827]/95 backdrop-blur-md border border-[#334155] rounded-xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#334155]">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#E91E8C]" /> Live Operations Map
          </h2>
          {lastUpdate && <p className="text-[10px] text-[#94A3B8] mt-1">Updated {lastUpdate.toLocaleTimeString()}</p>}
        </div>

        <div className="p-4 space-y-4">
          {/* Engineer filter */}
          <div>
            <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block mb-1">Filter Engineer</label>
            <select
              value={selectedEngineer}
              onChange={e => setSelectedEngineer(e.target.value)}
              className="w-full bg-[#1E293B] border border-[#334155] text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:border-[#E91E8C]"
            >
              <option value="all">All Engineers ({engineers.length})</option>
              {engineers.map(e => (
                <option key={e.id} value={e.id}>{e.name} — {e.status}</option>
              ))}
            </select>
          </div>

          {/* Layer toggles */}
          <div>
            <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block mb-2">Map Layers</label>
            {(['engineers', 'jobs', 'sites'] as const).map(layer => (
              <label key={layer} className="flex items-center gap-3 py-1.5 cursor-pointer group">
                <div
                  onClick={() => setLayers(l => ({ ...l, [layer]: !l[layer] }))}
                  className={`w-8 h-4 rounded-full transition-colors ${layers[layer] ? 'bg-[#E91E8C]' : 'bg-[#334155]'} relative cursor-pointer`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${layers[layer] ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-xs text-white font-medium capitalize">{layer} ({layer === 'engineers' ? displayedEngineers.length : layer === 'jobs' ? jobs.length : sites.length})</span>
              </label>
            ))}
          </div>

          {/* Refresh controls */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAutoRefresh(a => !a)}
                className={`w-8 h-4 rounded-full transition-colors ${autoRefresh ? 'bg-[#22C55E]' : 'bg-[#334155]'} relative cursor-pointer`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${autoRefresh ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-xs text-white font-medium">Auto refresh (30s)</span>
            </label>
            <button onClick={fetchData} className="w-full flex items-center justify-center gap-2 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-white text-xs font-bold py-2 rounded-lg transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh Now
            </button>
          </div>

          {/* Legend */}
          <div>
            <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block mb-2">Legend</label>
            <div className="space-y-1 text-xs">
              {[['bg-[#22C55E]','Available'],['bg-[#9333EA]','On Route'],['bg-[#E91E8C]','On Site'],['bg-[#6B7280]','Offline']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${c}`} /><span className="text-[#94A3B8]">{l}</span></div>
              ))}
              <div className="h-px bg-[#334155] my-1" />
              {[['bg-[#3B82F6]','Low Job'],['bg-[#F59E0B]','Medium Job'],['bg-[#F97316]','High Job'],['bg-[#EF4444]','Critical Job']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${c}`} /><span className="text-[#94A3B8]">{l}</span></div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={() => setCentreKey(k => k + 1)} className="flex-1 flex items-center justify-center gap-1 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-white text-[10px] font-bold py-2 rounded-lg transition-colors">
              <Crosshair className="w-3 h-3" /> Centre Engineers
            </button>
            <button onClick={() => setCentreKey(k => k + 100)} className="flex-1 flex items-center justify-center gap-1 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-white text-[10px] font-bold py-2 rounded-lg transition-colors">
              <Globe className="w-3 h-3" /> Centre UK
            </button>
          </div>
        </div>
      </div>

      {/* Map Component */}
      <MapContainer engineers={layers.engineers ? displayedEngineers : []} jobs={layers.jobs ? jobs : []} sites={layers.sites ? sites : []} centreKey={centreKey} />
    </div>
  );
}
