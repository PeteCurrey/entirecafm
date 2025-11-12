import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  AlertTriangle,
  TrendingDown,
  Clock,
  Users,
  RefreshCw,
  Activity,
  Download,
  Send,
  Ban,
  AlertCircle,
  CheckCircle,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InvoiceRiskTable from "../components/accounts/InvoiceRiskTable";
import ClientCreditTable from "../components/accounts/ClientCreditTable";
import LPCDCalculator from "../components/accounts/LPCDCalculator";
import ScoreBreakdown from "../components/accounts/ScoreBreakdown";

// WebSocket for live updates
let ws = null;

export default function AIAccountsPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadUser();
    return () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    };
  }, []);

  useEffect(() => {
    if (user?.org_id) {
      setupWebSocket();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const setupWebSocket = () => {
    if (!user?.org_id) return;
    
    if (ws) {
      ws.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ Accounts WebSocket connected');
        setWsConnected(true);
        
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `accounts.org.${user.org_id}`
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📊 Accounts update received:', message.type);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries(['invoice-features']);
          queryClient.invalidateQueries(['payment-scores']);
          queryClient.invalidateQueries(['clients']);
          setLastUpdated(new Date());
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        
        setTimeout(() => {
          if (user?.org_id) {
            setupWebSocket();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('WebSocket setup error:', error);
      setWsConnected(false);
    }
  };

  // Fetch data
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const { data: features = [] } = useQuery({
    queryKey: ['invoice-features', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.InvoiceFeatures.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['payment-scores', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.PaymentScore.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  // Compute features and scores
  const computeMetrics = async () => {
    if (!user?.org_id) return;
    
    setIsComputing(true);
    try {
      // Step 1: Compute features
      await base44.functions.invoke('accounts.computeInvoiceFeatures', {
        org_id: user.org_id
      });

      // Step 2: Score payments
      await base44.functions.invoke('accounts.scorePayments', {
        org_id: user.org_id
      });

      // Step 3: Apply credit policy
      await base44.functions.invoke('accounts.applyCreditPolicy', {
        org_id: user.org_id
      });

      // Refresh data
      queryClient.invalidateQueries(['invoice-features']);
      queryClient.invalidateQueries(['payment-scores']);
      queryClient.invalidateQueries(['clients']);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error computing metrics:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const handleExport = async () => {
    const response = await base44.functions.invoke('accounts.exportOverdues');
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overdue-invoices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  // Calculate summary metrics
  const today = new Date();
  const overdueInvoices = invoices.filter(i => {
    if (i.status === 'paid' || i.status === 'cancelled') return false;
    if (!i.due_date) return false;
    return new Date(i.due_date) < today;
  });

  const totalOverdueValue = overdueInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const highRiskCount = scores.filter(s => s.risk_band === 'HIGH').length;
  
  // Calculate average days to pay
  const paidInvoices = invoices.filter(i => i.status === 'paid' && i.paid_date && i.issue_date);
  let avgDaysToPay = 0;
  if (paidInvoices.length > 0) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentPaid = paidInvoices.filter(i => new Date(i.paid_date) >= sixMonthsAgo);
    if (recentPaid.length > 0) {
      const totalDays = recentPaid.reduce((sum, i) => {
        const issued = new Date(i.issue_date);
        const paid = new Date(i.paid_date);
        return sum + Math.floor((paid - issued) / (1000 * 60 * 60 * 24));
      }, 0);
      avgDaysToPay = Math.round(totalDays / recentPaid.length);
    }
  }

  // At-risk clients (those with hold flags or high overdue)
  const atRiskClients = clients.filter(c => {
    const clientOverdue = overdueInvoices
      .filter(i => i.client_id === c.id)
      .reduce((sum, i) => sum + (i.total || 0), 0);
    
    const hasHold = c.terms_json?.hold_non_critical;
    return hasHold || clientOverdue > 10000;
  }).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Accounts Dashboard</h1>
          <p className="text-[#CED4DA]">Payment probability scoring, LPCD calculations, and credit control</p>
        </div>
        <div className="flex items-center gap-3">
          {wsConnected && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              LIVE
            </Badge>
          )}
          {lastUpdated && (
            <span className="text-xs text-[#CED4DA]">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
          >
            <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Export CSV
          </Button>
          <Button
            onClick={computeMetrics}
            disabled={isComputing}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isComputing ? 'animate-spin' : ''}`} />
            {isComputing ? 'Computing...' : 'Compute Scores'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Overdue Exposure */}
        <div className="glass-panel rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Overdue Exposure</div>
          <div className="text-3xl font-bold text-red-400">
            £{totalOverdueValue.toLocaleString()}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            {overdueInvoices.length} invoices
          </div>
        </div>

        {/* High Risk */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">High-Risk Invoices</div>
          <div className="text-3xl font-bold text-orange-400">
            {highRiskCount}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            Score &lt;0.5
          </div>
        </div>

        {/* Average Days to Pay */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Avg Days to Pay</div>
          <div className="text-3xl font-bold text-blue-400">
            {avgDaysToPay}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            Rolling 6 months
          </div>
        </div>

        {/* At-Risk Clients */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">At-Risk Clients</div>
          <div className="text-3xl font-bold text-purple-400">
            {atRiskClients}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            On hold or high overdue
          </div>
        </div>

        {/* Actions Today */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Actions Queued</div>
          <div className="text-3xl font-bold text-green-400">
            {scores.filter(s => s.next_action && !s.next_action.includes('Monitor')).length}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            Reminders pending
          </div>
        </div>
      </div>

      {/* Invoice Risk Table */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h2 className="text-xl font-bold text-white mb-4">Invoices Ranked by Payment Risk</h2>
        <InvoiceRiskTable
          invoices={invoices}
          features={features}
          scores={scores}
          clients={clients}
          onInvoiceSelect={setSelectedInvoice}
          onRefresh={() => {
            queryClient.invalidateQueries(['invoice-features']);
            queryClient.invalidateQueries(['payment-scores']);
          }}
        />
      </div>

      {/* Client Credit Control */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h2 className="text-xl font-bold text-white mb-4">Client Credit Control</h2>
        <ClientCreditTable
          clients={clients}
          invoices={invoices}
          scores={scores}
          onRefresh={() => queryClient.invalidateQueries(['clients'])}
        />
      </div>

      {/* Right Panel - LPCD Calculator & Score Breakdown */}
      {selectedInvoice && (
        <div className="fixed right-0 top-0 bottom-0 w-96 glass-panel-strong border-l border-[rgba(255,255,255,0.1)] p-6 overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Invoice Analysis</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedInvoice(null)}
              className="text-[#CED4DA]"
            >
              <AlertCircle className="w-4 h-4" />
            </Button>
          </div>

          <ScoreBreakdown
            invoice={selectedInvoice}
            score={scores.find(s => s.invoice_id === selectedInvoice.id)}
            feature={features.find(f => f.invoice_id === selectedInvoice.id)}
          />

          <div className="mt-6">
            <LPCDCalculator
              invoice={selectedInvoice}
              orgId={user?.org_id}
            />
          </div>
        </div>
      )}
    </div>
  );
}