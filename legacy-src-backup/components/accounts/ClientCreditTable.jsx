import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ban, CheckCircle, FileText } from "lucide-react";

export default function ClientCreditTable({ clients, invoices, scores, onRefresh }) {
  const toggleHoldMutation = useMutation({
    mutationFn: async ({ clientId, currentHold }) => {
      const client = clients.find(c => c.id === clientId);
      const currentTerms = client.terms_json || {};
      
      await base44.entities.Client.update(clientId, {
        terms_json: {
          ...currentTerms,
          hold_non_critical: !currentHold
        }
      });
    },
    onSuccess: onRefresh
  });

  const toggleRequirePOMutation = useMutation({
    mutationFn: async ({ clientId, currentRequire }) => {
      const client = clients.find(c => c.id === clientId);
      const currentTerms = client.terms_json || {};
      
      await base44.entities.Client.update(clientId, {
        terms_json: {
          ...currentTerms,
          require_po_future: !currentRequire
        }
      });
    },
    onSuccess: onRefresh
  });

  const today = new Date();
  
  // Calculate client metrics
  const clientMetrics = clients.map(client => {
    const clientInvoices = invoices.filter(i => i.client_id === client.id);
    const clientScores = scores.filter(s => {
      const invoice = invoices.find(inv => inv.id === s.invoice_id);
      return invoice?.client_id === client.id;
    });

    const overdueInvoices = clientInvoices.filter(i => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      if (!i.due_date) return false;
      return new Date(i.due_date) < today;
    });

    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
    
    let oldestDaysOverdue = 0;
    for (const inv of overdueInvoices) {
      const days = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
      if (days > oldestDaysOverdue) oldestDaysOverdue = days;
    }

    const priorOverdues = overdueInvoices.length;
    const hasHighRisk = clientScores.some(s => s.risk_band === 'HIGH');
    const terms = client.terms_json || {};

    return {
      ...client,
      total_overdue: totalOverdue,
      oldest_days_overdue: oldestDaysOverdue,
      prior_overdues: priorOverdues,
      has_high_risk: hasHighRisk,
      hold_non_critical: terms.hold_non_critical || false,
      require_po_future: terms.require_po_future || false
    };
  })
  .filter(c => c.total_overdue > 0 || c.hold_non_critical)
  .sort((a, b) => b.total_overdue - a.total_overdue);

  if (clientMetrics.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-30" />
        <h3 className="text-xl font-semibold text-white mb-2">All clients current</h3>
        <p className="text-[#CED4DA]">No clients require credit control actions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clientMetrics.map(client => (
        <div
          key={client.id}
          className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-semibold text-white">{client.name}</h4>
                {client.has_high_risk && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                    HIGH RISK
                  </Badge>
                )}
                {client.hold_non_critical && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 border text-xs">
                    <Ban className="w-3 h-3 mr-1" />
                    ON HOLD
                  </Badge>
                )}
                {client.require_po_future && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    PO REQUIRED
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right ml-4">
              <div className="text-2xl font-bold text-red-400">
                £{client.total_overdue.toLocaleString()}
              </div>
              <div className="text-xs text-[#CED4DA]">
                {client.prior_overdues} invoice{client.prior_overdues !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#CED4DA] mb-3">
            <span>Oldest: {client.oldest_days_overdue} days</span>
            <span>Prior overdues (6mo): {client.prior_overdues}</span>
          </div>

          <div className="flex gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
            <Button
              onClick={() => toggleHoldMutation.mutate({ 
                clientId: client.id, 
                currentHold: client.hold_non_critical 
              })}
              disabled={toggleHoldMutation.isPending}
              size="sm"
              variant={client.hold_non_critical ? "default" : "outline"}
              className={client.hold_non_critical 
                ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/30"
                : "border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              }
            >
              <Ban className="w-3 h-3 mr-1" strokeWidth={1.5} />
              {client.hold_non_critical ? 'Remove Hold' : 'Hold Non-Critical'}
            </Button>
            <Button
              onClick={() => toggleRequirePOMutation.mutate({ 
                clientId: client.id, 
                currentRequire: client.require_po_future 
              })}
              disabled={toggleRequirePOMutation.isPending}
              size="sm"
              variant="outline"
              className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
            >
              <FileText className="w-3 h-3 mr-1" strokeWidth={1.5} />
              {client.require_po_future ? 'Remove PO Req' : 'Require PO'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}