import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, ArrowLeft, CheckCircle2, XCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ClientQuotesPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const { data: quotes = [] } = useQuery({
    queryKey: ['client-quotes'],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Quote.filter({ client_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  const approveQuoteMutation = useMutation({
    mutationFn: async (quoteId) => {
      const quote = quotes.find(q => q.id === quoteId);
      return base44.entities.Quote.update(quoteId, {
        status: 'approved',
        approved_date: new Date().toISOString(),
        approved_by: user.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-quotes']);
      toast.success('Quote approved successfully');
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (quoteId) => {
      return base44.entities.Quote.update(quoteId, {
        status: 'rejected'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-quotes']);
      toast.success('Quote rejected');
    },
  });

  const statusColors = {
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    sent: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    approved: 'bg-green-500/10 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className="min-h-screen bg-[#0D1117] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <Link to={createPageUrl("ClientPortal")}>
            <button className="flex items-center gap-2 text-body hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              Back to Dashboard
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Your Quotes</h1>
          <p className="text-body">Review and approve quotations</p>
        </div>

        {/* Quotes List */}
        <div className="space-y-4">
          {quotes.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 border border-divider text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-body/50" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold text-white mb-2">No quotes yet</h3>
              <p className="text-body">Quotes will appear here when available</p>
            </div>
          ) : (
            quotes.map((quote) => (
              <div
                key={quote.id}
                className="glass-panel rounded-2xl p-6 border border-divider"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{quote.title}</h3>
                      {quote.quote_number && (
                        <span className="text-sm text-body">#{quote.quote_number}</span>
                      )}
                    </div>
                    {quote.description && (
                      <p className="text-body text-sm mb-3">{quote.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-white mb-1">
                      £{(quote.total || 0).toLocaleString()}
                    </p>
                    <Badge className={`${statusColors[quote.status]} border`}>
                      {quote.status}
                    </Badge>
                  </div>
                </div>

                {quote.line_items && quote.line_items.length > 0 && (
                  <div className="mb-4 p-4 glass-panel rounded-lg">
                    <p className="text-xs text-body mb-2 uppercase tracking-wider">Quote Items</p>
                    <div className="space-y-2">
                      {quote.line_items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-white">{item.description}</span>
                          <span className="text-body">
                            {item.quantity} × £{item.unit_price} = £{item.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-divider">
                  <div className="text-sm text-body">
                    {quote.valid_until && (
                      <span>Valid until {format(new Date(quote.valid_until), 'MMM d, yyyy')}</span>
                    )}
                  </div>

                  {quote.status === 'sent' && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => rejectQuoteMutation.mutate(quote.id)}
                        disabled={rejectQuoteMutation.isPending}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Reject
                      </Button>
                      <Button
                        onClick={() => approveQuoteMutation.mutate(quote.id)}
                        disabled={approveQuoteMutation.isPending}
                        className="accent-magenta"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Approve Quote
                      </Button>
                    </div>
                  )}

                  {quote.status === 'approved' && (
                    <Button variant="outline" className="border-divider text-white">
                      <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}