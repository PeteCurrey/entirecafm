'use client';

import { useState, useEffect } from 'react';
import { FileBarChart, Loader2, RefreshCw, Download, Printer, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function AIBriefingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/briefing', { method: 'POST' });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setError('Could not generate executive briefing.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBriefing(); }, []);

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(233, 30, 140);
    doc.text('EntireCAFM', 14, 20);
    doc.setFontSize(14); doc.setTextColor(40);
    doc.text(`Executive Briefing — ${data.briefing.month}`, 14, 30);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 38);
    let y = 50;
    doc.setFontSize(11); doc.setTextColor(40);
    doc.text('Executive Summary', 14, y); y += 6;
    doc.setFontSize(9); doc.setTextColor(80);
    const sumLines = doc.splitTextToSize(data.briefing.executiveSummary, 180);
    doc.text(sumLines, 14, y); y += sumLines.length * 5 + 8;
    for (const section of data.briefing.sections) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setTextColor(233, 30, 140);
      doc.text(section.title, 14, y); y += 6;
      doc.setFontSize(9); doc.setTextColor(60);
      const lines = doc.splitTextToSize(section.content, 180);
      doc.text(lines, 14, y); y += lines.length * 5 + 8;
    }
    doc.save(`EntireCAFM_Briefing_${data.briefing.month?.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto pb-16 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[#E91E8C] text-sm font-bold uppercase tracking-widest mb-1">AI Operations</p>
          <h1 className="text-3xl font-black text-white font-inter tracking-tight">Executive Briefing</h1>
          <p className="text-[#94A3B8] text-sm mt-1">AI-generated monthly board pack — updated live from operational data.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchBriefing} disabled={loading} className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-10 px-5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />} Regenerate
          </Button>
          <Button onClick={exportPDF} disabled={loading || !data} variant="outline" className="border-[#334155] text-white bg-transparent hover:bg-[#334155] font-bold h-10 px-5">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button onClick={() => window.print()} disabled={loading || !data} variant="outline" className="border-[#334155] text-white bg-transparent hover:bg-[#334155] font-bold h-10 px-5">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-20 text-[#94A3B8] gap-4">
          <Brain className="w-12 h-12 text-[#E91E8C] animate-pulse" />
          <p className="font-bold text-white">Generating executive briefing...</p>
          <p className="text-sm">Analysing all operational data — this may take 5-10 seconds</p>
        </div>
      )}

      {error && <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-6 text-[#EF4444] font-bold">{error}</div>}

      {!loading && data && (
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden print:shadow-none">
          {/* Doc header */}
          <div className="bg-[#0D0D0D] p-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-[#E91E8C] tracking-tight mb-1">EntireCAFM.</h1>
              <p className="text-white/60 text-sm font-bold uppercase tracking-widest">Executive Briefing</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-lg">{data.briefing.month}</p>
              <p className="text-white/40 text-xs mt-1">Generated {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
              <div className="flex items-center gap-1 mt-2 justify-end">
                <Brain className="w-3 h-3 text-[#E91E8C]" />
                <span className="text-[10px] text-[#E91E8C] font-bold uppercase tracking-widest">AI Generated</span>
              </div>
            </div>
          </div>

          {/* KPI Snapshot */}
          {data.rawData && (
            <div className="grid grid-cols-4 bg-[#1E293B] border-b border-[#334155]">
              {[
                { label: 'Revenue', value: `£${Number(data.rawData.revThis).toLocaleString()}` },
                { label: 'Jobs Created', value: data.rawData.jobsThisMonth },
                { label: 'PPM Compliance', value: `${data.rawData.ppmCompliance}%` },
                { label: 'Active Engineers', value: data.rawData.engineers },
              ].map((kpi, i) => (
                <div key={i} className="p-5 border-r border-[#334155] last:border-0 text-center">
                  <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1">{kpi.label}</p>
                  <p className="text-2xl font-black text-white font-mono">{kpi.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="p-8 print:p-6">
            {/* Executive Summary */}
            <div className="bg-[#FFF8FE] border-l-4 border-[#E91E8C] p-6 rounded-r-xl mb-8">
              <p className="text-[10px] font-black text-[#E91E8C] uppercase tracking-widest mb-2">Executive Summary</p>
              <p className="text-slate-700 text-base leading-[1.7]">{data.briefing.executiveSummary}</p>
            </div>

            {/* Sections */}
            <div className="flex flex-col divide-y divide-slate-100">
              {(data.briefing.sections || []).map((section: any, i: number) => (
                <div key={i} className="py-7">
                  <h2 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#E91E8C] text-white text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    {section.title}
                  </h2>
                  <p className="text-slate-600 text-sm leading-[1.8] whitespace-pre-line">{section.content}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
              <span>EntireCAFM — Confidential Executive Briefing</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
