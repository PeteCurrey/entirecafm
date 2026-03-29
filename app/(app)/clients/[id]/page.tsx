'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Building2, Users, Receipt, FileText, ArrowLeft, Mail, Phone,
  Loader2, Wallet, Briefcase, FileSignature, Copy, CheckCircle2, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ClientDetailPage() {
  const params = useParams();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingPortal, setSavingPortal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      if (res.ok) setClient(await res.json());
    } catch (err) {
      console.error('Failed to fetch client:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [params.id]);

  const handlePortalToggle = async (checked: boolean) => {
    setSavingPortal(true);
    try {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalEnabled: checked })
      });
      if (res.ok) fetchClient();
    } finally {
      setSavingPortal(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://app.entirecafm.com/portal/${client.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-[#94A3B8]">
      <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Loading Client Ledger...
    </div>
  );

  if (!client) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#94A3B8]">
      <Users className="w-12 h-12 text-[#334155] mb-4" />
      <div>Client not found.</div>
    </div>
  );

  const initials = client.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <Link href="/clients" className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors text-sm w-fit font-bold uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Link>

      {/* Header Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-[#111827] border border-[#334155] rounded-xl p-6 relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#E91E8C]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Brand & Identity */}
        <div className="lg:col-span-1 flex flex-col justify-center items-center text-center border-r-0 lg:border-r border-[#334155] lg:pr-6 pb-6 lg:pb-0 border-b lg:border-b-0">
          <Avatar className="w-24 h-24 border-[3px] border-[#334155] mb-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <AvatarImage src={client.logo || ''} />
            <AvatarFallback className="bg-[#0D0D0D] text-[#E91E8C] font-black text-3xl">{initials}</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight leading-tight mb-2">
            {client.name}
          </h1>
          <div className="flex flex-col gap-1 items-center text-[#94A3B8] text-sm">
            <span className="flex items-center gap-2"><Mail className="w-3 h-3" /> {client.email}</span>
            {client.phone && <span className="flex items-center gap-2"><Phone className="w-3 h-3" /> {client.phone}</span>}
          </div>
        </div>

        {/* Global Stats */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 lg:pl-4">
           {/* Stat Blocks */}
           <div className="bg-[#1E293B] rounded-lg border border-[#334155] p-4 flex flex-col justify-center">
             <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><Wallet className="w-3 h-3" /> Revenue YTD</span>
             <span className="text-xl font-bold text-emerald-400 font-mono">£{client.stats?.ytdRevenue?.toFixed(2) || '0.00'}</span>
           </div>
           
           <div className="bg-[#1E293B] rounded-lg border border-[#334155] p-4 flex flex-col justify-center">
             <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><Receipt className="w-3 h-3" /> Debt. Ledger</span>
             <span className={cn("text-xl font-bold font-mono", client.stats?.outstandingBalance > 0 ? "text-[#EF4444]" : "text-white")}>
               £{client.stats?.outstandingBalance?.toFixed(2) || '0.00'}
             </span>
           </div>

           <div className="bg-[#1E293B] rounded-lg border border-[#334155] p-4 flex flex-col justify-center">
             <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Open Jobs</span>
             <span className="text-2xl font-bold text-white font-mono">{client.stats?.openJobs || '0'}</span>
           </div>

           <div className="bg-[#1E293B] rounded-lg border border-[#334155] p-4 flex flex-col justify-center relative overflow-hidden group">
             {/* Portal Toggle Inner Component */}
             <div className="flex justify-between items-center mb-2">
               <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest">Client Portal</span>
               <Switch 
                 checked={client.portalEnabled} 
                 onCheckedChange={handlePortalToggle}
                 disabled={savingPortal}
                 className="data-[state=checked]:bg-[#3B82F6]"
               />
             </div>
             
             {client.portalEnabled ? (
               <div className="mt-2 text-xs flex gap-2">
                 <Input 
                   readOnly 
                   value={`/portal/${client.id.split('-')[0]}`} 
                   className="bg-[#0D0D0D] border-[#334155] text-[#94A3B8] h-7 px-2 text-[10px]" 
                 />
                 <Button onClick={copyLink} variant="outline" className="h-7 w-7 p-0 shrink-0 border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20">
                   {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                 </Button>
               </div>
             ) : (
               <div className="text-[10px] text-[#475569] mt-2 leading-tight">Secure read-only access currently deactivated for this client.</div>
             )}
           </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full mt-2">
        <TabsList className="bg-[#1E293B] border border-[#334155] h-12 w-full flex overflow-x-auto justify-start rounded-lg p-1 custom-scrollbar">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6 shrink-0">
             Overview
          </TabsTrigger>
          <TabsTrigger value="sites" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2">
             <Building2 className="w-4 h-4" /> Sites <Badge className="bg-[#0D0D0D] text-[#94A3B8] border-none ml-1">{client.stats?.siteCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2">
             <Wrench className="w-4 h-4" /> Reactive
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2">
             <Receipt className="w-4 h-4" /> Debt
          </TabsTrigger>
          <TabsTrigger value="quotes" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2">
             <FileSignature className="w-4 h-4" /> Proposals
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <Card className="bg-[#1E293B] border-[#334155] text-white lg:col-span-2 shadow-none">
                  <CardHeader className="border-b border-[#334155]/50 pb-4">
                    <CardTitle className="text-sm uppercase tracking-widest text-[#94A3B8]">Gross Revenue Trace (12 Months)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={client.revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94A3B8" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(val) => {
                            const [y, m] = val.split('-');
                            const d = new Date(parseInt(y), parseInt(m)-1);
                            return d.toLocaleString('default', { month: 'short' });
                          }}
                        />
                        <YAxis 
                          stroke="#94A3B8" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(val) => `£${val}`}
                        />
                        <Tooltip 
                          cursor={{fill: '#334155', opacity: 0.4}}
                          contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#334155', borderRadius: '8px' }}
                          itemStyle={{ color: '#E91E8C', fontWeight: 'bold' }}
                          formatter={(value: any) => [`£${Number(value).toFixed(2)}`, 'Revenue']}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Bar dataKey="total" fill="#E91E8C" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
               </Card>

               <Card className="bg-[#1E293B] border-[#334155] text-white shadow-none">
                  <CardHeader className="border-b border-[#334155]/50 pb-4">
                    <CardTitle className="text-sm uppercase tracking-widest text-[#94A3B8]">Core Contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                     <div className="flex items-center gap-3 p-3 rounded-lg border border-[#334155] bg-[#0D0D0D]">
                        <Avatar className="w-10 h-10 border border-[#3B82F6]/50">
                          <AvatarFallback className="bg-[#1E293B] text-[#3B82F6] font-bold text-xs">{client.contactName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate">
                          <p className="text-xs font-bold text-white tracking-widest uppercase">{client.contactName}</p>
                          <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">{client.email}</p>
                        </div>
                        <Badge className="bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/10 border-none px-2 rounded-sm text-[9px] uppercase tracking-wider">Primary</Badge>
                     </div>
                  </CardContent>
               </Card>
             </div>
          </TabsContent>

          {/* Placeholders for complex list views mapped in previous phases */}
          <TabsContent value="sites">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 text-center text-[#94A3B8] italic text-sm">
               Rendering active {client.stats?.siteCount || 0} sites leveraging the `SiteTable` component template.
             </div>
          </TabsContent>

          <TabsContent value="jobs">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 text-center text-[#94A3B8] italic text-sm">
               Fetching relational pipeline jobs mapped directly to this commercial client UUID.
             </div>
          </TabsContent>

          <TabsContent value="invoices">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 text-center text-[#94A3B8] italic text-sm flex flex-col justify-center items-center">
               <Receipt className="w-12 h-12 text-[#334155] mb-4" />
               <p>Debt ledger and historical invoice logs will render here.</p>
               <Button className="mt-4 bg-[#E91E8C] text-white font-bold h-9">Create Invoice</Button>
             </div>
          </TabsContent>

          <TabsContent value="quotes">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 text-center text-[#94A3B8] italic text-sm flex flex-col justify-center items-center">
               <FileSignature className="w-12 h-12 text-[#334155] mb-4" />
               <p>Associated proposals and sent commercial quotes.</p>
               <Link href="/quotes">
                 <Button className="mt-4 bg-[#E91E8C] text-white font-bold h-9">Open Quote Builder</Button>
               </Link>
             </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
