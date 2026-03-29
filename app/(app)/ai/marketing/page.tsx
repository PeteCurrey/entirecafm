'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Loader2, RefreshCw, TrendingUp, AlertTriangle, FileText, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AIMarketingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/marketing', { method: 'POST' });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setError('Could not generate marketing analysis.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const contentTypeIcon = (type: string) => type === 'blog' ? '📝' : type === 'case study' ? '📊' : '📧';

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-16 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[#E91E8C] text-sm font-bold uppercase tracking-widest mb-1">AI Operations</p>
          <h1 className="text-3xl font-black text-white font-inter tracking-tight">Marketing Intelligence</h1>
          <p className="text-[#94A3B8] text-sm mt-1">AI-driven growth analysis — upsell opportunities, churn risks, and content strategy.</p>
        </div>
        <Button onClick={fetchData} disabled={loading} className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-10 px-6">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />} Refresh Analysis
        </Button>
      </div>

      {loading && <div className="flex items-center gap-4 p-10 text-[#94A3B8]"><Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" /><p>Analysing growth patterns...</p></div>}
      {error && <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-6 text-[#EF4444] font-bold">{error}</div>}

      {!loading && data && (
        <>
          {/* AI Summary */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 flex gap-4">
            <Brain className="w-6 h-6 text-[#E91E8C] shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest mb-2">AI Growth Summary</p>
              <p className="text-sm text-white leading-relaxed">{data.analysis.growthSummary}</p>
            </div>
          </div>

          {/* Client Acquisition Chart */}
          <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[280px]">
            <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">New Client Acquisition — Last 12 Months</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyNew}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#334155', borderRadius: '8px' }} />
                <Bar dataKey="newClients" name="New Clients" fill="#E91E8C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upsell Opportunities */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#22C55E]" /> Upsell Opportunities
              </h3>
              <div className="flex flex-col gap-3">
                {(data.analysis.upsellOpportunities || []).map((o: any, i: number) => (
                  <div key={i} className="border-l-4 border-l-[#22C55E] bg-[#22C55E]/5 rounded-r-xl p-4">
                    <p className="font-bold text-sm text-white mb-0.5">{o.client}</p>
                    <p className="text-[11px] text-[#22C55E] font-bold mb-1">→ {o.service}</p>
                    <p className="text-xs text-[#94A3B8]">{o.rationale}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Retention Risks */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" /> Retention Risks
              </h3>
              <div className="flex flex-col gap-3">
                {(data.analysis.retentionRisks || []).map((r: any, i: number) => (
                  <div key={i} className="border-l-4 border-l-[#F59E0B] bg-[#F59E0B]/5 rounded-r-xl p-4">
                    <p className="font-bold text-sm text-white mb-1">{r.client}</p>
                    <p className="text-xs text-[#94A3B8]">{r.risk}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Suggestions */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3B82F6]" /> Content Strategy
              </h3>
              <div className="flex flex-col gap-3">
                {(data.analysis.contentSuggestions || []).map((c: any, i: number) => (
                  <div key={i} className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{contentTypeIcon(c.type)}</span>
                      <span className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-widest">{c.type}</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">{c.topic}</p>
                    <p className="text-xs text-[#94A3B8]">{c.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
