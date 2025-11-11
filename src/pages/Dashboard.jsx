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
  ChevronRight,
  Map
} from "lucide-react";
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
    { label: 'NEW', count: jobs.filter(j => j.status === 'raised').length, color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30' },
    { label: 'ASSIGNED', count: jobs.filter(j => j.status === 'assigned').length, color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30' },
    { label: 'ON ROUTE', count: jobs.filter(j => j.status === 'en_route').length, color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30' },
    { label: 'ON SITE', count: jobs.filter(j => j.status === 'on_site').length, color: 'from-orange-500/20 to-orange-600/20 border-orange-500/30' },
    { label: 'COMPLETED', count: jobs.filter(j => j.status === 'completed').length, color: 'from-green-500/20 to-green-600/20 border-green-500/30' },
    { label: 'INVOICED', count: jobs.filter(j => j.invoice_id).length, color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30' },
  ];

  return (
    <>
      <TopNav user={user} />
      
      <div className="p-8 space-y-8">
        {/* KPI Cards - Row of 4 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Open Jobs */}
          <div className="glass-panel rounded-xl p-[18px] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                <Wrench className="w-5 h-5 text-[#CED4DA]" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-semibold text-white mb-1">{activeJobs}</h3>
            <p className="text-sm text-[#CED4DA]">Open Jobs</p>
          </div>

          {/* SLA At Risk */}
          <div className="glass-panel rounded-xl p-[18px] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#CED4DA]" strokeWidth={1.5} />
              </div>
            </div>
            <div className="border-b-2 border-[#E1467C] inline-block">
              <h3 className="text-3xl font-semibold text-white mb-1">{slaAtRisk}</h3>
            </div>
            <p className="text-sm text-[#CED4DA] mt-1">SLA At Risk</p>
          </div>

          {/* PPM Due */}
          <div className="glass-panel rounded-xl p-[18px] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#CED4DA]" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-semibold text-white mb-1">{ppmDue}</h3>
            <p className="text-sm text-[#CED4DA]">PPM Due This Week</p>
          </div>

          {/* Overdue */}
          <div className="glass-panel rounded-xl p-[18px] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#CED4DA]" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className={`text-3xl font-semibold mb-1 ${overdueJobs > 5 ? 'text-[#E1467C]' : 'text-white'}`}>
              {overdueJobs}
            </h3>
            <p className="text-sm text-[#CED4DA]">Overdue</p>
          </div>
        </div>

        {/* Map + Workload Heatmap Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Map - 50% width */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Map className="w-4 h-4 text-[#CED4DA]" strokeWidth={1.5} />
                Live Operations Map
              </h2>
            </div>
            <div className="h-[360px]">
              <LiveMap compact={true} />
            </div>
          </div>

          {/* Workload Heatmap - 50% width */}
          <WorkloadHeatmap />
        </div>

        {/* Job Workflow Pipeline - Full Width */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h2 className="text-base font-semibold text-white mb-6">Job Workflow Pipeline</h2>
          <div className="flex items-center gap-3">
            {workflowStages.map((stage, index) => (
              <React.Fragment key={stage.label}>
                {/* Stage Capsule */}
                <div className="flex-1">
                  <div className={`relative overflow-hidden rounded-full px-4 py-3 border bg-gradient-to-br ${stage.color} transition-all hover:scale-105`}>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-white mb-0.5 transition-all">
                        {stage.count}
                      </p>
                      <p className="text-[10px] font-semibold text-[#CED4DA] uppercase tracking-wider">
                        {stage.label}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Connector */}
                {index < workflowStages.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-[#CED4DA] opacity-30 flex-shrink-0" strokeWidth={1.5} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Activity Feed - Bottom */}
        <ActivityFeed />

        <style>{`
          @keyframes countTransition {
            0% { transform: translateY(-10px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }

          .glass-panel:hover {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          }
        `}</style>
      </div>
    </>
  );
}