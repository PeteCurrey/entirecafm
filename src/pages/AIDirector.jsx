
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  AlertTriangle,
  Users,
  DollarSign,
  Heart,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  ExternalLink,
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
  const [revenueProjection, setRevenueProjection] = useState(null);

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

  // Fetch latest revenue projection
  const { data: latestProjection } = useQuery({
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
  });

  useEffect(() => {
    if (latestProjection) {
      setRevenueProjection(latestProjection);
    }
  }, [latestProjection]);

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
      
      console.log('📊 Dashboard response:', result.data);
      
      if (result.data && result.data.success) {
        setDashboardData(result.data);
        setLastUpdated(new Date());
        console.log('✅ Dashboard data loaded successfully');
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

  const runRevenueSimulator = async () => {
    if (!user?.org_id) return;
    
    try {
      const result = await base44.functions.invoke('revenueSimulator', {
        org_id: user.org_id
      });
      
      if (result.data.success) {
        queryClient.invalidateQueries(['revenue-projection']);
        console.log('✅ Revenue forecast updated');
      }
    } catch (error) {
      console.error("Error running revenue simulator:", error);
    }
  };

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
        console.log('✅ WebSocket connected');
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
            console.log('📊 Dashboard update received via WebSocket');
            setDashboardData(message.data);
            setLastUpdated(new Date());
          }
          
          if (message.type === 'revenue_forecast_available') {
            console.log('💷 Revenue forecast update received');
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
        console.log('WebSocket disconnected');
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

  // Navigation handlers with scroll position preservation
  const handleNavigate = (path) => {
    sessionStorage.setItem('directorScrollPosition', scrollPositionRef.current.toString());
    navigate(path);
  };

  const handleSLARiskClick = () => {
    handleNavigate(`${createPageUrl("Jobs")}?filter=sla_risk&sort=due_at_asc&from=director`);
  };

  const handleJobClick = (jobId) => {
    handleNavigate(`${createPageUrl("JobDetail")}?id=${jobId}&from=director`);
  };

  const handleUtilisationClick = () => {
    handleNavigate(`${createPageUrl("Team")}?sort=utilisation_desc&window=48h&from=director`);
  };

  const handleFinancialsClick = () => {
    handleNavigate(`${createPageUrl("Invoices")}?status=overdue&from=director`);
  };

  const handleClientClick = (clientId) => {
    handleNavigate(`${createPageUrl("Clients")}?id=${clientId}&tab=health&from=director`);
  };

  const getHealthColor = (score) => {
    if (score >= 80) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'HEALTHY' };
    if (score >= 60) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'NEEDS ATTENTION' };
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'CRITICAL' };
  };

  const getUtilisationColor = (pct) => {
    if (pct >= 85) return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'OVERLOADED' };
    if (pct >= 70) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'BUSY' };
    if (pct >= 50) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'OPTIMAL' };
    return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'AVAILABLE' };
  };

  const getRiskColor = (count) => {
    if (count === 0) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'ON TRACK' };
    if (count <= 3) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'MONITOR' };
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'URGENT ACTION' };
  };

  const getFinancialColor = (overdueValue) => {
    if (overdueValue === 0) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'CURRENT' };
    if (overdueValue < 10000) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'REVIEW' };
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'COLLECTION REQUIRED' };
  };

  if (!dashboardData && !isLoadingDashboard) {
    return (
      <div className="p-6 lg:p-8">
        <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-[#E1467C]" />
          <h2 className="text-2xl font-bold text-white mb-2">Director Dashboard</h2>
          <p className="text-[#CED4DA] mb-6">Load operational intelligence and key metrics</p>
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
        <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
          <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#CED4DA]">Aggregating operational intelligence...</p>
        </div>
      </div>
    );
  }

  const healthColors = getHealthColor(dashboardData?.org_health_score || 0);
  const utilisationColors = getUtilisationColor(dashboardData?.summary?.avg_engineer_utilisation || 0);
  const riskColors = getRiskColor(dashboardData?.summary?.sla_breaches || 0);
  const financialColors = getFinancialColor(dashboardData?.financials?.outstanding_invoices?.overdue_value || 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Director Operations Dashboard</h1>
          <p className="text-[#CED4DA]">Real-time operational intelligence and financial metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.org_id && <AlertNotificationDropdown orgId={user.org_id} />}
          <Button
            onClick={() => setShowAlertsDialog(true)}
            variant="outline"
            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
          >
            <Bell className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Alerts ({alertRules.filter(r => r.is_active).length})
          </Button>
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
            onClick={loadDashboard}
            disabled={isLoadingDashboard}
            variant="outline"
            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingDashboard ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs: Dashboard | Trends */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass-panel border-[rgba(255,255,255,0.08)] mb-6">
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

        <TabsContent value="dashboard" className="space-y-6">
          {/* Revenue Forecast Cards */}
          {revenueProjection && (
            <>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
                Revenue Forecast
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className={`glass-panel rounded-2xl p-6 border ${
                  revenueProjection.risk_band === 'LOW' ? 'border-green-500/30' :
                  revenueProjection.risk_band === 'MED' ? 'border-yellow-500/30' :
                  'border-red-500/30'
                }`}>
                  <div className="text-sm text-[#CED4DA] mb-1">30-Day Projection</div>
                  <div className={`text-3xl font-bold ${
                    revenueProjection.risk_band === 'LOW' ? 'text-green-400' :
                    revenueProjection.risk_band === 'MED' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    £{(revenueProjection.projection_30d || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#CED4DA] mt-1">{revenueProjection.risk_band} Risk</div>
                </div>

                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">90-Day Projection</div>
                  <div className="text-3xl font-bold text-white">
                    £{(revenueProjection.projection_90d || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#CED4DA] mt-1">
                    Confirmed: £{(revenueProjection.confirmed_pipeline_value || 0).toLocaleString()}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">Expected Margin</div>
                  <div className="text-3xl font-bold text-green-400">
                    £{(revenueProjection.expected_margin || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#CED4DA] mt-1">AI-optimised</div>
                </div>

                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">Collection Probability</div>
                  <div className={`text-3xl font-bold ${
                    (revenueProjection.assumptions_json?.collection_ratio || 0) >= 0.9 ? 'text-green-400' :
                    (revenueProjection.assumptions_json?.collection_ratio || 0) >= 0.7 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {Math.round((revenueProjection.assumptions_json?.collection_ratio || 0) * 100)}%
                  </div>
                  <div className="text-xs text-[#CED4DA] mt-1">
                    Expected: £{(revenueProjection.expected_collections || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 5 Core Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. ORG HEALTH */}
            <div className={`glass-panel rounded-2xl p-6 border ${healthColors.border} transition-all hover:border-[rgba(255,255,255,0.12)]`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${healthColors.bg} flex items-center justify-center`}>
                    <Heart className={`w-6 h-6 ${healthColors.text}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">ORG HEALTH</h3>
                    <Badge className={`${healthColors.bg} ${healthColors.text} border ${healthColors.border} text-xs mt-1`}>
                      {healthColors.label}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${healthColors.text}`}>
                    {dashboardData?.org_health_score || 0}
                  </div>
                  <div className="text-xs text-[#CED4DA]">/ 100</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#CED4DA]">Active Jobs</span>
                  <span className="text-white font-semibold">{dashboardData?.summary?.active_jobs || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#CED4DA]">Completed</span>
                  <span className="text-white font-semibold">{dashboardData?.summary?.completed_jobs || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-[#CED4DA]`}>SLA Breaches</span>
                  <span className={`font-bold ${dashboardData?.summary?.sla_breaches > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {dashboardData?.summary?.sla_breaches || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. SLA RISK - Clickable */}
            <div 
              onClick={handleSLARiskClick}
              className={`glass-panel rounded-2xl p-6 border ${riskColors.border} transition-all hover:border-[rgba(255,255,255,0.15)] cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${riskColors.bg} flex items-center justify-center`}>
                    <AlertTriangle className={`w-6 h-6 ${riskColors.text}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">SLA RISK</h3>
                    <Badge className={`${riskColors.bg} ${riskColors.text} border ${riskColors.border} text-xs mt-1`}>
                      {riskColors.label}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${riskColors.text}`}>
                    {dashboardData?.summary?.at_risk_jobs || 0}
                  </div>
                  <div className="text-xs text-[#CED4DA]">Jobs at risk</div>
                </div>
              </div>
              <div className="space-y-2">
                {dashboardData?.at_risk_jobs?.slice(0, 3).map((job, idx) => (
                  <div 
                    key={idx} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJobClick(job.id);
                    }}
                    className="flex items-center justify-between text-xs hover:bg-[rgba(255,255,255,0.04)] p-1 rounded transition-all cursor-pointer"
                  >
                    <span className="text-[#CED4DA] truncate flex-1">{job.title}</span>
                    <Badge className={`ml-2 ${job.sla_risk_pct >= 100 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {job.sla_risk_pct}%
                    </Badge>
                  </div>
                )) || <p className="text-xs text-[#CED4DA]">No jobs at risk</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-xs text-[#CED4DA]">
                <span>View all at-risk jobs</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* 3. ENGINEER UTILISATION - Clickable */}
            <div 
              onClick={handleUtilisationClick}
              className={`glass-panel rounded-2xl p-6 border ${utilisationColors.border} transition-all hover:border-[rgba(255,255,255,0.15)] cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${utilisationColors.bg} flex items-center justify-center`}>
                    <Users className={`w-6 h-6 ${utilisationColors.text}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">UTILISATION</h3>
                    <Badge className={`${utilisationColors.bg} ${utilisationColors.text} border ${utilisationColors.border} text-xs mt-1`}>
                      {utilisationColors.label}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${utilisationColors.text}`}>
                    {dashboardData?.summary?.avg_engineer_utilisation || 0}%
                  </div>
                  <div className="text-xs text-[#CED4DA]">Next 48h</div>
                </div>
              </div>
              <div className="space-y-2">
                {dashboardData?.engineers_utilisation?.slice(0, 3).map((eng, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs hover:bg-[rgba(255,255,255,0.04)] p-1 rounded transition-all">
                    <span className="text-[#CED4DA] truncate flex-1">{eng.engineer_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white">{eng.jobs_next_48h} jobs</span>
                      <Badge className={`${
                        eng.capacity_pct >= 85 ? 'bg-red-500/20 text-red-400' :
                        eng.capacity_pct >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {eng.capacity_pct}%
                      </Badge>
                    </div>
                  </div>
                )) || <p className="text-xs text-[#CED4DA]">No engineer data</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-xs text-[#CED4DA]">
                <span>View all engineers</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* 4. FINANCIALS - Clickable */}
            <div 
              onClick={handleFinancialsClick}
              className={`glass-panel rounded-2xl p-6 border ${financialColors.border} lg:col-span-2 transition-all hover:border-[rgba(255,255,255,0.15)] cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${financialColors.bg} flex items-center justify-center`}>
                    <DollarSign className={`w-6 h-6 ${financialColors.text}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">FINANCIALS</h3>
                    <Badge className={`${financialColors.bg} ${financialColors.text} border ${financialColors.border} text-xs mt-1`}>
                      {financialColors.label}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${financialColors.text}`}>
                    £{(dashboardData?.financials?.total_at_risk || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#CED4DA]">Total at risk</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-[#CED4DA] mb-1">Overdue Invoices</div>
                  <div className="text-2xl font-bold text-red-400">
                    £{(dashboardData?.financials?.outstanding_invoices?.overdue_value || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#CED4DA]">
                    {dashboardData?.financials?.outstanding_invoices?.overdue_count || 0} invoices
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#CED4DA] mb-1">Approved Unbilled</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    £{(dashboardData?.financials?.unbilled_quotes?.approved_unbilled || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#CED4DA]">Quotes ready to invoice</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-xs text-[#CED4DA]">
                <span>View overdue invoices</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* 5. CLIENT SENTIMENT */}
            <div className={`glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] transition-all hover:border-[rgba(255,255,255,0.12)]`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center`}>
                    <TrendingUp className={`w-6 h-6 text-purple-400`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">CLIENT HEALTH</h3>
                    <Badge className={`${
                      (dashboardData?.client_health?.unhealthy_clients || 0) === 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      (dashboardData?.client_health?.unhealthy_clients || 0) <= 3 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-red-500/20 text-red-400 border-red-500/30'
                    } border text-xs mt-1`}>
                      {(dashboardData?.client_health?.unhealthy_clients || 0) === 0 ? 'ALL HEALTHY' :
                       (dashboardData?.client_health?.unhealthy_clients || 0) <= 3 ? 'MONITOR' :
                       'ACTION REQUIRED'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${
                    (dashboardData?.client_health?.unhealthy_clients || 0) === 0 ? 'text-green-400' :
                    (dashboardData?.client_health?.unhealthy_clients || 0) <= 3 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {dashboardData?.client_health?.unhealthy_clients || 0}
                  </div>
                  <div className="text-xs text-[#CED4DA]">At risk</div>
                </div>
              </div>
              <div className="space-y-2">
                {dashboardData?.client_health?.top_risk_clients?.slice(0, 3).map((client, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleClientClick(client.client_id)}
                    className="flex items-center justify-between text-xs hover:bg-[rgba(255,255,255,0.04)] p-1 rounded transition-all cursor-pointer"
                  >
                    <span className="text-[#CED4DA] truncate flex-1">{client.client_name}</span>
                    <Badge className={`ml-2 ${
                      client.health_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {client.health_score}
                    </Badge>
                  </div>
                )) || <p className="text-xs text-green-400">All clients healthy</p>}
              </div>
            </div>
          </div>

          {/* Detailed Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <h3 className="text-lg font-bold text-white mb-4">At-Risk Jobs</h3>
              <div className="space-y-2">
                {dashboardData?.at_risk_jobs?.slice(0, 5).map((job, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleJobClick(job.id)}
                    className="glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">{job.title}</span>
                          <Badge className="text-xs">{job.job_number}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#CED4DA]">
                          <Clock className="w-3 h-3" />
                          <span>SLA: {new Date(job.sla_due_date).toLocaleString()}</span>
                        </div>
                      </div>
                      <Badge className={`${
                        job.sla_risk_pct >= 100 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      } border`}>
                        {job.sla_risk_pct}% RISK
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end text-xs text-[#CED4DA]">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View details
                    </div>
                  </div>
                )) || <p className="text-[#CED4DA] text-sm">No jobs at risk</p>}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <h3 className="text-lg font-bold text-white mb-4">Next 48h Capacity</h3>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#CED4DA]">Utilisation</span>
                  <span className="text-white font-semibold">
                    {dashboardData?.forecast_summary?.next_48h_capacity?.utilisation_pct || 0}%
                  </span>
                </div>
                <div className="w-full h-3 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      (dashboardData?.forecast_summary?.next_48h_capacity?.utilisation_pct || 0) >= 85 ? 'bg-red-500' :
                      (dashboardData?.forecast_summary?.next_48h_capacity?.utilisation_pct || 0) >= 70 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(dashboardData?.forecast_summary?.next_48h_capacity?.utilisation_pct || 0, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-[#CED4DA] mb-1">Allocated</div>
                  <div className="text-2xl font-bold text-white">
                    {dashboardData?.forecast_summary?.next_48h_capacity?.allocated_jobs || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#CED4DA] mb-1">Available</div>
                  <div className="text-2xl font-bold text-green-400">
                    {dashboardData?.forecast_summary?.next_48h_capacity?.available_slots || 0}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <div className="text-xs text-[#CED4DA] mb-1">7-Day Revenue Projection</div>
                <div className="text-2xl font-bold text-white">
                  £{(dashboardData?.forecast_summary?.next_7d_revenue_projection || 0).toLocaleString()}
                </div>
              </div>
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
              <p className="text-sm text-[#CED4DA]">
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
              <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                <AlertRuleForm
                  onSubmit={(data) => createAlertMutation.mutate(data)}
                  onCancel={() => setShowNewAlertForm(false)}
                />
              </div>
            )}

            {alertRules.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 mx-auto mb-3 text-[#CED4DA] opacity-30" />
                <p className="text-[#CED4DA]">No alert rules configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertRules.map(rule => (
                  <div
                    key={rule.id}
                    className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">
                          {rule.type.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-[#CED4DA]">
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
                    <div className="flex items-center gap-4 text-xs text-[#CED4DA]">
                      <span>Channel: {rule.channel}</span>
                      {rule.destination && (
                        <span className="truncate">→ {rule.destination}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-[rgba(255,255,255,0.08)]">
              <p className="text-xs text-[#CED4DA]">
                ℹ️ Alerts are evaluated every 15 minutes. Duplicate alerts are suppressed for 60 minutes.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
