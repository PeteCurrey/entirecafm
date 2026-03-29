'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, AlertCircle, TrendingDown, Leaf, Download, Factory
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ComplianceDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [esgData, setEsgData] = useState<any[]>([]);

  // Form State
  const [esgForm, setEsgForm] = useState({
     monthYear: format(new Date(), 'yyyy-MM'),
     carbonFootprint: '',
     electricityKwh: '',
     gasKwh: '',
     waterM3: '',
     wasteGenerated: '',
     wasteRecycled: '',
     vehicleMiles: ''
  });
  const [savingEsg, setSavingEsg] = useState(false);

  const fetchData = async () => {
    try {
      const [ovRes, esgRes] = await Promise.all([
        fetch('/api/compliance/overview'),
        fetch('/api/compliance/esg')
      ]);
      if (ovRes.ok) setOverview(await ovRes.json());
      if (esgRes.ok) setEsgData(await esgRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEsgSubmit = async () => {
    setSavingEsg(true);
    try {
      const res = await fetch('/api/compliance/esg', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(esgForm)
      });
      if (res.ok) {
         fetchData();
         setEsgForm({
            ...esgForm,
            carbonFootprint: '', electricityKwh: '', gasKwh: '', waterM3: '', wasteGenerated: '', wasteRecycled: '', vehicleMiles: ''
         });
      }
    } finally {
      setSavingEsg(false);
    }
  };

  const exportCSV = () => {
     if (esgData.length === 0) return alert('No data to export');
     const headers = ['Month', 'Carbon (kg)', 'Electric (kWh)', 'Gas (kWh)', 'Water (m3)', 'Waste Gen (kg)', 'Waste Recycled (kg)', 'Fleet Miles'];
     const rows = esgData.map(d => [d.monthYear, d.carbonFootprint, d.electricityKwh, d.gasKwh, d.waterM3, d.wasteGenerated, d.wasteRecycled, d.vehicleMiles]);
     
     let csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `EFM_ESG_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
     document.body.appendChild(link);
     link.click();
     link.remove();
  };

  const getScoreColor = (pct: number) => {
     if (pct >= 95) return 'text-[#22C55E] stroke-[#22C55E] bg-[#22C55E]';
     if (pct >= 80) return 'text-[#F59E0B] stroke-[#F59E0B] bg-[#F59E0B]';
     return 'text-[#EF4444] stroke-[#EF4444] bg-[#EF4444]';
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-[#94A3B8]">
      <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Compiling Statutory Telemetry...
    </div>
  );

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((overview?.overall || 0) / 100) * circumference;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#E91E8C]" /> Compliance & ESG Oracle
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Statutory auditing scopes, real-time risk scores, and granular ecological mapping.
          </p>
        </div>
      </div>

      <Tabs defaultValue="compliance" className="w-full mt-4">
        <TabsList className="bg-[#1E293B] border border-[#334155] h-12 w-fit flex overflow-x-auto justify-start rounded-lg p-1">
          <TabsTrigger value="compliance" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6 shrink-0 flex items-center gap-2">
             <AlertCircle className="w-4 h-4" /> Statutory Compliance
          </TabsTrigger>
          <TabsTrigger value="esg" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#E91E8C] font-bold tracking-wide rounded-md h-full px-6 shrink-0 flex items-center gap-2">
             <Leaf className="w-4 h-4" /> ESG Telemetry
          </TabsTrigger>
        </TabsList>

        {/* ================= COMPLIANCE TAB ================= */}
        <TabsContent value="compliance" className="mt-8 space-y-6">
           
           <div className="flex flex-col md:flex-row gap-6">
              {/* Overall Ring component mapping the SFG20 outputs directly */}
              <div className="bg-[#111827] border border-[#334155] rounded-xl p-8 flex flex-col items-center justify-center min-w-[320px]">
                 <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-6">Aggregate Fleet Health</h3>
                 <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                       <circle className="stroke-[#1E293B]" strokeWidth="12" fill="transparent" r={radius} cx="80" cy="80" />
                       <circle 
                          className={cn("transition-all duration-1000 ease-in-out", getScoreColor(overview?.overall || 0).split(' ')[1])}
                          strokeWidth="12" strokeLinecap="round" fill="transparent" r={radius} cx="80" cy="80"
                          style={{ strokeDasharray: circumference, strokeDashoffset }}
                       />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                       <span className={cn("text-4xl font-black font-mono tracking-tighter", getScoreColor(overview?.overall || 0).split(' ')[0])}>
                         {overview?.overall}%
                       </span>
                    </div>
                 </div>
                 <p className="text-xs text-[#94A3B8] mt-6 text-center w-full max-w-[200px]">
                    Derived locally across {overview?.totalSites} sites holding {overview?.totalPlans} automated PPM plans.
                 </p>
              </div>

              {/* Categorical Matrix Mapping */}
              <div className="flex-1 bg-[#111827] border border-[#334155] rounded-xl p-6">
                 <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-6">Divisional Matrix Splitting</h3>
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {overview?.categories.map((cat: any) => (
                       <div key={cat.name} className="flex flex-col">
                          <div className="flex justify-between items-end mb-2">
                             <span className="text-xs font-bold text-white uppercase tracking-wider">{cat.name}</span>
                             <span className={cn("text-xs font-bold font-mono", getScoreColor(cat.score).split(' ')[0])}>{cat.score}%</span>
                          </div>
                          <div className="h-2 w-full bg-[#1E293B] rounded-full overflow-hidden">
                             <div className={cn("h-full transition-all duration-1000", getScoreColor(cat.score).split(' ')[2])} style={{ width: `${cat.score}%` }} />
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Site Table */}
           <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#334155]">
                 <h3 className="text-sm font-bold text-white tracking-widest uppercase">Deployed Asset Nodes</h3>
              </div>
              <Table>
                 <TableHeader className="bg-[#111827]">
                   <TableRow className="border-none hover:bg-transparent">
                     <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Site Designation</TableHead>
                     <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Client Portfolio</TableHead>
                     <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 w-[250px]">Health Bar</TableHead>
                     <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Risks</TableHead>
                     <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 text-right pr-6">Manage</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {overview?.sites.map((site: any) => (
                     <TableRow key={site.name} className="border-b border-[#334155] hover:bg-[#334155]/20">
                       <TableCell className="py-4">
                         <span className="font-bold text-[13px] text-white block">{site.name}</span>
                       </TableCell>
                       <TableCell className="py-4">
                         <span className="text-xs font-medium text-[#94A3B8] block">{site.clientName}</span>
                       </TableCell>
                       <TableCell className="py-4 w-[250px]">
                         <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-[#111827] rounded-sm overflow-hidden border border-[#334155]">
                               <div className={cn("h-full transition-all duration-1000", getScoreColor(site.compliancePercent).split(' ')[2])} style={{ width: `${site.compliancePercent}%` }} />
                            </div>
                            <span className={cn("text-[11px] font-bold font-mono w-8 text-right", getScoreColor(site.compliancePercent).split(' ')[0])}>{site.compliancePercent}%</span>
                         </div>
                       </TableCell>
                       <TableCell className="py-4">
                         {site.overdueCount > 0 ? (
                            <Badge className="bg-[#EF4444]/10 text-[#EF4444] border-none px-2 py-0 text-[10px] uppercase font-bold tracking-widest">
                               {site.overdueCount} Overdue
                            </Badge>
                         ) : (
                            <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-none px-2 py-0 text-[10px] uppercase font-bold tracking-widest">
                               0 Risks
                            </Badge>
                         )}
                       </TableCell>
                       <TableCell className="py-4 text-right pr-6">
                         <Link href={`/ppm`}>
                           <Button variant="outline" className="border-[#334155] text-white hover:bg-[#334155] h-7 text-[10px] font-bold uppercase tracking-wider px-3">
                              Access PPM Plan
                           </Button>
                         </Link>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
              </Table>
           </div>
        </TabsContent>

        {/* ================= ESG TAB ================= */}
        <TabsContent value="esg" className="mt-8 space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form Col */}
              <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 lg:col-span-1 border-t-4 border-t-[#E91E8C]">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-[#E91E8C] uppercase tracking-widest">Manual Ingestion Engine</h3>
                 </div>

                 <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1 block">Data Period (YYYY-MM)</label>
                      <Input type="month" value={esgForm.monthYear} onChange={e => setEsgForm({...esgForm, monthYear: e.target.value})} className="bg-[#1E293B] border-[#334155] text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1 block">Carbon Payload (kg CO2)</label>
                      <Input type="number" value={esgForm.carbonFootprint} onChange={e => setEsgForm({...esgForm, carbonFootprint: e.target.value})} className="bg-[#1E293B] border-[#334155] text-white font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1 block">Electric (kWh)</label>
                         <Input type="number" value={esgForm.electricityKwh} onChange={e => setEsgForm({...esgForm, electricityKwh: e.target.value})} className="bg-[#1E293B] border-[#334155] text-white font-mono" />
                       </div>
                       <div>
                         <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1 block">Gas (kWh)</label>
                         <Input type="number" value={esgForm.gasKwh} onChange={e => setEsgForm({...esgForm, gasKwh: e.target.value})} className="bg-[#1E293B] border-[#334155] text-white font-mono" />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1 block">Waste Vol (kg)</label>
                         <Input type="number" value={esgForm.wasteGenerated} onChange={e => setEsgForm({...esgForm, wasteGenerated: e.target.value})} className="bg-[#1E293B] border-[#334155] text-white font-mono" />
                       </div>
                       <div>
                         <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1 block">Recycled (kg)</label>
                         <Input type="number" value={esgForm.wasteRecycled} onChange={e => setEsgForm({...esgForm, wasteRecycled: e.target.value})} className="bg-[#1E293B] border-[#334155] text-white font-mono" />
                       </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mb-1 block">Logistics Mileage (Miles)</label>
                      <Input type="number" value={esgForm.vehicleMiles} onChange={e => setEsgForm({...esgForm, vehicleMiles: e.target.value})} className="bg-[#1E293B] border-[#334155] text-white font-mono" />
                    </div>

                    <Button onClick={handleEsgSubmit} disabled={savingEsg || !esgForm.monthYear} className="w-full bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold tracking-widest mt-4">
                       {savingEsg ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Compile Monthly Sequence'}
                    </Button>
                 </div>
              </div>

              {/* Charts Col */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                 <div className="flex justify-end w-full">
                    <Button onClick={exportCSV} variant="outline" className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 font-bold px-4 h-8 text-[11px] uppercase tracking-wide">
                       <Download className="w-4 h-4 mr-2" /> Rip CSV Output
                    </Button>
                 </div>
                 
                 <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[260px]">
                    <h3 className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest mb-4">Carbon Trace Trajectory (kg CO2)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={esgData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="monthYear" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#94A3B8', fontSize: '10px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#E91E8C', fontWeight: 'bold' }}
                        />
                        <Line type="monotone" dataKey="carbonFootprint" stroke="#E91E8C" strokeWidth={3} dot={{r: 4, fill: '#0D0D0D', strokeWidth: 2}} />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[200px]">
                       <h3 className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-widest mb-4">M&E Electric Output (kWh)</h3>
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={esgData}>
                           <Tooltip contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#334155', borderRadius: '8px' }} />
                           <Line type="stepAfter" dataKey="electricityKwh" stroke="#3B82F6" strokeWidth={2} dot={false} />
                         </LineChart>
                       </ResponsiveContainer>
                    </div>

                    <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[200px]">
                       <h3 className="text-[10px] font-bold text-[#22C55E] uppercase tracking-widest mb-4">Solid Waste Dispersal (kg)</h3>
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={esgData}>
                           <Tooltip contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#334155', borderRadius: '8px' }} />
                           <Line type="monotone" dataKey="wasteGenerated" stroke="#475569" strokeWidth={2} dot={false} />
                           <Line type="monotone" dataKey="wasteRecycled" stroke="#22C55E" strokeWidth={2} dot={false} />
                         </LineChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
