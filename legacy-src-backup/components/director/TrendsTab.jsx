import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TrendsTab({ orgId }) {
  const [timeRange, setTimeRange] = useState('30d');

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['org-metrics', orgId, timeRange],
    queryFn: async () => {
      const daysBack = parseInt(timeRange) || 30;
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - daysBack);
      
      const fromDateStr = fromDate.toISOString().split('T')[0];
      
      const allMetrics = await base44.entities.DailyOrgMetrics.filter({
        org_id: orgId
      });
      
      return allMetrics
        .filter(m => m.date >= fromDateStr)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!orgId,
  });

  const handleExport = async () => {
    const response = await base44.functions.invoke('exportOrgMetrics', {
      range: timeRange
    });
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-metrics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

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

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#CED4DA]">Loading trend data...</p>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
        <h3 className="text-xl font-semibold text-white mb-2">No historical data yet</h3>
        <p className="text-[#CED4DA] mb-4">
          Daily snapshots will be created automatically at 23:55 GMT
        </p>
        <p className="text-sm text-[#CED4DA]">
          Metrics are collected: {new Date().toLocaleDateString()}
        </p>
      </div>
    );
  }

  // Format data for charts
  const chartData = metrics.map(m => ({
    date: new Date(m.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    fullDate: m.date,
    'Org Health': m.org_health_score || 0,
    'SLA Breaches': m.sla_breaches || 0,
    'At Risk Jobs': m.at_risk_jobs || 0,
    'Utilisation %': m.avg_utilisation_pct || 0,
    'Overdue £': (m.overdue_value || 0) / 1000, // Convert to thousands
    'Unbilled £': (m.unbilled_value || 0) / 1000,
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#CED4DA]" />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
        >
          <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
          Export CSV
        </Button>
      </div>

      {/* Organization Health Trend */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-lg font-bold text-white mb-4">Organization Health Score</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
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
              dataKey="Org Health" 
              stroke="#10B981" 
              strokeWidth={3}
              dot={{ fill: '#10B981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div>
            <span className="text-[#CED4DA]">Current: </span>
            <span className="text-white font-bold">
              {chartData[chartData.length - 1]?.['Org Health'] || 0}
            </span>
          </div>
          <div>
            <span className="text-[#CED4DA]">Avg: </span>
            <span className="text-white font-bold">
              {Math.round(chartData.reduce((sum, d) => sum + d['Org Health'], 0) / chartData.length) || 0}
            </span>
          </div>
          <div>
            <span className="text-[#CED4DA]">Target: </span>
            <span className="text-green-400 font-bold">≥80</span>
          </div>
        </div>
      </div>

      {/* Dual Chart: SLA Breaches & At-Risk Jobs */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-lg font-bold text-white mb-4">SLA Performance</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="#CED4DA" 
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#CED4DA" 
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#CED4DA' }} />
            <Line 
              type="monotone" 
              dataKey="SLA Breaches" 
              stroke="#EF4444" 
              strokeWidth={2}
              dot={{ fill: '#EF4444', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="At Risk Jobs" 
              stroke="#F59E0B" 
              strokeWidth={2}
              dot={{ fill: '#F59E0B', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Engineer Utilisation Trend */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-lg font-bold text-white mb-4">Engineer Utilisation Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
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
              dataKey="Utilisation %" 
              stroke="#6366F1" 
              strokeWidth={3}
              dot={{ fill: '#6366F1', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-[#CED4DA]">Current: </span>
            <span className="text-white font-bold">
              {chartData[chartData.length - 1]?.['Utilisation %'] || 0}%
            </span>
          </div>
          <div>
            <span className="text-[#CED4DA]">Optimal Range: </span>
            <span className="text-green-400 font-bold">50-70%</span>
          </div>
          <div>
            <span className="text-[#CED4DA]">Avg: </span>
            <span className="text-white font-bold">
              {Math.round(chartData.reduce((sum, d) => sum + d['Utilisation %'], 0) / chartData.length) || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Financial Trends */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-lg font-bold text-white mb-4">Financial Trends (£ thousands)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="#CED4DA" 
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#CED4DA" 
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#CED4DA' }} />
            <Line 
              type="monotone" 
              dataKey="Overdue £" 
              stroke="#EF4444" 
              strokeWidth={2}
              dot={{ fill: '#EF4444', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="Unbilled £" 
              stroke="#F59E0B" 
              strokeWidth={2}
              dot={{ fill: '#F59E0B', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 text-xs text-[#CED4DA]">
          ℹ️ Values shown in thousands (£K). Overdue invoices should trend toward zero.
        </div>
      </div>

      {/* Data Summary Table */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-lg font-bold text-white mb-4">Data Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-[#CED4DA] mb-1">Total Data Points</div>
            <div className="text-2xl font-bold text-white">{metrics.length}</div>
          </div>
          <div>
            <div className="text-xs text-[#CED4DA] mb-1">Date Range</div>
            <div className="text-sm text-white">
              {metrics[0]?.date || 'N/A'} → {metrics[metrics.length - 1]?.date || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#CED4DA] mb-1">Peak Health Score</div>
            <div className="text-2xl font-bold text-green-400">
              {Math.max(...metrics.map(m => m.org_health_score || 0), 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#CED4DA] mb-1">Peak Utilisation</div>
            <div className="text-2xl font-bold text-blue-400">
              {Math.max(...metrics.map(m => m.avg_utilisation_pct || 0), 0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}