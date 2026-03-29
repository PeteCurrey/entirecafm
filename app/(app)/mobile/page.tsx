'use client';

import { useState, useEffect } from 'react';
import { Loader2, ChevronRight, Navigation, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const PRIORITY_COLOUR: Record<string, string> = { LOW: 'bg-[#3B82F6]', MEDIUM: 'bg-[#F59E0B]', HIGH: 'bg-[#F97316]', CRITICAL: 'bg-[#EF4444]' };
const STATUS_COLOUR: Record<string, string> = { OPEN: 'bg-[#334155] text-[#94A3B8]', ASSIGNED: 'bg-[#9333EA]/20 text-[#9333EA]', ON_ROUTE: 'bg-[#F59E0B]/20 text-[#F59E0B]', ON_SITE: 'bg-[#E91E8C]/20 text-[#E91E8C]' };

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function MobileHomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [jobRes, profileRes] = await Promise.all([
          fetch('/api/mobile/jobs?filter=today'),
          fetch('/api/profile'),
        ]);
        if (jobRes.ok) setData(await jobRes.json());
        if (profileRes.ok) setUser(await profileRes.json());
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const nextJob = data?.jobs?.[0];
  const todayJobs = data?.jobs || [];

  const handleOnMyWay = async () => {
    if (!nextJob) return;
    const body = { jobId: nextJob.id, status: 'ON_ROUTE' };
    if (!navigator.onLine) {
      const q = JSON.parse(localStorage.getItem('cafm_offline_queue') || '[]');
      q.push({ url: '/api/mobile/jobs', method: 'PATCH', body });
      localStorage.setItem('cafm_offline_queue', JSON.stringify(q));
      alert("You're offline — status change queued and will sync automatically.");
      return;
    }
    await fetch('/api/mobile/jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setData((d: any) => ({ ...d, jobs: d.jobs.map((j: any) => j.id === nextJob.id ? { ...j, status: 'ON_ROUTE' } : j) }));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 p-4 pt-6">
      {/* Greeting */}
      <div>
        <p className="text-[#94A3B8] text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        <h1 className="text-2xl font-black text-white mt-1">{getGreeting()}, {firstName}.</h1>
      </div>

      {/* Next Job Card */}
      {nextJob ? (
        <div className="bg-[#1E293B] rounded-2xl border-t-4 border-t-[#E91E8C] border border-[#334155] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-[#E91E8C] uppercase tracking-[0.2em]">⚡ Next Job</span>
            <Badge className={cn("border-none text-[10px] uppercase font-bold", STATUS_COLOUR[nextJob.status] || 'bg-[#334155] text-[#94A3B8]')}>
              {nextJob.status}
            </Badge>
          </div>
          {nextJob.scheduledDate && (
            <p className="text-[#94A3B8] text-xs font-bold mb-1">{format(new Date(nextJob.scheduledDate), 'HH:mm')} today</p>
          )}
          <h2 className="text-lg font-black text-white leading-tight mb-0.5">{nextJob.client?.name}</h2>
          <p className="text-[#94A3B8] text-sm mb-1">{nextJob.site?.address}, {nextJob.site?.postcode}</p>
          <p className="text-white text-sm font-semibold mb-4">{nextJob.title}</p>
          <div className={cn("inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded mb-4", PRIORITY_COLOUR[nextJob.priority])}>
            {nextJob.priority}
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nextJob.site?.address} ${nextJob.site?.postcode}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#1E40AF] text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
            >
              <Navigation className="w-4 h-4" /> Navigate
            </a>
            {nextJob.status === 'ASSIGNED' && (
              <button onClick={handleOnMyWay} className="flex items-center justify-center gap-2 bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold py-3.5 rounded-xl transition-colors text-sm">
                <Zap className="w-4 h-4" /> I&apos;m On My Way
              </button>
            )}
            {nextJob.status === 'ON_ROUTE' && (
              <Link href={`/mobile/jobs/${nextJob.id}`} className="flex items-center justify-center gap-2 bg-[#E91E8C] text-white font-bold py-3.5 rounded-xl text-sm">
                <CheckCircle2 className="w-4 h-4" /> Update Status
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-[#22C55E] mx-auto mb-3" />
          <p className="text-white font-bold">No jobs scheduled today</p>
          <p className="text-[#94A3B8] text-sm mt-1">Check the jobs list for upcoming work</p>
        </div>
      )}

      {/* Today's Schedule */}
      {todayJobs.length > 1 && (
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">Today&apos;s Schedule</h3>
          <div className="flex flex-col gap-2">
            {todayJobs.slice(1).map((job: any) => (
              <Link key={job.id} href={`/mobile/jobs/${job.id}`} className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between active:bg-[#334155] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", PRIORITY_COLOUR[job.priority])} />
                  <div>
                    <p className="text-[#94A3B8] text-[11px] font-bold">{job.scheduledDate ? format(new Date(job.scheduledDate), 'HH:mm') : 'Anytime'} • {job.client?.name}</p>
                    <p className="text-white text-sm font-bold leading-tight">{job.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("border-none text-[9px] uppercase font-bold", STATUS_COLOUR[job.status] || 'bg-[#334155] text-[#94A3B8]')}>
                    {job.status}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-[#475569]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-white">{data?.weekCount || 0}</p>
          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mt-1">Jobs This Week</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-[#22C55E]">{data?.completedToday || 0}</p>
          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mt-1">Completed Today</p>
        </div>
      </div>
    </div>
  );
}
