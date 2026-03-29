'use client';

import { useState, useEffect } from 'react';
import { Plus, ListFilter, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobTable } from '@/components/JobTable';
import { JobFilters } from '@/components/JobFilters';
import { NewJobModal } from '@/components/NewJobModal';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<any>({});
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== 'ALL' && v !== '')
        ),
      });

      const res = await fetch(`/api/jobs?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, filters]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-inter tracking-tight">Jobs</h1>
          <p className="text-[#94A3B8] text-sm mt-1">{total} operational jobs found</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="bg-transparent border-[#334155] text-white hover:bg-[#334155]"
            onClick={() => {/* CSV Export logic */}}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={() => setIsNewJobModalOpen(true)}
            className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold shadow-[0_0_15px_rgba(233,30,140,0.2)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
        </div>
      </div>

      {/* Filters */}
      <JobFilters 
        onFilterChange={handleFilterChange} 
        onClear={clearFilters} 
      />

      {/* Table Section */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-[#0D0D0D]/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg">
            <Loader2 className="w-8 h-8 text-[#E91E8C] animate-spin" />
          </div>
        )}
        <JobTable data={jobs} />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-4 border-t border-[#334155] mt-4">
        <p className="text-sm text-[#94A3B8]">
          Showing page <span className="text-white font-medium">{page}</span> of <span className="text-white font-medium">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="bg-transparent border-[#334155] text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="bg-transparent border-[#334155] text-white disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* New Job Modal */}
      <NewJobModal 
        open={isNewJobModalOpen} 
        onOpenChange={setIsNewJobModalOpen} 
        onSuccess={fetchJobs} 
      />
    </div>
  );
}

