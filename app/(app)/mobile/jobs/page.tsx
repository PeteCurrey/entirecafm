'use client';

import { useState, useEffect } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const FILTERS = ['Today', 'This Week', 'All Open'] as const;
const PRIORITY_DOT: Record<string, string> = { LOW: 'bg-[#3B82F6]', MEDIUM: 'bg-[#F59E0B]', HIGH: 'bg-[#F97316]', CRITICAL: 'bg-[#EF4444]' };
const STATUS_BADGE: Record<string, string> = { OPEN: 'bg-[#334155] text-[#94A3B8]', ASSIGNED: 'bg-[#9333EA]/20 text-[#9333EA]', ON_ROUTE: 'bg-[#F59E0B]/20 text-[#F59E0B]', ON_SITE: 'bg-[#E91E8C]/20 text-[#E91E8C]' };

export default function MobileJobsPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]>('Today');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const map: Record<string, string> = { 'Today': 'today', 'This Week': 'week', 'All Open': 'all' };
    fetch(`/api/mobile/jobs?filter=${map[filter]}`)
      .then(r => r.ok ? r.json() : { jobs: [] })
      .then(d => setJobs(d.jobs || []))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-[#111827] border-b border-[#334155] px-4 pt-5 pb-3 z-10">
        <h1 className="text-xl font-black text-white mb-3">My Jobs</h1>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn("flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
              filter === f ? 'bg-[#E91E8C] text-white' : 'bg-[#1E293B] text-[#94A3B8] border border-[#334155]'
            )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading && <div className="flex justify-center pt-10"><Loader2 className="w-6 h-6 text-[#E91E8C] animate-spin" /></div>}

        {!loading && jobs.length === 0 && (
          <div className="text-center pt-16 text-[#94A3B8]">
            <p className="font-bold text-white">No jobs found</p>
            <p className="text-sm mt-1">No {filter.toLowerCase()} jobs assigned to you</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {jobs.map(job => (
            <Link key={job.id} href={`/mobile/jobs/${job.id}`} className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center gap-3 active:bg-[#334155] transition-colors">
              <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", PRIORITY_DOT[job.priority])} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#94A3B8] font-bold">{job.client?.name}</p>
                <p className="text-white text-sm font-bold truncate">{job.title}</p>
                {job.scheduledDate && (
                  <p className="text-[#475569] text-[10px] mt-0.5">{format(new Date(job.scheduledDate), 'EEE dd MMM, HH:mm')}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={cn("border-none text-[9px] font-bold uppercase", STATUS_BADGE[job.status] || 'bg-[#334155] text-[#94A3B8]')}>
                  {job.status}
                </Badge>
                <ChevronRight className="w-4 h-4 text-[#475569]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
