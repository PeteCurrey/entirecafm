import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Wrench, Search, ArrowLeft, Clock, User, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function ClientJobsPage() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

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
      return base44.entities.Job.filter({ client_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const filteredJobs = jobs.filter(job =>
    !searchTerm ||
    job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.job_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    raised: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    en_route: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    on_site: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className="min-h-screen bg-[#0D1117] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <Link to={createPageUrl("ClientPortal")}>
            <button className="flex items-center gap-2 text-body hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              Back to Dashboard
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Your Jobs</h1>
          <p className="text-body">Track all your maintenance and service requests</p>
        </div>

        {/* Search */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-body" strokeWidth={1.5} />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass-panel border-divider text-white"
            />
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const site = sites.find(s => s.id === job.site_id);
            const engineer = users.find(u => u.id === job.assigned_engineer_id);

            return (
              <Link
                key={job.id}
                to={createPageUrl("ClientJobDetail") + `?id=${job.id}`}
                className="block"
              >
                <div className="glass-panel rounded-2xl p-6 border border-divider hover:glass-panel-strong transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                        {job.job_number && (
                          <span className="text-sm text-body">#{job.job_number}</span>
                        )}
                      </div>
                      {job.description && (
                        <p className="text-body text-sm mb-3">{job.description}</p>
                      )}
                    </div>
                    <Badge className={`${statusColors[job.status]} border ml-4`}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {site && (
                      <div className="flex items-center gap-2 text-body">
                        <MapPin className="w-4 h-4" strokeWidth={1.5} />
                        <span>{site.name}</span>
                      </div>
                    )}
                    {engineer && (
                      <div className="flex items-center gap-2 text-body">
                        <User className="w-4 h-4" strokeWidth={1.5} />
                        <span>{engineer.full_name}</span>
                      </div>
                    )}
                    {job.scheduled_date && (
                      <div className="flex items-center gap-2 text-body">
                        <Clock className="w-4 h-4" strokeWidth={1.5} />
                        <span>{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}