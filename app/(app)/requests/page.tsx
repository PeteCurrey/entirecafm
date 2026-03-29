'use client';

import { useState, useEffect } from 'react';
import { 
  InboxIcon, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Search, 
  ShieldAlert,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PriorityBadge } from '@/components/PriorityBadge';

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [converting, setConverting] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleConvert = async (id: string) => {
    if (!confirm('Convert this public request into a live Job record?')) return;
    
    setConverting(id);
    try {
      const res = await fetch(`/api/requests/${id}/convert`, {
        method: 'POST'
      });
      if (res.ok) {
        const newJob = await res.json();
        alert(`Successfully generated Job: ${newJob.jobNumber}`);
        fetchRequests(); // Refresh list to reflect converted status
      } else {
        alert('Failed to convert. Check server logs.');
      }
    } catch (err) {
      alert('Internal error converting request.');
    } finally {
      setConverting(null);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase()) || 
    r.description.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <InboxIcon className="w-6 h-6 text-[#E91E8C]" /> Inbound Requests
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Review and convert client-submitted maintenance issues from the Public Portal.
          </p>
        </div>
      </div>

      <div className="flex bg-[#1E293B] p-4 rounded-lg border border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input 
            placeholder="Search request ID, title or description..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0D0D0D] border-[#334155] text-white h-10 w-full"
          />
        </div>
      </div>

      <div className="relative rounded-md border border-[#334155] bg-[#1E293B] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-[#0D0D0D]/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" />
          </div>
        )}
        <Table>
          <TableHeader className="bg-[#111827]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Ref #</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Client / Site</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Issue Title</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Priority</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Status</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Received</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map((req) => (
                <TableRow key={req.id} className="border-b border-[#334155] hover:bg-[#334155]/20">
                  <TableCell className="py-4">
                    <span className="text-[#E91E8C] font-mono text-[11px] font-bold tracking-widest bg-[#E91E8C]/10 px-2 py-1 rounded">
                      REQ-{req.id.substring(0, 6).toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                     <div className="text-[13px] font-bold text-white mb-0.5">{req.client.name}</div>
                     <div className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-widest">{req.site.name}</div>
                  </TableCell>
                  <TableCell className="py-4 font-inter font-bold text-[13px] text-white max-w-[300px] truncate">
                    {req.title}
                  </TableCell>
                  <TableCell className="py-4">
                    <PriorityBadge priority={req.priority} />
                  </TableCell>
                  <TableCell className="py-4">
                     <Badge className={cn("border-none px-2.5 py-0.5 rounded-sm font-bold uppercase tracking-widest text-[10px]", 
                        req.status === 'Pending' ? "bg-[#334155] text-white" : 
                        req.status === 'Converted to Job' ? "bg-[#22C55E] text-white" : "bg-[#F59E0B] text-white"
                     )}>
                       {req.status}
                     </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-xs font-medium text-[#94A3B8]">
                    {format(new Date(req.createdAt), "dd MMM HH:mm")}
                  </TableCell>
                  <TableCell className="py-4 text-right pr-6">
                    {req.status !== 'Converted to Job' ? (
                      <Button 
                        onClick={() => handleConvert(req.id)}
                        disabled={!!converting}
                        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white h-8 text-[11px] font-bold uppercase tracking-wider px-3 border-none"
                      >
                        {converting === req.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                        Approve & Convert
                      </Button>
                    ) : (
                      <Link href={`/jobs/${req.convertedToJobId}`}>
                        <Button variant="outline" className="border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E]/10 bg-transparent h-8 text-[11px] font-bold uppercase tracking-wider px-3">
                           <ArrowRight className="w-3 h-3 mr-1" /> View Job
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-[#94A3B8]">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-[#334155]" />
                  <p>Queue is empty. No inbound requests found.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
