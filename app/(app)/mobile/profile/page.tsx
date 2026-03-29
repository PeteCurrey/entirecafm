'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, User, MapPin, ToggleLeft, ToggleRight, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function MobileProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('Tracking Paused');
  const watchRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(d => { if (d) setProfile(d); }).finally(() => setLoading(false));
    const saved = localStorage.getItem('cafm_tracking') === 'true';
    setTracking(saved);
    if (saved) startTracking();
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  const startTracking = () => {
    setTrackingStatus('Tracking Active');
    const id = navigator.geolocation.watchPosition(async pos => {
      const now = Date.now();
      if (now - lastSentRef.current < 2 * 60 * 1000) return; // throttle 2min
      lastSentRef.current = now;
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/engineers/${session.user.id}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      });
    }, err => {
      console.error('Geolocation error:', err);
      setTrackingStatus('Location access denied');
    }, { enableHighAccuracy: true, maximumAge: 30000 });
    watchRef.current = id;
  };

  const stopTracking = () => {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setTrackingStatus('Tracking Paused');
  };

  const toggleTracking = () => {
    const next = !tracking;
    setTracking(next);
    localStorage.setItem('cafm_tracking', String(next));
    if (next) startTracking(); else stopTracking();
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-5 p-4 pt-6">
      <h1 className="text-xl font-black text-white">Profile</h1>

      {/* Avatar + name */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#9333EA] flex items-center justify-center shrink-0">
          <span className="text-white font-black text-xl">
            {profile?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'ME'}
          </span>
        </div>
        <div>
          <h2 className="text-white font-black text-lg">{profile?.name}</h2>
          <p className="text-[#94A3B8] text-sm">{profile?.email}</p>
          {profile?.phone && <p className="text-[#94A3B8] text-sm">{profile?.phone}</p>}
          {profile?.role && <span className="mt-1 inline-block bg-[#E91E8C]/20 text-[#E91E8C] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">{profile.role}</span>}
        </div>
      </div>

      {/* Skills */}
      {profile?.skills?.length > 0 && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mb-3">Skills</p>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s: string) => (
              <span key={s} className="bg-[#334155] text-white text-[11px] font-bold px-3 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Location Tracking */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-[#E91E8C]" /> Location Tracking</p>
            <p className={`text-xs mt-0.5 font-bold ${tracking ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`}>{trackingStatus}</p>
          </div>
          <button onClick={toggleTracking} className="flex items-center gap-2 text-white font-bold">
            {tracking ? (
              <><ToggleRight className="w-10 h-10 text-[#22C55E]" /></>
            ) : (
              <><ToggleLeft className="w-10 h-10 text-[#334155]" /></>
            )}
          </button>
        </div>
        <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg ${tracking ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#334155]/50 text-[#94A3B8]'}`}>
          {tracking ? <><CheckCircle className="w-3 h-3" /> Sending location every 2 minutes</> : 'Toggle on to enable GPS tracking'}
        </div>
      </div>
    </div>
  );
}
