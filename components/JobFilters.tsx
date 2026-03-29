'use client';

import { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface FilterProps {
  onFilterChange: (filters: any) => void;
  onClear: () => void;
}

export function JobFilters({ onFilterChange, onClear }: FilterProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [clients, setClients] = useState<{ id: string, name: string }[]>([]);
  const [engineers, setEngineers] = useState<{ id: string, name: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedEngineer, setSelectedEngineer] = useState('ALL');

  useEffect(() => {
    // Fetch clients and engineers for filters
    const fetchMetadata = async () => {
      try {
        const [cRes, eRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/engineers'),
        ]);
        if (cRes.ok) setClients(await cRes.json());
        if (eRes.ok) setEngineers(await eRes.json());
      } catch (err) {
        console.error('Failed to fetch filter metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const filters: any = { search, status, priority, type, clientId: selectedClient, engineerId: selectedEngineer };
    filters[key] = value;
    onFilterChange(filters);
  };

  const clearAll = () => {
    setSearch('');
    setStatus('ALL');
    setPriority('ALL');
    setType('ALL');
    setSelectedClient('ALL');
    setSelectedEngineer('ALL');
    onClear();
  };

  return (
    <div className="flex flex-col gap-4 bg-[#1E293B] p-4 rounded-lg border border-[#334155] mb-6">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input 
            placeholder="Search job number, title, client..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              handleFilterChange('search', e.target.value);
            }}
            className="pl-10 bg-[#0D0D0D] border-[#334155] text-white placeholder:text-[#475569] h-10"
          />
        </div>

        {/* Status */}
        <Select value={status} onValueChange={(val) => { setStatus(val); handleFilterChange('status', val); }}>
          <SelectTrigger className="w-[140px] bg-[#0D0D0D] border-[#334155] text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="NEW">NEW</SelectItem>
            <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
            <SelectItem value="ON_ROUTE">ON ROUTE</SelectItem>
            <SelectItem value="ON_SITE">ON SITE</SelectItem>
            <SelectItem value="COMPLETED">COMPLETED</SelectItem>
            <SelectItem value="INVOICED">INVOICED</SelectItem>
            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={priority} onValueChange={(val) => { setPriority(val); handleFilterChange('priority', val); }}>
          <SelectTrigger className="w-[140px] bg-[#0D0D0D] border-[#334155] text-white">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
            <SelectItem value="ALL">All Priority</SelectItem>
            <SelectItem value="LOW">LOW</SelectItem>
            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
            <SelectItem value="HIGH">HIGH</SelectItem>
            <SelectItem value="CRITICAL">CRITICAL</SelectItem>
          </SelectContent>
        </Select>

        {/* Type */}
        <Select value={type} onValueChange={(val) => { setType(val); handleFilterChange('type', val); }}>
          <SelectTrigger className="w-[140px] bg-[#0D0D0D] border-[#334155] text-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="REACTIVE">REACTIVE</SelectItem>
            <SelectItem value="PPM">PPM</SelectItem>
            <SelectItem value="INSPECTION">INSPECTION</SelectItem>
            <SelectItem value="QUOTE">QUOTE</SelectItem>
            <SelectItem value="PROJECT">PROJECT</SelectItem>
          </SelectContent>
        </Select>

        {/* Client */}
        <Select value={selectedClient} onValueChange={(val) => { setSelectedClient(val); handleFilterChange('clientId', val); }}>
          <SelectTrigger className="w-[160px] bg-[#0D0D0D] border-[#334155] text-white">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
            <SelectItem value="ALL">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Engineer */}
        <Select value={selectedEngineer} onValueChange={(val) => { setSelectedEngineer(val); handleFilterChange('engineerId', val); }}>
          <SelectTrigger className="w-[160px] bg-[#0D0D0D] border-[#334155] text-white">
            <SelectValue placeholder="Engineer" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
            <SelectItem value="ALL">All Engineers</SelectItem>
            {engineers.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          onClick={clearAll}
          className="bg-transparent border-[#334155] text-[#94A3B8] hover:text-white hover:bg-[#334155]"
        >
          <X className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
}
