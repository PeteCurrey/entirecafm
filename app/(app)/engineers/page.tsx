'use client';

import { useState, useEffect } from 'react';
import { 
  Wrench, Search, Loader2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function EngineersPage() {
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchEngineers = async () => {
    try {
      const res = await fetch('/api/engineers');
      if (res.ok) setEngineers(await res.json());
    } catch (err) {
      console.error('Failed to fetch engineers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineers();
  }, []);

  const filteredEngineers = engineers.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[#E91E8C]" /> Field Operatives
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Real-time fleet tracking, skill matrices, and active ticket dispatch.
          </p>
        </div>
        <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold shadow-lg">
          Add Operative
        </Button>
      </div>

      <div className="flex bg-[#1E293B] p-4 rounded-lg border border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input 
            placeholder="Search by operative name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0D0D0D] border-[#334155] text-white h-10 w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-20 text-[#94A3B8]">
          <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Locating fleet...
        </div>
      ) : (
        <>
          {filteredEngineers.length === 0 ? (
             <div className="w-full bg-[#1E293B] rounded-lg border border-[#334155] p-20 flex flex-col items-center text-[#94A3B8] italic text-sm">
                <Wrench className="w-12 h-12 mb-4 text-[#334155]" />
                No operatives matching criteria.
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredEngineers.map((engineer) => {
                 const initials = engineer.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                 const onSiteJob = engineer.jobs && engineer.jobs.length > 0 ? engineer.jobs[0] : null;

                 return (
                   <div key={engineer.id} className="group bg-[#1E293B] rounded-xl border border-[#334155] p-6 hover:-translate-y-1 hover:border-[#E91E8C] hover:shadow-[0_0_20px_rgba(233,30,140,0.15)] transition-all duration-300">
                     
                     <div className="flex items-start justify-between mb-4">
                        <Avatar className="w-14 h-14 border-2 border-[#E91E8C]/50">
                          <AvatarImage src={engineer.avatar || ''} />
                          <AvatarFallback className="bg-[#0D0D0D] text-[#E91E8C] font-bold text-lg">{initials}</AvatarFallback>
                        </Avatar>
                        {!engineer.isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#EF4444] bg-[#EF4444]/10 px-2 py-1 rounded">Inactive</span>
                        )}
                        <Badge className="bg-[#334155] text-white border-none text-[10px] uppercase font-bold tracking-widest">{engineer.role}</Badge>
                     </div>

                     <div className="mb-4">
                        <h3 className="text-xl font-bold text-white font-inter tracking-tight mb-1 truncate">{engineer.name}</h3>
                        <p className="text-xs text-[#94A3B8] font-medium truncate mb-0.5">{engineer.email}</p>
                        <p className="text-xs text-[#94A3B8] font-medium truncate">{engineer.phone || 'No phone recorded'}</p>
                     </div>

                     {/* Skills Tags */}
                     <div className="flex flex-wrap gap-2 mb-4">
                        {(engineer.skills || []).map((skill: string, i: number) => (
                           <Badge key={i} variant="outline" className="text-[10px] bg-[#0D0D0D] text-[#94A3B8] border-[#334155] uppercase tracking-wider font-bold">
                             {skill}
                           </Badge>
                        ))}
                        {(!engineer.skills || engineer.skills.length === 0) && (
                           <span className="text-[10px] text-[#475569] italic font-bold">No skills tagged</span>
                        )}
                     </div>

                     {/* Status Indicator */}
                     <div className="py-3 mt-auto border-t border-[#334155] flex items-center gap-2">
                        {onSiteJob ? (
                           <>
                             <div className="w-2.5 h-2.5 rounded-full bg-[#E91E8C] shadow-[0_0_8px_rgba(233,30,140,0.8)] animate-pulse" />
                             <span className="text-xs font-bold text-white truncate w-[90%]">
                                <span className="text-[#E91E8C] uppercase tracking-widest text-[10px] mr-1">On Site:</span> {onSiteJob.title}
                             </span>
                           </>
                        ) : (
                           <>
                             <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                             <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Available / Mobile</span>
                           </>
                        )}
                     </div>

                     <Link href={`/engineers/${engineer.id}`} className="block mt-4">
                       <Button className="w-full bg-transparent border border-[#E91E8C] text-[#E91E8C] hover:bg-[#E91E8C] hover:text-white font-bold transition-all group-hover:shadow-[0_0_15px_rgba(233,30,140,0.3)]">
                         View Profile <ArrowRight className="w-4 h-4 ml-2" />
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
