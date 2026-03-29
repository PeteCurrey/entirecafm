'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  Wrench, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Sparkles, 
  ArrowRight 
} from 'lucide-react';
import { KPITile } from '@/components/KPITile';
import { JobPipeline } from '@/components/JobPipeline';
import { EngineerHeatmap } from '@/components/EngineerHeatmap';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Dynamically import map to avoid SSR issues
const DashboardMap = dynamic(
  () => import('@/components/DashboardMap'),
  { ssr: false, loading: () => <div className="h-[280px] w-full bg-[#111827] animate-pulse rounded-lg border border-[#334155]" /> }
);

export default function DashboardPage() {
  const [kpis, setKpis] = useState({ openJobs: 0, slaAtRisk: 0, ppmDue: 0, overdue: 0 });
  const [pipeline, setPipeline] = useState({ NEW: 0, ASSIGNED: 0, ON_ROUTE: 0, ON_SITE: 0, COMPLETED: 0, INVOICED: 0 });
  const [heatmap, setHeatmap] = useState<{ id: string; name: string; hourData: Record<number, number> }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [kpiRes, pipeRes, heatRes] = await Promise.all([
          fetch('/api/dashboard/kpis'),
          fetch('/api/dashboard/pipeline'),
          fetch('/api/dashboard/heatmap'),
        ]);

        const kpiData = await kpiRes.json();
        const pipeData = await pipeRes.json();
        const heatData = await heatRes.json();

        setKpis(kpiData);
        setPipeline(pipeData);
        setHeatmap(heatData.engineers || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const hasData = kpis.openJobs > 0 || kpis.slaAtRisk > 0 || kpis.ppmDue > 0 || kpis.overdue > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 animate-pulse text-[#94A3B8]">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white font-inter tracking-tight">Operations Dashboard</h1>
      </div>

      {/* Empty State / Welcome */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#1E293B]/50 border-2 border-dashed border-[#334155] rounded-xl text-center">
          <div className="w-16 h-16 bg-[rgba(233,30,140,0.1)] rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-[#E91E8C]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 font-inter">No Data Yet</h2>
          <p className="text-[#94A3B8] max-w-md mb-8 leading-relaxed">
            Import your operational data to unlock live intelligence, AI dashboards, and real-time engineer tracking.
          </p>
          <Button asChild className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white px-8 h-12 text-base font-semibold border-none Magenta-box-shadow">
            <Link href="/import" className="flex items-center gap-2">
              Import Data <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      )}

      {/* Map Section */}
      <DashboardMap />

      {/* KPI Tiles Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPITile 
          title="Open Jobs" 
          value={kpis.openJobs} 
          icon={Wrench} 
          color="blue" 
        />
        <KPITile 
          title="SLA At Risk" 
          value={kpis.slaAtRisk} 
          icon={AlertCircle} 
          color="red" 
          pulse={kpis.slaAtRisk > 0} 
        />
        <KPITile 
          title="PPM Due This Week" 
          value={kpis.ppmDue} 
          icon={Calendar} 
          color="amber" 
        />
        <KPITile 
          title="Overdue" 
          value={kpis.overdue} 
          icon={Clock} 
          color="red" 
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <EngineerHeatmap engineers={heatmap} />
        <JobPipeline data={pipeline} />
      </div>
    </div>
  );
}
