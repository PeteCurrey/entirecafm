import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Wrench,
  FileText,
  DollarSign,
  Plus,
  Clock,
  CheckCircle2,
  User,
  Building2,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    queryKey: ['client-jobs'],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Job.filter({ client_id: user.id }, '-created_date', 20);
    },
    enabled: !!user,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['client-quotes'],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Quote.filter({ client_id: user.id }, '-created_date', 20);
    },
    enabled: !!user,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['client-invoices'],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Invoice.filter({ client_id: user.id }, '-created_date', 20);
    },
    enabled: !!user,
  });

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status));
  const pendingQuotes = quotes.filter(q => q.status === 'sent');
  const unpaidInvoices = invoices.filter(i => ['sent', 'overdue'].includes(i.status));

  const statusColors = {
    raised: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    en_route: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    on_site: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  };

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Client Header */}
      <header className="glass-panel border-b border-divider p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Client Portal</h1>
              {user?.client_details?.company_name && (
                <p className="text-xs text-body">{user.client_details.company_name}</p>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to={createPageUrl("ClientJobs")}>
              <Button variant="ghost" className="text-body hover:text-white">
                Jobs
              </Button>
            </Link>
            <Link to={createPageUrl("ClientQuotes")}>
              <Button variant="ghost" className="text-body hover:text-white">
                Quotes
              </Button>
            </Link>
            <Link to={createPageUrl("ClientInvoices")}>
              <Button variant="ghost" className="text-body hover:text-white">
                Invoices
              </Button>
            </Link>
            
            {user && (
              <div className="flex items-center gap-2 pl-4 border-l border-divider">
                <div className="w-8 h-8 rounded-full accent-magenta flex items-center justify-center text-white font-bold text-sm">
                  {user.full_name?.[0]}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => base44.auth.logout()}
                  className="text-body hover:text-white"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-divider space-y-2">
            <Link to={createPageUrl("ClientJobs")} className="block">
              <Button variant="ghost" className="w-full justify-start text-body">
                Jobs
              </Button>
            </Link>
            <Link to={createPageUrl("ClientQuotes")} className="block">
              <Button variant="ghost" className="w-full justify-start text-body">
                Quotes
              </Button>
            </Link>
            <Link to={createPageUrl("ClientInvoices")} className="block">
              <Button variant="ghost" className="w-full justify-start text-body">
                Invoices
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Welcome */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back, {user?.full_name || 'User'}
          </h2>
          <p className="text-body">Manage your facilities maintenance and service requests</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-divider">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{activeJobs.length}</h3>
            <p className="text-sm text-body">Active Jobs</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-divider">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-400" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{pendingQuotes.length}</h3>
            <p className="text-sm text-body">Quotes Pending</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-divider">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-400" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{unpaidInvoices.length}</h3>
            <p className="text-sm text-body">Unpaid Invoices</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to={createPageUrl("ClientRequestJob")} className="block">
            <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all h-full">
              <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-[#E1467C]" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Request New Job</h3>
              <p className="text-sm text-body">Raise a new maintenance or service request</p>
            </div>
          </Link>

          <Link to={createPageUrl("ClientJobs")} className="block">
            <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all h-full">
              <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">View Active Jobs</h3>
              <p className="text-sm text-body">Track your ongoing maintenance work</p>
            </div>
          </Link>
        </div>

        {/* Recent Jobs */}
        {activeJobs.length > 0 && (
          <div className="glass-panel rounded-2xl p-6 border border-divider">
            <h2 className="text-xl font-bold text-white mb-4">Active Jobs</h2>
            <div className="space-y-3">
              {activeJobs.slice(0, 5).map((job) => (
                <Link
                  key={job.id}
                  to={createPageUrl("ClientJobDetail") + `?id=${job.id}`}
                  className="block"
                >
                  <div className="glass-panel rounded-xl p-4 border border-divider hover:glass-panel-strong transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white">{job.title}</h3>
                      <Badge className={`${statusColors[job.status]} border ml-4`}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-body">
                      {job.job_number && <span>#{job.job_number}</span>}
                      {job.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" strokeWidth={1.5} />
                          {format(new Date(job.scheduled_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}