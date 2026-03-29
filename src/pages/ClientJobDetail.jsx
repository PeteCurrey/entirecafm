import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  MapPin,
  User,
  Clock,
  Calendar,
  CheckCircle2,
  Navigation,
  Phone,
  MessageCircle,
  Upload,
  FileText,
  Download,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function ClientJobDetailPage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEngineerMap, setShowEngineerMap] = useState(false);

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => base44.entities.Job.filter({ id: jobId }),
    select: (data) => data[0],
    enabled: !!jobId,
    refetchInterval: 10000
  });

  const { data: site } = useQuery({
    queryKey: ['site', job?.site_id],
    queryFn: () => base44.entities.Site.filter({ id: job.site_id }),
    select: (data) => data[0],
    enabled: !!job?.site_id,
  });

  const { data: engineer } = useQuery({
    queryKey: ['engineer', job?.assigned_engineer_id],
    queryFn: () => base44.entities.User.filter({ id: job.assigned_engineer_id }),
    select: (data) => data[0],
    enabled: !!job?.assigned_engineer_id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['job-documents', jobId],
    queryFn: () => base44.entities.ClientDocument.filter({ job_id: jobId }),
    enabled: !!jobId
  });

  const { data: engineerLocation } = useQuery({
    queryKey: ['engineer-location', engineer?.id],
    queryFn: async () => {
      const locations = await base44.entities.EngineerLocation.filter(
        { engineer_id: engineer.id },
        '-timestamp',
        1
      );
      return locations[0];
    },
    enabled: !!engineer?.id && ['on_route', 'en_route', 'on_site'].includes(job?.status),
    refetchInterval: 10000 // Update every 10s
  });

  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (fileData) => {
      const uploadResult = await base44.integrations.Core.UploadFile({ file: fileData });
      return base44.entities.ClientDocument.create({
        client_id: job.client_id,
        job_id: jobId,
        name: fileData.name,
        file_url: uploadResult.file_url,
        file_type: fileData.type,
        file_size: fileData.size,
        category: 'other',
        uploaded_by: job.client_id,
        uploaded_by_name: 'Client',
        is_visible_to_client: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-documents']);
      setShowUploadDialog(false);
      setUploadFile(null);
      toast.success('Document uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload document');
    }
  });

  const handleUpload = () => {
    if (!uploadFile) return;
    setUploading(true);
    uploadMutation.mutate(uploadFile);
    setUploading(false);
  };

  const statusColors = {
    raised: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    en_route: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    on_site: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  };

  const getStatusMessage = (status) => {
    const messages = {
      raised: 'Your job request has been received and is being reviewed',
      assigned: 'An engineer has been assigned to your job',
      en_route: 'Engineer is traveling to your location',
      on_site: 'Engineer is currently on site working on your job',
      completed: 'Job has been completed successfully',
    };
    return messages[status] || '';
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-[#0D1117] p-6 flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-12 border border-divider text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body">Loading job details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <Link to={createPageUrl("ClientJobs")}>
            <button className="flex items-center gap-2 text-body hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              Back to Jobs
            </button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{job.title}</h1>
              {job.job_number && (
                <p className="text-body">Job #{job.job_number}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${statusColors[job.status]} border text-sm px-4 py-2`}>
                {job.status.replace('_', ' ')}
              </Badge>
              <Button 
                onClick={() => setShowUploadDialog(true)}
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Doc
              </Button>
              {engineer && ['on_route', 'en_route', 'on_site'].includes(job.status) && (
                <Button
                  onClick={() => setShowEngineerMap(true)}
                  variant="outline"
                  className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Track Engineer
                </Button>
              )}
              <Link to={createPageUrl("ClientMessages")}>
                <Button className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <h2 className="text-lg font-bold text-white mb-4">Status Update</h2>
          <p className="text-body mb-4">{getStatusMessage(job.status)}</p>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {['raised', 'assigned', 'en_route', 'on_site', 'completed'].map((status, idx) => {
              const isActive = job.status === status;
              const isPast = ['raised', 'assigned', 'en_route', 'on_site', 'completed'].indexOf(job.status) > idx;
              
              return (
                <React.Fragment key={status}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive || isPast ? 'bg-[#E1467C]' : 'glass-panel'
                    }`}>
                      {isPast ? (
                        <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={1.5} />
                      ) : (
                        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-white' : 'bg-white/30'}`} />
                      )}
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? 'text-white' : 'text-body'}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  {idx < 4 && (
                    <div className={`flex-1 h-1 ${isPast ? 'bg-[#E1467C]' : 'bg-white/10'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Job Details */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <h2 className="text-lg font-bold text-white mb-4">Job Details</h2>
          {job.description && (
            <p className="text-body mb-6">{job.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {site && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-body flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-body mb-1">Site Location</p>
                  <p className="text-white">{site.name}</p>
                  {site.address && <p className="text-sm text-body">{site.address}</p>}
                </div>
              </div>
            )}

            {job.scheduled_date && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-body flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-body mb-1">Scheduled Date</p>
                  <p className="text-white">
                    {format(new Date(job.scheduled_date), 'EEEE, MMMM d, yyyy')}
                  </p>
                  {job.scheduled_time && (
                    <p className="text-sm text-body">{job.scheduled_time}</p>
                  )}
                </div>
              </div>
            )}

            {engineer && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-body flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-body mb-1">Assigned Engineer</p>
                  <p className="text-white">{engineer.full_name}</p>
                  {engineer.phone && (
                    <a href={`tel:${engineer.phone}`} className="text-sm text-[#E1467C] hover:underline flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" strokeWidth={1.5} />
                      {engineer.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {job.job_type && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-body flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-body mb-1">Job Type</p>
                  <p className="text-white capitalize">{job.job_type}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Job Documents */}
        {documents.length > 0 && (
          <div className="glass-panel rounded-2xl p-6 border border-divider">
            <h2 className="text-lg font-bold text-white mb-4">Attached Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map(doc => (
                <div key={doc.id} className="glass-panel rounded-lg p-4 border border-divider flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#E1467C]" />
                    <div>
                      <p className="text-white text-sm font-semibold">{doc.name}</p>
                      <p className="text-xs text-body">{(doc.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-[#CED4DA]">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Details */}
        {job.status === 'completed' && (
          <div className="glass-panel rounded-2xl p-6 border border-divider">
            <h2 className="text-lg font-bold text-white mb-4">Completion Details</h2>
            {job.completion_notes && (
              <div className="mb-4">
                <p className="text-xs text-body mb-2">Engineer Notes</p>
                <p className="text-white">{job.completion_notes}</p>
              </div>
            )}
            {job.completed_date && (
              <p className="text-sm text-body">
                Completed on {format(new Date(job.completed_date), 'MMMM d, yyyy \'at\' h:mm a')}
              </p>
            )}
            {job.completion_photos && job.completion_photos.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-body mb-3">Completion Photos</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {job.completion_photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Completion ${idx + 1}`}
                      className="rounded-lg w-full h-32 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full text-white"
            />
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowUploadDialog(false)}
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Engineer Tracking Dialog */}
      <Dialog open={showEngineerMap} onOpenChange={setShowEngineerMap}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Live Engineer Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {engineerLocation ? (
              <div>
                <div className="glass-panel rounded-lg p-4 border border-divider mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#CED4DA]">Engineer</span>
                    <span className="text-white font-semibold">{engineer?.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#CED4DA]">Last Updated</span>
                    <span className="text-white text-sm">
                      {new Date(engineerLocation.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="w-full h-64 bg-[#0D1117] rounded-lg border border-divider flex items-center justify-center">
                  <p className="text-[#CED4DA]">Map view: Lat {engineerLocation.lat.toFixed(4)}, Lng {engineerLocation.lng.toFixed(4)}</p>
                </div>
                <p className="text-xs text-[#CED4DA] text-center mt-2">
                  Real-time tracking active • Updates every 10 seconds
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Navigation className="w-12 h-12 mx-auto mb-4 text-[#CED4DA] opacity-30" />
                <p className="text-[#CED4DA]">Engineer location unavailable</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}