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
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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

  // Stats calculations
  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status)).length;
  const completedThisMonth = jobs.filter(j => {
    if (!j.completed_date) return false;
    const completed = new Date(j.completed_date);
    const now = new Date();
    return completed.getMonth() === now.getMonth() && completed.getFullYear() === now.getFullYear();
  }).length;

  const pendingQuotes = quotes.filter(q => q.status === 'sent').length;
  const overdueInvoices = invoices.filter(i => {
    if (i.status === 'paid') return false;
    if (!i.due_date) return false;
    return new Date(i.due_date) < new Date();
  }).length;

  const recentJobs = jobs.slice(0, 5);

  const statusColors = {
    raised: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    assigned: 'bg-purple-500/20 text-purple-200 border-purple-300/30',
    en_route: 'bg-yellow-500/20 text-yellow-200 border-yellow-300/30',
    on_site: 'bg-orange-500/20 text-orange-200 border-orange-300/30',
    completed: 'bg-green-500/20 text-green-200 border-green-300/30',
    cancelled: 'bg-red-500/20 text-red-200 border-red-300/30',
  };

  const priorityColors = {
    low: 'bg-gray-500/20 text-gray-200 border-gray-300/30',
    medium: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    high: 'bg-orange-500/20 text-orange-200 border-orange-300/30',
    critical: 'bg-red-500/20 text-red-200 border-red-300/30',
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user?.full_name || 'User'}
        </h1>
        <p className="text-white/70">Here's what's happening with your operations today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Jobs */}
        <div className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl glass-effect-strong flex items-center justify-center">
              <Wrench className="w-6 h-6 text-blue-300" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{activeJobs}</h3>
          <p className="text-sm text-white/70">Active Jobs</p>
        </div>

        {/* Completed This Month */}
        <div className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl glass-effect-strong flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-300" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{completedThisMonth}</h3>
          <p className="text-sm text-white/70">Completed This Month</p>
        </div>

        {/* Pending Quotes */}
        <div className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl glass-effect-strong flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-300" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{pendingQuotes}</h3>
          <p className="text-sm text-white/70">Pending Quotes</p>
        </div>

        {/* Overdue Invoices */}
        <div className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl glass-effect-strong flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-300" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{overdueInvoices}</h3>
          <p className="text-sm text-white/70">Overdue Invoices</p>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Recent Jobs</h2>
          <Link to={createPageUrl("Jobs")}>
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {recentJobs.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No jobs yet. Create your first job to get started!</p>
            </div>
          ) : (
            recentJobs.map((job) => (
              <Link
                key={job.id}
                to={createPageUrl("JobDetail") + `?id=${job.id}`}
                className="block"
              >
                <div className="glass-effect rounded-xl p-4 border border-white/20 glass-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{job.title}</h3>
                      <p className="text-sm text-white/60 line-clamp-1">{job.description}</p>
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
                      <span className="text-xs text-white/60">{job.job_type.toUpperCase()}</span>
                    )}
                    {job.scheduled_date && (
                      <span className="text-xs text-white/60 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
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
          <div className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover h-full">
            <div className="w-12 h-12 rounded-xl glass-effect-strong flex items-center justify-center mb-4">
              <Wrench className="w-6 h-6 text-blue-300" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Create New Job</h3>
            <p className="text-sm text-white/60">Log a reactive or emergency job</p>
          </div>
        </Link>

        <Link to={createPageUrl("PPMSchedule")} className="block">
          <div className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover h-full">
            <div className="w-12 h-12 rounded-xl glass-effect-strong flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-purple-300" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">View PPM Schedule</h3>
            <p className="text-sm text-white/60">Manage planned maintenance</p>
          </div>
        </Link>

        <Link to={createPageUrl("Quotes") + "?new=true"} className="block">
          <div className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover h-full">
            <div className="w-12 h-12 rounded-xl glass-effect-strong flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-green-300" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Create Quote</h3>
            <p className="text-sm text-white/60">Generate a new quote for approval</p>
          </div>
        </Link>
      </div>
    </div>
  );
}