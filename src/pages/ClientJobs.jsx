import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Wrench,
  Search,
  Filter,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientJobsPage() {
  const [user, setUser] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    if (userData.client_id) {
      setClientId(userData.client_id);
    }
  };

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['client-jobs', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.Job.filter({ client_id: clientId });
    },
    enabled: !!clientId
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['client-sites', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.Site.filter({ client_id: clientId });
    },
    enabled: !!clientId
  });

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    on_route: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    on_site: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <div className="min-h-screen bg-[#0D1117] p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl("ClientPortal")}>
            <Button variant="ghost" className="mb-4 text-[#CED4DA]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">My Jobs</h1>
          <p className="text-[#CED4DA]">Track all your service requests and maintenance jobs</p>
        </div>

        {/* Filters */}
        <div className="glass-panel rounded-2xl p-4 border border-[rgba(255,255,255,0.08)] mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CED4DA] opacity-50" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 glass-panel border-[rgba(255,255,255,0.08)] text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="on_site">On Site</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#CED4DA]">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <Wrench className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
            <p className="text-[#CED4DA] mb-6">No jobs match your search criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map(job => {
              const site = sites.find(s => s.id === job.site_id);
              const isOverdue = job.sla_due_date && new Date(job.sla_due_date) < new Date() && !['completed', 'cancelled'].includes(job.status);
              
              return (
                <Link 
                  key={job.id}
                  to={`${createPageUrl("ClientJobDetail")}?id=${job.id}`}
                  className="block glass-panel rounded-xl p-6 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-semibold text-lg">{job.title}</h3>
                        {isOverdue && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-[#CED4DA] text-sm mb-2">{job.description || 'No description'}</p>
                      <div className="flex items-center gap-4 text-xs text-[#CED4DA]">
                        <span>Job #{job.job_number || job.id.slice(0, 8)}</span>
                        {site && <span>📍 {site.name}</span>}
                        {job.scheduled_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(job.scheduled_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${statusColors[job.status] || 'bg-gray-500/20 text-gray-400'} border`}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                      {job.priority && job.priority !== 'medium' && (
                        <Badge className={`${
                          job.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          job.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-blue-500/20 text-blue-400'
                        } border-0`}>
                          {job.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}