import React, { useState, useEffect } from "react";
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
  Upload,
  Clock,
  Play,
  Square
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
import { format } from "date-fns";
import { toast } from "sonner";

export default function EngineerApp() {
  const [user, setUser] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [partsUsed, setPartsUsed] = useState([]);
  const [newPart, setNewPart] = useState({ description: "", quantity: 1, cost: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const [signature, setSignature] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    // Request location permissions
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(() => {
        console.log('Location permission granted');
      });
    }

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['engineer-jobs'],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Job.filter({ assigned_engineer_id: user.id }, '-scheduled_date');
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ jobId, updates }) => {
      return base44.entities.Job.update(jobId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['engineer-jobs']);
    },
  });

  const updateJobStatus = async (jobId, status) => {
    const updates = { status };
    
    // Update engineer location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        base44.auth.updateMe({
          engineer_details: {
            ...user.engineer_details,
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude,
            last_location_update: new Date().toISOString()
          }
        });
      });
    }

    updateJobMutation.mutate({ jobId, updates });
    toast.success(`Job status updated to ${status.replace('_', ' ')}`);
  };

  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files);
    const uploadPromises = files.map(async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    });
    const urls = await Promise.all(uploadPromises);
    setCompletionPhotos([...completionPhotos, ...urls]);
  };

  const handleVoiceRecord = () => {
    if (!isRecording) {
      if ('webkitSpeechRecognition' in window) {
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
        }, 30000); // Stop after 30 seconds
      } else {
        toast.error('Voice recording not supported on this device');
      }
    }
  };

  const addPart = () => {
    if (newPart.description) {
      setPartsUsed([...partsUsed, { ...newPart }]);
      setNewPart({ description: "", quantity: 1, cost: 0 });
    }
  };

  const completeJob = async () => {
    if (!selectedJob) return;

    const updates = {
      status: 'completed',
      completed_date: new Date().toISOString(),
      completion_notes: completionNotes,
      completion_photos: completionPhotos,
      parts_used: partsUsed,
      customer_signature_url: signature
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
        setSignature(null);
        toast.success('Job completed successfully');
      }
    });
  };

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');

  const statusColors = {
    assigned: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    en_route: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
    on_site: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    completed: 'bg-green-500/20 text-green-300 border-green-400/30',
  };

  return (
    <div className="min-h-screen bg-[#0D1117] pb-20">
      <style>{`
        /* PWA Optimizations */
        * {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        .thumb-target {
          min-height: 48px;
          min-width: 48px;
        }

        /* Offline indicator */
        .offline-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #E1467C;
          color: white;
          padding: 8px;
          text-align: center;
          font-size: 12px;
          z-index: 9999;
        }
      `}</style>

      {!navigator.onLine && (
        <div className="offline-indicator">
          📡 Offline Mode - Changes will sync when connection is restored
        </div>
      )}

      {/* Header */}
      <div className="glass-panel border-b border-divider p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">My Jobs</h1>
            {user && <p className="text-sm text-body">{user.full_name}</p>}
          </div>
          <div className="w-10 h-10 rounded-full accent-magenta flex items-center justify-center text-white font-bold">
            {user?.full_name?.[0] || 'E'}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Today's Jobs */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Today's Jobs</h2>
          <div className="space-y-3">
            {isLoading ? (
              <div className="glass-panel rounded-2xl p-8 border border-divider text-center">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                <p className="text-body text-sm">Loading jobs...</p>
              </div>
            ) : activeJobs.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 border border-divider text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-400" strokeWidth={1.5} />
                <p className="text-white font-semibold">All caught up!</p>
                <p className="text-body text-sm">No active jobs</p>
              </div>
            ) : (
              activeJobs.map((job) => (
                <div
                  key={job.id}
                  className="glass-panel rounded-2xl p-4 border border-divider"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{job.title}</h3>
                      <p className="text-body text-sm line-clamp-2">{job.description}</p>
                    </div>
                    <Badge className={`${statusColors[job.status]} border ml-3`}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {job.scheduled_date && (
                    <p className="text-body text-sm mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" strokeWidth={1.5} />
                      {format(new Date(job.scheduled_date), 'h:mm a')}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {job.status === 'assigned' && (
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
                          Arrived On Site
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
                        className="thumb-target w-full col-span-2 accent-magenta"
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
            <div className="space-y-3">
              {completedJobs.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="glass-panel rounded-2xl p-4 border border-divider opacity-75"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className="text-white font-semibold">{job.title}</p>
                      {job.completed_date && (
                        <p className="text-body text-sm">
                          {format(new Date(job.completed_date), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complete Job Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="glass-panel-strong border-divider text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Complete Job</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Notes */}
            <div>
              <Label className="text-white mb-2">Completion Notes</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleVoiceRecord}
                  className={`thumb-target ${isRecording ? 'accent-magenta' : 'glass-panel border-divider'}`}
                >
                  {isRecording ? <Square className="w-4 h-4" strokeWidth={1.5} /> : <Mic className="w-4 h-4" strokeWidth={1.5} />}
                </Button>
                <span className="text-sm text-body flex items-center">
                  {isRecording ? 'Recording...' : 'Tap to use voice-to-text'}
                </span>
              </div>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Describe work completed..."
                className="glass-panel border-divider text-white h-24"
              />
            </div>

            {/* Photos */}
            <div>
              <Label className="text-white mb-2">Photos</Label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload">
                <Button type="button" asChild className="thumb-target w-full glass-panel border-divider">
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
                      <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-20 object-cover rounded" />
                      <button
                        onClick={() => setCompletionPhotos(completionPhotos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-white" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Parts Used */}
            <div>
              <Label className="text-white mb-2">Parts Used</Label>
              <div className="space-y-2 mb-2">
                {partsUsed.map((part, idx) => (
                  <div key={idx} className="glass-panel p-2 rounded flex justify-between items-center">
                    <span className="text-white text-sm">{part.description} (x{part.quantity})</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPartsUsed(partsUsed.filter((_, i) => i !== idx))}
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Part name"
                  value={newPart.description}
                  onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                  className="glass-panel border-divider text-white col-span-2"
                />
                <Button
                  type="button"
                  onClick={addPart}
                  className="thumb-target glass-panel border-divider"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>

            {/* Complete Button */}
            <Button
              onClick={completeJob}
              disabled={updateJobMutation.isPending}
              className="thumb-target w-full accent-magenta"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Complete Job
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}