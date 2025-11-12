
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Clock,
  FileText,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  X,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import VoiceNoteUpload from "../components/jobs/VoiceNoteUpload";

export default function JobDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const jobId = searchParams.get('id');
  const fromPage = searchParams.get('from'); // 'director' or undefined

  const [completionNotes, setCompletionNotes] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0];
    },
    enabled: !!jobId,
  });

  const { data: site } = useQuery({
    queryKey: ['site', job?.site_id],
    queryFn: async () => {
      const sites = await base44.entities.Site.filter({ id: job.site_id });
      return sites[0];
    },
    enabled: !!job?.site_id,
  });

  const { data: asset } = useQuery({
    queryKey: ['asset', job?.asset_id],
    queryFn: async () => {
      const assets = await base44.entities.Asset.filter({ id: job.asset_id });
      return assets[0];
    },
    enabled: !!job?.asset_id,
  });

  const { data: engineer } = useQuery({
    queryKey: ['engineer', job?.assigned_engineer_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: job.assigned_engineer_id });
      return users[0];
    },
    enabled: !!job?.assigned_engineer_id,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes', jobId],
    queryFn: async () => {
      const allQuotes = await base44.entities.Quote.list();
      return allQuotes.filter(q => q.job_id === jobId || job?.quote_id === q.id);
    },
    enabled: !!jobId && !!job,
  });

  const { data: voiceNotes = [] } = useQuery({
    queryKey: ['voice-notes', jobId],
    queryFn: async () => {
      const allNotes = await base44.entities.VoiceNote.list();
      return allNotes.filter(vn => vn.job_id === jobId);
    },
    enabled: !!jobId,
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Job.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['job', jobId]);
      queryClient.invalidateQueries(['jobs']);
    },
  });

  const handleStatusChange = async (newStatus) => {
    const updateData = { status: newStatus };
    
    if (newStatus === 'completed') {
      updateData.completed_date = new Date().toISOString();
      updateData.completion_notes = completionNotes;
    }
    
    updateJobMutation.mutate({ id: jobId, data: updateData });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const photoUrls = results.map(r => r.file_url);
      
      const currentPhotos = job.completion_photos || [];
      updateJobMutation.mutate({
        id: jobId,
        data: { completion_photos: [...currentPhotos, ...photoUrls] }
      });
    } catch (error) {
      console.error("Error uploading photos:", error);
      alert("Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
          <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#CED4DA]">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 lg:p-8">
        <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
          <p className="text-white">Job not found</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    new: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    assigned: 'bg-purple-500/20 text-purple-200 border-purple-300/30',
    on_route: 'bg-yellow-500/20 text-yellow-200 border-yellow-300/30',
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
        
        {!fromPage && (
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Jobs"))}
            className="mb-4 text-[#CED4DA] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Back to Jobs
          </Button>
        )}

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{job.title}</h1>
              {job.job_number && (
                <span className="text-lg text-[#CED4DA] opacity-50">#{job.job_number}</span>
              )}
            </div>
            {job.description && (
              <p className="text-[#CED4DA] mb-4">{job.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-6">
            <Badge className={`${priorityColors[job.priority]} border`}>
              {job.priority} priority
            </Badge>
            <Badge className={`${statusColors[job.status]} border`}>
              {job.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <h2 className="text-xl font-bold text-white mb-4">Job Details</h2>
            <div className="space-y-4">
              {site && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#CED4DA] mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-[#CED4DA] opacity-70">Site</p>
                    <p className="text-white">{site.name}</p>
                    {site.address && (
                      <p className="text-sm text-[#CED4DA]">{site.address}</p>
                    )}
                  </div>
                </div>
              )}

              {engineer && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#CED4DA] mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-[#CED4DA] opacity-70">Assigned Engineer</p>
                    <p className="text-white">{engineer.full_name}</p>
                  </div>
                </div>
              )}

              {job.scheduled_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#CED4DA] mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-[#CED4DA] opacity-70">Scheduled Date</p>
                    <p className="text-white">
                      {format(new Date(job.scheduled_date), 'MMMM d, yyyy')}
                      {job.scheduled_time && ` at ${job.scheduled_time}`}
                    </p>
                  </div>
                </div>
              )}

              {job.po_number && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#CED4DA] mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-[#CED4DA] opacity-70">PO Number</p>
                    <p className="text-white">{job.po_number}</p>
                  </div>
                </div>
              )}

              {asset && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#CED4DA] mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-[#CED4DA] opacity-70">Asset</p>
                    <p className="text-white">{asset.name}</p>
                    <p className="text-sm text-[#CED4DA]">{asset.asset_type}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Voice Note to Quote Section */}
          {job.status !== 'cancelled' && (
            <VoiceNoteUpload 
              jobId={jobId} 
              onSuccess={(data) => {
                console.log('Voice note processed:', data);
                if (data.quote_id) {
                  queryClient.invalidateQueries(['quotes', jobId]);
                  queryClient.invalidateQueries(['job', jobId]);
                }
                queryClient.invalidateQueries(['voice-notes', jobId]);
              }}
            />
          )}

          {/* Generated Quotes */}
          {quotes.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
                <h2 className="text-xl font-bold text-white">Generated Quotes</h2>
              </div>
              <div className="space-y-3">
                {quotes.map(quote => (
                  <div
                    key={quote.id}
                    className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all cursor-pointer"
                    onClick={() => navigate(`${createPageUrl("Quotes")}?id=${quote.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{quote.title}</h3>
                        {quote.description?.includes('🎙️ AI-Generated') && (
                          <Badge className="bg-[#E1467C]/20 text-[#E1467C] border-[#E1467C]/30 border">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      <span className="text-white font-bold">
                        £{quote.total?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#CED4DA]">
                      <span>Status: {quote.status}</span>
                      {quote.created_date && (
                        <span>Created: {format(new Date(quote.created_date), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                    {quote.notes && quote.notes.includes('⚠️ Unmatched items') && (
                      <p className="text-xs text-yellow-400 mt-2">
                        ⚠️ Low confidence. Human confirmation required.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion Section */}
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <h2 className="text-xl font-bold text-white mb-4">Complete Job</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white mb-2 block">Completion Notes</label>
                  <Textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA] min-h-[120px]"
                    placeholder="Describe work completed, parts used, etc..."
                  />
                </div>

                <div>
                  <label className="text-sm text-white mb-2 block">Upload Photos</label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {job.completion_photos?.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-[rgba(255,255,255,0.08)]"
                        />
                      </div>
                    ))}
                  </div>
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <div className="glass-panel border-2 border-dashed border-[rgba(255,255,255,0.3)] rounded-xl p-6 text-center cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                      {uploadingPhotos ? (
                        <div className="text-[#CED4DA]">Uploading...</div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-[#CED4DA]" strokeWidth={1.5} />
                          <p className="text-sm text-[#CED4DA]">Click to upload photos</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                <Button
                  onClick={() => handleStatusChange('completed')}
                  disabled={updateJobMutation.isPending}
                  className="w-full bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Mark as Completed
                </Button>
              </div>
            </div>
          )}

          {/* Completion Info (if completed) */}
          {job.status === 'completed' && (
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <h2 className="text-xl font-bold text-white mb-4">Completion Details</h2>
              
              {job.completion_notes && (
                <div className="mb-4">
                  <p className="text-sm text-[#CED4DA] opacity-70 mb-2">Notes</p>
                  <p className="text-white">{job.completion_notes}</p>
                </div>
              )}

              {job.completed_date && (
                <div className="mb-4">
                  <p className="text-sm text-[#CED4DA] opacity-70 mb-2">Completed Date</p>
                  <p className="text-white">
                    {format(new Date(job.completed_date), 'MMMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}

              {job.completion_photos && job.completion_photos.length > 0 && (
                <div>
                  <p className="text-sm text-[#CED4DA] opacity-70 mb-2">Photos</p>
                  <div className="grid grid-cols-2 gap-3">
                    {job.completion_photos.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Completion photo ${idx + 1}`}
                        className="w-full h-40 object-cover rounded-xl border border-[rgba(255,255,255,0.08)]"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <h3 className="font-semibold text-white mb-4">Update Status</h3>
              <Select value={job.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="on_route">On Route</SelectItem>
                  <SelectItem value="on_site">On Site</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Job Info */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <h3 className="font-semibold text-white mb-4">Job Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[#CED4DA] opacity-70">Type</p>
                <p className="text-white capitalize">{job.job_type}</p>
              </div>
              <div>
                <p className="text-[#CED4DA] opacity-70">Created</p>
                <p className="text-white">
                  {format(new Date(job.created_date), 'MMM d, yyyy')}
                </p>
              </div>
              {job.sla_due_date && (
                <div>
                  <p className="text-[#CED4DA] opacity-70">SLA Due</p>
                  <p className="text-white">
                    {format(new Date(job.sla_due_date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
