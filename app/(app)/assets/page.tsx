'use client';

import { useState, useEffect } from 'react';
import { Plus, ListFilter, Download, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
import { format, isPast, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { assetCategories, getCategoryInfo } from '@/lib/assetCategories';

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [siteId, setSiteId] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [statutoryOnly, setStatutoryOnly] = useState(false);
  const [sites, setSites] = useState<{ id: string, name: string }[]>([]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (siteId !== 'ALL') params.set('siteId', siteId);
      if (category !== 'ALL') params.set('category', category);
      if (status !== 'ALL') params.set('status', status);
      if (statutoryOnly) params.set('statutory', 'true');

      const res = await fetch(`/api/assets?${params.toString()}`);
      if (res.ok) {
        setAssets(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await fetch('/api/sites');
        if (res.ok) setSites(await res.json());
      } catch (err) {
        console.error('Failed to fetch sites:', err);
      }
    };
    fetchSites();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [search, siteId, category, status, statutoryOnly]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Asset Name",
      cell: ({ row }) => {
        const catInfo = getCategoryInfo(row.original.category);
        const Icon = catInfo.icon;
        return (
          <Link 
            href={`/assets/${row.original.id}`}
            className="font-bold font-inter text-white hover:text-[#E91E8C] transition-colors flex items-center gap-2"
          >
            <div className={cn("p-1.5 rounded bg-[#111827] border border-[#334155]", catInfo.color)}>
              <Icon className="w-4 h-4" />
            </div>
            {row.getValue("name")}
          </Link>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="text-xs text-[#94A3B8] font-medium tracking-wide">
          {row.getValue("category")}
        </span>
      ),
    },
    {
      accessorKey: "site.name",
      header: "Site",
      cell: ({ row }) => (
        <span className="text-[#F8FAFC] text-[13px]">{row.original.site?.name}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.getValue("status") as string;
        let color = "bg-[#334155] text-white";
        if (s === 'OPERATIONAL') color = "bg-[#22C55E] text-white";
        if (s === 'REQUIRES_ATTENTION') color = "bg-[#F59E0B] text-white";
        if (s === 'OUT_OF_SERVICE') color = "bg-[#EF4444] text-white";
        
        return (
          <Badge className={cn("font-bold text-[10px] tracking-widest uppercase border-0 rounded-sm", color)}>
            {s.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: "criticality",
      header: "Criticality",
      cell: ({ row }) => {
        const c = row.getValue("criticality") as string;
        return (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-transparent",
            c === 'Low' && "text-[#94A3B8] border-[#475569]",
            c === 'Medium' && "text-[#3B82F6] border-[#3B82F6]",
            c === 'High' && "text-[#F59E0B] border-[#F59E0B]",
            c === 'Critical' && "text-[#EF4444] border-[#EF4444]"
          )}>
            {c}
          </span>
        );
      },
    },
    {
      accessorKey: "nextService",
      header: "Next Service",
      cell: ({ row }) => {
        const dateStr = row.getValue("nextService") as string;
        if (!dateStr) return <span className="text-[#94A3B8]">—</span>;
        
        const date = new Date(dateStr);
        const overdue = isPast(date) && differenceInDays(new Date(), date) > 0;
        
        return (
          <span className={cn("text-xs font-medium", overdue ? "text-[#EF4444] font-bold" : "text-white")}>
            {format(date, "dd MMM yyyy")}
          </span>
        );
      },
    },
    {
      accessorKey: "isStatutory",
      header: "Statutory",
      cell: ({ row }) => {
        return row.getValue("isStatutory") ? (
          <div className="w-5 h-5 rounded-full bg-[#E91E8C]/20 border border-[#E91E8C] flex items-center justify-center text-[#E91E8C] text-xs font-bold">★</div>
        ) : (
          <span className="text-[#94A3B8] ml-2">—</span>
        );
      },
    },
  ];

  const table = useReactTable({
    data: assets,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight">Asset Register</h1>
          <p className="text-[#94A3B8] text-sm mt-1">{assets.length} equipment assets mapped</p>
        </div>
        <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Filters Base44 Style */}
      <div className="flex flex-wrap gap-3 items-center bg-[#1E293B] p-4 rounded-lg border border-[#334155]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input 
            placeholder="Search name, serial..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0D0D0D] border-[#334155] text-white h-10"
          />
        </div>
        <Select value={siteId} onValueChange={setSiteId}>
          <SelectTrigger className="w-[160px] bg-[#0D0D0D] border-[#334155] text-white">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
            <SelectItem value="ALL">All Sites</SelectItem>
            {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] bg-[#0D0D0D] border-[#334155] text-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
            <SelectItem value="ALL">All Categories</SelectItem>
            {assetCategories.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] bg-[#0D0D0D] border-[#334155] text-white">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="OPERATIONAL">OPERATIONAL</SelectItem>
            <SelectItem value="REQUIRES_ATTENTION">REQUIRES ATTN</SelectItem>
            <SelectItem value="OUT_OF_SERVICE">OUT OF SERVICE</SelectItem>
            <SelectItem value="DECOMMISSIONED">DECOMMISSIONED</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant={statutoryOnly ? "default" : "outline"}
          onClick={() => setStatutoryOnly(!statutoryOnly)}
          className={cn(
            "h-10 transition-colors",
            statutoryOnly ? "bg-[#E91E8C] hover:bg-[#D41B7F] text-white border-none" : "bg-transparent border-[#334155] text-[#94A3B8] hover:text-white"
          )}
        >
          ★ Statutory Only
        </Button>
      </div>

      <div className="relative rounded-md border border-[#334155] bg-[#1E293B] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-[#0D0D0D]/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" />
          </div>
        )}
        <Table>
          <TableHeader className="bg-[#111827]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-none hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-b border-[#334155] hover:bg-[#334155]/20">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-[#94A3B8]">
                  No assets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
