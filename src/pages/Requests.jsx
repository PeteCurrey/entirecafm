import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Inbox,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Calendar,
  MapPin,
  User
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function RequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => base44.entities.Request.list('-created_date'),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const convertToJobMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      
      // Create job from request
      const job = await base44.entities.Job.create({
        org_id: request.org_id,
        title: request.title,
        description: request.description,
        job_type: 'reactive',
        priority: request.priority,
        status: 'new',
        client_id: request.client_id,
        site_id: request.site_id,
        building_id: request.building_id,
        request_id: request.id,
        scheduled_date: request.preferred_date,
        notes: [{
          text: `Converted from Request #${request.request_number || request.id}`,
          created_by: 'system',
          created_at: new Date().toISOString()
        }]
      });

      // Update request status
      await base44.entities.Request.update(requestId, {
        status: 'converted',
        converted_job_id: job.id,
        converted_date: new Date().toISOString()
      });

      return job;
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries(['requests']);
      queryClient.invalidateQueries(['jobs']);
      setShowConvertDialog(false);
      setSelectedRequest(null);
      navigate(`${createPageUrl("JobDetail")}?id=${job.id}`);
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => {
      await base44.entities.Request.update(requestId, {
        status: 'rejected',
        rejection_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
    },
  });

  const filteredRequests = requests.filter(req => {
    const matchesSearch = !searchTerm || 
      req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.request_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-200 border-yellow-300/30',
    triaged: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    converted: 'bg-green-500/20 text-green-200 border-green-300/30',
    rejected: 'bg-red-500/20 text-red-200 border-red-300/30',
  };

  const priorityColors = {
    low: 'bg-gray-500/20 text-gray-200',
    medium: 'bg-blue-500/20 text-blue-200',
    high: 'bg-orange-500/20 text-orange-200',
    critical: 'bg-red-500/20 text-red-200',
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Requests Inbox</h1>
            <p className="text-[#CED4DA]">Triage and convert client-raised job requests</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CED4DA] opacity-50" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="triaged">Triaged</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Pending Triage</div>
          <div className="text-3xl font-semibold text-white">
            {requests.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Triaged</div>
          <div className="text-3xl font-semibold text-white">
            {requests.filter(r => r.status === 'triaged').length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Converted</div>
          <div className="text-3xl font-semibold text-white">
            {requests.filter(r => r.status === 'converted').length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Rejected</div>
          <div className="text-3xl font-semibold text-white">
            {requests.filter(r => r.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#CED4DA]">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <Inbox className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No requests found</h3>
            <p className="text-[#CED4DA]">Requests from clients will appear here</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const site = sites.find(s => s.id === request.site_id);
            const client = clients.find(c => c.id === request.client_id);
            
            return (
              <div
                key={request.id}
                className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{request.title}</h3>
                      {request.request_number && (
                        <span className="text-sm text-[#CED4DA] opacity-50">#{request.request_number}</span>
                      )}
                    </div>
                    {request.description && (
                      <p className="text-[#CED4DA] mb-3 line-clamp-2">{request.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge className={`${priorityColors[request.priority]}`}>
                      {request.priority}
                    </Badge>
                    <Badge className={`${statusColors[request.status]} border`}>
                      {request.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-[#CED4DA] mb-4">
                  {client && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" strokeWidth={1.5} />
                      <span>{client.name}</span>
                    </div>
                  )}
                  {site && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" strokeWidth={1.5} />
                      <span>{site.name}</span>
                    </div>
                  )}
                  {request.preferred_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" strokeWidth={1.5} />
                      <span>Preferred: {format(new Date(request.preferred_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  <div className="ml-auto text-xs opacity-50">
                    {format(new Date(request.created_date), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowConvertDialog(true);
                      }}
                      className="flex-1 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Convert to Job
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectDialog(true);
                      }}
                      variant="outline"
                      className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      <XCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Reject
                    </Button>
                  </div>
                )}

                {request.status === 'converted' && request.converted_job_id && (
                  <div className="pt-4 border-t border-[rgba(255,255,255,0.08)]">
                    <Button
                      onClick={() => navigate(`${createPageUrl("JobDetail")}?id=${request.converted_job_id}`)}
                      variant="outline"
                      className="w-full border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      View Job
                      <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
                    </Button>
                  </div>
                )}

                {request.status === 'rejected' && request.rejection_reason && (
                  <div className="pt-4 border-t border-[rgba(255,255,255,0.08)]">
                    <p className="text-sm text-red-400">
                      <AlertCircle className="w-4 h-4 inline mr-2" strokeWidth={1.5} />
                      {request.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Convert to Job Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Convert Request to Job</DialogTitle>
            <DialogDescription className="text-[#CED4DA]">
              This will create a new job with the request details pre-filled.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[#CED4DA] mb-4">
              Job will be created with status: <strong className="text-white">NEW</strong>
            </p>
            {selectedRequest && (
              <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                <h4 className="font-semibold text-white mb-2">{selectedRequest.title}</h4>
                <p className="text-sm text-[#CED4DA]">{selectedRequest.description}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
              className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && convertToJobMutation.mutate(selectedRequest.id)}
              disabled={convertToJobMutation.isPending}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              {convertToJobMutation.isPending ? 'Converting...' : 'Create Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Request</DialogTitle>
            <DialogDescription className="text-[#CED4DA]">
              Provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-white mb-2 block">Rejection Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Out of service area, duplicate request, etc."
              className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && rejectRequestMutation.mutate({
                requestId: selectedRequest.id,
                reason: rejectionReason
              })}
              disabled={!rejectionReason || rejectRequestMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {rejectRequestMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}