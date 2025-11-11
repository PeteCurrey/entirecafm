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

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date', 20),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 20),
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
  
  const ppmThisWeek = ppmSchedules.filter(s => {
    if (!s.next_due_date) return false;
    const dueDate = new Date(s.next_due_date);
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    return dueDate >= today && dueDate <= weekFromNow;
  }).length;

  const activeEngineers = users.filter(u => u.engineer_details?.is_available).length;

  const recentJobs = jobs.slice(0, 5);

  const statusColors = {
    raised: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    en_route: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    on_site: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const priorityColors = {
    low: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    critical: 'bg-[#E1467C]/10 text-[#E1467C] border-[#E1467C]/30',
  };

  // Job workflow funnel data
  const workflowStages = [
    { label: 'New', count: jobs.filter(j => j.status === 'raised').length },
    { label: 'Assigned', count: jobs.filter(j => j.status === 'assigned').length },
    { label: 'En Route', count: jobs.filter(j => j.status === 'en_route').length },
    { label: 'On Site', count: jobs.filter(j => j.status === 'on_site').length },
    { label: 'Complete', count: jobs.filter(j => j.status === 'completed').length },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-divider">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user?.full_name || 'User'}
        </h1>
        <p className="text-body">Here's your operational overview for today</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
              <Wrench className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{activeJobs}</h3>
          <p className="text-sm text-body">Open Jobs</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#E1467C]" strokeWidth={1.5} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{slaAtRisk}</h3>
          <p className="text-sm text-body">SLA At Risk</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-400" strokeWidth={1.5} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{ppmThisWeek}</h3>
          <p className="text-sm text-body">PPM This Week</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" strokeWidth={1.5} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{activeEngineers}</h3>
          <p className="text-sm text-body">Engineers Active</p>
        </div>
      </div>

      {/* Map + Workload Heatmap Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Operations Map */}
        <Link to={createPageUrl("MapTracking")} className="block">
          <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Map className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                Live Operations Map
              </h2>
              <ArrowRight className="w-5 h-5 text-body" strokeWidth={1.5} />
            </div>
            <LiveMap compact={true} />
          </div>
        </Link>

        {/* Workload Heatmap */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <h2 className="text-lg font-bold text-white mb-4">Engineer Workload</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body text-sm">Ryan Mitchell</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400" style={{ width: '65%' }}></div>
                </div>
                <span className="text-xs text-body">3 jobs</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-sm">Mia Chen</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: '85%' }}></div>
                </div>
                <span className="text-xs text-body">5 jobs</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-sm">James Foster</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400" style={{ width: '45%' }}></div>
                </div>
                <span className="text-xs text-body">2 jobs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Job Workflow Funnel */}
      <div className="glass-panel rounded-2xl p-6 border border-divider">
        <h2 className="text-xl font-bold text-white mb-6">Job Pipeline</h2>
        <div className="flex items-center justify-between gap-3">
          {workflowStages.map((stage, index) => (
            <React.Fragment key={stage.label}>
              <div className="flex-1 text-center">
                <div className="glass-panel rounded-xl p-4 mb-2 hover:glass-panel-strong transition-all">
                  <p className="text-2xl font-bold text-white mb-1">{stage.count}</p>
                  <p className="text-xs text-body uppercase tracking-wider">{stage.label}</p>
                </div>
              </div>
              {index < workflowStages.length - 1 && (
                <ChevronRight className="w-5 h-5 text-body/50 flex-shrink-0" strokeWidth={1.5} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="glass-panel rounded-2xl p-6 border border-divider">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          <Link to={createPageUrl("Jobs")}>
            <Button variant="ghost" className="text-body hover:text-white hover:bg-white/10">
              View All
              <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {recentJobs.length === 0 ? (
            <div className="text-center py-12 text-body">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
              <p>No jobs yet. Create your first job to get started!</p>
            </div>
          ) : (
            recentJobs.map((job) => (
              <Link
                key={job.id}
                to={createPageUrl("JobDetail") + `?id=${job.id}`}
                className="block"
              >
                <div className="glass-panel rounded-xl p-4 border border-divider hover:glass-panel-strong transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{job.title}</h3>
                      <p className="text-sm text-body line-clamp-1">{job.description}</p>
                    </div>
                    <Badge className={`ml-4 ${priorityColors[job.priority]} border`}>
                      {job.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={`${statusColors[job.status]} border`}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                    {job.job_type && (
                      <span className="text-xs text-body uppercase tracking-wider">{job.job_type}</span>
                    )}
                    {job.scheduled_date && (
                      <span className="text-xs text-body flex items-center gap-1">
                        <Calendar className="w-3 h-3" strokeWidth={1.5} />
                        {format(new Date(job.scheduled_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to={createPageUrl("Jobs") + "?new=true"} className="block">
          <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all h-full">
            <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center mb-4">
              <Wrench className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Create New Job</h3>
            <p className="text-sm text-body">Log a reactive or emergency job</p>
          </div>
        </Link>

        <Link to={createPageUrl("PPMPlanner")} className="block">
          <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all h-full">
            <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-purple-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">View PPM Schedule</h3>
            <p className="text-sm text-body">Manage planned maintenance</p>
          </div>
        </Link>

        <Link to={createPageUrl("Quotes") + "?new=true"} className="block">
          <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all h-full">
            <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-green-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Create Quote</h3>
            <p className="text-sm text-body">Generate a new quote for approval</p>
          </div>
        </Link>
      </div>
    </div>
  );
}