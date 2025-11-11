import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  FileText
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

import QuoteForm from "../components/quotes/QuoteForm";

export default function QuotesPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewQuoteForm, setShowNewQuoteForm] = useState(searchParams.get('new') === 'true');

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = !searchTerm || 
      quote.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-200 border-gray-300/30',
    sent: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    approved: 'bg-green-500/20 text-green-200 border-green-300/30',
    rejected: 'bg-red-500/20 text-red-200 border-red-300/30',
    expired: 'bg-orange-500/20 text-orange-200 border-orange-300/30',
  };

  const statusIcons = {
    draft: FileText,
    sent: Clock,
    approved: CheckCircle2,
    rejected: XCircle,
    expired: Clock,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Quotes</h1>
            <p className="text-white/70">Create and manage client quotations</p>
          </div>
          <Button
            onClick={() => setShowNewQuoteForm(true)}
            className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                placeholder="Search quotes..."
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
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Awaiting Approval</span>
            <Clock className="w-5 h-5 text-blue-300" />
          </div>
          <p className="text-2xl font-bold text-white">
            {quotes.filter(q => q.status === 'sent').length}
          </p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Approved</span>
            <CheckCircle2 className="w-5 h-5 text-green-300" />
          </div>
          <p className="text-2xl font-bold text-white">
            {quotes.filter(q => q.status === 'approved').length}
          </p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Total Value (Approved)</span>
          </div>
          <p className="text-2xl font-bold text-white">
            £{quotes.filter(q => q.status === 'approved').reduce((sum, q) => sum + (q.total || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-effect rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Drafts</span>
            <FileText className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-white">
            {quotes.filter(q => q.status === 'draft').length}
          </p>
        </div>
      </div>

      {/* Quotes List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70">Loading quotes...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <h3 className="text-xl font-semibold text-white mb-2">No quotes found</h3>
            <p className="text-white/60 mb-6">Create your first quote to get started</p>
            <Button
              onClick={() => setShowNewQuoteForm(true)}
              className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Quote
            </Button>
          </div>
        ) : (
          filteredQuotes.map((quote) => {
            const site = sites.find(s => s.id === quote.site_id);
            const StatusIcon = statusIcons[quote.status];
            
            return (
              <div
                key={quote.id}
                className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{quote.title}</h3>
                      {quote.quote_number && (
                        <span className="text-sm text-white/50">#{quote.quote_number}</span>
                      )}
                    </div>
                    {quote.description && (
                      <p className="text-white/70 mb-3 line-clamp-2">{quote.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge className={`${statusColors[quote.status]} border flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {quote.status}
                    </Badge>
                    <span className="text-xl font-bold text-white">
                      £{(quote.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  {site && (
                    <span className="text-white/70">{site.name}</span>
                  )}
                  {quote.valid_until && (
                    <span className="text-white/70">
                      Valid until: {format(new Date(quote.valid_until), 'MMM d, yyyy')}
                    </span>
                  )}
                  {quote.approved_date && (
                    <span className="text-green-300">
                      Approved: {format(new Date(quote.approved_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {quote.po_number_provided && (
                    <span className="text-white/90">
                      PO: {quote.po_number_provided}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Quote Dialog */}
      <Dialog open={showNewQuoteForm} onOpenChange={setShowNewQuoteForm}>
        <DialogContent className="glass-effect-strong border-white/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Quote</DialogTitle>
          </DialogHeader>
          <QuoteForm
            onSuccess={() => {
              setShowNewQuoteForm(false);
              queryClient.invalidateQueries(['quotes']);
            }}
            onCancel={() => setShowNewQuoteForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}