import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  TrendingUp, 
  CheckCircle, 
  X,
  ExternalLink,
  Users,
  DollarSign,
  BarChart3,
  Copy
} from "lucide-react";
import { format } from "date-fns";

export default function NextBestActionsTable({ actions, clients, onRefresh }) {
  const navigate = useNavigate();

  const completeActionMutation = useMutation({
    mutationFn: (actionId) => base44.entities.NextBestAction.update(actionId, {
      status: 'completed'
    }),
    onSuccess: onRefresh
  });

  const dismissActionMutation = useMutation({
    mutationFn: (actionId) => base44.entities.NextBestAction.update(actionId, {
      status: 'dismissed'
    }),
    onSuccess: onRefresh
  });

  const getActionIcon = (type) => {
    switch (type) {
      case 'REACTIVATE_CLIENT': return Users;
      case 'INCREASE_SPEND': return TrendingUp;
      case 'REVIEW_PRICING': return DollarSign;
      case 'DUPLICATE_CAMPAIGN': return Copy;
      case 'FOLLOW_UP': return Send;
      default: return Zap;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Sort by confidence descending
  const sortedActions = [...actions].sort((a, b) => b.confidence - a.confidence);

  if (sortedActions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-30" />
        <h3 className="text-xl font-semibold text-white mb-2">No actions pending</h3>
        <p className="text-[#CED4DA]">All recommendations completed or system performing well</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedActions.map((action, index) => {
        const Icon = getActionIcon(action.action_type);
        
        return (
          <div
            key={action.id}
            className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-[#E1467C]/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-2xl font-bold ${getConfidenceColor(action.confidence)}`}>
                      {Math.round(action.confidence * 100)}%
                    </span>
                    <Badge className="text-xs">
                      {action.action_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-white font-semibold">
                    {action.description}
                  </p>
                </div>
              </div>
              {action.due_date && (
                <div className="text-right ml-4">
                  <div className="text-xs text-[#CED4DA]">Due</div>
                  <div className="text-sm text-white">
                    {format(new Date(action.due_date), 'MMM d')}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
              {action.action_type === 'REACTIVATE_CLIENT' && action.client_id && (
                <Button
                  onClick={() => navigate(`${createPageUrl("Clients")}?id=${action.client_id}`)}
                  size="sm"
                  className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                >
                  <Send className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  Send Email
                </Button>
              )}
              {action.action_type === 'INCREASE_SPEND' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                >
                  <ExternalLink className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  View Source
                </Button>
              )}
              <Button
                onClick={() => completeActionMutation.mutate(action.id)}
                size="sm"
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-green-400 hover:bg-green-500/10"
              >
                <CheckCircle className="w-3 h-3 mr-1" strokeWidth={1.5} />
                Complete
              </Button>
              <Button
                onClick={() => dismissActionMutation.mutate(action.id)}
                size="sm"
                variant="ghost"
                className="text-[#CED4DA]"
              >
                <X className="w-3 h-3 mr-1" strokeWidth={1.5} />
                Dismiss
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}