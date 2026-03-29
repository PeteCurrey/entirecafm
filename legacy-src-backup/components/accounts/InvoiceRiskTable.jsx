import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, Ban, AlertCircle, Mail, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function InvoiceRiskTable({ invoices, features, scores, clients, onInvoiceSelect, onRefresh }) {
  const [sendingDunning, setSendingDunning] = useState(null);

  // Merge data
  const today = new Date();
  const overdueInvoices = invoices
    .filter(i => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      if (!i.due_date) return false;
      return new Date(i.due_date) < today;
    })
    .map(invoice => {
      const feature = features.find(f => f.invoice_id === invoice.id);
      const score = scores.find(s => s.invoice_id === invoice.id);
      const client = clients.find(c => c.id === invoice.client_id);
      
      return {
        ...invoice,
        feature,
        score,
        client
      };
    })
    .filter(i => i.score) // Only show scored invoices
    .sort((a, b) => {
      // Sort by risk (HIGH first) then by score (low to high)
      const riskOrder = { 'HIGH': 0, 'MED': 1, 'LOW': 2 };
      if (riskOrder[a.score.risk_band] !== riskOrder[b.score.risk_band]) {
        return riskOrder[a.score.risk_band] - riskOrder[b.score.risk_band];
      }
      return a.score.score - b.score.score;
    });

  const sendDunningMutation = useMutation({
    mutationFn: async ({ invoiceId, step }) => {
      setSendingDunning(invoiceId);
      const result = await base44.functions.invoke('accounts.generateDunning', {
        invoice_id: invoiceId,
        force_step: step
      });
      return result.data;
    },
    onSuccess: () => {
      onRefresh();
      setSendingDunning(null);
    },
    onError: () => {
      setSendingDunning(null);
    }
  });

  const markDisputedMutation = useMutation({
    mutationFn: async (invoiceId) => {
      const feature = features.find(f => f.invoice_id === invoiceId);
      if (feature) {
        await base44.entities.InvoiceFeatures.update(feature.id, {
          disputed: !feature.disputed
        });
      }
    },
    onSuccess: onRefresh
  });

  const riskColors = {
    'HIGH': 'bg-red-500/20 text-red-400 border-red-500/30',
    'MED': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'LOW': 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  if (overdueInvoices.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-30" />
        <h3 className="text-xl font-semibold text-white mb-2">No overdue invoices</h3>
        <p className="text-[#CED4DA]">All invoices are current or paid</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {overdueInvoices.map((invoice, index) => (
        <div
          key={invoice.id}
          onClick={() => onInvoiceSelect(invoice)}
          className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-semibold text-white">
                  Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
                </h4>
                {index === 0 && invoice.score?.risk_band === 'HIGH' && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                    #1 PRIORITY
                  </Badge>
                )}
                <Badge className={`${riskColors[invoice.score?.risk_band]} border`}>
                  {invoice.score?.risk_band} RISK
                </Badge>
                {invoice.feature?.disputed && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 border">
                    DISPUTED
                  </Badge>
                )}
              </div>
              <div className="text-sm text-[#CED4DA]">
                {invoice.client?.name || 'Unknown Client'}
              </div>
            </div>
            <div className="text-right ml-4">
              <div className="text-2xl font-bold text-white">
                £{(invoice.total || 0).toLocaleString()}
              </div>
              <div className="text-xs text-red-400">
                {invoice.feature?.days_outstanding || 0} days OD
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-4 text-[#CED4DA]">
              <span>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
              <span>Score: {invoice.score?.score?.toFixed(3) || 'N/A'}</span>
              {invoice.po_number && <span>PO: {invoice.po_number}</span>}
            </div>
          </div>

          <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-semibold">
                {invoice.score?.next_action || 'No action needed'}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  sendDunningMutation.mutate({ invoiceId: invoice.id, step: 1 });
                }}
                disabled={sendingDunning === invoice.id}
                size="sm"
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
              >
                <Mail className="w-3 h-3 mr-1" strokeWidth={1.5} />
                Reminder #1
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  sendDunningMutation.mutate({ invoiceId: invoice.id, step: 2 });
                }}
                disabled={sendingDunning === invoice.id}
                size="sm"
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
              >
                <Send className="w-3 h-3 mr-1" strokeWidth={1.5} />
                Reminder #2
              </Button>
              {invoice.score?.risk_band === 'HIGH' && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    sendDunningMutation.mutate({ invoiceId: invoice.id, step: 3 });
                  }}
                  disabled={sendingDunning === invoice.id}
                  size="sm"
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  Final Notice
                </Button>
              )}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  markDisputedMutation.mutate(invoice.id);
                }}
                size="sm"
                variant="ghost"
                className="text-[#CED4DA]"
              >
                <Ban className="w-3 h-3 mr-1" strokeWidth={1.5} />
                {invoice.feature?.disputed ? 'Clear' : 'Disputed'}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}