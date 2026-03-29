import React from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function SourcePerformanceTable({ sources, leadEvents }) {
  const sourceMetrics = sources.map(source => {
    const sourceEvents = leadEvents.filter(e => e.source_id === source.id);
    
    const enquiries = sourceEvents.filter(e => e.event_type === 'ENQUIRY').length;
    const quotesSent = sourceEvents.filter(e => e.event_type === 'QUOTE_SENT').length;
    const quotesApproved = sourceEvents.filter(e => e.event_type === 'QUOTE_APPROVED').length;
    const revenue = sourceEvents
      .filter(e => e.event_type === 'INVOICE_PAID')
      .reduce((sum, e) => sum + (e.event_value || 0), 0);
    
    const conversion = quotesSent > 0 ? (quotesApproved / quotesSent) * 100 : 0;
    const cost = source.cost_per_month || 0;
    const roi = cost > 0 ? revenue / cost : 0;

    return {
      ...source,
      enquiries,
      quotes_sent: quotesSent,
      quotes_approved: quotesApproved,
      conversion,
      revenue,
      roi
    };
  }).sort((a, b) => b.roi - a.roi);

  if (sourceMetrics.length === 0) {
    return (
      <div className="text-center py-8 text-[#CED4DA]">
        <p>No lead sources configured</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.08)]">
            <th className="text-left py-3 px-2 text-xs font-semibold text-[#CED4DA] uppercase">Source</th>
            <th className="text-right py-3 px-2 text-xs font-semibold text-[#CED4DA] uppercase">Leads</th>
            <th className="text-right py-3 px-2 text-xs font-semibold text-[#CED4DA] uppercase">Quotes</th>
            <th className="text-right py-3 px-2 text-xs font-semibold text-[#CED4DA] uppercase">Conv%</th>
            <th className="text-right py-3 px-2 text-xs font-semibold text-[#CED4DA] uppercase">Revenue</th>
            <th className="text-right py-3 px-2 text-xs font-semibold text-[#CED4DA] uppercase">Spend</th>
            <th className="text-right py-3 px-2 text-xs font-semibold text-[#CED4DA] uppercase">ROI</th>
          </tr>
        </thead>
        <tbody>
          {sourceMetrics.map((source, index) => (
            <tr 
              key={source.id}
              className="border-b border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)] transition-all"
            >
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  {index === 0 && source.roi > 0 && (
                    <Badge className="bg-[#E1467C]/20 text-[#E1467C] border-[#E1467C]/30 border text-xs">
                      TOP
                    </Badge>
                  )}
                  <span className="text-white font-semibold">{source.name}</span>
                  <Badge className="text-xs">{source.category}</Badge>
                </div>
              </td>
              <td className="text-right py-3 px-2 text-white">{source.enquiries}</td>
              <td className="text-right py-3 px-2 text-white">{source.quotes_sent}</td>
              <td className="text-right py-3 px-2">
                <span className={`font-semibold ${
                  source.conversion >= 40 ? 'text-green-400' :
                  source.conversion >= 25 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {source.conversion.toFixed(1)}%
                </span>
              </td>
              <td className="text-right py-3 px-2 text-white">
                £{source.revenue.toLocaleString()}
              </td>
              <td className="text-right py-3 px-2 text-[#CED4DA]">
                £{source.cost_per_month?.toLocaleString() || '0'}
              </td>
              <td className="text-right py-3 px-2">
                <div className="flex items-center justify-end gap-2">
                  <span className={`font-bold text-lg ${
                    source.roi >= 3 ? 'text-green-400' :
                    source.roi >= 1.5 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {source.roi.toFixed(1)}x
                  </span>
                  {source.roi >= 3 ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : source.roi >= 1.5 ? (
                    <Minus className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}