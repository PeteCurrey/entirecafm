'use client';

import { useState, useEffect } from 'react';
import { Brain, Loader2, RefreshCw, AlertTriangle, TrendingUp, Target, Zap, DollarSign, Users, Wrench, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-[#1E293B] rounded-xl p-6 animate-pulse", className)}>
      <div className="h-4 w-1/3 bg-[#334155] rounded mb-3" />
      <div className="h-3 w-full bg-[#334155] rounded mb-2" />
      <div className="h-3 w-4/5 bg-[#334155] rounded" />
    </div>
  );
}

function KPICard({ label, value, icon, sub }: { label: string; value: string | number; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-[#111827] border border-[#334155] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">{label}</span>
        <div className="text-[#E91E8C]">{icon}</div>
      </div>
      <div className="text-3xl font-black text-white font-mono tracking-tight">{value}</div>
      {sub && <p className="text-xs text-[#94A3B8] leading-relaxed">{sub}</p>}
    </div>
  );
}

export default function AIDirectorPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning, Peter.';
    if (h < 17) return 'Good afternoon, Peter.';
    return 'Good evening, Peter.';
  };

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/director', { method: 'POST' });
      if (!res.ok) throw new Error('Generation failed');
      setData(await res.json());
      setLastRefresh(new Date());
    } catch (e) {
      setError('Could not generate briefing — please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBriefing(); }, []);

  const urgencyStyle = (u: string) => ({
    high:   'border-l-[#EF4444] bg-[#EF4444]/5 text-[#EF4444]',
    medium: 'border-l-[#F59E0B] bg-[#F59E0B]/5 text-[#F59E0B]',
    low:    'border-l-[#3B82F6] bg-[#3B82F6]/5 text-[#3B82F6]',
  }[u] || 'border-l-[#334155] bg-[#1E293B] text-[#94A3B8]');

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-16">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[#E91E8C] text-sm font-bold uppercase tracking-widest mb-1">AI Operations</p>
          <h1 className="text-3xl font-black text-white font-inter tracking-tight">{getGreeting()}</h1>
          <p className="text-[#94A3B8] text-sm mt-1">AI Director Dashboard — real-time business intelligence</p>
          {lastRefresh && <p className="text-[#475569] text-xs mt-1">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>}
        </div>
        <Button onClick={fetchBriefing} disabled={loading} className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-10 px-6 shadow-lg">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {loading ? 'Generating...' : 'Refresh Briefing'}
        </Button>
      </div>

      {error && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-6 flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-[#EF4444] shrink-0" />
          <div>
            <p className="text-white font-bold">{error}</p>
            <Button onClick={fetchBriefing} variant="ghost" className="text-[#EF4444] hover:bg-[#EF4444]/10 font-bold mt-2 h-8 px-3">Retry</Button>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="flex flex-col gap-6">
          <div className="bg-[#1E293B] rounded-xl p-8 animate-pulse flex items-center gap-4">
            <Brain className="w-8 h-8 text-[#E91E8C] animate-pulse" />
            <div>
              <div className="h-5 w-64 bg-[#334155] rounded mb-2" />
              <p className="text-[#94A3B8] text-sm">Generating your briefing... (3-8 seconds)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <SkeletonCard className="h-40" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* Headline */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-6 h-6 text-[#E91E8C]" />
              <span className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest">AI Intelligence Summary</span>
            </div>
            <h2 className="text-[22px] font-bold text-white font-inter leading-tight mb-3">{data.briefing.headline}</h2>
            <p className="text-[#94A3B8] text-base leading-[1.7]">{data.briefing.summary}</p>
          </div>

          {/* KPI Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Open Jobs" value={data.kpis.openJobs} icon={<Wrench className="w-5 h-5" />} sub={data.briefing.engineerInsight} />
            <KPICard label="Revenue This Month" value={`£${Number(data.kpis.revenueThisMonth).toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} sub={data.briefing.kpiCommentary?.split('.')[0] + '.'} />
            <KPICard label="Outstanding" value={`£${Number(data.kpis.outstandingBalance).toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} sub={`${data.kpis.overdueJobs} jobs overdue`} />
            <KPICard label="PPM Compliance" value={`${data.kpis.ppmComplianceAvg}%`} icon={<ShieldCheck className="w-5 h-5" />} sub={`${data.kpis.overduePPMCount} overdue tasks`} />
          </div>

          {/* Alerts & Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alerts */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" /> Alerts & Risks
              </h3>
              <div className="flex flex-col gap-3">
                {(data.briefing.alerts || []).map((alert: any, i: number) => (
                  <div key={i} className={cn("border-l-4 rounded-r-xl p-4", urgencyStyle(alert.urgency))}>
                    <p className="font-bold text-sm mb-1">{alert.title}</p>
                    <p className="text-xs text-[#94A3B8]">{alert.detail}</p>
                  </div>
                ))}
                {(!data.briefing.alerts || data.briefing.alerts.length === 0) && (
                  <div className="text-[#94A3B8] text-sm italic p-4">No critical alerts at this time.</div>
                )}
              </div>
            </div>

            {/* Opportunities */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#22C55E]" /> Opportunities
              </h3>
              <div className="flex flex-col gap-3">
                {(data.briefing.opportunities || []).map((opp: any, i: number) => (
                  <div key={i} className="border-l-4 border-l-[#22C55E] bg-[#22C55E]/5 rounded-r-xl p-4">
                    <p className="font-bold text-sm text-[#22C55E] mb-1">{opp.title}</p>
                    <p className="text-xs text-[#94A3B8]">{opp.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Priority */}
          <div className="relative overflow-hidden rounded-xl p-8 bg-gradient-to-r from-[#E91E8C] to-[#9333EA]">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgyVjZoNFY0aC00ek02IDM0di00SDR2NEgwdjJoNHY0aDJ2LTRoNHYtMkg2ek02IDRWMEg0djRIMHYyaDR2NGgyVjZoNFY0SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="relative">
              <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] block mb-3">⚡ Today's Top Priority</span>
              <p className="text-xl font-bold text-white leading-relaxed">{data.briefing.topPriority}</p>
              <a href="/jobs/new">
                <Button className="mt-6 bg-white text-[#E91E8C] font-black hover:bg-white/90 h-10 px-6">
                  <Zap className="w-4 h-4 mr-2" /> Create Action
                </Button>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
