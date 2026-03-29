'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Building, ArrowLeft, Loader2, Phone, Mail, 
  Settings, Pickaxe, FileText, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { JobStatusBadge } from '@/components/JobStatusBadge';

export default function ContractorDetailPage() {
  const params = useParams();
  const [contractor, setContractor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchContractor = async () => {
    try {
      const res = await fetch(`/api/contractors/${params.id}`);
      if (res.ok) setContractor(await res.json());
    } catch (err) {
      console.error('Failed to fetch contractor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractor();
  }, [params.id]);

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-[#94A3B8]">
      <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Compiling Contractor Portfolio...
    </div>
  );

  if (!contractor) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#94A3B8]">
      <Building className="w-12 h-12 text-[#334155] mb-4" />
      <div>Partner record lost or archived.</div>
    </div>
  );

  const activeJobs = contractor.jobs?.filter((j: any) => !['COMPLETED', 'CANCELLED', 'INVOICED'].includes(j.status));
  const historicalJobs = contractor.jobs?.filter((j: any) => ['COMPLETED', 'CANCELLED', 'INVOICED'].includes(j.status));

  // Documents checking
  const docs = contractor.documents || [];
  
  const getExpiryStatus = (date?: string) => {
     if (!date) return { color: "bg-[#334155]", text: "No Expiry Tracked" };
     const days = differenceInDays(new Date(date), new Date());
     if (days < 0) return { color: "bg-[#EF4444]", text: `Expired ${Math.abs(days)} days ago`, isDanger: true };
     if (days <= 30) return { color: "bg-[#F59E0B]", text: `Expiring in ${days} days`, isWarn: true };
     return { color: "bg-[#22C55E]", text: "Valid Compliance" };
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <Link href="/contractors" className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors text-sm w-fit font-bold uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4" /> Back to Outsourced Network
      </Link>

      {/* Header Profile Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#334155] rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white font-inter tracking-tight leading-tight">
                  {contractor.name}
                </h1>
                <Badge className={cn("border-none uppercase text-[10px] tracking-widest", contractor.isActive ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/10 text-[#EF4444]")}>
                  {contractor.isActive ? 'Active Partner' : 'Suspended'}
                </Badge>
            </div>
            
            <p className="text-[#94A3B8] text-sm font-medium mb-1">
              Primary Interface: <span className="text-white font-bold">{contractor.contact}</span>
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-[#94A3B8] mb-6">
               <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {contractor.email}</span>
               {contractor.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {contractor.phone}</span>}
            </div>
            
            <p className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest mb-2">Core Competencies / Trades</p>
            <div className="flex flex-wrap gap-2 mb-6">
               {(contractor.trades || []).map((t: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] bg-[#0D0D0D] text-[#94A3B8] border-[#334155] uppercase tracking-wider font-bold">
                    {t}
                  </Badge>
               ))}
            </div>
          </div>
          
          <div className="flex gap-3">
             <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-9">
                <ShieldCheck className="w-4 h-4 mr-2" /> Request Auditing Pack
             </Button>
             <Button variant="outline" className="border-[#334155] text-white bg-transparent hover:bg-[#334155] font-bold h-9">
                <Settings className="w-4 h-4 mr-2" /> Modify Record
             </Button>
          </div>
        </div>

        {/* Action / Flag Stack */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl flex flex-col p-6">
           <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Risk & Workload Overview</h3>
           
           <div className="flex-1 flex flex-col gap-4 justify-center">
             <div className="flex items-center justify-between p-3 border border-[#334155] rounded-md bg-[#0D0D0D]">
                <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Active Jobs</span>
                <span className="text-lg font-bold text-white font-mono">{activeJobs?.length || 0}</span>
             </div>
             
             {docs.some((d: any) => getExpiryStatus(d.expiryDate)?.isDanger) ? (
                <div className="flex items-center gap-3 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
                   <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
                   <div className="flex flex-col">
                      <span className="text-[10px] text-[#EF4444] font-bold uppercase tracking-widest">Compliance Failure</span>
                      <span className="text-xs font-medium text-white line-clamp-2">Has expired accreditation or insurance preventing active deployment.</span>
                   </div>
                </div>
             ) : docs.some((d: any) => getExpiryStatus(d.expiryDate)?.isWarn) ? (
                <div className="flex items-center gap-3 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
                   <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
                   <div className="flex flex-col">
                      <span className="text-[10px] text-[#F59E0B] font-bold uppercase tracking-widest">Upcoming Expiry</span>
                      <span className="text-xs font-medium text-white line-clamp-2">Documentation requires imminent renewal via portal.</span>
                   </div>
                </div>
             ) : (
                <div className="flex items-center gap-3 p-3 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg">
                   <ShieldCheck className="w-6 h-6 text-[#22C55E]" />
                   <div className="flex flex-col">
                      <span className="text-[10px] text-[#22C55E] font-bold uppercase tracking-widest">Fully Compliant</span>
                      <span className="text-xs font-medium text-white line-clamp-2">CHAS & PL Insurances mapped and verified dynamically.</span>
                   </div>
                </div>
             )}
           </div>
        </div>
      </div>

      <Tabs defaultValue="jobs" className="w-full mt-2">
        <TabsList className="bg-[#1E293B] border border-[#334155] h-12 w-full flex overflow-x-auto justify-start rounded-lg p-1 custom-scrollbar">
          <TabsTrigger value="jobs" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6 shrink-0 flex items-center gap-2">
             <Pickaxe className="w-4 h-4" /> Active Subcontracts <Badge className="bg-[#0D0D0D] text-[#94A3B8] border-none ml-1">{activeJobs?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2">
             Historical Ledger
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#E91E8C] font-bold tracking-wide rounded-md h-full px-5 shrink-0 flex items-center gap-2">
             <FileText className="w-4 h-4" /> Verified Compliance Docs <Badge className="bg-[#0D0D0D] text-[#94A3B8] border-none ml-1">{docs?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="jobs">
             {activeJobs && activeJobs.length > 0 ? (
               <div className="space-y-4">
                 {activeJobs.map((aJob: any) => (
                    <div key={aJob.id} className="bg-[#111827] border border-[#334155] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-[#E91E8C] font-bold uppercase tracking-widest">{aJob.jobNumber}</span>
                          <span className="text-lg font-bold text-white mt-1">{aJob.title}</span>
                          <span className="text-xs text-[#94A3B8] font-medium mt-1">{aJob.client?.name} • {aJob.site?.name}</span>
                       </div>
                       <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-2 border-t border-[#334155] sm:border-0 sm:pt-0">
                          <JobStatusBadge status={aJob.status} />
                          <Link href={`/jobs/${aJob.id}`}>
                            <Button variant="outline" className="bg-[#1E293B] border-[#334155] text-white hover:bg-[#334155] h-8 text-[11px] font-bold uppercase px-4">Tracker</Button>
                          </Link>
                       </div>
                    </div>
                 ))}
               </div>
             ) : (
                <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-16 text-center text-[#94A3B8] flex flex-col justify-center items-center">
                  <Pickaxe className="w-12 h-12 text-[#334155] mb-4" />
                  <p className="font-bold text-sm uppercase tracking-widest">Network is clear</p>
                  <p className="text-xs mt-2">Zero active pipeline operations currently delegated to this partner.</p>
                </div>
             )}
          </TabsContent>

          <TabsContent value="docs">
            {docs.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {docs.map((doc: any) => {
                    const status = getExpiryStatus(doc.expiryDate);
                    return (
                      <div key={doc.id} className="bg-[#111827] border border-[#334155] rounded-xl p-4 flex flex-col hover:border-[#E91E8C] transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-10 h-10 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-[#94A3B8] group-hover:text-[#E91E8C] transition-colors" />
                           </div>
                           <div className="overflow-hidden flex-1">
                              <h4 className="text-sm font-bold text-white truncate">{doc.name}</h4>
                              <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest truncate">{doc.type}</p>
                           </div>
                        </div>
                        
                        <div className={cn("mt-auto flex items-center justify-center p-2 rounded-md text-[10px] font-bold uppercase tracking-widest text-white text-center", status.color)}>
                           {status.text}
                        </div>
                      </div>
                    )
                 })}
               </div>
            ) : (
               <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-16 text-center text-[#94A3B8] flex flex-col justify-center items-center">
                 <ShieldCheck className="w-12 h-12 text-[#334155] mb-4" />
                 <p className="font-bold text-sm uppercase tracking-widest text-[#EF4444]">High Risk Account</p>
                 <p className="text-xs mt-2">No active CHAS or Liability certifications loaded onto file. Deployment dangerous.</p>
                 <Button className="bg-[#E91E8C] text-white h-8 text-[11px] font-bold uppercase mt-4">Generate Upload Link</Button>
               </div>
            )}
          </TabsContent>

          <TabsContent value="history">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 text-center text-[#94A3B8] italic text-sm">
               Fetching historical Job Trace. Last {historicalJobs?.length || 0} outsourced tasks mapped directly to this commercial operative UUID.
             </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
