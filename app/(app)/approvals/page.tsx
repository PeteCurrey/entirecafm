'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, Ban, AlertTriangle, Loader2, ChevronDown, ChevronUp, FileSignature
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

export default function ApprovalsDashboardPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/approvals');
      if (res.ok) setApprovals(await res.json());
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleAction = async (id: string, status: string) => {
    setActioning(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        setNotes('');
        setExpandedId(null);
        fetchApprovals();
      }
    } finally {
      setActioning(null);
    }
  };

  const getStatusColor = (status: string) => {
     switch (status) {
       case 'APPROVED': return 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30';
       case 'REJECTED': return 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30';
       default: return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30';
     }
  };

  const getTypeFormat = (type: string) => {
     const clean = type.replace(/_/g, ' ');
     return clean;
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-[#E91E8C]" /> Authorization Gateway
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Review and sign-off on escalated threshold limits, financial write-offs, and critical commercial deployments.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-20 text-[#94A3B8]">
          <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Fetching Escrow Sequences...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
           {approvals.length > 0 ? (
             approvals.map((app) => (
                <div key={app.id} className="bg-[#111827] border border-[#334155] rounded-xl overflow-hidden transition-all">
                   
                   {/* Row Header */}
                   <div 
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#1E293B] transition-colors"
                   >
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 w-full">
                         <div className="w-[180px] shrink-0">
                           <Badge className="bg-[#334155] text-white border-none uppercase text-[10px] tracking-widest">{getTypeFormat(app.type)}</Badge>
                         </div>
                         <div className="flex-1">
                            <h3 className="text-sm font-bold text-white truncate max-w-[400px]">{app.description}</h3>
                            <p className="text-[11px] text-[#94A3B8] font-mono mt-1">Req By: {app.requestedBy.substring(0,8)}...</p>
                         </div>
                         <div className="w-[120px] text-right">
                            {app.value ? <span className="text-sm font-bold text-white font-mono leading-tight block">£{(app.value).toLocaleString()}</span> : <span className="text-xs text-[#475569] italic block leading-tight">No Financial Risk</span>}
                            <span className="text-[10px] text-[#94A3B8] block">{format(new Date(app.createdAt), 'dd MMM yyyy')}</span>
                         </div>
                         <div className="w-[120px] flex justify-end">
                            <Badge className={cn("border uppercase text-[10px] tracking-widest px-2", getStatusColor(app.status))}>
                               {app.status}
                            </Badge>
                         </div>
                         <div className="w-[40px] flex justify-end">
                            {expandedId === app.id ? <ChevronUp className="w-5 h-5 text-[#94A3B8]" /> : <ChevronDown className="w-5 h-5 text-[#94A3B8]" />}
                         </div>
                      </div>
                   </div>

                   {/* Expanded Details */}
                   {expandedId === app.id && (
                      <div className="border-t border-[#334155] bg-[#0D0D0D] p-6 animate-in slide-in-from-top-2">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                               <h4 className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest mb-3">Authorization Context</h4>
                               <p className="text-sm text-white mb-6 leading-relaxed">{app.description}</p>
                               
                               <h4 className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-widest mb-3">Ledger Thread</h4>
                               {app.activities && app.activities.length > 0 ? (
                                  <div className="space-y-3">
                                     {app.activities.map((act: any) => (
                                        <div key={act.id} className="text-xs">
                                          <span className="text-[#94A3B8] mr-2">[{format(new Date(act.createdAt), 'dd/MM HH:mm')}]</span>
                                          <span className={cn("font-bold mr-2", act.action === 'REJECTED' ? 'text-[#EF4444]' : 'text-[#22C55E]')}>{act.action}</span>
                                          <span className="text-white italic">"{act.notes || 'No notes included'}"</span>
                                        </div>
                                     ))}
                                  </div>
                               ) : (
                                  <p className="text-xs text-[#94A3B8] italic">Awaiting initial administrative review...</p>
                               )}
                            </div>

                            {app.status === 'PENDING' && (
                               <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
                                  <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Final Decision Parameters</h4>
                                  <Textarea 
                                     placeholder="Append reasoning or strict parameters to your operational signature..."
                                     value={notes}
                                     onChange={(e) => setNotes(e.target.value)}
                                     className="bg-[#0D0D0D] border-[#334155] text-white min-h-[100px] mb-4 text-xs"
                                  />
                                  <div className="flex gap-3">
                                     <Button 
                                        onClick={() => handleAction(app.id, 'APPROVED')}
                                        disabled={actioning === app.id}
                                        className="flex-1 bg-[#22C55E] hover:bg-green-600 text-white font-bold h-10 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                     >
                                        {actioning === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Stamp Approval</>}
                                     </Button>
                                     <Button 
                                        onClick={() => handleAction(app.id, 'REJECTED')}
                                        disabled={actioning === app.id}
                                        variant="outline"
                                        className="flex-1 border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 font-bold h-10"
                                     >
                                        {actioning === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4 mr-2" /> Veto Action</>}
                                     </Button>
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                   )}
                </div>
             ))
           ) : (
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-20 text-center text-[#94A3B8] flex flex-col justify-center items-center">
               <AlertTriangle className="w-12 h-12 text-[#334155] mb-4" />
               <p className="font-bold text-sm uppercase tracking-widest text-white">Queue is Clear</p>
               <p className="text-xs mt-2">There are currently zero commercial thresholds awaiting signature.</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
