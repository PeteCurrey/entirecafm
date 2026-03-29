'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Search, Loader2, ArrowRight, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) setClients(await res.json());
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.contactName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#E91E8C]" /> Client Ecosystem
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Boutique CRM displaying top-level accounts, site portfolios, and financial overviews.
          </p>
        </div>
        <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold shadow-lg">
          Add New Client
        </Button>
      </div>

      <div className="flex bg-[#1E293B] p-4 rounded-lg border border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input 
            placeholder="Search by client name, contact..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0D0D0D] border-[#334155] text-white h-10 w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-20 text-[#94A3B8]">
          <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Compiling database...
        </div>
      ) : (
        <>
          {filteredClients.length === 0 ? (
             <div className="w-full bg-[#1E293B] rounded-lg border border-[#334155] p-20 flex flex-col items-center text-[#94A3B8] italic text-sm">
                <Briefcase className="w-12 h-12 mb-4 text-[#334155]" />
                No clients matching criteria.
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredClients.map((client) => {
                 const initials = client.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                 
                 return (
                   <div key={client.id} className="group bg-[#1E293B] rounded-xl border border-[#334155] p-6 hover:-translate-y-1 hover:border-[#E91E8C] hover:shadow-[0_0_20px_rgba(233,30,140,0.15)] transition-all duration-300">
                     
                     <div className="flex items-start justify-between mb-6">
                        <Avatar className="w-14 h-14 border-2 border-[#E91E8C]/50">
                          <AvatarImage src={client.logo || ''} />
                          <AvatarFallback className="bg-[#0D0D0D] text-[#E91E8C] font-bold text-lg">{initials}</AvatarFallback>
                        </Avatar>
                        {!client.isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#EF4444] bg-[#EF4444]/10 px-2 py-1 rounded">Archived</span>
                        )}
                        {client.portalEnabled && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-2 py-0.5 rounded">Portal Active</span>
                        )}
                     </div>

                     <div className="mb-6">
                        <h3 className="text-xl font-bold text-white font-inter tracking-tight mb-1 truncate">{client.name}</h3>
                        <p className="text-xs text-[#94A3B8] font-medium truncate">{client.contactName} • {client.email}</p>
                     </div>

                     <div className="grid grid-cols-3 gap-2 py-4 border-y border-[#334155] bg-[#0D0D0D]/50 -mx-6 px-6 mb-4">
                        <div className="flex flex-col text-center">
                          <span className="text-lg font-bold text-white font-mono">{client._count?.sites || 0}</span>
                          <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest mt-0.5">Sites</span>
                        </div>
                        <div className="flex flex-col text-center border-l border-[#334155]">
                          <span className="text-lg font-bold text-[#F59E0B] font-mono">{client._count?.jobs || 0}</span>
                          <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest mt-0.5">Open Jobs</span>
                        </div>
                        <div className="flex flex-col text-center border-l border-[#334155]">
                          <span className="text-lg font-bold text-white font-mono">{client.totalAssets || 0}</span>
                          <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest mt-0.5">Assets</span>
                        </div>
                     </div>

                     <Link href={`/clients/${client.id}`} className="block">
                       <Button className="w-full bg-transparent border border-[#E91E8C] text-[#E91E8C] hover:bg-[#E91E8C] hover:text-white font-bold transition-all mt-2 group-hover:shadow-[0_0_15px_rgba(233,30,140,0.3)]">
                         View Client Space <ArrowRight className="w-4 h-4 ml-2" />
                       </Button>
                     </Link>

                   </div>
                 )
               })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
