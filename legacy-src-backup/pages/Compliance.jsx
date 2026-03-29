import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Leaf,
  TrendingUp,
  Upload,
  FileText,
  RefreshCw,
  Plus,
  Eye,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CompliancePage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.org_id) {
      setupWebSocket();
    }
  }, [user]);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const setupWebSocket = () => {
    if (!user?.org_id) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        setWsConnected(true);
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `compliance.org.${user.org_id}`
        }));
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `sustainability.org.${user.org_id}`
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'compliance_update' || message.type === 'esg_update') {
          queryClient.invalidateQueries(['compliance-records']);
          queryClient.invalidateQueries(['sustainability-scores']);
        }
      };

      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => setWsConnected(false);
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  };

  const { data: records = [] } = useQuery({
    queryKey: ['compliance-records', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.ComplianceRecord.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['compliance-requirements', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.ComplianceRequirement.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list()
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list()
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['sustainability-scores', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.SustainabilityScore.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id
  });

  const { data: esgMetrics = [] } = useQuery({
    queryKey: ['esg-metrics', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.ESGMetric.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id
  });

  const runMonitorMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('complianceMonitor', {
        org_id: user.org_id,
        auto_create_jobs: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['compliance-records']);
    }
  });

  const runAnalyzerMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('sustainabilityAnalyzer', {
        org_id: user.org_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sustainability-scores']);
    }
  });

  // Calculate metrics
  const now = new Date();
  const overdue = records.filter(r => new Date(r.next_due_date) < now);
  const expiringSoon = records.filter(r => {
    const dueDate = new Date(r.next_due_date);
    const thirtyDays = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    return dueDate >= now && dueDate < thirtyDays;
  });

  const complianceRate = records.length > 0
    ? ((records.length - overdue.length) / records.length) * 100
    : 100;

  const orgScore = scores.find(s => s.site_id === null);

  // Prepare chart data
  const last90Days = [];
  for (let i = 89; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const dateStr = date.toISOString().split('T')[0];
    
    const dayMetrics = esgMetrics.filter(m => m.recorded_at === dateStr);
    const energy = dayMetrics.filter(m => m.metric_type === 'energy_kwh').reduce((s, m) => s + m.value, 0);
    const co2 = dayMetrics.filter(m => m.metric_type === 'co2_tonnes').reduce((s, m) => s + m.value, 0);
    
    if (i % 7 === 0) { // Weekly points
      last90Days.push({
        date: date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        energy: Math.round(energy),
        co2: Math.round(co2 * 10) / 10
      });
    }
  }

  const radarData = orgScore ? [
    { subject: 'Compliance', value: orgScore.compliance_rate_pct, fullMark: 100 },
    { subject: 'Carbon', value: Math.max(0, 100 - (orgScore.carbon_intensity * 10)), fullMark: 100 },
    { subject: 'Waste', value: orgScore.waste_diversion_pct, fullMark: 100 },
    { subject: 'Overall', value: orgScore.overall_esg_score, fullMark: 100 }
  ] : [];

  const riskColors = {
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
    MED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  const ratingColors = {
    EXCELLENT: 'bg-green-500/20 text-green-400 border-green-500/30',
    GOOD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    FAIR: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    POOR: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Compliance & Sustainability</h1>
          <p className="text-[#CED4DA]">Statutory compliance tracking and ESG analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {wsConnected && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
              LIVE
            </Badge>
          )}
          <Button
            onClick={() => {
              runMonitorMutation.mutate();
              runAnalyzerMutation.mutate();
            }}
            disabled={runMonitorMutation.isPending || runAnalyzerMutation.isPending}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(runMonitorMutation.isPending || runAnalyzerMutation.isPending) ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`glass-panel rounded-xl p-5 border ${
          complianceRate >= 90 ? 'border-green-500/30' :
          complianceRate >= 70 ? 'border-yellow-500/30' :
          'border-red-500/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <Shield className={`w-5 h-5 ${
              complianceRate >= 90 ? 'text-green-400' :
              complianceRate >= 70 ? 'text-yellow-400' :
              'text-red-400'
            }`} />
            <div className="text-sm text-[#CED4DA]">Compliance Rate</div>
          </div>
          <div className={`text-3xl font-bold ${
            complianceRate >= 90 ? 'text-green-400' :
            complianceRate >= 70 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {Math.round(complianceRate)}%
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-red-500/30">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="text-sm text-[#CED4DA]">Overdue</div>
          </div>
          <div className="text-3xl font-bold text-red-400">{overdue.length}</div>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-yellow-500/30">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-yellow-400" />
            <div className="text-sm text-[#CED4DA]">Expiring Soon</div>
          </div>
          <div className="text-3xl font-bold text-yellow-400">{expiringSoon.length}</div>
        </div>

        <div className={`glass-panel rounded-xl p-5 border ${
          orgScore ? ratingColors[orgScore.rating].replace('bg-', 'border-').replace('/20', '/30') : 'border-[rgba(255,255,255,0.08)]'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="w-5 h-5 text-green-400" />
            <div className="text-sm text-[#CED4DA]">ESG Score</div>
          </div>
          <div className={`text-3xl font-bold ${
            orgScore?.rating === 'EXCELLENT' ? 'text-green-400' :
            orgScore?.rating === 'GOOD' ? 'text-blue-400' :
            orgScore?.rating === 'FAIR' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {orgScore?.overall_esg_score || 0}
          </div>
          {orgScore && (
            <Badge className={`${ratingColors[orgScore.rating]} border mt-2`}>
              {orgScore.rating}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="glass-panel border-[rgba(255,255,255,0.08)]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="statutory">Statutory Tasks</TabsTrigger>
          <TabsTrigger value="sustainability">Sustainability</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Trend */}
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <h3 className="text-lg font-bold text-white mb-4">Compliance Status</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#CED4DA]">Compliant</span>
                    <span className="text-green-400">{records.length - overdue.length}</span>
                  </div>
                  <div className="w-full h-3 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${complianceRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#CED4DA]">Overdue</span>
                    <span className="text-red-400">{overdue.length}</span>
                  </div>
                  <div className="w-full h-3 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(overdue.length / records.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ESG Radar */}
            {radarData.length > 0 && (
              <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                <h3 className="text-lg font-bold text-white mb-4">ESG Performance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" stroke="#CED4DA" style={{ fontSize: '12px' }} />
                    <PolarRadiusAxis stroke="rgba(255,255,255,0.3)" />
                    <Radar dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="statutory" className="space-y-6 mt-6">
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Compliance Records</h3>
              <Button
                onClick={() => setShowUploadDialog(true)}
                size="sm"
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Certificate
              </Button>
            </div>
            {records.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
                <h3 className="text-xl font-semibold text-white mb-2">No compliance records</h3>
                <p className="text-[#CED4DA]">Start tracking statutory tests and certifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map(record => {
                  const asset = assets.find(a => a.id === record.asset_id);
                  const site = sites.find(s => s.id === record.site_id);
                  const requirement = requirements.find(r => r.id === record.requirement_id);
                  const dueDate = new Date(record.next_due_date);
                  const daysUntil = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={record.id}
                      className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-white font-semibold">{requirement?.requirement_name || 'Unknown'}</h4>
                            <Badge className={`${riskColors[record.risk_level]} border`}>
                              {record.risk_level}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[#CED4DA]">
                            <span>🏢 {asset?.name || 'N/A'}</span>
                            <span>📍 {site?.name || 'N/A'}</span>
                            <span>
                              {daysUntil < 0 ? (
                                <span className="text-red-400">⚠️ {Math.abs(daysUntil)}d overdue</span>
                              ) : (
                                <span>Due in {daysUntil}d</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.certificate_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[#CED4DA]"
                              onClick={() => window.open(record.certificate_url, '_blank')}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
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

        <TabsContent value="sustainability" className="space-y-6 mt-6">
          {last90Days.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <h3 className="text-lg font-bold text-white mb-4">Energy & Carbon Trend (90 Days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={last90Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#CED4DA" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#CED4DA" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(13, 17, 23, 0.95)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                  <Line type="monotone" dataKey="energy" stroke="#27B3F7" strokeWidth={2} name="Energy (kWh)" />
                  <Line type="monotone" dataKey="co2" stroke="#10B981" strokeWidth={2} name="CO₂ (tonnes)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
              <div className="text-sm text-[#CED4DA] mb-2">Compliance Rate</div>
              <div className="text-2xl font-bold text-white">{orgScore?.compliance_rate_pct || 0}%</div>
            </div>
            <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
              <div className="text-sm text-[#CED4DA] mb-2">Carbon Intensity</div>
              <div className="text-2xl font-bold text-yellow-400">{orgScore?.carbon_intensity || 0}</div>
              <div className="text-xs text-[#CED4DA]">kg CO₂/kWh</div>
            </div>
            <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
              <div className="text-sm text-[#CED4DA] mb-2">Waste Diversion</div>
              <div className="text-2xl font-bold text-green-400">{orgScore?.waste_diversion_pct || 0}%</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Compliance Detail</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-[#CED4DA]">Requirement: </span>
                <span className="text-white font-semibold">
                  {requirements.find(r => r.id === selectedRecord.requirement_id)?.requirement_name}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-[#CED4DA]">Status: </span>
                <Badge className={`${riskColors[selectedRecord.risk_level]} border`}>
                  {selectedRecord.risk_level}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="text-[#CED4DA]">Next Due: </span>
                <span className="text-white">{new Date(selectedRecord.next_due_date).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Certificate</DialogTitle>
          </DialogHeader>
          <p className="text-[#CED4DA] text-sm">Certificate upload functionality coming soon...</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}