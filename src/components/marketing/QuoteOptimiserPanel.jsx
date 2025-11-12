import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, CheckCircle, Sparkles, ExternalLink, AlertCircle } from "lucide-react";

export default function QuoteOptimiserPanel({ optimisations, quotes, onRefresh }) {
  const navigate = useNavigate();

  const applyOptimisationMutation = useMutation({
    mutationFn: async ({ optimisationId, quoteId, newMarkup }) => {
      // Fetch quote
      const fetchedQuotes = await base44.entities.Quote.filter({ id: quoteId });
      if (fetchedQuotes.length === 0) throw new Error('Quote not found');
      
      const quote = fetchedQuotes[0];
      const subtotal = quote.subtotal || 0;
      
      // Recalculate with new markup
      const newMarginAmount = subtotal * (newMarkup / 100);
      const newTotal = subtotal + newMarginAmount;
      const vatAmount = newTotal * (quote.vat_rate || 20) / 100;
      const finalTotal = newTotal + vatAmount;

      // Update quote
      await base44.entities.Quote.update(quoteId, {
        subtotal,
        vat_amount: Math.round(vatAmount * 100) / 100,
        total: Math.round(finalTotal * 100) / 100,
        notes: (quote.notes || '') + `\n\n✨ AI Optimised: Markup adjusted to ${newMarkup.toFixed(1)}% (predicted ${(optimisations.find(o => o.quote_id === quoteId)?.predicted_accept_prob * 100).toFixed(0)}% acceptance)`
      });

      // Mark optimisation as applied
      await base44.entities.QuoteOptimisation.update(optimisationId, {
        applied: true,
        applied_date: new Date().toISOString()
      });
    },
    onSuccess: onRefresh
  });

  // Enrich with quote data
  const enrichedOptimisations = optimisations
    .map(opt => {
      const quote = quotes.find(q => q.id === opt.quote_id);
      return { ...opt, quote };
    })
    .filter(o => o.quote && !o.applied)
    .sort((a, b) => b.delta_margin - a.delta_margin); // Biggest margin gain first

  if (enrichedOptimisations.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400 opacity-30" />
        <h3 className="text-xl font-semibold text-white mb-2">No optimisations available</h3>
        <p className="text-[#CED4DA]">AI will analyze new quotes automatically</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enrichedOptimisations.map(opt => {
        const isIncrease = opt.recommended_markup_pct > opt.base_markup_pct;
        const marginGainPct = opt.base_markup_pct > 0 
          ? ((opt.recommended_markup_pct - opt.base_markup_pct) / opt.base_markup_pct) * 100
          : 0;

        return (
          <div
            key={opt.id}
            className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-white">
                    {opt.quote?.title || 'Quote'}
                  </h4>
                  <Badge className="text-xs">
                    {opt.quote?.quote_number || 'DRAFT'}
                  </Badge>
                  <Badge className={`${
                    opt.confidence >= 0.8 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  } border text-xs`}>
                    {Math.round(opt.confidence * 100)}% Confidence
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-[#CED4DA]">
                  <span>Value: £{opt.quote?.total?.toLocaleString() || '0'}</span>
                  <span>
                    Markup: {opt.base_markup_pct?.toFixed(1)}% → {opt.recommended_markup_pct?.toFixed(1)}%
                  </span>
                  <Badge className={`${
                    opt.predicted_accept_prob >= 0.75 ? 'bg-green-500/20 text-green-400' :
                    opt.predicted_accept_prob >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  } border-none text-xs`}>
                    {Math.round(opt.predicted_accept_prob * 100)}% Accept Prob
                  </Badge>
                </div>
              </div>
              <div className="text-right ml-4">
                <div className={`text-2xl font-bold ${
                  opt.delta_margin > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {opt.delta_margin > 0 && '+'}£{opt.delta_margin?.toFixed(0)}
                </div>
                <div className="text-xs text-[#CED4DA]">Expected margin gain</div>
              </div>
            </div>

            <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
              <p className="text-xs text-[#CED4DA] mb-3">
                {isIncrease 
                  ? `💡 Increase markup by ${Math.abs(marginGainPct).toFixed(1)}% - client has strong relationship score`
                  : `💡 Reduce markup by ${Math.abs(marginGainPct).toFixed(1)}% - optimizes win probability while maintaining margin`
                }
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => applyOptimisationMutation.mutate({
                    optimisationId: opt.id,
                    quoteId: opt.quote_id,
                    newMarkup: opt.recommended_markup_pct
                  })}
                  disabled={applyOptimisationMutation.isPending}
                  size="sm"
                  className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                >
                  <CheckCircle className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  Apply Optimisation
                </Button>
                <Button
                  onClick={() => navigate(`${createPageUrl("Quotes")}?id=${opt.quote_id}`)}
                  size="sm"
                  variant="outline"
                  className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                >
                  <ExternalLink className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  View Quote
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#CED4DA]">Total Expected Margin Gain</span>
          <span className="text-2xl font-bold text-green-400">
            +£{enrichedOptimisations.reduce((sum, o) => sum + (o.delta_margin || 0), 0).toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}