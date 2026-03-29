'use client';

import { useState, useEffect } from 'react';
import { 
  Building, Search, Loader2, ArrowRight, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchContractors = async () => {
    try {
      const res = await fetch('/api/contractors');
      if (res.ok) setContractors(await res.json());
    } catch (err) {
      console.error('Failed to fetch contractors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  const filtered = contractors.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.trades.join(', ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#E91E8C]" /> Outsourced Contractors
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Manage external trades, insurance accreditations, and active job dispatch.
          </p>
        </div>
        <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold shadow-lg">
          Onboard Contractor
        </Button>
      </div>

      <div className="flex bg-[#1E293B] p-4 rounded-lg border border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input 
            placeholder="Search company or mapped trades..." 
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
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Company Partner</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Primary Contact</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Mapped Trades</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Active Jobs</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Status</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 text-right pr-6">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((con) => (
                <TableRow key={con.id} className="border-b border-[#334155] hover:bg-[#334155]/20">
                  <TableCell className="py-4">
                    <span className="font-bold text-[13px] text-white block">
                      {con.name}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                     <span className="text-[12px] font-bold text-white block">{con.contact}</span>
                     <span className="text-[10px] text-[#94A3B8] block">{con.email}</span>
                  </TableCell>
                  <TableCell className="py-4 max-w-[200px]">
                     <div className="flex flex-wrap gap-1">
                        {(con.trades || []).map((t: string, i: number) => (
                           <Badge key={i} className="bg-[#334155] hover:bg-[#334155] text-[9px] uppercase tracking-widest text-[#94A3B8] border-none px-1.5 py-0">
                             {t}
                           </Badge>
                        ))}
                     </div>
                  </TableCell>
                  <TableCell className="py-4 flex items-center gap-2">
                     <span className={cn("font-bold text-xs px-2 py-0.5 rounded", (con._count?.jobs || 0) > 0 ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "bg-[#22C55E]/10 text-[#22C55E]")}>
                        {con._count?.jobs || 0} Open Tickets
                     </span>
                  </TableCell>
                  <TableCell className="py-4">
                     <Badge className={cn("border-none px-2.5 py-0.5 rounded-sm font-bold uppercase tracking-widest text-[10px]", 
                        con.isActive ? "bg-[#22C55E]/10 flex text-[#22C55E] w-fit" : "bg-[#EF4444]/10 text-[#EF4444] flex w-fit"
                     )}>
                       {con.isActive ? 'Active' : 'Archived'}
                     </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-right pr-6">
                    <Link href={`/contractors/${con.id}`}>
                      <Button variant="outline" className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 bg-transparent h-8 text-[11px] font-bold uppercase tracking-wider px-3">
                         Review <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-[#94A3B8]">
                  <p>No outsourced contractors matching criteria.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
