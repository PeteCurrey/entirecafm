import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Download,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm || 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-200 border-gray-300/30',
    sent: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    paid: 'bg-green-500/20 text-green-200 border-green-300/30',
    overdue: 'bg-red-500/20 text-red-200 border-red-300/30',
    cancelled: 'bg-orange-500/20 text-orange-200 border-orange-300/30',
  };

  const statusIcons = {
    draft: Clock,
    sent: Clock,
    paid: CheckCircle2,
    overdue: AlertCircle,
    cancelled: AlertCircle,
  };

  // Calculate stats
  const totalOutstanding = filteredInvoices
    .filter(i => ['sent', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (i.total || 0), 0);
  
  const totalPaid = filteredInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  
  const overdueCount = filteredInvoices.filter(i => i.status === 'overdue').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Invoices</h1>
            <p className="text-white/70">Track payments and financial status</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="glass-effect border-white/30 text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              className="glass-effect-strong border-white/30 text-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-effect border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Outstanding</span>
            <DollarSign className="w-5 h-5 text-blue-300" />
          </div>
          <p className="text-2xl font-bold text-white">
            £{totalOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Paid</span>
            <CheckCircle2 className="w-5 h-5 text-green-300" />
          </div>
          <p className="text-2xl font-bold text-white">
            £{totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Overdue</span>
            <AlertCircle className="w-5 h-5 text-red-300" />
          </div>
          <p className="text-2xl font-bold text-white">
            {overdueCount}
          </p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Total Invoices</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {invoices.length}
          </p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <h3 className="text-xl font-semibold text-white mb-2">No invoices found</h3>
            <p className="text-white/60">Invoices will appear here</p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const StatusIcon = statusIcons[invoice.status];
            
            return (
              <div
                key={invoice.id}
                className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-white">
                        {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                      </h3>
                      <Badge className={`${statusColors[invoice.status]} border flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-white/50">Issue Date</span>
                        <p className="text-white/90">
                          {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/50">Due Date</span>
                        <p className="text-white/90">
                          {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {invoice.paid_date && (
                        <div>
                          <span className="text-white/50">Paid Date</span>
                          <p className="text-white/90">
                            {format(new Date(invoice.paid_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      )}
                      {invoice.po_number && (
                        <div>
                          <span className="text-white/50">PO Number</span>
                          <p className="text-white/90">{invoice.po_number}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-6">
                    <p className="text-2xl font-bold text-white">
                      £{(invoice.total || 0).toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/80 hover:text-white hover:bg-white/10 mt-2"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}