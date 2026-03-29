import React from "react";
import { TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ScoreBreakdown({ invoice, score, feature }) {
  if (!score || !feature) {
    return (
      <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
        <p className="text-sm text-[#CED4DA]">No score data available</p>
      </div>
    );
  }

  const riskColors = {
    'HIGH': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    'MED': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    'LOW': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' }
  };

  const colors = riskColors[score.risk_band];

  return (
    <div className="space-y-4">
      {/* Score Display */}
      <div className={`glass-panel rounded-xl p-5 border ${colors.border}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Payment Probability</h4>
            <Badge className={`${colors.bg} ${colors.text} border ${colors.border}`}>
              {score.risk_band} RISK
            </Badge>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${colors.text}`}>
              {Math.round(score.score * 100)}%
            </div>
            <div className="text-xs text-[#CED4DA]">Score: {score.score.toFixed(3)}</div>
          </div>
        </div>

        {/* Score bar */}
        <div className="w-full h-3 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              score.score >= 0.75 ? 'bg-green-500' :
              score.score >= 0.5 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(score.score * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[#CED4DA] mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Top Drivers */}
      <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" strokeWidth={1.5} />
          Risk Drivers
        </h4>
        <div className="space-y-2">
          {score.top_drivers?.map((driver, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" />
              <span className="text-sm text-[#CED4DA]">{driver}</span>
            </div>
          ))}
          {(!score.top_drivers || score.top_drivers.length === 0) && (
            <p className="text-sm text-green-400">No major risk factors identified</p>
          )}
        </div>
      </div>

      {/* Feature Details */}
      <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
        <h4 className="text-sm font-semibold text-white mb-3">Feature Details</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#CED4DA]">Days Outstanding</span>
            <span className="text-white font-semibold">{feature.days_outstanding}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#CED4DA]">Has PO</span>
            <span className={feature.has_po ? 'text-green-400' : 'text-red-400'}>
              {feature.has_po ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#CED4DA]">Prior Overdues (180d)</span>
            <span className="text-white font-semibold">{feature.prior_overdues}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#CED4DA]">Avg Days to Pay</span>
            <span className="text-white font-semibold">{feature.avg_days_to_pay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#CED4DA]">Contact Quality</span>
            <span className={`font-semibold ${
              feature.contact_quality >= 70 ? 'text-green-400' :
              feature.contact_quality >= 40 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {feature.contact_quality}/100
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#CED4DA]">Value Segment</span>
            <Badge className="text-xs">
              {feature.value_segment}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-[#CED4DA]">Last Reminder</span>
            <span className="text-white font-semibold">
              {feature.last_reminder_days >= 999 ? 'Never' : `${feature.last_reminder_days} days ago`}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Action */}
      <div className={`glass-panel rounded-xl p-4 border ${colors.border}`}>
        <h4 className="text-sm font-semibold text-white mb-2">Recommended Action</h4>
        <p className={`text-sm ${colors.text} font-semibold`}>
          {score.next_action}
        </p>
      </div>
    </div>
  );
}