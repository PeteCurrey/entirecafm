import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  Search,
  Filter,
  Wrench,
  Calendar,
  MapPin,
  User,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

import JobForm from "../components/jobs/JobForm";

export default function JobsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showNewJobForm, setShowNewJobForm] = useState(searchParams.get('new') === 'true');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date'),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || job.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleJobClick = (jobId) => {
    navigate(createPageUrl("JobDetail") + `?id=${jobId}`);
  };

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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Jobs</h1>
            <p className="text-white/70">Manage reactive and planned maintenance jobs</p>
          </div>
          <Button
            onClick={() => setShowNewJobForm(true)}
            className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-effect border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="raised">Raised</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="en_route">En Route</SelectItem>
              <SelectItem value="on_site">On Site</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <Wrench className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
            <p className="text-white/60 mb-6">Get started by creating your first job</p>
            <Button
              onClick={() => setShowNewJobForm(true)}
              className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const site = sites.find(s => s.id === job.site_id);
            const engineer = users.find(u => u.id === job.assigned_engineer_id);
            
            return (
              <div
                key={job.id}
                onClick={() => handleJobClick(job.id)}
                className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                      {job.job_number && (
                        <span className="text-sm text-white/50">#{job.job_number}</span>
                      )}
                    </div>
                    {job.description && (
                      <p className="text-white/70 mb-3 line-clamp-2">{job.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge className={`${priorityColors[job.priority]} border`}>
                      {job.priority}
                    </Badge>
                    <Badge className={`${statusColors[job.status]} border`}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  {site && (
                    <div className="flex items-center gap-2 text-white/70">
                      <MapPin className="w-4 h-4" />
                      <span>{site.name}</span>
                    </div>
                  )}
                  {engineer && (
                    <div className="flex items-center gap-2 text-white/70">
                      <User className="w-4 h-4" />
                      <span>{engineer.full_name}</span>
                    </div>
                  )}
                  {job.scheduled_date && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  <div className="ml-auto">
                    <span className="text-xs text-white/50 uppercase">{job.job_type}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Job Dialog */}
      <Dialog open={showNewJobForm} onOpenChange={setShowNewJobForm}>
        <DialogContent className="glass-effect-strong border-white/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Job</DialogTitle>
          </DialogHeader>
          <JobForm
            onSuccess={() => {
              setShowNewJobForm(false);
              queryClient.invalidateQueries(['jobs']);
            }}
            onCancel={() => setShowNewJobForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}