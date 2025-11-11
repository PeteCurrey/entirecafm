import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  CheckCircle,
  AlertCircle,
  XCircle,
  Wrench,
  Clock,
  Package,
  Zap,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AITriagePanel({ request, triageTask, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const aiOutput = triageTask?.ai_output || {};
  const confidence = triageTask?.confidence || 0;
  const status = triageTask?.status || 'REVIEW_REQUIRED';

  const confirmTriageMutation = useMutation({
    mutationFn: async () => {
      // If job already exists, just navigate to it
      if (triageTask.job_id) {
        return { job_id: triageTask.job_id };
      }

      // Create job from AI triage
      const job = await base44.entities.Job.create({
        org_id: request.org_id,
        title: request.title,
        description: `${request.description}\n\n🤖 AI Diagnosis: ${aiOutput.issue}`,
        job_type: 'reactive',
        priority: aiOutput.recommended_priority,
        status: 'new',
        client_id: request.client_id,
        site_id: request.site_id,
        building_id: request.building_id,
        request_id: request.id,
        notes: [
          {
            text: `🤖 AI Triage (${(confidence * 100).toFixed(0)}% confidence)\n\nChecklist:\n${aiOutput.checklist?.map((item, i) => `${i + 1}. ${item}`).join('\n') || 'N/A'}\n\nParts: ${aiOutput.required_parts?.map(p => `${p.description} (${p.sku}) x${p.qty}`).join(', ') || 'None identified'}`,
            created_by: 'AI Triage',
            created_at: new Date().toISOString()
          }
        ]
      });

      // Update request
      await base44.entities.Request.update(request.id, {
        status: 'converted',
        converted_job_id: job.id,
        converted_date: new Date().toISOString()
      });

      // Update triage task
      await base44.entities.AITriageTask.update(triageTask.id, {
        status: 'CONFIRMED',
        job_id: job.id,
        confirmed_by: (await base44.auth.me()).id,
        confirmed_date: new Date().toISOString()
      });

      return { job_id: job.id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['requests']);
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['ai-triage-tasks']);
      navigate(`${createPageUrl("JobDetail")}?id=${data.job_id}`);
    },
  });

  const rejectTriageMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.AITriageTask.update(triageTask.id, {
        status: 'REJECTED',
        rejection_reason: 'User rejected AI triage suggestion'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-triage-tasks']);
      onClose();
    },
  });

  const runTriageMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('aiHelpdeskTriage', {
        request_id: request.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['requests']);
      queryClient.invalidateQueries(['ai-triage-tasks']);
      
      if (data.job_id) {
        navigate(`${createPageUrl("JobDetail")}?id=${data.job_id}`);
      }
    },
  });

  const confidenceColor = 
    confidence >= 0.78 ? 'text-green-400' :
    confidence >= 0.55 ? 'text-yellow-400' :
    'text-red-400';

  const statusConfig = {
    AUTO_CREATED: {
      icon: CheckCircle,
      color: 'bg-green-500/20 text-green-200 border-green-300/30',
      label: 'Auto-Created',
      message: '✅ Job created automatically'
    },
    AWAITING_CONFIRMATION: {
      icon: AlertCircle,
      color: 'bg-yellow-500/20 text-yellow-200 border-yellow-300/30',
      label: 'Awaiting Confirmation',
      message: '⚠️ Low confidence. Human confirmation required.'
    },
    REVIEW_REQUIRED: {
      icon: XCircle,
      color: 'bg-red-500/20 text-red-200 border-red-300/30',
      label: 'Review Required',
      message: '🛑 Needs manual triage.'
    },
    CONFIRMED: {
      icon: CheckCircle,
      color: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
      label: 'Confirmed',
      message: '✅ Triage confirmed and job created'
    },
    REJECTED: {
      icon: XCircle,
      color: 'bg-gray-500/20 text-gray-200 border-gray-300/30',
      label: 'Rejected',
      message: 'AI triage rejected'
    }
  };

  const currentStatus = statusConfig[status] || statusConfig.REVIEW_REQUIRED;
  const StatusIcon = currentStatus.icon;

  if (!triageTask) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <div className="text-center py-8">
          <Brain className="w-16 h-16 mx-auto mb-4 text-[#E1467C] opacity-50" strokeWidth={1.5} />
          <h3 className="text-xl font-semibold text-white mb-2">AI Triage Not Run</h3>
          <p className="text-[#CED4DA] mb-6">
            Run AI analysis to automatically classify and generate job details
          </p>
          <Button
            onClick={() => runTriageMutation.mutate()}
            disabled={runTriageMutation.isPending}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            {runTriageMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.5} />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Run AI Triage
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
            <h3 className="text-lg font-bold text-white">AI Triage Analysis</h3>
          </div>
          <Badge className={`${currentStatus.color} border`}>
            <StatusIcon className="w-3 h-3 mr-1" strokeWidth={1.5} />
            {currentStatus.label}
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#CED4DA] mb-1">Confidence</div>
          <div className={`text-2xl font-bold ${confidenceColor}`}>
            {(confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className={`p-3 rounded-lg border ${currentStatus.color.replace('text-', 'text-').replace('border-', 'border-')}`}>
        <p className="text-sm">{currentStatus.message}</p>
      </div>

      {/* Issue Diagnosis */}
      <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-[#E1467C]" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-white">Diagnosed Issue</span>
        </div>
        <p className="text-[#CED4DA]">{aiOutput.issue || 'No diagnosis available'}</p>
        {aiOutput.reasoning && (
          <p className="text-xs text-[#CED4DA] mt-2 opacity-70">
            💭 {aiOutput.reasoning}
          </p>
        )}
      </div>

      {/* Recommended Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#E1467C]" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-white">Priority</span>
          </div>
          <Badge className={`${
            aiOutput.recommended_priority === 'critical' ? 'bg-red-500/20 text-red-200' :
            aiOutput.recommended_priority === 'high' ? 'bg-orange-500/20 text-orange-200' :
            aiOutput.recommended_priority === 'medium' ? 'bg-blue-500/20 text-blue-200' :
            'bg-gray-500/20 text-gray-200'
          }`}>
            {aiOutput.recommended_priority || 'medium'}
          </Badge>
        </div>

        <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#E1467C]" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-white">Duration</span>
          </div>
          <p className="text-white font-semibold">
            {aiOutput.estimated_duration_minutes || 0} mins
          </p>
        </div>
      </div>

      {/* Checklist */}
      {aiOutput.checklist && aiOutput.checklist.length > 0 && (
        <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-[#E1467C]" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-white">Engineer Checklist</span>
          </div>
          <ol className="space-y-2 text-sm text-[#CED4DA]">
            {aiOutput.checklist.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-[#E1467C] font-semibold">{index + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Required Parts */}
      {aiOutput.required_parts && aiOutput.required_parts.length > 0 && (
        <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-[#E1467C]" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-white">Required Parts</span>
          </div>
          <div className="space-y-2">
            {aiOutput.required_parts.map((part, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="text-[#CED4DA]">
                  <span className="text-white">{part.description}</span>
                  {part.sku && <span className="text-xs opacity-70 ml-2">({part.sku})</span>}
                </div>
                <Badge className="bg-[rgba(255,255,255,0.08)] text-white">
                  x{part.qty || 1}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(status === 'AWAITING_CONFIRMATION' || status === 'REVIEW_REQUIRED') && (
        <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
          <Button
            onClick={() => confirmTriageMutation.mutate()}
            disabled={confirmTriageMutation.isPending}
            className="flex-1 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            {confirmTriageMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.5} />
                Creating Job...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Create Job from AI
              </>
            )}
          </Button>
          <Button
            onClick={() => rejectTriageMutation.mutate()}
            disabled={rejectTriageMutation.isPending}
            variant="outline"
            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
          >
            <XCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Reject
          </Button>
        </div>
      )}

      {status === 'AUTO_CREATED' && triageTask.job_id && (
        <Button
          onClick={() => navigate(`${createPageUrl("JobDetail")}?id=${triageTask.job_id}`)}
          className="w-full bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
        >
          View Created Job
        </Button>
      )}
    </div>
  );
}