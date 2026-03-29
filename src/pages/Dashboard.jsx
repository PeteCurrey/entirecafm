import React, { useState, useEffect, Suspense, lazy } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Wrench,
  Clock,
  AlertCircle,
  Calendar,
  ChevronRight,
  Upload,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TopNav from "../components/dashboard/TopNav";

// Lazy-load heavy components
const HeroMap = lazy(() => import("../components/dashboard/HeroMap"));
const WorkloadHeatmap = lazy(() => import("../components/dashboard/WorkloadHeatmap"));
const ActivityFeed = lazy(() => import("../components/dashboard/ActivityFeed"));

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 50),
  });

  const { data: ppmSchedules = [] } = useQuery({
    queryKey: ['ppm-schedules'],
    queryFn: () => base44.entities.PPMSchedule.list('-next_due_date', 10),
  });

  // Stats calculations
  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status)).length;
  const slaAtRisk = jobs.filter(j => {
    if (!j.sla_due_date || ['completed', 'cancelled'].includes(j.status)) return false;
    return new Date(j.sla_due_date) < new Date();
  }).length;
  
  const ppmDue = ppmSchedules.filter(s => {
    if (!s.next_due_date) return false;
    const dueDate = new Date(s.next_due_date);
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    return dueDate >= today && dueDate <= weekFromNow;
  }).length;

  const overdueJobs = jobs.filter(j => {
    if (!j.scheduled_date || ['completed', 'cancelled'].includes(j.status)) return false;
    return new Date(j.scheduled_date) < new Date();
  }).length;

  // Job workflow funnel data
  const workflowStages = [
    { label: 'New', count: jobs.filter(j => j.status === 'raised').length, color: 'from-gray-500/20 to-gray-600/20 border-gray-500/30' },
    { label: 'Assigned', count: jobs.filter(j => j.status === 'assigned').length, color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30' },
    { label: 'On Route', count: jobs.filter(j => j.status === 'en_route').length, color: 'from-teal-500/20 to-teal-600/20 border-teal-500/30' },
    { label: 'On Site', count: jobs.filter(j => j.status === 'on_site').length, color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30' },
    { label: 'Completed', count: jobs.filter(j => j.status === 'completed').length, color: 'from-green-500/20 to-green-600/20 border-green-500/30' },
    { label: 'Invoiced', count: jobs.filter(j => j.invoice_id).length, color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30' },
  ];

  const hasNoData = jobs.length === 0 && ppmSchedules.length === 0;

  return (
    <>
      <TopNav user={user} />
      
      <div className="px-6 py-6 max-w-[1680px] mx-auto">
        <div className="space-y-6">
          {/* Empty State CTA */}
          {hasNoData && user?.role === 'admin' && (
            <div className="glass-panel rounded-2xl p-8 border-2 border-dashed border-[#E1467C]/30 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-[#E1467C]" />
              <h3 className="text-xl font-bold text-white mb-2">No Data Yet</h3>
              <p className="text-[#CED4DA] mb-6">
                Import your operational data to unlock live intelligence and AI dashboards
              </p>
              <Button
                onClick={() => navigate(createPageUrl("DataImport"))}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Data → Unlock Live Intelligence
              </Button>
            </div>
          )}

          {/* Hero Map - Lazy Loaded */}
          <Suspense fallback={<div className="glass-panel rounded-2xl h-64 border border-[rgba(255,255,255,0.08)] animate-pulse" />}>
            <HeroMap />
          </Suspense>

          {/* KPI Cards - Row of 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Open Jobs */}
            <div className="data-card hover-glow group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-[#CED4DA]">Open Jobs</div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Wrench className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{activeJobs}</div>
              <div className="h-1 w-full bg-gradient-to-r from-blue-500/20 to-transparent rounded-full" />
            </div>

            {/* SLA At Risk */}
            <div className="data-card hover-glow group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-[#CED4DA]">SLA At Risk</div>
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <AlertCircle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{slaAtRisk}</div>
              <div className="h-1 w-full bg-gradient-to-r from-red-500/30 to-transparent rounded-full" />
            </div>

            {/* PPM Due */}
            <div className="data-card hover-glow group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-[#CED4DA]">PPM Due This Week</div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Calendar className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{ppmDue}</div>
              <div className="h-1 w-full bg-gradient-to-r from-purple-500/20 to-transparent rounded-full" />
            </div>

            {/* Overdue */}
            <div className="data-card hover-glow group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-[#CED4DA]">Overdue</div>
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <Clock className="w-5 h-5 text-orange-400" strokeWidth={1.5} />
                </div>
              </div>
              <div className={`text-3xl font-bold mb-1 transition-colors ${overdueJobs > 5 ? 'text-[#E1467C]' : 'text-white'}`}>
                {overdueJobs}
              </div>
              <div className={`h-1 w-full rounded-full ${overdueJobs > 5 ? 'bg-gradient-to-r from-red-500/30 to-transparent' : 'bg-gradient-to-r from-green-500/20 to-transparent'}`} />
            </div>
          </div>

          {/* Engineer Capacity Heatmap & Job Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<div className="glass-panel rounded-2xl h-64 border border-[rgba(255,255,255,0.08)] animate-pulse" />}>
              <WorkloadHeatmap />
            </Suspense>
            
            {/* Job Pipeline */}
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <div className="text-sm text-[#CED4DA] mb-4">Job Pipeline</div>
              <div className="flex items-center gap-2">
                {workflowStages.map((stage, index) => (
                  <React.Fragment key={stage.label}>
                    <div className="flex-1">
                      <div className={`relative overflow-hidden rounded-full border bg-gradient-to-br ${stage.color} transition-all hover:scale-105 cursor-pointer`}>
                        <div className="text-center py-3">
                          <p className="text-xl font-semibold text-white transition-all duration-300 ease-out">
                            {stage.count}
                          </p>
                          <p className="text-[9px] font-semibold text-[#CED4DA] uppercase tracking-wider mt-0.5">
                            {stage.label}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {index < workflowStages.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-[#CED4DA] opacity-30 flex-shrink-0" strokeWidth={1.5} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Feed - Lazy Loaded */}
          <Suspense fallback={<div className="glass-panel rounded-2xl h-96 border border-[rgba(255,255,255,0.08)] animate-pulse" />}>
            <ActivityFeed />
          </Suspense>
        </div>
      </div>

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .data-card {
          animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .data-card:nth-child(1) { animation-delay: 0.1s; opacity: 0; }
        .data-card:nth-child(2) { animation-delay: 0.2s; opacity: 0; }
        .data-card:nth-child(3) { animation-delay: 0.3s; opacity: 0; }
        .data-card:nth-child(4) { animation-delay: 0.4s; opacity: 0; }
      `}</style>
    </>
  );
}