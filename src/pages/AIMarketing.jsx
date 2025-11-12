import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Zap,
  RefreshCw,
  Activity,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  TrendingDown,
  Sliders,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import BudgetAllocator from "../components/marketing/BudgetAllocator";
import QuoteOptimiserPanel from "../components/marketing/QuoteOptimiserPanel";

// WebSocket
let ws = null;

export default function AIMarketingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

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
        console.log('✅ Marketing WebSocket connected');
        setWsConnected(true);
        
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `marketing.org.${user.org_id}`
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📊 Marketing update received:', message.type);
          
          queryClient.invalidateQueries(['marketing-metrics']);
          queryClient.invalidateQueries(['next-best-actions']);
          queryClient.invalidateQueries(['lead-sources']);
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
  const { data: metrics = [] } = useQuery({
    queryKey: ['marketing-metrics', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.MarketingMetricsDaily.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['next-best-actions', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.NextBestAction.filter({ 
        org_id: user.org_id,
        status: 'pending'
      });
    },
    enabled: !!user?.org_id,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['lead-sources', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.LeadSource.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  const { data: leadEvents = [] } = useQuery({
    queryKey: ['lead-events', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.LeadEvent.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['campaign-allocations', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.CampaignAllocation.filter({ 
        org_id: user.org_id,
        status: 'PENDING'
      });
    },
    enabled: !!user?.org_id,
  });

  const { data: optimisations = [] } = useQuery({
    queryKey: ['quote-optimisations', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.QuoteOptimisation.filter({ 
        org_id: user.org_id,
        applied: false
      });
    },
    enabled: !!user?.org_id,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
  });

  // Compute metrics
  const computeMetrics = async () => {
    if (!user?.org_id) return;
    
    setIsComputing(true);
    try {
      await base44.functions.invoke('marketing.computeMetrics', {
        org_id: user.org_id
      });

      queryClient.invalidateQueries(['marketing-metrics']);
      queryClient.invalidateQueries(['next-best-actions']);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error computing metrics:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const runBudgetAllocation = async () => {
    if (!user?.org_id) return;
    
    setIsComputing(true);
    try {
      await base44.functions.invoke('marketing.allocateBudget', {
        org_id: user.org_id
      });

      queryClient.invalidateQueries(['campaign-allocations']);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error allocating budget:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const runQuoteOptimisation = async () => {
    if (!user?.org_id) return;
    
    setIsComputing(true);
    try {
      await base44.functions.invoke('quoteOptimiser', {
        org_id: user.org_id
      });

      queryClient.invalidateQueries(['quote-optimisations']);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error optimising quotes:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const handleExport = async () => {
    const response = await base44.functions.invoke('marketing.exportMetrics');
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-metrics-30d-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const dismissActionMutation = useMutation({
    mutationFn: (actionId) => base44.entities.NextBestAction.update(actionId, { status: 'dismissed' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['next-best-actions']);
    }
  });

  // Calculate summary metrics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentMetrics = metrics
    .filter(m => new Date(m.date) >= thirtyDaysAgo)
    .sort((a, b) => a.date.localeCompare(b.date));

  const avgConversionRate = recentMetrics.length > 0
    ? recentMetrics.reduce((sum, m) => sum + (m.conversion_rate || 0), 0) / recentMetrics.length
    : 0;

  const totalRevenue = recentMetrics.reduce((sum, m) => sum + (m.revenue_realised || 0), 0);
  const totalSpend = recentMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
  const avgROI = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Top source
  const topSource = recentMetrics.length > 0
    ? recentMetrics[recentMetrics.length - 1]?.top_source || 'N/A'
    : 'N/A';

  // Client reactivation opportunities
  const reactivationActions = actions.filter(a => a.action_type === 'REACTIVATE_CLIENT');

  // ROI by source (calculate from lead events)
  const sourceROI = sources.map(source => {
    const sourceEvents = leadEvents.filter(e => e.source_id === source.id);
    const revenue = sourceEvents
      .filter(e => e.event_type === 'INVOICE_PAID')
      .reduce((sum, e) => sum + (e.event_value || 0), 0);
    const spend = source.cost_per_month || 0;
    const roi = spend > 0 ? revenue / spend : 0;

    return {
      name: source.name,
      roi: Math.round(roi * 100) / 100,
      revenue,
      spend
    };
  }).sort((a, b) => b.roi - a.roi);

  // Lead distribution (pie chart)
  const leadDistribution = sources.map(source => {
    const count = leadEvents.filter(e => 
      e.source_id === source.id && e.event_type === 'ENQUIRY'
    ).length;
    return {
      name: source.name,
      value: count
    };
  }).filter(s => s.value > 0);

  // Conversion rate chart (last 30 days)
  const conversionChartData = recentMetrics.map(m => ({
    date: new Date(m.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    conversion: (m.conversion_rate || 0) * 100
  }));

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const handleActionClick = (action) => {
    if (action.client_id) {
      navigate(`${createPageUrl("Clients")}?id=${action.client_id}`);
    } else if (action.source_id) {
      // Navigate to sources management (if exists) or show modal
      console.log('Navigate to source:', action.source_id);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel-strong border border-[rgba(255,255,255,0.1)] p-3 rounded-lg">
          <p className="text-white font-semibold mb-1">{label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} className="text-xs text-[#CED4DA]">
              <span style={{ color: entry.color }}>{entry.name}: </span>
              <span className="text-white font-semibold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate optimization metrics
  const totalMarginGain = optimisations.reduce((sum, o) => sum + (o.delta_margin || 0), 0);
  const avgAcceptProb = optimisations.length > 0
    ? optimisations.reduce((sum, o) => sum + (o.predicted_accept_prob || 0), 0) / optimisations.length
    : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Marketing Dashboard</h1>
          <p className="text-[#CED4DA]">Conversion analysis, ROI tracking, and next-best-action recommendations</p>
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
            {isComputing ? 'Computing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Tabs: Dashboard | Optimisation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass-panel border-[rgba(255,255,255,0.08)]">
          <TabsTrigger 
            value="dashboard"
            className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white"
          >
            <Activity className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="optimisation"
            className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white"
          >
            <Sliders className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Optimisation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Conversion Rate */}
        <div className={`glass-panel rounded-2xl p-6 border ${
          avgConversionRate >= 0.6 ? 'border-green-500/30' :
          avgConversionRate >= 0.4 ? 'border-yellow-500/30' :
          'border-red-500/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl ${
              avgConversionRate >= 0.6 ? 'bg-green-500/20' :
              avgConversionRate >= 0.4 ? 'bg-yellow-500/20' :
              'bg-red-500/20'
            } flex items-center justify-center`}>
              <Target className={`w-5 h-5 ${
                avgConversionRate >= 0.6 ? 'text-green-400' :
                avgConversionRate >= 0.4 ? 'text-yellow-400' :
                'text-red-400'
              }`} strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Conversion Rate</div>
          <div className={`text-3xl font-bold ${
            avgConversionRate >= 0.6 ? 'text-green-400' :
            avgConversionRate >= 0.4 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {(avgConversionRate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">Last 30 days</div>
        </div>

        {/* Average ROI */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Average ROI</div>
          <div className="text-3xl font-bold text-blue-400">
            {avgROI.toFixed(1)}x
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            £{totalRevenue.toLocaleString()} / £{totalSpend.toLocaleString()}
          </div>
        </div>

        {/* Top Source */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Top Source</div>
          <div className="text-xl font-bold text-purple-400">
            {topSource}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            {sourceROI.length > 0 ? `${sourceROI[0]?.roi?.toFixed(1)}x ROI` : 'No data'}
          </div>
        </div>

        {/* Reactivation Opportunities */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Reactivation Opps</div>
          <div className="text-3xl font-bold text-orange-400">
            {reactivationActions.length}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">Dormant clients</div>
        </div>

        {/* Next Actions */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Actions Pending</div>
          <div className="text-3xl font-bold text-green-400">
            {actions.length}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            {actions.filter(a => a.confidence >= 0.8).length} high confidence
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Rate Trend */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-bold text-white mb-4">Conversion Rate (30 Days)</h3>
          {conversionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={conversionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#CED4DA" 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#CED4DA" 
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="conversion" 
                  name="Conversion %" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[#CED4DA]">
              No data available - run Sync Now
            </div>
          )}
        </div>

        {/* ROI by Source */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-bold text-white mb-4">ROI by Source</h3>
          {sourceROI.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceROI.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#CED4DA" 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#CED4DA" 
                  style={{ fontSize: '12px' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="roi" name="ROI" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[#CED4DA]">
              No sources configured
            </div>
          )}
        </div>
      </div>

          {/* Lead Distribution Pie */}
          {leadDistribution.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-bold text-white mb-4">Lead Distribution by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {leadDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          </div>
          )}

          {/* Next Best Actions Table */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h2 className="text-xl font-bold text-white mb-4">Next Best Actions</h2>
        {actions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No pending actions</h3>
            <p className="text-[#CED4DA]">Run Sync Now to generate recommendations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.slice(0, 10).map((action) => {
              const client = action.client_id ? clients.find(c => c.id === action.client_id) : null;
              const source = action.source_id ? sources.find(s => s.id === action.source_id) : null;
              
              return (
                <div
                  key={action.id}
                  className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${
                          action.confidence >= 0.8 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          action.confidence >= 0.6 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        } border`}>
                          {Math.round(action.confidence * 100)}% Confidence
                        </Badge>
                        <Badge className="text-xs">
                          {action.action_type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-white mb-2">{action.description}</p>
                      <div className="flex items-center gap-4 text-xs text-[#CED4DA]">
                        {client && <span>Target: {client.name}</span>}
                        {source && <span>Source: {source.name}</span>}
                        {action.due_date && (
                          <span>Due: {new Date(action.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleActionClick(action)}
                        size="sm"
                        className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => dismissActionMutation.mutate(action.id)}
                        size="sm"
                        variant="ghost"
                        className="text-[#CED4DA]"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        </TabsContent>

        <TabsContent value="optimisation" className="space-y-6 mt-6">
          {/* Optimization Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <div className="text-sm text-[#CED4DA] mb-1">Budget Changes Pending</div>
              <div className="text-3xl font-bold text-white">{allocations.length}</div>
              <div className="text-xs text-[#CED4DA] mt-1">
                {allocations.filter(a => a.change_pct > 0).length} increases, {allocations.filter(a => a.change_pct < 0).length} decreases
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <div className="text-sm text-[#CED4DA] mb-1">Quotes Optimised</div>
              <div className="text-3xl font-bold text-white">{optimisations.length}</div>
              <div className="text-xs text-[#CED4DA] mt-1">
                Avg {Math.round(avgAcceptProb * 100)}% accept probability
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-green-500/30 bg-green-500/5">
              <div className="text-sm text-[#CED4DA] mb-1">Expected Margin Gain</div>
              <div className="text-3xl font-bold text-green-400">
                +£{totalMarginGain.toFixed(0)}
              </div>
              <div className="text-xs text-[#CED4DA] mt-1">
                If all recommendations applied
              </div>
            </div>
          </div>

          {/* Campaign Budget Allocator */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
                Campaign Budget Allocator
              </h3>
              <Button
                onClick={runBudgetAllocation}
                disabled={isComputing}
                size="sm"
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isComputing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                Recalculate Allocation
              </Button>
            </div>
            <BudgetAllocator
              allocations={allocations}
              sources={sources}
              onRefresh={() => {
                queryClient.invalidateQueries(['campaign-allocations']);
                queryClient.invalidateQueries(['lead-sources']);
              }}
            />
          </div>

          {/* Quote Optimiser */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
                Quote Markup Optimiser
              </h3>
              <Button
                onClick={runQuoteOptimisation}
                disabled={isComputing}
                size="sm"
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isComputing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                Optimise Quotes
              </Button>
            </div>
            <QuoteOptimiserPanel
              optimisations={optimisations}
              quotes={quotes}
              onRefresh={() => {
                queryClient.invalidateQueries(['quote-optimisations']);
                queryClient.invalidateQueries(['quotes']);
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}