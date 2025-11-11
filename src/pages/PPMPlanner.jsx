import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, addDays, isPast, isFuture } from "date-fns";

import PPMScheduleForm from "../components/ppm/PPMScheduleForm";

export default function PPMPlannerPage() {
  const queryClient = useQueryClient();
  const [showNewScheduleForm, setShowNewScheduleForm] = useState(false);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['ppm-schedules'],
    queryFn: () => base44.entities.PPMSchedule.list('-next_due_date'),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const activeSchedules = schedules.filter(s => s.is_active !== false);
  
  // Categorize schedules
  const overdueSchedules = activeSchedules.filter(s => 
    s.next_due_date && isPast(new Date(s.next_due_date))
  );
  
  const dueSoonSchedules = activeSchedules.filter(s => {
    if (!s.next_due_date) return false;
    const dueDate = new Date(s.next_due_date);
    const sevenDaysFromNow = addDays(new Date(), 7);
    return isFuture(dueDate) && dueDate <= sevenDaysFromNow;
  });

  const upcomingSchedules = activeSchedules.filter(s => {
    if (!s.next_due_date) return false;
    const dueDate = new Date(s.next_due_date);
    const sevenDaysFromNow = addDays(new Date(), 7);
    return dueDate > sevenDaysFromNow;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">PPM Planner</h1>
            <p className="text-white/70">Planned preventative maintenance schedule</p>
          </div>
          <Button
            onClick={() => setShowNewScheduleForm(true)}
            className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Overdue</span>
            <AlertCircle className="w-5 h-5 text-red-300" />
          </div>
          <p className="text-2xl font-bold text-white">{overdueSchedules.length}</p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Due Soon (7 days)</span>
            <Clock className="w-5 h-5 text-yellow-300" />
          </div>
          <p className="text-2xl font-bold text-white">{dueSoonSchedules.length}</p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Upcoming</span>
            <Calendar className="w-5 h-5 text-blue-300" />
          </div>
          <p className="text-2xl font-bold text-white">{upcomingSchedules.length}</p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Total Active</span>
            <CheckCircle2 className="w-5 h-5 text-green-300" />
          </div>
          <p className="text-2xl font-bold text-white">{activeSchedules.length}</p>
        </div>
      </div>

      {/* Overdue Section */}
      {overdueSchedules.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-300" />
            Overdue PPM Tasks
          </h2>
          <div className="space-y-3">
            {overdueSchedules.map((schedule) => {
              const asset = assets.find(a => a.id === schedule.asset_id);
              const site = sites.find(s => s.id === schedule.site_id);
              const engineer = users.find(u => u.id === schedule.assigned_engineer_id);

              return (
                <div
                  key={schedule.id}
                  className="glass-effect rounded-2xl p-6 border border-red-300/30 glass-hover cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{schedule.name}</h3>
                      {schedule.task_description && (
                        <p className="text-white/70 text-sm mb-2">{schedule.task_description}</p>
                      )}
                    </div>
                    <Badge className="bg-red-500/20 text-red-200 border-red-300/30 border ml-4">
                      Overdue
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {asset && (
                      <div>
                        <span className="text-white/50">Asset</span>
                        <p className="text-white/90">{asset.name}</p>
                      </div>
                    )}
                    {site && (
                      <div>
                        <span className="text-white/50">Site</span>
                        <p className="text-white/90">{site.name}</p>
                      </div>
                    )}
                    {schedule.next_due_date && (
                      <div>
                        <span className="text-white/50">Due Date</span>
                        <p className="text-red-300">
                          {format(new Date(schedule.next_due_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                    {engineer && (
                      <div>
                        <span className="text-white/50">Assigned To</span>
                        <p className="text-white/90">{engineer.full_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Due Soon Section */}
      {dueSoonSchedules.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-300" />
            Due Soon (Next 7 Days)
          </h2>
          <div className="space-y-3">
            {dueSoonSchedules.map((schedule) => {
              const asset = assets.find(a => a.id === schedule.asset_id);
              const site = sites.find(s => s.id === schedule.site_id);
              const engineer = users.find(u => u.id === schedule.assigned_engineer_id);

              return (
                <div
                  key={schedule.id}
                  className="glass-effect rounded-2xl p-6 border border-yellow-300/30 glass-hover cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{schedule.name}</h3>
                      {schedule.task_description && (
                        <p className="text-white/70 text-sm mb-2">{schedule.task_description}</p>
                      )}
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-300/30 border ml-4">
                      {schedule.frequency}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {asset && (
                      <div>
                        <span className="text-white/50">Asset</span>
                        <p className="text-white/90">{asset.name}</p>
                      </div>
                    )}
                    {site && (
                      <div>
                        <span className="text-white/50">Site</span>
                        <p className="text-white/90">{site.name}</p>
                      </div>
                    )}
                    {schedule.next_due_date && (
                      <div>
                        <span className="text-white/50">Due Date</span>
                        <p className="text-yellow-300">
                          {format(new Date(schedule.next_due_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                    {engineer && (
                      <div>
                        <span className="text-white/50">Assigned To</span>
                        <p className="text-white/90">{engineer.full_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Section */}
      {upcomingSchedules.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-300" />
            Upcoming PPM Tasks
          </h2>
          <div className="space-y-3">
            {upcomingSchedules.slice(0, 10).map((schedule) => {
              const asset = assets.find(a => a.id === schedule.asset_id);
              const site = sites.find(s => s.id === schedule.site_id);
              const engineer = users.find(u => u.id === schedule.assigned_engineer_id);

              return (
                <div
                  key={schedule.id}
                  className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{schedule.name}</h3>
                      {schedule.task_description && (
                        <p className="text-white/70 text-sm mb-2">{schedule.task_description}</p>
                      )}
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-200 border-blue-300/30 border ml-4">
                      {schedule.frequency}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {asset && (
                      <div>
                        <span className="text-white/50">Asset</span>
                        <p className="text-white/90">{asset.name}</p>
                      </div>
                    )}
                    {site && (
                      <div>
                        <span className="text-white/50">Site</span>
                        <p className="text-white/90">{site.name}</p>
                      </div>
                    )}
                    {schedule.next_due_date && (
                      <div>
                        <span className="text-white/50">Due Date</span>
                        <p className="text-white/90">
                          {format(new Date(schedule.next_due_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                    {engineer && (
                      <div>
                        <span className="text-white/50">Assigned To</span>
                        <p className="text-white/90">{engineer.full_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isLoading ? (
        <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading schedules...</p>
        </div>
      ) : activeSchedules.length === 0 ? (
        <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <h3 className="text-xl font-semibold text-white mb-2">No PPM schedules</h3>
          <p className="text-white/60 mb-6">Create your first maintenance schedule</p>
          <Button
            onClick={() => setShowNewScheduleForm(true)}
            className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      ) : null}

      {/* New Schedule Dialog */}
      <Dialog open={showNewScheduleForm} onOpenChange={setShowNewScheduleForm}>
        <DialogContent className="glass-effect-strong border-white/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create PPM Schedule</DialogTitle>
          </DialogHeader>
          <PPMScheduleForm
            onSuccess={() => {
              setShowNewScheduleForm(false);
              queryClient.invalidateQueries(['ppm-schedules']);
            }}
            onCancel={() => setShowNewScheduleForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}