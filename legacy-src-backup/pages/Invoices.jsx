import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign,
  Search,
  Download,
  ArrowLeft,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = searchParams.get('status'); // 'overdue' or undefined
  const fromPage = searchParams.get('from'); // 'director' or undefined
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(statusParam === 'overdue' ? 'overdue' : 'all');

  // Update filter when URL param changes
  useEffect(() => {
    if (statusParam === 'overdue') {
      setStatusFilter('overdue');
    }
  }, [statusParam]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const handleClearFilters = () => {
    navigate(createPageUrl("Invoices"));
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchTerm || 
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        matchesStatus = inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date();
      } else {
        matchesStatus = inv.status === statusFilter;
      }
    }
    
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-200 border-gray-300/30',
    sent: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    paid: 'bg-green-500/20 text-green-200 border-green-300/30',
    overdue: 'bg-red-500/20 text-red-200 border-red-300/30',
    cancelled: 'bg-orange-500/20 text-orange-200 border-orange-300/30',
  };

  const getInvoiceStatus = (invoice) => {
    if (invoice.status === 'paid') return 'paid';
    if (invoice.status === 'cancelled') return 'cancelled';
    if (invoice.due_date && new Date(invoice.due_date) < new Date()) return 'overdue';
    return invoice.status;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        {/* Back Link - Show if coming from director dashboard */}
        {fromPage === 'director' && (
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("AIDirector"))}
            className="mb-4 text-[#CED4DA] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
            AI Director
          </Button>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Invoices</h1>
            <p className="text-[#CED4DA]">
              {statusParam === 'overdue' ? 'Overdue invoices requiring collection' : 'Manage and track client invoices'}
            </p>
          </div>
          <Button
            variant="outline"
            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
          >
            <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Export
          </Button>
        </div>

        {/* Active Filter Pills */}
        {statusParam && (
          <div className="mb-4 flex flex-wrap gap-2">
            {statusParam === 'overdue' && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border flex items-center gap-2">
                Status: Overdue
                <X 
                  className="w-3 h-3 cursor-pointer hover:bg-red-500/30 rounded-full" 
                  onClick={handleClearFilters}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CED4DA] opacity-50" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {statusParam === 'overdue' && (
        <div className="glass-panel rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Collection Required</h3>
              <p className="text-[#CED4DA] text-sm">{filteredInvoices.length} overdue invoices</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-red-400">
                £{filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toLocaleString()}
              </div>
              <div className="text-xs text-[#CED4DA]">Total overdue</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Total Outstanding</div>
          <div className="text-3xl font-semibold text-white">
            £{invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.total || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Overdue</div>
          <div className="text-3xl font-semibold text-red-400">
            {invoices.filter(i => getInvoiceStatus(i) === 'overdue').length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Paid This Month</div>
          <div className="text-3xl font-semibold text-green-400">
            {invoices.filter(i => {
              if (!i.paid_date) return false;
              const paidDate = new Date(i.paid_date);
              const now = new Date();
              return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Draft</div>
          <div className="text-3xl font-semibold text-white">
            {invoices.filter(i => i.status === 'draft').length}
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#CED4DA]">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No invoices found</h3>
            <p className="text-[#CED4DA]">
              {statusParam === 'overdue' ? 'No overdue invoices - excellent!' : 'Invoices will appear here'}
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const client = clients.find(c => c.id === invoice.client_id);
            const status = getInvoiceStatus(invoice);
            
            return (
              <div
                key={invoice.id}
                className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
                      </h3>
                    </div>
                    {client && (
                      <p className="text-[#CED4DA] mb-3">{client.name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className="text-2xl font-bold text-white">
                      £{(invoice.total || 0).toLocaleString()}
                    </span>
                    <Badge className={`${statusColors[status]} border`}>
                      {status}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-[#CED4DA]">
                  {invoice.issue_date && (
                    <span>Issued: {format(new Date(invoice.issue_date), 'MMM d, yyyy')}</span>
                  )}
                  {invoice.due_date && (
                    <span className={status === 'overdue' ? 'text-red-400 font-semibold' : ''}>
                      Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {invoice.paid_date && (
                    <span className="text-green-400">
                      Paid: {format(new Date(invoice.paid_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {invoice.po_number && (
                    <span>PO: {invoice.po_number}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}