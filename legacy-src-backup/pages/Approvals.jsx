import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckSquare,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  DollarSign,
  Wrench,
  CreditCard,
  AlertCircle
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

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => base44.entities.Approval.list('-created_date'),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
  });

  const approveMutation = useMutation({
    mutationFn: async (approvalId) => {
      const approval = approvals.find(a => a.id === approvalId);
      const user = await base44.auth.me();
      
      // Update approval
      await base44.entities.Approval.update(approvalId, {
        status: 'approved',
        approved_by: user.id,
        approved_date: new Date().toISOString()
      });

      // Update linked entity based on type
      if (approval.approval_type === 'quote' && approval.linked_entity_id) {
        await base44.entities.Quote.update(approval.linked_entity_id, {
          status: 'ready_to_schedule',
          internal_approved_by: user.id,
          internal_approved_date: new Date().toISOString()
        });
      }
      
      if (approval.approval_type === 'job_completion' && approval.linked_entity_id) {
        await base44.entities.Job.update(approval.linked_entity_id, {
          approved_by: user.id,
          approved_date: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['approvals']);
      queryClient.invalidateQueries(['quotes']);
      queryClient.invalidateQueries(['jobs']);
      setShowApproveDialog(false);
      setSelectedApproval(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ approvalId, reason }) => {
      await base44.entities.Approval.update(approvalId, {
        status: 'rejected',
        rejection_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['approvals']);
      setShowRejectDialog(false);
      setSelectedApproval(null);
      setRejectionReason("");
    },
  });

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = !searchTerm || 
      approval.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || approval.approval_type === typeFilter;
    const isPending = approval.status === 'pending';
    
    return matchesSearch && matchesType && isPending;
  });

  const typeIcons = {
    quote: FileText,
    expense: DollarSign,
    job_completion: Wrench,
    purchase_order: CreditCard,
    contractor_invoice: FileText,
  };

  const typeColors = {
    quote: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    expense: 'bg-green-500/20 text-green-200 border-green-300/30',
    job_completion: 'bg-purple-500/20 text-purple-200 border-purple-300/30',
    purchase_order: 'bg-orange-500/20 text-orange-200 border-orange-300/30',
    contractor_invoice: 'bg-cyan-500/20 text-cyan-200 border-cyan-300/30',
  };

  const priorityColors = {
    low: 'bg-gray-500/20 text-gray-200',
    medium: 'bg-blue-500/20 text-blue-200',
    high: 'bg-orange-500/20 text-orange-200',
    urgent: 'bg-red-500/20 text-red-200',
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const approvedToday = approvals.filter(a => 
    a.status === 'approved' && 
    a.approved_date && 
    new Date(a.approved_date).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Approvals Hub</h1>
            <p className="text-[#CED4DA]">Review and approve quotes, expenses, and job completions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CED4DA] opacity-50" />
              <Input
                placeholder="Search approvals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="quote">Quotes</SelectItem>
              <SelectItem value="job_completion">Job Completions</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="purchase_order">Purchase Orders</SelectItem>
              <SelectItem value="contractor_invoice">Contractor Invoices</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Pending Approval</div>
          <div className="text-3xl font-semibold text-white">{pendingCount}</div>
          {pendingCount > 0 && (
            <div className="mt-2 h-0.5 w-8 bg-[#E1467C]/90 rounded-full" />
          )}
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Approved Today</div>
          <div className="text-3xl font-semibold text-white">{approvedToday}</div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Total Value Pending</div>
          <div className="text-3xl font-semibold text-white">
            £{approvals
              .filter(a => a.status === 'pending' && a.amount)
              .reduce((sum, a) => sum + (a.amount || 0), 0)
              .toLocaleString()}
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#CED4DA]">Loading approvals...</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <CheckSquare className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
            <p className="text-[#CED4DA]">No pending approvals at the moment</p>
          </div>
        ) : (
          filteredApprovals.map((approval) => {
            const TypeIcon = typeIcons[approval.approval_type] || FileText;
            
            return (
              <div
                key={approval.id}
                className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-lg glass-panel border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                      <TypeIcon className="w-5 h-5 text-[#CED4DA]" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{approval.title}</h3>
                      </div>
                      {approval.notes && (
                        <p className="text-[#CED4DA] mb-3">{approval.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-[#CED4DA]">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          <span>Requested {format(new Date(approval.created_date), 'MMM d, yyyy')}</span>
                        </div>
                        {approval.amount && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" strokeWidth={1.5} />
                            <span>£{approval.amount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge className={`${priorityColors[approval.priority]}`}>
                      {approval.priority}
                    </Badge>
                    <Badge className={`${typeColors[approval.approval_type]} border`}>
                      {approval.approval_type?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                  <Button
                    onClick={() => {
                      setSelectedApproval(approval);
                      setShowApproveDialog(true);
                    }}
                    className="flex-1 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedApproval(approval);
                      setShowRejectDialog(true);
                    }}
                    variant="outline"
                    className="flex-1 border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
                  >
                    <XCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Reject
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Approve Request</DialogTitle>
            <DialogDescription className="text-[#CED4DA]">
              Confirm approval of this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedApproval && (
              <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                <h4 className="font-semibold text-white mb-2">{selectedApproval.title}</h4>
                {selectedApproval.amount && (
                  <p className="text-lg font-bold text-[#E1467C] mb-2">
                    £{selectedApproval.amount.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-[#CED4DA]">
                  Type: {selectedApproval.approval_type?.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedApproval && approveMutation.mutate(selectedApproval.id)}
              disabled={approveMutation.isPending}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Request</DialogTitle>
            <DialogDescription className="text-[#CED4DA]">
              Provide a reason for rejecting this approval request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-white mb-2 block">Rejection Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Exceeds budget, requires additional documentation, etc."
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
              onClick={() => selectedApproval && rejectMutation.mutate({
                approvalId: selectedApproval.id,
                reason: rejectionReason
              })}
              disabled={!rejectionReason || rejectMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}