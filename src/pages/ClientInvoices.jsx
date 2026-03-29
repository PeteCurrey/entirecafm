import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DollarSign, ArrowLeft, Download, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function ClientInvoicesPage() {
  const [user, setUser] = useState(null);

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

  const { data: invoices = [] } = useQuery({
    queryKey: ['client-invoices'],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Invoice.filter({ client_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  const statusColors = {
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    sent: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    paid: 'bg-green-500/10 text-green-400 border-green-500/30',
    overdue: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const totalOutstanding = invoices
    .filter(i => ['sent', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (i.total || 0), 0);

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
          <h1 className="text-3xl font-bold text-white mb-2">Your Invoices</h1>
          <p className="text-body">View and download invoices</p>
        </div>

        {/* Summary */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-body mb-1">Total Outstanding</p>
              <p className="text-3xl font-bold text-white">
                £{totalOutstanding.toLocaleString()}
              </p>
            </div>
            {totalOutstanding > 0 && (
              <div className="flex items-center gap-2 text-orange-400">
                <AlertCircle className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm">Payment due</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoices List */}
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 border border-divider text-center">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-body/50" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold text-white mb-2">No invoices yet</h3>
              <p className="text-body">Invoices will appear here when available</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="glass-panel rounded-2xl p-6 border border-divider"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                      </h3>
                      <Badge className={`${statusColors[invoice.status]} border`}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-white">
                      £{(invoice.total || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-body mb-1">Issue Date</p>
                    <p className="text-white">
                      {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-body mb-1">Due Date</p>
                    <p className={invoice.status === 'overdue' ? 'text-red-400' : 'text-white'}>
                      {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {invoice.paid_date && (
                    <div>
                      <p className="text-body mb-1">Paid Date</p>
                      <p className="text-green-400">
                        {format(new Date(invoice.paid_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                  {invoice.po_number && (
                    <div>
                      <p className="text-body mb-1">PO Number</p>
                      <p className="text-white">{invoice.po_number}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-divider">
                  <Button variant="outline" className="border-divider text-white">
                    <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Download Invoice
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}