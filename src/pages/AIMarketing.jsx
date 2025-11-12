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
  BarChart3,
  PieChart,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import NextBestActionsTable from "../components/marketing/NextBestActionsTable";
import SourcePerformanceTable from "../components/marketing/SourcePerformanceTable";

// WebSocket for live updates
let ws = null;

export default function AIMarketingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

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
      const allMetrics = await base44.entities.MarketingMetricsDaily.filter({
        org_id: user.org_id
      });
      return allMetrics.sort((a, b) => a.date.localeCompare(b.date));
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

  const computeMetrics = async () => {
    if (!user?.org_id) return;
    
    setIsComputing(true);
    try {
      await base44.functions.invoke('marketing.computeMetrics');
      
      queryClient.invalidateQueries(['marketing-metrics']);
      queryClient.invalidateQueries(['next-best-actions']);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error computing metrics:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const handleExport = async () => {
    const response = await base44.functions.invoke('marketing.exportMarketing', {
      range: '30d'
    });
    
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

  // Calculate summary metrics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const recentMetrics = metrics.filter(m => m.date >= thirtyDaysAgoStr);

  const avgConversion = recentMetrics.length > 0
    ? (recentMetrics.reduce((sum, m) => sum + (m.conversion_rate || 0), 0) / recentMetrics.length) * 100
    : 0;

  const totalRevenue = recentMetrics.reduce((sum, m) => sum + (m.revenue_realised || 0), 0);
  const totalSpend = recentMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
  const overallROI = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Calculate ROI by source
  const sourceROIs = sources.map(source => {
    const sourceRevenue = leadEvents
      .filter(e => e.source_id === source.id && e.event_type === 'INVOICE_PAID')
      .reduce((sum, e) => sum + (e.event_value || 0), 0);
    
    const sourceCost = source.cost_per_month || 0;
    const roi = sourceCost > 0 ? sourceRevenue / sourceCost : 0;

    return {
      name: source.name,
      roi: Math.round(roi * 100) / 100,
      revenue: sourceRevenue,
      spend: sourceCost
    };
  }).sort((a, b) => b.roi - a.roi);

  const topSource = sourceROIs[0];

  // Lead distribution
  const leadDistribution = sources.map(source => {
    const count = leadEvents.filter(e => 
      e.source_id === source.id && e.event_type === 'ENQUIRY'
    ).length;
    
    return {
      name: source.name,
      value: count
    };
  }).filter(s => s.value > 0);

  // Conversion trend (last 30 days)
  const conversionTrend = recentMetrics.map(m => ({
    date: new Date(m.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    'Conversion %': Math.round((m.conversion_rate || 0) * 100)
  }));

  // Client reactivation opportunities
  const reactivationCount = actions.filter(a => a.action_type === 'REACTIVATE_CLIENT').length;

  const COLORS = ['#E1467C', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel-strong border border-[rgba(255,255,255,0.1)] p-3 rounded-lg">
          <p className="text-white font-semibold mb-2">{label}</p>
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Marketing Dashboard</h1>
          <p className="text-[#CED4DA]">Conversion analytics, ROI tracking, and next-best-action recommendations</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Conversion Rate */}
        <div className={`glass-panel rounded-2xl p-6 border ${
          avgConversion >= 40 ? 'border-green-500/30' :
          avgConversion >= 25 ? 'border-yellow-500/30' :
          'border-red-500/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              avgConversion >= 40 ? 'bg-green-500/20' :
              avgConversion >= 25 ? 'bg-yellow-500/20' :
              'bg-red-500/20'
            }`}>
              <Target className={`w-5 h-5 ${
                avgConversion >= 40 ? 'text-green-400' :
                avgConversion >= 25 ? 'text-yellow-400' :
                'text-red-400'
              }`} strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Conversion Rate</div>
          <div className={`text-3xl font-bold ${
            avgConversion >= 40 ? 'text-green-400' :
            avgConversion >= 25 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {avgConversion.toFixed(1)}%
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">Last 30 days</div>
        </div>

        {/* Overall ROI */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Overall ROI</div>
          <div className="text-3xl font-bold text-blue-400">
            {overallROI.toFixed(1)}x
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
          <div className="text-xl font-bold text-purple-400 truncate">
            {topSource?.name || 'N/A'}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">
            {topSource ? `${topSource.roi}x ROI` : 'No data'}
          </div>
        </div>

        {/* Reactivation Opportunities */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Reactivation Opps</div>
          <div className="text-3xl font-bold text-green-400">
            {reactivationCount}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">Dormant clients</div>
        </div>

        {/* Actions Today */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-[#CED4DA] mb-1">Actions Pending</div>
          <div className="text-3xl font-bold text-orange-400">
            {actions.length}
          </div>
          <div className="text-xs text-[#CED4DA] mt-1">Next best actions</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Rate Trend */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
            Conversion Rate (30 Days)
          </h3>
          {conversionTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={conversionTrend}>
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
                  dataKey="Conversion %" 
                  stroke="#E1467C" 
                  strokeWidth={3}
                  dot={{ fill: '#E1467C', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-[#CED4DA]">
              No conversion data yet
            </div>
          )}
        </div>

        {/* ROI by Source */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
            ROI by Source
          </h3>
          {sourceROIs.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceROIs}>
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
                <Bar dataKey="roi" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-[#CED4DA]">
              No source data yet
            </div>
          )}
        </div>
      </div>

      {/* Lead Distribution Pie */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
          Lead Distribution by Source
        </h3>
        {leadDistribution.length > 0 ? (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={leadDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-[#CED4DA]">
            No lead data yet
          </div>
        )}
      </div>

      {/* Next Best Actions */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
          Next Best Actions
        </h3>
        <NextBestActionsTable
          actions={actions}
          clients={[]}
          onRefresh={() => queryClient.invalidateQueries(['next-best-actions'])}
        />
      </div>

      {/* Source Performance Details */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-lg font-bold text-white mb-4">Source Performance Details</h3>
        <SourcePerformanceTable
          sources={sources}
          leadEvents={leadEvents}
        />
      </div>
    </div>
  );
}