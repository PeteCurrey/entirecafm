import React, { useState, useEffect, Suspense, lazy } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wrench,
  Navigation,
  MapPin,
  CheckCircle2,
  Camera,
  Mic,
  Plus,
  X,
  Clock,
  Play,
  Square,
  List,
  Map as MapIcon,
  Bell,
  Package,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

// PWA Components
import { 
  initDB, 
  cacheJobs, 
  getCachedJobs, 
  queueUpdate,
  savePartsLog,
  savePhoto as savePhotoOffline
} from "../components/pwa/OfflineStorage";
import { setupAutoSync, syncPendingUpdates } from "../components/pwa/SyncManager";
import { 
  requestNotificationPermission, 
  setupRealtimeNotifications,
  notifyNewJob 
} from "../components/pwa/PushNotifications";
import TimeTracker from "../components/pwa/TimeTracker";
import SyncIndicator from "../components/pwa/SyncIndicator";
import InstallPrompt from "../components/pwa/InstallPrompt";

// Lazy load map for better performance
const MobileMap = lazy(() => import("../components/pwa/MobileMap"));

export default function EngineerMobile() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("jobs");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [partsUsed, setPartsUsed] = useState([]);
  const [newPart, setNewPart] = useState({ description: "", quantity: 1, cost: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const [offlineJobs, setOfflineJobs] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const queryClient = useQueryClient();

  // Initialize PWA features
  useEffect(() => {
    const initPWA = async () => {
      await initDB();
      
      // Load cached jobs for offline access
      const cached = await getCachedJobs();
      setOfflineJobs(cached);

      // Request notification permission
      await requestNotificationPermission();
    };

    initPWA();
    loadUser();

    // Online/offline listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Request geolocation permission
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(() => {
        console.log('Location permission granted');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Setup auto-sync and real-time notifications when user loads
  useEffect(() => {
    if (!user) return;

    const cleanupSync = setupAutoSync((result) => {
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} updates`);
        queryClient.invalidateQueries(['engineer-jobs']);
      }
    });

    const cleanupNotifications = setupRealtimeNotifications(user.id, user.org_id);

    return () => {
      cleanupSync();
      cleanupNotifications();
    };
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Fetch jobs with offline fallback
  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['engineer-jobs'],
    queryFn: async () => {
      if (!user) return offlineJobs;
      
      try {
        const serverJobs = await base44.entities.Job.filter(
          { assigned_engineer_id: user.id }, 
          '-scheduled_date'
        );
        // Cache for offline access
        await cacheJobs(serverJobs);
        return serverJobs;
      } catch (error) {
        console.error('Failed to fetch jobs, using cache:', error);
        return offlineJobs;
      }
    },
    enabled: !!user,
    refetchInterval: navigator.onLine ? 30000 : false,
    retry: false
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ jobId, updates }) => {
      if (navigator.onLine) {
        return base44.entities.Job.update(jobId, updates);
      } else {
        // Queue for later sync
        await queueUpdate({
          type: 'job_status',
          job_id: jobId,
          data: updates
        });
        return { ...updates, _queued: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['engineer-jobs']);
      if (result._queued) {
        toast.info('Update saved offline - will sync when online');
      }
    },
  });

  const updateJobStatus = async (jobId, status) => {
    const updates = { status };
    
    // Update engineer location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        if (navigator.onLine) {
          try {
            await base44.functions.invoke('updateEngineerLocation', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              battery_level: 100
            });
          } catch (e) {
            console.error('Location update failed:', e);
          }
        }
      });
    }

    updateJobMutation.mutate({ jobId, updates });
    toast.success(`Job status updated to ${status.replace('_', ' ')}`);
  };

  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (navigator.onLine) {
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          setCompletionPhotos(prev => [...prev, file_url]);
        } catch (error) {
          console.error('Photo upload failed:', error);
          // Save offline
          const blob = await file.arrayBuffer();
          await savePhotoOffline(selectedJob.id, blob, { name: file.name });
          setCompletionPhotos(prev => [...prev, URL.createObjectURL(file)]);
          toast.info('Photo saved offline');
        }
      } else {
        // Save offline
        const blob = await file.arrayBuffer();
        await savePhotoOffline(selectedJob.id, blob, { name: file.name });
        setCompletionPhotos(prev => [...prev, URL.createObjectURL(file)]);
        toast.info('Photo saved offline - will upload when online');
      }
    }
  };

  const handleVoiceRecord = () => {
    if (!isRecording && 'webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setCompletionNotes(transcript);
      };

      recognition.start();
      setIsRecording(true);
      
      setTimeout(() => {
        recognition.stop();
        setIsRecording(false);
      }, 30000);
    }
  };

  const addPart = async () => {
    if (newPart.description) {
      const part = { ...newPart, job_id: selectedJob?.id };
      setPartsUsed([...partsUsed, part]);
      
      // Save offline
      await savePartsLog({
        job_id: selectedJob?.id,
        engineer_id: user?.id,
        org_id: user?.org_id,
        part_description: part.description,
        quantity: part.quantity,
        unit_cost: part.cost
      });
      
      setNewPart({ description: "", quantity: 1, cost: 0 });
    }
  };

  const completeJob = async () => {
    if (!selectedJob) return;

    const updates = {
      status: 'completed',
      completed_date: new Date().toISOString(),
      completion_notes: completionNotes,
      completion_photos: completionPhotos.filter(p => !p.startsWith('blob:')),
      parts_used: partsUsed
    };

    updateJobMutation.mutate({ 
      jobId: selectedJob.id, 
      updates 
    }, {
      onSuccess: () => {
        setShowCompleteModal(false);
        setSelectedJob(null);
        setCompletionNotes("");
        setCompletionPhotos([]);
        setPartsUsed([]);
        toast.success('Job completed!');
      }
    });
  };

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');

  const statusColors = {
    new: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    assigned: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    en_route: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
    on_site: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    in_progress: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    completed: 'bg-green-500/20 text-green-300 border-green-400/30',
  };

  const priorityColors = {
    emergency: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500'
  };

  return (
    <div className="min-h-screen bg-[#0D1117] pb-24">
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .thumb-target {
          min-height: 48px;
          min-width: 48px;
        }
        .safe-bottom {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-[#E1467C] text-white text-center py-2 text-sm font-medium">
          📡 Offline Mode - Changes will sync when connected
        </div>
      )}

      {/* Header */}
      <div className="glass-panel border-b border-[rgba(255,255,255,0.08)] p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
              Field App
            </h1>
            {user && <p className="text-sm text-[#CED4DA]">{user.full_name}</p>}
          </div>
          <SyncIndicator onSyncComplete={() => refetch()} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-4">
          <TabsList className="w-full glass-panel border-[rgba(255,255,255,0.08)]">
            <TabsTrigger 
              value="jobs" 
              className="flex-1 data-[state=active]:bg-[#E1467C] data-[state=active]:text-white"
            >
              <List className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Jobs
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              className="flex-1 data-[state=active]:bg-[#E1467C] data-[state=active]:text-white"
            >
              <MapIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Map
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="p-4 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel rounded-xl p-3 border border-[rgba(255,255,255,0.08)] text-center">
              <div className="text-2xl font-bold text-[#E1467C]">{activeJobs.length}</div>
              <div className="text-xs text-[#CED4DA]">Active</div>
            </div>
            <div className="glass-panel rounded-xl p-3 border border-[rgba(255,255,255,0.08)] text-center">
              <div className="text-2xl font-bold text-green-400">{completedJobs.length}</div>
              <div className="text-xs text-[#CED4DA]">Completed</div>
            </div>
            <div className="glass-panel rounded-xl p-3 border border-[rgba(255,255,255,0.08)] text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {activeJobs.filter(j => j.priority === 'high' || j.priority === 'emergency').length}
              </div>
              <div className="text-xs text-[#CED4DA]">Urgent</div>
            </div>
          </div>

          {/* Jobs List */}
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Today's Jobs</h2>
            <div className="space-y-3">
              {isLoading ? (
                <div className="glass-panel rounded-2xl p-8 border border-[rgba(255,255,255,0.08)] text-center">
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-[#CED4DA] text-sm">Loading jobs...</p>
                </div>
              ) : activeJobs.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 border border-[rgba(255,255,255,0.08)] text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-400" strokeWidth={1.5} />
                  <p className="text-white font-semibold">All caught up!</p>
                  <p className="text-[#CED4DA] text-sm">No active jobs</p>
                </div>
              ) : (
                activeJobs.map((job) => (
                  <div
                    key={job.id}
                    className="glass-panel rounded-2xl p-4 border border-[rgba(255,255,255,0.08)]"
                  >
                    {/* Priority indicator */}
                    {job.priority && (
                      <div className={`w-full h-1 rounded-full mb-3 ${priorityColors[job.priority] || 'bg-gray-500'}`} />
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{job.title}</h3>
                        <p className="text-[#CED4DA] text-sm line-clamp-2">{job.description}</p>
                      </div>
                      <Badge className={`${statusColors[job.status] || statusColors.assigned} border ml-3`}>
                        {job.status?.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Job Meta */}
                    <div className="flex flex-wrap gap-2 mb-3 text-xs text-[#CED4DA]">
                      {job.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" strokeWidth={1.5} />
                          {format(new Date(job.scheduled_date), 'h:mm a')}
                        </span>
                      )}
                      {job.site_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" strokeWidth={1.5} />
                          {job.site_name}
                        </span>
                      )}
                    </div>

                    {/* Time Tracker (for on_site jobs) */}
                    {job.status === 'on_site' && user && (
                      <div className="mb-3">
                        <TimeTracker 
                          job={job} 
                          user={user} 
                          onTimeSaved={() => toast.success('Time logged')} 
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {(job.status === 'assigned' || job.status === 'new') && (
                        <>
                          <Button
                            onClick={() => updateJobStatus(job.id, 'en_route')}
                            className="thumb-target w-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 hover:bg-yellow-500/30"
                          >
                            <Navigation className="w-4 h-4 mr-2" strokeWidth={1.5} />
                            Start Travel
                          </Button>
                          <Button
                            onClick={() => updateJobStatus(job.id, 'on_site')}
                            className="thumb-target w-full bg-orange-500/20 text-orange-300 border border-orange-400/30 hover:bg-orange-500/30"
                          >
                            <MapPin className="w-4 h-4 mr-2" strokeWidth={1.5} />
                            On Site
                          </Button>
                        </>
                      )}

                      {job.status === 'en_route' && (
                        <Button
                          onClick={() => updateJobStatus(job.id, 'on_site')}
                          className="thumb-target w-full col-span-2 bg-orange-500/20 text-orange-300 border border-orange-400/30 hover:bg-orange-500/30"
                        >
                          <MapPin className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Arrived On Site
                        </Button>
                      )}

                      {job.status === 'on_site' && (
                        <Button
                          onClick={() => {
                            setSelectedJob(job);
                            setShowCompleteModal(true);
                          }}
                          className="thumb-target w-full col-span-2 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Complete Job
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3">Completed Today</h2>
              <div className="space-y-2">
                {completedJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="glass-panel rounded-xl p-3 border border-[rgba(255,255,255,0.08)] flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{job.title}</p>
                      <p className="text-[#CED4DA] text-xs">
                        {job.completed_date && format(new Date(job.completed_date), 'h:mm a')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#CED4DA]" strokeWidth={1.5} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map" className="h-[calc(100vh-180px)]">
          <Suspense fallback={
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          }>
            <MobileMap 
              jobs={activeJobs} 
              currentJob={activeJobs.find(j => j.status === 'en_route' || j.status === 'on_site')}
              onNavigate={(job) => toast.info(`Navigating to ${job.title}`)}
            />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Complete Job Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Complete Job</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Notes with voice */}
            <div>
              <Label className="text-white mb-2 block">Completion Notes</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleVoiceRecord}
                  className={`thumb-target ${isRecording ? 'bg-[#E1467C]' : 'glass-panel border-[rgba(255,255,255,0.08)]'}`}
                >
                  {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <span className="text-sm text-[#CED4DA] flex items-center">
                  {isRecording ? 'Recording...' : 'Tap to dictate'}
                </span>
              </div>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Describe work completed..."
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white h-24"
              />
            </div>

            {/* Photos */}
            <div>
              <Label className="text-white mb-2 block">Photos</Label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
                id="photo-upload-mobile"
              />
              <label htmlFor="photo-upload-mobile">
                <Button type="button" asChild className="thumb-target w-full glass-panel border-[rgba(255,255,255,0.08)]">
                  <div>
                    <Camera className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Take Photos ({completionPhotos.length})
                  </div>
                </Button>
              </label>
              {completionPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {completionPhotos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                      <button
                        onClick={() => setCompletionPhotos(completionPhotos.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Parts Used */}
            <div>
              <Label className="text-white mb-2 block flex items-center gap-2">
                <Package className="w-4 h-4" strokeWidth={1.5} />
                Parts Used
              </Label>
              {partsUsed.length > 0 && (
                <div className="space-y-2 mb-3">
                  {partsUsed.map((part, idx) => (
                    <div key={idx} className="glass-panel p-2 rounded-lg flex justify-between items-center">
                      <span className="text-white text-sm">{part.description} (x{part.quantity})</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPartsUsed(partsUsed.filter((_, i) => i !== idx))}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Part name"
                  value={newPart.description}
                  onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white flex-1"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={newPart.quantity}
                  onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 1 })}
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white w-16"
                />
                <Button
                  type="button"
                  onClick={addPart}
                  className="thumb-target glass-panel border-[rgba(255,255,255,0.08)]"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>

            {/* Complete Button */}
            <Button
              onClick={completeJob}
              disabled={updateJobMutation.isPending}
              className="thumb-target w-full bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              {updateJobMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
              )}
              Complete Job
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  );
}