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
    { label: 'New', count: jobs.filter(j => j.status === 'raised').length, color: 'from-gray-500/20 to-gray-600/20 border-gray-500/30' },
    { label: 'Assigned', count: jobs.filter(j => j.status === 'assigned').length, color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30' },
    { label: 'On Route', count: jobs.filter(j => j.status === 'en_route').length, color: 'from-teal-500/20 to-teal-600/20 border-teal-500/30' },
    { label: 'On Site', count: jobs.filter(j => j.status === 'on_site').length, color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30' },
    { label: 'Completed', count: jobs.filter(j => j.status === 'completed').length, color: 'from-green-500/20 to-green-600/20 border-green-500/30' },
    { label: 'Invoiced', count: jobs.filter(j => j.invoice_id).length, color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30' },
  ];

  return (
    <>
      <TopNav user={user} />
      
      <div className="px-6 py-8 max-w-[1680px] mx-auto">
        <div className="space-y-6">
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
              <h3 className={`text-3xl font-semibold mb-1 transition-colors ${overdueJobs > 5 ? 'text-[#E1467C]' : 'text-white'}`}>
                {overdueJobs}
              </h3>
              <p className="text-sm text-[#CED4DA]">Overdue</p>
            </div>
          </div>

          {/* Map + Workload Heatmap Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Map - 50% width */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
              <div className="p-6 pb-0">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                  <Map className="w-4 h-4 text-[#CED4DA]" strokeWidth={1.5} />
                  Live Operations Map
                </h2>
              </div>
              <div className="h-[360px] p-6 pt-2">
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
                    <div className={`relative overflow-hidden rounded-full px-4 py-3 border bg-gradient-to-br ${stage.color} transition-all hover:scale-105 cursor-pointer`}>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-white mb-0.5 transition-all duration-300 ease-out">
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
        </div>
      </div>

      <style>{`
        .glass-panel:hover {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }
      `}</style>
    </>
  );
}