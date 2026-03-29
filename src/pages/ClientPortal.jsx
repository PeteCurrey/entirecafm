import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Wrench,
  DollarSign,
  FileText,
  Database,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientPortalPage() {
  const [user, setUser] = useState(null);
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    
    // Get client_id from user metadata or ClientUser entity
    if (userData.client_id) {
      setClientId(userData.client_id);
    }
  };

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['client-dashboard', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const result = await base44.functions.invoke('getClientDashboard', { client_id: clientId });
      return result.data?.dashboard;
    },
    enabled: !!clientId,
    refetchInterval: 30000 // Refresh every 30s
  });

  const { data: theme } = useQuery({
    queryKey: ['client-theme', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const themes = await base44.entities.ClientPortalTheme.filter({ client_id: clientId });
      return themes[0] || null;
    },
    enabled: !!clientId
  });

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#CED4DA]">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const primaryColor = theme?.primary_color || '#E1467C';

  return (
    <div className="min-h-screen bg-[#0D1117] p-6 lg:p-8">
      <style>{`
        .custom-accent { color: ${primaryColor}; }
        .custom-accent-bg { background-color: ${primaryColor}; }
        .custom-accent-border { border-color: ${primaryColor}; }
      `}</style>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          {theme?.logo_url && (
            <img src={theme.logo_url} alt="Logo" className="h-12" />
          )}
          <div>
            <h1 className="text-3xl font-bold text-white">
              {theme?.welcome_text || 'Welcome to Your Portal'}
            </h1>
            <p className="text-[#CED4DA]">Real-time access to your services and data</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-5 h-5 text-blue-400" />
            <div className="text-sm text-[#CED4DA]">Open Jobs</div>
          </div>
          <div className="text-3xl font-bold text-white">{dashboardData.jobs_open}</div>
        </div>

        <div className={`glass-panel rounded-xl p-5 border ${
          dashboardData.sla_score >= 90 ? 'border-green-500/30' : 
          dashboardData.sla_score >= 70 ? 'border-yellow-500/30' : 
          'border-red-500/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 custom-accent" />
            <div className="text-sm text-[#CED4DA]">SLA Score</div>
          </div>
          <div className={`text-3xl font-bold ${
            dashboardData.sla_score >= 90 ? 'text-green-400' : 
            dashboardData.sla_score >= 70 ? 'text-yellow-400' : 
            'text-red-400'
          }`}>
            {dashboardData.sla_score}%
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <div className="text-sm text-[#CED4DA]">YTD Spend</div>
          </div>
          <div className="text-3xl font-bold text-white">
            £{dashboardData.total_spend_ytd.toLocaleString()}
          </div>
        </div>

        <div className={`glass-panel rounded-xl p-5 border ${
          dashboardData.overdue_invoices > 0 ? 'border-red-500/30' : 'border-green-500/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className={`w-5 h-5 ${dashboardData.overdue_invoices > 0 ? 'text-red-400' : 'text-green-400'}`} />
            <div className="text-sm text-[#CED4DA]">Overdue</div>
          </div>
          <div className={`text-3xl font-bold ${dashboardData.overdue_invoices > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {dashboardData.overdue_invoices > 0 ? `£${dashboardData.overdue_value.toLocaleString()}` : '£0'}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* SLA Trend Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-bold text-white mb-4">SLA Performance (30 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dashboardData.sla_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#CED4DA" style={{ fontSize: '12px' }} />
              <YAxis stroke="#CED4DA" style={{ fontSize: '12px' }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(13, 17, 23, 0.95)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="score" stroke={primaryColor} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to={createPageUrl("ClientJobs")}>
              <Button className="w-full justify-start custom-accent-bg hover:opacity-90 text-white">
                <Wrench className="w-4 h-4 mr-2" />
                View All Jobs
              </Button>
            </Link>
            <Link to={createPageUrl("ClientRequestJob")}>
              <Button className="w-full justify-start" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Raise New Request
              </Button>
            </Link>
            <Link to={createPageUrl("ClientInvoices")}>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Invoices
              </Button>
            </Link>
            <Link to={createPageUrl("ClientDocuments")}>
              <Button className="w-full justify-start" variant="outline">
                <Database className="w-4 h-4 mr-2" />
                Documents & Reports
              </Button>
            </Link>
            <Link to={createPageUrl("ClientMessages")}>
              <Button className="w-full justify-start" variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" />
                Secure Messages
              </Button>
            </Link>
            <Link to={createPageUrl("Settings")}>
              <Button className="w-full justify-start" variant="outline">
                <User className="w-4 h-4 mr-2" />
                Manage Users & Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
        {dashboardData.recent_jobs.length === 0 ? (
          <p className="text-[#CED4DA] text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {dashboardData.recent_jobs.map(job => (
              <Link 
                key={job.id}
                to={`${createPageUrl("ClientJobDetail")}?id=${job.id}`}
                className="block glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      job.status === 'completed' ? 'bg-green-400' :
                      job.status === 'on_site' ? 'bg-blue-400' :
                      'bg-yellow-400'
                    }`} />
                    <div>
                      <div className="text-white font-semibold">{job.title}</div>
                      <div className="text-xs text-[#CED4DA]">
                        {new Date(job.updated_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.priority === 'critical' && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border">
                        {job.priority}
                      </Badge>
                    )}
                    <Badge className={`${
                      job.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      job.status === 'on_site' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    } border`}>
                      {job.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}