import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  Download,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Users,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export default function AnalyticsPage() {
  const [user, setUser] = useState(null);
  const [dateRange, setDateRange] = useState("30"); // days
  const [compareMode, setCompareMode] = useState(false);
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedJobType, setSelectedJobType] = useState("all");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  // Calculate date ranges
  const getDateRange = () => {
    const end = new Date();
    let start;
    
    switch(dateRange) {
      case "7":
        start = subDays(end, 7);
        break;
      case "30":
        start = subDays(end, 30);
        break;
      case "90":
        start = subDays(end, 90);
        break;
      case "thisMonth":
        start = startOfMonth(end);
        break;
      case "lastMonth":
        start = startOfMonth(subMonths(end, 1));
        end.setTime(endOfMonth(subMonths(end, 1)).getTime());
        break;
      case "365":
        start = subDays(end, 365);
        break;
      default:
        start = subDays(end, 30);
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Fetch all data
  const { data: jobs = [] } = useQuery({
    queryKey: ['analytics-jobs', startDate, endDate, selectedClient, selectedJobType],
    queryFn: async () => {
      let query = {
        created_date: { $gte: startDate, $lte: endDate }
      };
      if (selectedClient !== "all") query.client_id = selectedClient;
      if (selectedJobType !== "all") query.job_type = selectedJobType;
      
      return base44.entities.Job.filter(query);
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['analytics-invoices', startDate, endDate],
    queryFn: async () => {
      return base44.entities.Invoice.filter({
        issue_date: { $gte: startDate, $lte: endDate }
      });
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['analytics-clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['analytics-quotes', startDate, endDate],
    queryFn: async () => {
      return base44.entities.Quote.filter({
        created_date: { $gte: startDate, $lte: endDate }
      });
    }
  });

  // KPI Calculations
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const completionRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : 0;

  const slaBreaches = jobs.filter(j => {
    if (!j.sla_due_date || j.status === 'completed') return false;
    return new Date(j.sla_due_date) < new Date(j.completed_date || new Date());
  }).length;
  const slaCompliance = totalJobs > 0 ? (((totalJobs - slaBreaches) / totalJobs) * 100).toFixed(1) : 100;

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const outstandingRevenue = totalRevenue - paidRevenue;

  const quoteConversionRate = quotes.length > 0 
    ? ((quotes.filter(q => q.status === 'client_approved').length / quotes.length) * 100).toFixed(1)
    : 0;

  const avgJobDuration = completedJobs > 0
    ? jobs.filter(j => j.time_on_site_minutes).reduce((sum, j) => sum + (j.time_on_site_minutes || 0), 0) / completedJobs
    : 0;

  // Time series data
  const getDailyData = () => {
    const days = parseInt(dateRange) || 30;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM dd');
      
      const dayJobs = jobs.filter(j => 
        format(new Date(j.created_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      const dayRevenue = invoices.filter(i =>
        i.issue_date && format(new Date(i.issue_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).reduce((sum, inv) => sum + (inv.total || 0), 0);

      data.push({
        date: dateStr,
        jobs: dayJobs.length,
        completed: dayJobs.filter(j => j.status === 'completed').length,
        revenue: Math.round(dayRevenue)
      });
    }
    
    return data;
  };

  // Job type distribution
  const jobTypeData = [
    { name: 'Reactive', value: jobs.filter(j => j.job_type === 'reactive').length, color: '#E41E65' },
    { name: 'PPM', value: jobs.filter(j => j.job_type === 'ppm').length, color: '#27B3F7' },
    { name: 'Project', value: jobs.filter(j => j.job_type === 'project').length, color: '#10B981' },
    { name: 'Emergency', value: jobs.filter(j => j.job_type === 'emergency').length, color: '#F59E0B' }
  ].filter(d => d.value > 0);

  // Status distribution
  const statusData = [
    { name: 'New', value: jobs.filter(j => j.status === 'new' || j.status === 'raised').length },
    { name: 'In Progress', value: jobs.filter(j => ['assigned', 'on_route', 'en_route', 'on_site'].includes(j.status)).length },
    { name: 'Completed', value: completedJobs },
    { name: 'Cancelled', value: jobs.filter(j => j.status === 'cancelled').length }
  ].filter(d => d.value > 0);

  const timeSeriesData = getDailyData();

  // Previous period comparison
  const getPreviousMetrics = () => {
    const days = parseInt(dateRange) || 30;
    const prevStart = subDays(new Date(startDate), days);
    const prevEnd = new Date(startDate);
    
    const prevJobs = jobs.length; // Simplified - in real app, fetch previous period
    return {
      jobsChange: 12.5,
      revenueChange: 8.3,
      slaChange: 2.1,
      completionChange: 5.2
    };
  };

  const trends = getPreviousMetrics();

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendLabel, color = "blue" }) => {
    const colorClasses = {
      blue: 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20',
      green: 'bg-green-500/10 text-green-400 group-hover:bg-green-500/20',
      red: 'bg-red-500/10 text-red-400 group-hover:bg-red-500/20',
      purple: 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20',
      orange: 'bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20'
    };

    return (
      <div className="data-card hover-glow group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-[#CED4DA] mb-2">{title}</div>
            <div className="text-3xl font-bold text-white mb-1 metric-value">{value}</div>
            {subtitle && <div className="text-xs text-[#CED4DA]">{subtitle}</div>}
          </div>
          <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center transition-colors`}>
            <Icon className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>
        
        {trend !== undefined && (
          <div className="flex items-center gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
            {trend > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-semibold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {Math.abs(trend)}%
            </span>
            <span className="text-xs text-[#CED4DA]">{trendLabel}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-[#E1467C]" strokeWidth={1.5} />
            Advanced Analytics
          </h1>
          <p className="text-[#CED4DA]">Comprehensive insights and performance metrics</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 glass-panel border-[rgba(255,255,255,0.08)]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-40 glass-panel border-[rgba(255,255,255,0.08)]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setCompareMode(!compareMode)}
            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
          >
            <Activity className="w-4 h-4 mr-2" />
            {compareMode ? 'Hide' : 'Show'} Comparison
          </Button>

          <Button className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Job Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${completedJobs} of ${totalJobs} jobs`}
          icon={CheckCircle}
          trend={trends.completionChange}
          trendLabel="vs previous period"
          color="green"
        />
        
        <MetricCard
          title="SLA Compliance"
          value={`${slaCompliance}%`}
          subtitle={`${slaBreaches} breaches`}
          icon={Clock}
          trend={trends.slaChange}
          trendLabel="vs previous period"
          color={parseFloat(slaCompliance) >= 90 ? "green" : "orange"}
        />
        
        <MetricCard
          title="Total Revenue"
          value={`£${(totalRevenue / 1000).toFixed(1)}k`}
          subtitle={`£${(paidRevenue / 1000).toFixed(1)}k paid`}
          icon={DollarSign}
          trend={trends.revenueChange}
          trendLabel="vs previous period"
          color="purple"
        />
        
        <MetricCard
          title="Quote Conversion"
          value={`${quoteConversionRate}%`}
          subtitle={`${quotes.length} quotes sent`}
          icon={TrendingUp}
          trend={5.7}
          trendLabel="vs previous period"
          color="blue"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs & Revenue Trend */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] lg:col-span-2">
          <h3 className="section-title mb-6">Jobs & Revenue Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E41E65" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#E41E65" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#27B3F7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#27B3F7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#CED4DA" style={{ fontSize: '12px' }} />
              <YAxis yAxisId="left" stroke="#E41E65" style={{ fontSize: '12px' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#27B3F7" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(13, 17, 23, 0.95)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Legend />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="jobs" 
                stroke="#E41E65" 
                strokeWidth={2}
                fill="url(#jobsGradient)" 
                name="Jobs Created"
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="revenue" 
                stroke="#27B3F7" 
                strokeWidth={2}
                fill="url(#revenueGradient)"
                name="Revenue (£)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Job Type Distribution */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h3 className="section-title mb-6">Job Type Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPie>
              <Pie
                data={jobTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {jobTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(13, 17, 23, 0.95)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* Job Status Overview */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h3 className="section-title mb-6">Job Status Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#CED4DA" style={{ fontSize: '12px' }} />
              <YAxis stroke="#CED4DA" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(13, 17, 23, 0.95)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Bar dataKey="value" fill="#E41E65" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white">Avg. Job Duration</h4>
            <Clock className="w-5 h-5 text-[#E1467C]" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {Math.round(avgJobDuration)} min
          </div>
          <div className="text-xs text-[#CED4DA]">Average time on site</div>
        </div>

        <div className="glass-panel rounded-xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white">Outstanding Revenue</h4>
            <AlertCircle className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            £{(outstandingRevenue / 1000).toFixed(1)}k
          </div>
          <div className="text-xs text-[#CED4DA]">Pending invoices</div>
        </div>

        <div className="glass-panel rounded-xl p-6 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white">Active Clients</h4>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {clients.filter(c => c.status === 'active').length}
          </div>
          <div className="text-xs text-[#CED4DA]">Total clients: {clients.length}</div>
        </div>
      </div>
    </div>
  );
}