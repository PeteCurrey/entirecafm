import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, CheckCircle, X } from "lucide-react";

export default function BudgetAllocator({ allocations, sources, onRefresh }) {
  const applyAllocationMutation = useMutation({
    mutationFn: async ({ allocationId, sourceId, newBudget }) => {
      // Update source budget
      await base44.entities.LeadSource.update(sourceId, {
        cost_per_month: newBudget
      });

      // Mark allocation as applied
      await base44.entities.CampaignAllocation.update(allocationId, {
        status: 'APPLIED',
        applied_date: new Date().toISOString(),
        applied_by: (await base44.auth.me()).id
      });
    },
    onSuccess: onRefresh
  });

  const rejectAllocationMutation = useMutation({
    mutationFn: (allocationId) => base44.entities.CampaignAllocation.update(allocationId, {
      status: 'REJECTED'
    }),
    onSuccess: onRefresh
  });

  // Enrich allocations with source data
  const enrichedAllocations = allocations
    .map(alloc => {
      const source = sources.find(s => s.id === alloc.source_id);
      return { ...alloc, source };
    })
    .filter(a => a.source)
    .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct)); // Biggest changes first

  if (enrichedAllocations.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-30" />
        <h3 className="text-xl font-semibold text-white mb-2">No allocations pending</h3>
        <p className="text-[#CED4DA]">Run allocation calculator to generate recommendations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enrichedAllocations.map(allocation => {
        const isIncrease = allocation.change_pct > 0;
        const isDecrease = allocation.change_pct < 0;
        
        return (
          <div
            key={allocation.id}
            className={`glass-panel rounded-xl p-4 border ${
              isIncrease ? 'border-green-500/30 bg-green-500/5' :
              isDecrease ? 'border-red-500/30 bg-red-500/5' :
              'border-[rgba(255,255,255,0.08)]'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isIncrease ? 'bg-green-500/20' :
                  isDecrease ? 'bg-red-500/20' :
                  'bg-gray-500/20'
                }`}>
                  {isIncrease ? (
                    <TrendingUp className="w-5 h-5 text-green-400" strokeWidth={1.5} />
                  ) : isDecrease ? (
                    <TrendingDown className="w-5 h-5 text-red-400" strokeWidth={1.5} />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{allocation.source?.name}</h4>
                  <div className="flex items-center gap-3 text-sm">
                    <Badge className={`${
                      allocation.roi >= 3 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      allocation.roi >= 1.5 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-red-500/20 text-red-400 border-red-500/30'
                    } border text-xs`}>
                      ROI: {allocation.roi?.toFixed(1)}x
                    </Badge>
                    <Badge className="text-xs">
                      Conv: {((allocation.conversion_rate || 0) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-[#CED4DA]">£{allocation.current_budget?.toLocaleString()}</span>
                  <span className={`text-lg font-bold ${
                    isIncrease ? 'text-green-400' :
                    isDecrease ? 'text-red-400' :
                    'text-[#CED4DA]'
                  }`}>
                    {isIncrease && '+'}
                    {allocation.change_pct}%
                  </span>
                  <span className="text-sm text-white">→ £{allocation.recommended_budget?.toLocaleString()}</span>
                </div>
                <div className="text-xs text-[#CED4DA]">
                  Avg lead value: £{allocation.avg_lead_value?.toLocaleString() || '0'}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
              <Button
                onClick={() => applyAllocationMutation.mutate({
                  allocationId: allocation.id,
                  sourceId: allocation.source_id,
                  newBudget: allocation.recommended_budget
                })}
                disabled={applyAllocationMutation.isPending}
                size="sm"
                className={`${
                  isIncrease ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30' :
                  isDecrease ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30' :
                  'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30'
                } border`}
              >
                <CheckCircle className="w-3 h-3 mr-1" strokeWidth={1.5} />
                Apply Change
              </Button>
              <Button
                onClick={() => rejectAllocationMutation.mutate(allocation.id)}
                size="sm"
                variant="ghost"
                className="text-[#CED4DA]"
              >
                <X className="w-3 h-3 mr-1" strokeWidth={1.5} />
                Reject
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}