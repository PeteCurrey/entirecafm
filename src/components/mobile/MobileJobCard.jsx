import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, ChevronRight, AlertCircle } from "lucide-react";

export default function MobileJobCard({ job, onClick, showEngineer = false }) {
  const statusColors = {
    new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    raised: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    on_route: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    en_route: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    on_site: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const priorityColors = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-blue-500/20 text-blue-400'
  };

  const isOverdue = job.sla_due_date && 
    new Date(job.sla_due_date) < new Date() && 
    !['completed', 'cancelled'].includes(job.status);

  return (
    <div
      onClick={onClick}
      className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white text-sm truncate flex-1">
              {job.title}
            </h4>
            {isOverdue && (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-[#CED4DA] line-clamp-2 mb-2">
            {job.description || 'No description'}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-[#CED4DA] flex-shrink-0 mt-1" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge className={`${statusColors[job.status] || 'bg-gray-500/20 text-gray-400'} border text-xs`}>
          {job.status.replace('_', ' ')}
        </Badge>
        
        {job.priority && job.priority !== 'medium' && (
          <Badge className={`${priorityColors[job.priority] || 'bg-gray-500/20 text-gray-400'} text-xs`}>
            {job.priority}
          </Badge>
        )}

        {job.job_type && (
          <Badge variant="outline" className="text-xs text-[#CED4DA]">
            {job.job_type.toUpperCase()}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#CED4DA]">
        <div className="flex items-center gap-3">
          {job.scheduled_date && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(job.scheduled_date).toLocaleDateString()}
            </div>
          )}
          {job.site_name && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{job.site_name}</span>
            </div>
          )}
        </div>
        
        {showEngineer && job.assigned_engineer_name && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{job.assigned_engineer_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}