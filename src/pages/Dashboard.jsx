import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  ArrowRight,
  ChevronRight,
  Map
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import LiveMap from "../components/dashboard/LiveMap";
import WorkloadHeatmap from "../components/dashboard/WorkloadHeatmap";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import TopNav from "../components/dashboard/TopNav";

export default function Dashboard() {
  const [user, setUser] = useState(null);

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

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
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

  const statusColors = {
    raised: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    en_route: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    on_site: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  // Job workflow funnel data
  const workflowStages = [
    { label: 'New', count: jobs.filter(j => j.status === 'raised').length },
    { label: 'Assigned', count: jobs.filter(j => j.status === 'assigned').length },
    { label: 'En Route', count: jobs.filter(j => j.status === 'en_route').length },
    { label: 'On Site', count: jobs.filter(j => j.status === 'on_site').length },
    { label: 'Complete', count: jobs.filter(j => j.status === 'completed').length },
    { label: 'Invoiced', count: jobs.filter(j => j.invoice_id).length },
  ];

  const totalJobs = jobs.length || 1;
  const flowEfficiency = workflowStages.map(stage => ({
    ...stage,
    percentage: ((stage.count / totalJobs) * 100).toFixed(0)
  }));

  return (
    <>
      <TopNav user={user} />
      
      <div className="pt-16 p-6 lg:p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all cursor-pointer kpi-card">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{activeJobs}</h3>
            <p className="text-sm text-body">Open Jobs</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all cursor-pointer kpi-card">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-[#E1467C]" strokeWidth={1.5} />
              </div>
              {slaAtRisk > 0 && <div className="pulse-dot" />}
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{slaAtRisk}</h3>
            <p className="text-sm text-body">SLA At Risk</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all cursor-pointer kpi-card">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-400" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{ppmDue}</h3>
            <p className="text-sm text-body">PPM Due</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all cursor-pointer kpi-card">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-400" strokeWidth={1.5} />
              </div>
              {overdueJobs > 0 && <div className="pulse-dot" />}
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{overdueJobs}</h3>
            <p className="text-sm text-body">Overdue</p>
          </div>
        </div>

        {/* Map + Workload Heatmap Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-divider">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Map className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                Live Operations Map
              </h2>
            </div>
            <LiveMap compact={true} />
          </div>

          <WorkloadHeatmap />
        </div>

        {/* Job Workflow Funnel */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <h2 className="text-xl font-bold text-white mb-6">Job Pipeline Progression</h2>
          <div className="space-y-4">
            {/* Visual Funnel */}
            <div className="flex items-center justify-between gap-2">
              {flowEfficiency.map((stage, index) => (
                <React.Fragment key={stage.label}>
                  <div className="flex-1 text-center">
                    <div className="glass-panel rounded-xl p-4 hover:glass-panel-strong transition-all cursor-pointer">
                      <p className="text-2xl font-bold text-white mb-1">{stage.count}</p>
                      <p className="text-xs text-body uppercase tracking-wider mb-1">{stage.label}</p>
                      <p className="text-xs text-[#E1467C] font-semibold">{stage.percentage}%</p>
                    </div>
                  </div>
                  {index < flowEfficiency.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-body/50 flex-shrink-0" strokeWidth={1.5} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Flow Efficiency Indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-body">
              <span>Flow Efficiency:</span>
              <span className="text-white font-semibold">
                {((jobs.filter(j => j.status === 'completed').length / totalJobs) * 100).toFixed(0)}%
              </span>
              <span>completion rate</span>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <ActivityFeed />

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.1); }
          }

          .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #E1467C;
            animation: pulse 2s ease-in-out infinite;
          }

          .kpi-card {
            animation: fadeIn 0.3s ease-in-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}