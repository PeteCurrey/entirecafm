'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Loader2, ArrowRight,
  PoundSterling, TrendingUp, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { KPITile } from '@/components/KPITile';

export default function InvoicesDashboardPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const [invRes, sumRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/invoices/summary')
      ]);
      if (invRes.ok) setInvoices(await invRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
    inv.client?.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
     switch (status) {
       case 'PAID': return 'bg-[#22C55E]/10 flex text-[#22C55E]';
       case 'SENT': return 'bg-[#3B82F6]/10 flex text-[#3B82F6]';
       case 'DRAFT': return 'bg-[#334155] flex text-[#94A3B8]';
       case 'OVERDUE': return 'bg-[#EF4444]/10 flex text-[#EF4444] animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]';
       case 'CANCELLED': return 'bg-[#1E293B] flex text-[#475569] line-through';
       default: return 'bg-[#334155] flex text-white';
     }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <PoundSterling className="w-6 h-6 text-[#E91E8C]" /> Financial Ledger
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Accounts receivable, draft invoices, and YTD performance analytics.
          </p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-20 text-[#94A3B8]">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#E91E8C]" /> Processing Ledgers...
        </div>
      ) : (
        <>
          {/* Financial Summary */}
          {summary && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <KPITile 
                   title="Total Invoiced (YTD)" 
                   value={`£${summary.metrics.totalInvoiced.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}
                   icon={TrendingUp}
                   color="blue"
                 />
                 <KPITile 
                   title="Cleared / Paid (YTD)" 
                   value={`£${summary.metrics.totalPaid.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}
                   icon={PoundSterling}
                   color="pink"
                 />
                 <KPITile 
                   title="Outstanding Debts" 
                   value={`£${summary.metrics.outstanding.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}
                   icon={AlertCircle}
                   color="red"
                   trend={summary.metrics.outstanding > 10000 ? "High Risk Exposure" : "Manageable Float"}
                   trendUp={summary.metrics.outstanding > 10000 ? false : true}
                 />
              </div>

              <div className="bg-[#111827] border border-[#334155] rounded-xl p-6 h-[300px]">
                 <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Invoiced vs Cleared (Last 12 Months)</h3>
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={summary.chart}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                     <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                     <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `£${value}`} />
                     <Tooltip 
                       cursor={{fill: '#334155', opacity: 0.2}}
                       contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#334155', borderRadius: '8px' }}
                       labelStyle={{ color: '#94A3B8', fontSize: '12px', fontWeight: 'bold' }}
                     />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                     <Bar dataKey="invoiced" name="Invoiced Amount" fill="#1E40AF" radius={[2, 2, 0, 0]} />
                     <Bar dataKey="paid" name="Cleared (Paid)" fill="#E91E8C" radius={[2, 2, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table Controls */}
          <div className="flex bg-[#1E293B] p-4 rounded-lg border border-[#334155]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <Input 
                placeholder="Search Invoice Number or Client..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-[#0D0D0D] border-[#334155] text-white h-10 w-full"
              />
            </div>
          </div>

          <div className="relative rounded-md border border-[#334155] bg-[#1E293B] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#111827]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 w-[160px]">Invoice #</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Client Focus</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Net Amount</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">VAT Amount</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Gross Total</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Current Status</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Creation Date</TableHead>
                  <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 text-right pr-6">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((inv) => (
                    <TableRow key={inv.id} className="border-b border-[#334155] hover:bg-[#334155]/20">
                      <TableCell className="py-4">
                        <span className="font-bold text-[12px] text-white font-mono">{inv.invoiceNumber}</span>
                      </TableCell>
                      <TableCell className="py-4">
                         <span className="font-bold text-[12px] text-white block">{inv.client?.name}</span>
                      </TableCell>
                      <TableCell className="py-4 text-[#94A3B8] text-[12px]">£{parseFloat(inv.subtotal).toLocaleString('en-GB', {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="py-4 text-[#E91E8C] font-mono text-[11px]">£{parseFloat(inv.tax).toLocaleString('en-GB', {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="py-4">
                         <span className="font-bold text-white text-[13px]">£{parseFloat(inv.total).toLocaleString('en-GB', {minimumFractionDigits: 2})}</span>
                      </TableCell>
                      <TableCell className="py-4">
                         <Badge className={cn("border-none px-2.5 py-0.5 rounded-sm font-bold uppercase tracking-widest text-[10px] w-fit", getStatusColor(inv.status))}>
                           {inv.status}
                         </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-[#94A3B8] text-[11px]">{format(new Date(inv.createdAt), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="outline" className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 bg-transparent h-7 text-[10px] font-bold uppercase tracking-wider px-3">
                             Open Trace
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center text-[#94A3B8]">
                      <p>No invoices matching criteria.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
