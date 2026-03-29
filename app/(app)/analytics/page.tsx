'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2, TrendingUp, ShieldCheck, Wrench, Users, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

const PERIODS = ['7D', '30D', '90D', 'YTD'] as const;
const STATUS_COLOURS: Record<string, string> = { OPEN: '#3B82F6', ASSIGNED: '#9333EA', ON_ROUTE: '#F59E0B', ON_SITE: '#E91E8C', COMPLETED: '#22C55E', CANCELLED: '#6B7280', INVOICED: '#14B8A6' };
const PRIORITY_COLOURS: Record<string, string> = { LOW: '#3B82F6', MEDIUM: '#F59E0B', HIGH: '#F97316', CRITICAL: '#EF4444' };

function KPI({ label, value, sub, colour = 'text-white' }: { label: string; value: string | number; sub?: string; colour?: string }) {
  return (
    <div className="bg-[#111827] border border-[#334155] rounded-xl p-5">
      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">{label}</p>
      <p className={cn("text-3xl font-black font-mono tracking-tight", colour)}>{value}</p>
      {sub && <p className="text-xs text-[#94A3B8] mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<string>('30D');
  const [kpis, setKpis] = useState<any>(null);
  const [jobsTime, setJobsTime] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [ppm, setPpm] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const p = period.toLowerCase();
    const [kRes, jtRes, rRes, ppmRes] = await Promise.all([
      fetch(`/api/analytics/kpis?period=${p}`),
      fetch(`/api/analytics/jobs-over-time?period=${p}`),
      fetch('/api/analytics/revenue'),
      fetch('/api/analytics/ppm-compliance'),
    ]);
    if (kRes.ok) setKpis(await kRes.json());
    if (jtRes.ok) setJobsTime(await jtRes.json());
    if (rRes.ok) setRevenue(await rRes.json());
    if (ppmRes.ok) setPpm(await ppmRes.json());
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const periodLabel = period === 'YTD' ? 'Year to Date' : `Last ${period}`;

  const slaColour = (v: number) => v >= 90 ? 'text-[#22C55E]' : v >= 70 ? 'text-[#F59E0B]' : 'text-[#EF4444]';
  const complianceColour = (v: number) => v >= 90 ? '#22C55E' : v >= 70 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-16 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-inter tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#E91E8C]" /> Analytics
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">Operational performance — {periodLabel}</p>
        </div>
        <div className="flex gap-2 bg-[#1E293B] p-1 rounded-lg border border-[#334155]">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn("px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors", period === p ? 'bg-[#E91E8C] text-white' : 'text-[#94A3B8] hover:text-white')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="flex items-center gap-3 text-[#94A3B8] p-10"><Loader2 className="w-6 h-6 animate-spin text-[#E91E8C]" /> Loading analytics...</div>}

      {!loading && kpis && (
        <>
          {/* KPI Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Total Jobs" value={kpis.kpis.total} sub={periodLabel} />
            <KPI label="Completed" value={kpis.kpis.completed} sub={kpis.kpis.total ? `${Math.round(kpis.kpis.completed/kpis.kpis.total*100)}% completion rate` : '—'} colour="text-[#22C55E]" />
            <KPI label="SLA Compliance" value={`${kpis.kpis.slaCompliance}%`} colour={slaColour(kpis.kpis.slaCompliance)} />
            <KPI label="Active Engineers" value={kpis.kpis.engineerCount} />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Pie */}
            <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[320px]">
              <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Jobs by Status</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kpis.statusDist} dataKey="count" nameKey="status" cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                    {kpis.statusDist.map((e: any, i: number) => <Cell key={i} fill={STATUS_COLOURS[e.status] || '#334155'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Bar */}
            <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[320px]">
              <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Jobs by Priority</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.priorityDist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="priority" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} width={70} />
                  <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {kpis.priorityDist.map((e: any, i: number) => <Cell key={i} fill={PRIORITY_COLOURS[e.priority] || '#334155'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Jobs Over Time */}
            <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[280px]">
              <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Job Creation — {periodLabel}</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={jobsTime}>
                  <defs><linearGradient id="jg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E91E8C" stopOpacity={0.2}/><stop offset="95%" stopColor="#E91E8C" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} interval={Math.floor(jobsTime.length / 6)} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="jobs" stroke="#E91E8C" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue */}
            <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[280px]">
              <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Revenue — Last 12 Months</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="ri" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E91E8C" stopOpacity={0.3}/><stop offset="95%" stopColor="#E91E8C" stopOpacity={0}/></linearGradient>
                    <linearGradient id="rp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/><stop offset="95%" stopColor="#22C55E" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `£${v}`} />
                  <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke="#E91E8C" strokeWidth={2} fill="url(#ri)" />
                  <Area type="monotone" dataKey="paid" name="Paid" stroke="#22C55E" strokeWidth={2} fill="url(#rp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Engineer Workload */}
            <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[280px]">
              <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Engineer Workload</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.engineerWorkload.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="jobs" name="Jobs" fill="#E91E8C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Clients table */}
            <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 overflow-auto">
              <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Top Clients by Job Volume</h3>
              <Table>
                <TableHeader><TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#94A3B8] text-[10px] uppercase tracking-wider">#</TableHead>
                  <TableHead className="text-[#94A3B8] text-[10px] uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-[#94A3B8] text-[10px] uppercase tracking-wider text-right">Jobs</TableHead>
                  <TableHead className="text-[#94A3B8] text-[10px] uppercase tracking-wider text-right">Rate</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {kpis.topClients.slice(0, 8).map((c: any, i: number) => (
                    <TableRow key={c.name} className="border-b border-[#334155] hover:bg-[#334155]/20">
                      <TableCell className="text-[#475569] font-mono text-xs py-2">{i + 1}</TableCell>
                      <TableCell className="text-white font-bold text-xs py-2">{c.name}</TableCell>
                      <TableCell className="text-white font-mono text-xs text-right py-2">{c.total}</TableCell>
                      <TableCell className="py-2 text-right"><span className={cn("text-xs font-bold", c.rate >= 80 ? 'text-[#22C55E]' : c.rate >= 60 ? 'text-[#F59E0B]' : 'text-[#EF4444]')}>{c.rate}%</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* PPM Compliance Section */}
          {ppm && (
            <>
              <div className="mt-4">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#E91E8C]" /> PPM Compliance by Site</h2>
                <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ppm.sites} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} width={100} />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Compliance']} contentStyle={{ background: '#0D0D0D', border: '1px solid #334155', borderRadius: '8px' }} />
                      <Bar dataKey="compliance" radius={[0, 4, 4, 0]}>
                        {ppm.sites.map((s: any, i: number) => <Cell key={i} fill={complianceColour(s.compliance)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Overdue PPM table */}
              {ppm.overdueTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#EF4444]" /> Overdue PPM Tasks
                  </h3>
                  <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#111827]"><TableRow className="border-none hover:bg-transparent">
                        <TableHead className="text-[#94A3B8] text-[10px] uppercase tracking-wider py-3">Task</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] uppercase tracking-wider py-3">Site</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] uppercase tracking-wider py-3">Due Date</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] uppercase tracking-wider py-3 text-right">Days Overdue</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] uppercase tracking-wider py-3 text-right pr-4">Action</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {ppm.overdueTasks.slice(0, 10).map((t: any) => (
                          <TableRow key={t.id} className="border-b border-[#334155] hover:bg-[#334155]/20">
                            <TableCell className="text-white font-bold text-xs py-3">{t.title}</TableCell>
                            <TableCell className="text-[#94A3B8] text-xs py-3">{t.siteName}</TableCell>
                            <TableCell className="text-[#94A3B8] text-xs py-3">{format(new Date(t.nextDue), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="py-3 text-right"><Badge className="bg-[#EF4444]/10 text-[#EF4444] border-none text-[10px]">{t.daysOverdue}d</Badge></TableCell>
                            <TableCell className="py-3 text-right pr-4"><Link href="/jobs/new"><Button variant="outline" className="h-7 text-[10px] uppercase border-[#334155] hover:bg-[#334155] text-white font-bold"><Plus className="w-3 h-3 mr-1" />Create Job</Button></Link></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
