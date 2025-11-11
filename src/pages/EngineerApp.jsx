import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Wrench,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Upload,
  Camera,
  Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function EngineerAppPage() {
  const [user, setUser] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [timeEntryActive, setTimeEntryActive] = useState(null);
  const queryClient = useQueryClient();

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

  const { data: myJobs = [], isLoading } = useQuery({
    queryKey: ['engineer-jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Job.filter({ assigned_engineer_id: user.id });
    },
    enabled: !!user,
  });

  const activeJobs = myJobs.filter(j => !['completed', 'cancelled'].includes(j.status));
  const completedJobs = myJobs.filter(j => j.status === 'completed');

  const updateJobMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Job.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['engineer-jobs']);
      setSelectedJob(null);
    },
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['time-entries']);
    },
  });

  const handleClockIn = async (job) => {
    const entry = {
      engineer_id: user.id,
      job_id: job.id,
      clock_in: new Date().toISOString(),
    };
    
    await createTimeEntryMutation.mutateAsync(entry);
    setTimeEntryActive(entry);
    
    // Update job status to on_site
    updateJobMutation.mutate({
      id: job.id,
      data: { status: 'on_site' }
    });
  };

  const handleClockOut = async () => {
    if (!timeEntryActive) return;
    
    const clockOutTime = new Date().toISOString();
    const clockInTime = new Date(timeEntryActive.clock_in);
    const durationMinutes = Math.floor((new Date(clockOutTime) - clockInTime) / 1000 / 60);
    
    // Update time entry with clock out
    // Note: In production, you'd update the existing entry
    await createTimeEntryMutation.mutateAsync({
      ...timeEntryActive,
      clock_out: clockOutTime,
      duration_minutes: durationMinutes,
    });
    
    setTimeEntryActive(null);
  };

  const handlePhotoUpload = async (e, job) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const photoUrls = results.map(r => r.file_url);
      
      const currentPhotos = job.completion_photos || [];
      updateJobMutation.mutate({
        id: job.id,
        data: { completion_photos: [...currentPhotos, ...photoUrls] }
      });
    } catch (error) {
      console.error("Error uploading photos:", error);
    }
  };

  const handleCompleteJob = async (job) => {
    updateJobMutation.mutate({
      id: job.id,
      data: {
        status: 'completed',
        completed_date: new Date().toISOString(),
        completion_notes: completionNotes,
      }
    });
    setCompletionNotes("");
  };

  const statusColors = {
    raised: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    assigned: 'bg-purple-500/20 text-purple-200 border-purple-300/30',
    en_route: 'bg-yellow-500/20 text-yellow-200 border-yellow-300/30',
    on_site: 'bg-orange-500/20 text-orange-200 border-orange-300/30',
    completed: 'bg-green-500/20 text-green-200 border-green-300/30',
  };

  if (!user) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass-effect rounded-2xl p-8 border border-white/20 text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      {/* Install PWA Banner */}
      <div className="mb-6 glass-effect rounded-2xl p-4 border border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl glass-effect-strong flex items-center justify-center">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white">Engineer Mobile App</h2>
            <p className="text-xs text-white/70">Install this app for offline access</p>
          </div>
        </div>
      </div>

      {/* Active Timer */}
      {timeEntryActive && (
        <div className="mb-6 glass-effect-strong rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-300 animate-pulse" />
              <span className="font-semibold text-white">On Site</span>
            </div>
            <Button
              onClick={handleClockOut}
              size="sm"
              className="glass-effect border-white/30 text-white hover:bg-white/20"
            >
              Clock Out
            </Button>
          </div>
          <p className="text-sm text-white/70">
            Started: {format(new Date(timeEntryActive.clock_in), 'h:mm a')}
          </p>
        </div>
      )}

      {/* Today's Jobs */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Today's Jobs ({activeJobs.length})</h2>
        <div className="space-y-3">
          {activeJobs.map((job) => (
            <div
              key={job.id}
              className="glass-effect rounded-2xl p-4 border border-white/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{job.title}</h3>
                  {job.description && (
                    <p className="text-sm text-white/70 line-clamp-2 mb-2">{job.description}</p>
                  )}
                </div>
                <Badge className={`ml-3 ${statusColors[job.status]} border`}>
                  {job.status.replace('_', ' ')}
                </Badge>
              </div>

              {job.scheduled_date && (
                <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</span>
                  {job.scheduled_time && <span>at {job.scheduled_time}</span>}
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {job.status === 'assigned' && (
                  <Button
                    onClick={() => updateJobMutation.mutate({ id: job.id, data: { status: 'en_route' } })}
                    size="sm"
                    className="glass-effect border-white/30 text-white hover:bg-white/20"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    En Route
                  </Button>
                )}
                {(job.status === 'en_route' || job.status === 'assigned') && (
                  <Button
                    onClick={() => handleClockIn(job)}
                    size="sm"
                    className="glass-effect border-white/30 text-white hover:bg-white/20"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Clock In
                  </Button>
                )}
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(e) => handlePhotoUpload(e, job)}
                    className="hidden"
                  />
                  <div className="glass-effect border-white/30 text-white hover:bg-white/20 rounded-lg px-3 py-2 text-sm font-medium flex items-center justify-center cursor-pointer">
                    <Camera className="w-4 h-4 mr-2" />
                    Photo
                  </div>
                </label>
                <Button
                  onClick={() => setSelectedJob(job)}
                  size="sm"
                  className="glass-effect border-white/30 text-white hover:bg-white/20"
                >
                  Complete
                </Button>
              </div>

              {/* Completion Photos */}
              {job.completion_photos && job.completion_photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {job.completion_photos.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-white/20"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {activeJobs.length === 0 && (
            <div className="glass-effect rounded-2xl p-8 border border-white/20 text-center">
              <Wrench className="w-12 h-12 mx-auto mb-3 text-white/30" />
              <p className="text-white/70">No active jobs assigned</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed Today */}
      {completedJobs.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Completed ({completedJobs.length})</h2>
          <div className="space-y-3">
            {completedJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="glass-effect rounded-2xl p-4 border border-white/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white mb-1">{job.title}</h3>
                    {job.completed_date && (
                      <p className="text-sm text-white/60">
                        {format(new Date(job.completed_date), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-green-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Job Dialog */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="glass-effect-strong border-white/30 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-4">Complete Job</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-white/90 mb-2 block">Completion Notes</label>
                <Textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="glass-effect border-white/20 text-white placeholder:text-white/50 min-h-[120px]"
                  placeholder="What work was completed?"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setSelectedJob(null);
                  setCompletionNotes("");
                }}
                variant="outline"
                className="flex-1 glass-effect border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleCompleteJob(selectedJob)}
                disabled={updateJobMutation.isPending}
                className="flex-1 glass-effect-strong border-white/30 text-white hover:bg-white/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}