'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, RefreshCw, AlertTriangle, PoundSterling, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const urgencyBorder: Record<string, string> = {
  high: 'border-l-[#EF4444] bg-[#EF4444]/5',
  medium: 'border-l-[#F59E0B] bg-[#F59E0B]/5',
  low: 'border-l-[#3B82F6] bg-[#3B82F6]/5',
};

export default function AIAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/accounts', { method: 'POST' });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setError('Could not generate accounts analysis.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-16 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[#E91E8C] text-sm font-bold uppercase tracking-widest mb-1">AI Operations</p>
          <h1 className="text-3xl font-black text-white font-inter tracking-tight">Accounts Intelligence</h1>
          <p className="text-[#94A3B8] text-sm mt-1">AI-powered financial analysis — cashflow, risks, and collection priorities.</p>
        </div>
        <Button onClick={fetchData} disabled={loading} className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-10 px-6">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />} Refresh Analysis
        </Button>
      </div>

      {loading && <div className="flex items-center gap-4 p-10 text-[#94A3B8]"><Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" /><p>Analysing accounts data...</p></div>}

      {error && <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-6 text-[#EF4444] font-bold">{error}</div>}

      {!loading && data && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111827] border border-[#334155] rounded-xl p-5">
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Cleared This Month</p>
              <p className="text-3xl font-black text-[#22C55E] font-mono">£{Number(data.metrics.totalPaidThisMonth).toLocaleString()}</p>
            </div>
            <div className="bg-[#111827] border border-[#334155] rounded-xl p-5">
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Total Outstanding</p>
              <p className="text-3xl font-black text-[#EF4444] font-mono">£{Number(data.metrics.totalOutstanding).toLocaleString()}</p>
            </div>
          </div>

          {/* AI Summary Box */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 flex gap-4">
            <Brain className="w-6 h-6 text-[#E91E8C] shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest mb-2">AI Cashflow Analysis</p>
              <p className="text-sm text-white leading-relaxed mb-2">{data.analysis.cashflowSummary}</p>
              <p className="text-xs text-[#94A3B8] leading-relaxed">{data.analysis.paymentPatternInsight}</p>
              <p className="text-xs text-[#94A3B8] mt-2 italic">{data.analysis.revenueOutlook}</p>
            </div>
          </div>

          {/* Revenue Trend */}
          <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[300px]">
            <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Revenue Trend — Last 12 Months</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="invoiced" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E91E8C" stopOpacity={0.3} /><stop offset="95%" stopColor="#E91E8C" stopOpacity={0} /></linearGradient>
                  <linearGradient id="paid" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `£${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke="#E91E8C" strokeWidth={2} fill="url(#invoiced)" />
                <Area type="monotone" dataKey="paid" name="Paid" stroke="#22C55E" strokeWidth={2} fill="url(#paid)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overdue Risk */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" /> Client Risk Register
              </h3>
              <div className="flex flex-col gap-3">
                {(data.analysis.overdueRiskClients || []).map((c: any, i: number) => (
                  <div key={i} className="border border-[#EF4444]/30 bg-[#EF4444]/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">{c.client}</span>
                      <span className="font-mono text-sm text-[#EF4444] font-bold">£{Number(c.amount).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">{c.recommendation}</p>
                  </div>
                ))}
                {(!data.analysis.overdueRiskClients || data.analysis.overdueRiskClients.length === 0) && (
                  <div className="text-[#94A3B8] text-sm italic bg-[#1E293B] rounded-xl p-5">No overdue client risks identified.</div>
                )}
              </div>
            </div>

            {/* Collection Priorities */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <PoundSterling className="w-4 h-4 text-[#22C55E]" /> Collection Actions
              </h3>
              <div className="flex flex-col gap-3">
                {(data.analysis.collectionPriorities || []).map((c: any, i: number) => (
                  <div key={i} className={cn("border-l-4 rounded-r-xl p-4", urgencyBorder[c.urgency] || 'border-l-[#334155] bg-[#1E293B]')}>
                    <p className="font-bold text-sm text-white mb-1">{c.client}</p>
                    <p className="text-xs text-[#94A3B8]">{c.action}</p>
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
