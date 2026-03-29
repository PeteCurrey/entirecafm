'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Loader2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) setSites(await res.json());
    } catch (err) {
      console.error('Failed to fetch sites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.client?.name.toLowerCase().includes(search.toLowerCase()) ||
    s.postcode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#E91E8C]" /> Site Portfolio
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Manage physical asset locations, geofencing, and PPM metrics across your clients.
          </p>
        </div>
        <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold shadow-lg">
          <Plus className="w-4 h-4 mr-2" /> Add Site Location
        </Button>
      </div>

      <div className="flex bg-[#1E293B] p-4 rounded-lg border border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input 
            placeholder="Search site name, client, or postcode..." 
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
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Site Name</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Client</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Address / Postcode</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Assets</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Active Jobs</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">PPM Compliance</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">Status</TableHead>
              <TableHead className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSites.length > 0 ? (
              filteredSites.map((site) => (
                <TableRow key={site.id} className="border-b border-[#334155] hover:bg-[#334155]/20">
                  <TableCell className="py-4">
                    <span className="font-bold text-[13px] text-white block">
                      {site.name}
                    </span>
                    {!site.lat && (
                       <span className="text-[9px] text-[#F59E0B] font-bold uppercase tracking-widest mt-0.5 block">Not Geocoded</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 font-bold text-[12px] text-[#94A3B8]">
                     {site.client?.name}
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-[12px] text-white block truncate max-w-[200px]">{site.address}</span>
                    <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest mt-0.5 block">{site.postcode}</span>
                  </TableCell>
                  <TableCell className="py-4">
                     <span className="font-mono text-xs font-bold bg-[#111827] border border-[#334155] px-2 py-1 rounded">
                       {site._count?.assets || 0}
                     </span>
                  </TableCell>
                  <TableCell className="py-4 flex items-center gap-2">
                     <div className={cn("w-2 h-2 rounded-full", (site._count?.jobs || 0) > 0 ? "bg-[#F59E0B]" : "bg-[#22C55E]")} />
                     <span className="font-bold text-xs">{site._count?.jobs || 0} Open</span>
                  </TableCell>
                  <TableCell className="py-4">
                     <div className="flex items-center gap-2">
                        <div className="w-full bg-[#111827] rounded-full h-2 min-w-[60px] max-w-[100px] overflow-hidden">
                           <div 
                              className={cn("h-full rounded-full transition-all", site.ppmCompliance > 80 ? "bg-[#22C55E]" : site.ppmCompliance > 50 ? "bg-[#F59E0B]" : "bg-[#EF4444]")} 
                              style={{ width: `${site.ppmCompliance}%`}} 
                           />
                        </div>
                        <span className="text-xs font-bold">{site.ppmCompliance}%</span>
                     </div>
                  </TableCell>
                  <TableCell className="py-4">
                     <Badge className={cn("border-none px-2.5 py-0.5 rounded-sm font-bold uppercase tracking-widest text-[10px]", 
                        site.isActive ? "bg-[#22C55E]/10 flex text-[#22C55E] w-fit" : "bg-[#EF4444]/10 text-[#EF4444] flex w-fit"
                     )}>
                       {site.isActive ? 'Active' : 'Archived'}
                     </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-right pr-6">
                    <Link href={`/sites/${site.id}`}>
                      <Button variant="outline" className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 bg-transparent h-8 text-[11px] font-bold uppercase tracking-wider px-3">
                         Manage <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-[#94A3B8]">
                  <p>No managed sites found. Adjust your search criteria.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
