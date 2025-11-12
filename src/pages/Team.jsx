import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Search,
  Plus,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Wrench
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

export default function TeamPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sortParam = searchParams.get('sort'); // 'utilisation' or undefined
  const fromPage = searchParams.get('from'); // 'director' or undefined
  
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
  });

  // Calculate utilisation for each engineer
  const now = new Date();
  const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const engineers = users
    .filter(u => u.role === 'user') // Assuming 'user' role is for engineers
    .map(engineer => {
      const assignedJobs = jobs.filter(j => 
        j.assigned_engineer_id === engineer.id &&
        j.status !== 'completed' &&
        j.status !== 'cancelled'
      ).length;

      const jobsNext48h = jobs.filter(j => {
        if (j.assigned_engineer_id !== engineer.id) return false;
        if (!j.scheduled_date) return false;
        const scheduledDate = new Date(j.scheduled_date);
        return scheduledDate >= now && scheduledDate <= next48h;
      }).length;

      // Assume 8 jobs per day capacity, 16 for 48h
      const maxCapacity = 16;
      const utilisationPct = Math.min((jobsNext48h / maxCapacity) * 100, 100);

      return {
        ...engineer,
        assigned_jobs: assignedJobs,
        jobs_next_48h: jobsNext48h,
        utilisation_pct: Math.round(utilisationPct)
      };
    });

  // Sort by utilisation if requested
  let displayEngineers = [...engineers];
  if (sortParam === 'utilisation') {
    displayEngineers.sort((a, b) => b.utilisation_pct - a.utilisation_pct);
  }

  // Apply filters
  displayEngineers = displayEngineers.filter(eng => {
    const matchesSearch = !searchTerm || 
      eng.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eng.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || eng.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getUtilisationColor = (pct) => {
    if (pct >= 85) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (pct >= 70) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (pct >= 50) return 'bg-green-500/20 text-green-400 border-green-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        {/* Back Link - Show if coming from director dashboard */}
        {fromPage === 'director' && (
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("AIDirector"))}
            className="mb-4 text-[#CED4DA] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Return to AI Director Dashboard
          </Button>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Team</h1>
            <p className="text-[#CED4DA]">
              {sortParam === 'utilisation' ? 'Engineers sorted by utilisation (next 48h)' : 'Manage engineers and team members'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CED4DA] opacity-50" />
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              />
            </div>
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">Engineer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {sortParam === 'utilisation' && (
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-[#CED4DA] mb-1">Avg Utilisation</div>
              <div className="text-3xl font-bold text-white">
                {displayEngineers.length > 0
                  ? Math.round(displayEngineers.reduce((sum, e) => sum + e.utilisation_pct, 0) / displayEngineers.length)
                  : 0}%
              </div>
            </div>
            <div>
              <div className="text-sm text-[#CED4DA] mb-1">Overloaded (≥85%)</div>
              <div className="text-3xl font-bold text-red-400">
                {displayEngineers.filter(e => e.utilisation_pct >= 85).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-[#CED4DA] mb-1">Available (&lt;50%)</div>
              <div className="text-3xl font-bold text-green-400">
                {displayEngineers.filter(e => e.utilisation_pct < 50).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Engineers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#CED4DA]">Loading team members...</p>
          </div>
        ) : displayEngineers.length === 0 ? (
          <div className="col-span-full glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No team members found</h3>
            <p className="text-[#CED4DA]">Team members will appear here</p>
          </div>
        ) : (
          displayEngineers.map((engineer) => (
            <div
              key={engineer.id}
              className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-[#E1467C] flex items-center justify-center text-white text-xl font-bold">
                  {engineer.full_name?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{engineer.full_name}</h3>
                  <Badge className="text-xs">
                    {engineer.role === 'admin' ? 'Admin' : 'Engineer'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {engineer.email && (
                  <div className="flex items-center gap-2 text-[#CED4DA]">
                    <Mail className="w-4 h-4" strokeWidth={1.5} />
                    <span className="truncate">{engineer.email}</span>
                  </div>
                )}

                {engineer.role === 'user' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[#CED4DA]">Active Jobs</span>
                      <span className="text-white font-semibold">{engineer.assigned_jobs}</span>
                    </div>

                    <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#CED4DA] text-xs">Next 48h Utilisation</span>
                        <Badge className={`${getUtilisationColor(engineer.utilisation_pct)} border text-xs`}>
                          {engineer.utilisation_pct}%
                        </Badge>
                      </div>
                      <div className="w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            engineer.utilisation_pct >= 85 ? 'bg-red-500' :
                            engineer.utilisation_pct >= 70 ? 'bg-yellow-500' :
                            engineer.utilisation_pct >= 50 ? 'bg-green-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(engineer.utilisation_pct, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-[#CED4DA] mt-1">
                        {engineer.jobs_next_48h} jobs scheduled
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}