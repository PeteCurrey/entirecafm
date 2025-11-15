
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Activity,
  Bell,
  Plus,
  Trash2,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import AlertRuleForm from "../components/alerts/AlertRuleForm";
import AlertNotificationDropdown from "../components/alerts/AlertNotificationDropdown";
import TrendsTab from "../components/director/TrendsTab";
import MetricTile from "../components/metrics/MetricTile";
import { LiveBadge } from "@/components/ui/LiveBadge";

// WebSocket connection state
let ws = null;

export default function AIDirectorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollPositionRef = useRef(0);
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const [showNewAlertForm, setShowNewAlertForm] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  // revenueProjection and benchmarkData are no longer directly rendered in the outline,
  // but their fetching logic is kept in case they are used elsewhere or in future iterations.
  // For this outline, their state variables and related effects are removed.
  // const [revenueProjection, setRevenueProjection] = useState(null);
  // const [benchmarkData, setBenchmarkData] = useState(null);

  // Save scroll position before unmount
  useEffect(() => {
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position when returning
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('directorScrollPosition');
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition));
      sessionStorage.removeItem('directorScrollPosition');
    }
  }, []);

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
      loadDashboard();
      setupWebSocket();
    }
  }, [user]);

  const { data: alertRules = [] } = useQuery({
    queryKey: ['alert-rules', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.AlertRule.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  // Fetch latest revenue projection (kept, but not rendered in this outline)
  useQuery({
    queryKey: ['revenue-projection', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return null;
      const projections = await base44.entities.RevenueProjection.filter({ org_id: user.org_id });
      if (projections.length === 0) return null;
      return projections.sort((a, b) => 
        new Date(b.date_generated) - new Date(a.date_generated)
      )[0];
    },
    enabled: !!user?.org_id,
    // onSuccess: (data) => setRevenueProjection(data) // No longer setting state for rendering in this outline
  });

  // Fetch benchmark data (kept, but not rendered in this outline)
  useQuery({
    queryKey: ['benchmarks', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return null;
      const result = await base44.functions.invoke('aiBenchmark', { org_id: user.org_id });
      return result.data;
    },
    enabled: !!user?.org_id,
    // onSuccess: (data) => setBenchmarkData(data) // No longer setting state for rendering in this outline
  });

  const createAlertMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.AlertRule.create({
        ...data,
        org_id: user.org_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['alert-rules']);
      setShowNewAlertForm(false);
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (ruleId) => base44.entities.AlertRule.delete(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries(['alert-rules']);
    },
  });

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadDashboard = async () => {
    if (!user?.org_id) return;
    
    setIsLoadingDashboard(true);
    try {
      const result = await base44.functions.invoke('aiDirectorDashboard', {
        org_id: user.org_id
      });
      
      if (result.data && result.data.success) {
        setDashboardData(result.data);
        setLastUpdated(new Date());
      } else {
        console.error('Dashboard response missing success flag:', result.data);
      }

      // Also refresh revenue projection
      queryClient.invalidateQueries(['revenue-projection']);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      alert(`Dashboard Error: ${error.message || 'Failed to load dashboard'}`);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // runRevenueSimulator is no longer used in the provided outline
  // const runRevenueSimulator = async () => {
  //   if (!user?.org_id) return;
    
  //   try {
  //     const result = await base44.functions.invoke('revenueSimulator', {
  //       org_id: user.org_id
  //     });
      
  //     if (result.data.success) {
  //       queryClient.invalidateQueries(['revenue-projection']);
  //       console.log('✅ Revenue forecast updated');
  //     }
  //   } catch (error) {
  //     console.error("Error running revenue simulator:", error);
  //   }
  // };

  const setupWebSocket = () => {
    if (!user?.org_id) return;
    
    // Close existing connection
    if (ws) {
      ws.close();
    }

    // Get WebSocket URL from environment or construct it
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setWsConnected(true);
        
        // Subscribe to director channel
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `director.org.${user.org_id}`
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'director_dashboard_update') {
            setDashboardData(message.data);
            setLastUpdated(new Date());
          }
          
          if (message.type === 'revenue_forecast_available') {
            queryClient.invalidateQueries(['revenue-projection']);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
        
        // Attempt reconnection after 5 seconds
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

  // Navigation handlers are no longer directly triggered by the metric tiles in the new outline
  const handleNavigate = (path) => {
    sessionStorage.setItem('directorScrollPosition', scrollPositionRef.current.toString());
    navigate(path);
  };

  // The following specific handlers are removed as the new MetricTile components abstract the linking
  // const handleSLARiskClick = () => {
  //   handleNavigate(`${createPageUrl("Jobs")}?filter=sla_risk&sort=due_at_asc&from=director`);
  // };

  // const handleJobClick = (jobId) => {
  //   handleNavigate(`${createPageUrl("JobDetail")}?id=${jobId}&from=director`);
  // };

  // const handleUtilisationClick = () => {
  //   handleNavigate(`${createPageUrl("Team")}?sort=utilisation_desc&window=48h&from=director`);
  // };

  // const handleFinancialsClick = () => {
  //   handleNavigate(`${createPageUrl("Invoices")}?status=overdue&from=director`);
  // };

  // const handleClientClick = (clientId) => {
  //   handleNavigate(`${createPageUrl("Clients")}?id=${clientId}&tab=health&from=director`);
  // };

  // Color utility functions are no longer needed as MetricTile handles styling internally
  // const getHealthColor = (score) => {
  //   if (score >= 80) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'HEALTHY' };
  //   if (score >= 60) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'NEEDS ATTENTION' };
  //   return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'CRITICAL' };
  // };

  // const getUtilisationColor = (pct) => {
  //   if (pct >= 85) return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'OVERLOADED' };
  //   if (pct >= 70) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'BUSY' };
  //   if (pct >= 50) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'OPTIMAL' };
  //   return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'AVAILABLE' };
  // };

  // const getRiskColor = (count) => {
  //   if (count === 0) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'ON TRACK' };
  //   if (count <= 3) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'MONITOR' };
  //   return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'URGENT ACTION' };
  // };

  // const getFinancialColor = (overdueValue) => {
  //   if (overdueValue === 0) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'CURRENT' };
  //   if (overdueValue < 10000) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'REVIEW' };
  //   return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'COLLECTION REQUIRED' };
  // };

  if (!dashboardData && !isLoadingDashboard) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-[18px] bg-[#121216]/95 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset,0_8px_30px_rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.06)] p-12 text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-[#E1467C]" />
          <h2 className="text-2xl font-bold text-white mb-2">Director Dashboard</h2>
          <p className="text-[#96A0AA] mb-6">Load operational intelligence and key metrics</p>
          <Button
            onClick={loadDashboard}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingDashboard) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-[18px] bg-[#121216]/95 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset,0_8px_30px_rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.06)] p-12 text-center">
          <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#96A0AA]">Aggregating operational intelligence...</p>
        </div>
      </div>
    );
  }

  // Color functions are removed, these derived values are also no longer needed
  // const healthColors = getHealthColor(dashboardData?.org_health_score || 0);
  // const utilisationColors = getUtilisationColor(dashboardData?.summary?.avg_engineer_utilisation || 0);
  // const riskColors = getRiskColor(dashboardData?.summary?.sla_breaches || 0);
  // const financialColors = getFinancialColor(dashboardData?.financials?.outstanding_invoices?.overdue_value || 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            AI <span className="text-[#E1467C]">Director Dashboard</span>
          </h1>
          <p className="text-[#96A0AA]">Real-time operational intelligence and financial metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.org_id && <AlertNotificationDropdown orgId={user.org_id} />}
          <Button
            onClick={() => setShowAlertsDialog(true)}
            variant="outline"
            className="border-[rgba(255,255,255,0.06)] text-[#96A0AA] hover:bg-[rgba(255,255,255,0.04)]"
          >
            <Bell className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Alerts ({alertRules.filter(r => r.is_active).length})
          </Button>
          {wsConnected && <LiveBadge />}
          {lastUpdated && (
            <span className="text-xs text-[#96A0AA]">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={loadDashboard}
            disabled={isLoadingDashboard}
            variant="outline"
            className="border-[rgba(255,255,255,0.06)] text-[#96A0AA] hover:bg-[rgba(255,255,255,0.04)]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingDashboard ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs: Dashboard | Trends */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass-panel border-[rgba(255,255,255,0.06)] mb-6">
          <TabsTrigger 
            value="dashboard"
            className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white"
          >
            <Activity className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Live Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="trends"
            className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Historical Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-8">
          {/* AI Director Dashboard Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricTile 
              label="ACTIVE ASSETS"
              value={dashboardData?.summary?.active_jobs || 0}
              delta={+2.1}
              accent="mag"
            />
            <MetricTile 
              label="SLA COMPLIANCE"
              value={`${Math.round(100 - ((dashboardData?.summary?.sla_breaches || 0) / Math.max(dashboardData?.summary?.active_jobs || 1, 1)) * 100)}%`}
              delta={+2.1}
              accent="teal"
            />
            <MetricTile 
              label="AVG RESPONSE"
              value="16min"
              delta={-8}
              accent="mag"
            />
            <MetricTile 
              label="OPEN TICKETS"
              value={dashboardData?.summary?.at_risk_jobs || 0}
              delta={-1}
              accent="teal"
            />
          </div>

          {/* PAFE Predictive Maintenance Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              PAFE <span className="text-[#E1467C]">Predictive Maintenance</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricTile 
                label="PREDICTED FAILURES"
                value={4}
                accent="mag"
              />
              <MetricTile 
                label="MAINTENANCE SCHEDULED"
                value={14}
                accent="teal"
              />
              <MetricTile 
                label="PARTS ORDERED"
                value={10}
                accent="mag"
              />
              <MetricTile 
                label="COST SAVINGS"
                value="33550$"
                accent="teal"
              />
            </div>
          </div>

          {/* Compliance & Sustainability Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Compliance & <span className="text-[#E1467C]">Sustainability</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricTile 
                label="ESG SCORE"
                value={96}
                accent="teal"
              />
              <MetricTile 
                label="REGULATORY COMPLIANCE"
                value="99.0%"
                accent="mag"
              />
              <MetricTile 
                label="AUDITS PENDING"
                value={0}
                accent="teal"
              />
              <MetricTile 
                label="SUSTAINABILITY GOALS"
                value="92%"
                accent="mag"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          {user?.org_id && <TrendsTab orgId={user.org_id} />}
        </TabsContent>
      </Tabs>

      {/* Alert Management Dialog */}
      <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#E1467C]" />
              Alert Rules
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-[#96A0AA]">
                Configure threshold-based alerts for key metrics
              </p>
              <Button
                onClick={() => setShowNewAlertForm(true)}
                size="sm"
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Alert
              </Button>
            </div>

            {showNewAlertForm && (
              <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.06)]">
                <AlertRuleForm
                  onSubmit={(data) => createAlertMutation.mutate(data)}
                  onCancel={() => setShowNewAlertForm(false)}
                />
              </div>
            )}

            {alertRules.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 mx-auto mb-3 text-[#96A0AA] opacity-30" />
                <p className="text-[#96A0AA]">No alert rules configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertRules.map(rule => (
                  <div
                    key={rule.id}
                    className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.06)]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">
                          {rule.type.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-[#96A0AA]">
                          Alert when value {rule.operator} {rule.threshold_number}
                          {rule.type === 'OVERDUE_INVOICES' && ' £'}
                          {rule.type === 'UTILISATION' && '%'}
                          {rule.type === 'ORG_HEALTH' && '/100'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          rule.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          onClick={() => deleteAlertMutation.mutate(rule.id)}
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#96A0AA]">
                      <span>Channel: {rule.channel}</span>
                      {rule.destination && (
                        <span className="truncate">→ {rule.destination}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-[#96A0AA]">
                ℹ️ Alerts are evaluated every 15 minutes. Duplicate alerts are suppressed for 60 minutes.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
