import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  RefreshCw,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Users,
  DollarSign,
  Target,
  Plus,
  Mail,
  Trash2,
  ExternalLink,
  CheckCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function ExecutiveBriefPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddRecipientForm, setShowAddRecipientForm] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [recipientForm, setRecipientForm] = useState({
    name: '',
    email: '',
    role: 'Director',
    preferred_channel: 'email'
  });

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

  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ['executive-briefs', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.ExecutiveBrief.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  const { data: recipients = [] } = useQuery({
    queryKey: ['executive-recipients', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.ExecutiveRecipient.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  const generateBriefMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('aiGenerateExecutiveBrief', {
        org_id: user.org_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['executive-briefs']);
    },
  });

  const addRecipientMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ExecutiveRecipient.create({
        ...data,
        org_id: user.org_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['executive-recipients']);
      setShowAddRecipientForm(false);
      setRecipientForm({
        name: '',
        email: '',
        role: 'Director',
        preferred_channel: 'email'
      });
    },
  });

  const deleteRecipientMutation = useMutation({
    mutationFn: (id) => base44.entities.ExecutiveRecipient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['executive-recipients']);
    },
  });

  const handleGenerateBrief = async () => {
    setIsGenerating(true);
    try {
      await generateBriefMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  // Sort briefs by week commencing (newest first)
  const sortedBriefs = [...briefs].sort((a, b) => 
    b.week_commencing.localeCompare(a.week_commencing)
  );

  const currentBrief = sortedBriefs[0];
  const historicalBriefs = sortedBriefs.slice(1);

  const roleColors = {
    CEO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Director: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Ops: 'bg-green-500/20 text-green-400 border-green-500/30',
    Finance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Marketing: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  };

  const channelIcons = {
    email: <Mail className="w-3 h-3" />,
    slack: <Users className="w-3 h-3" />,
    pdf: <Download className="w-3 h-3" />
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Executive AI Briefing</h1>
            <p className="text-[#CED4DA]">Automated weekly performance summaries and recommendations</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerateBrief}
              disabled={isGenerating}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} strokeWidth={1.5} />
              {isGenerating ? 'Generating...' : 'Generate Brief Now'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
            <div className="text-sm text-[#CED4DA] mb-1">Total Briefs</div>
            <div className="text-3xl font-bold text-white">{briefs.length}</div>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
            <div className="text-sm text-[#CED4DA] mb-1">Active Recipients</div>
            <div className="text-3xl font-bold text-white">{recipients.filter(r => r.active).length}</div>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
            <div className="text-sm text-[#CED4DA] mb-1">Next Generation</div>
            <div className="text-sm text-white font-semibold">Monday 06:00 GMT</div>
            <div className="text-xs text-[#CED4DA] mt-1">Automated weekly</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass-panel border-[rgba(255,255,255,0.08)]">
          <TabsTrigger 
            value="current"
            className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white"
          >
            <FileText className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Current Week
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white"
          >
            <Calendar className="w-4 h-4 mr-2" strokeWidth={1.5} />
            History
          </TabsTrigger>
          <TabsTrigger 
            value="recipients"
            className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Recipients
          </TabsTrigger>
        </TabsList>

        {/* Current Week Tab */}
        <TabsContent value="current" className="space-y-6 mt-6">
          {currentBrief ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className={`glass-panel rounded-2xl p-6 border ${
                  currentBrief.org_health_score >= 80 ? 'border-green-500/30' :
                  currentBrief.org_health_score >= 60 ? 'border-yellow-500/30' :
                  'border-red-500/30'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      currentBrief.org_health_score >= 80 ? 'bg-green-500/20' :
                      currentBrief.org_health_score >= 60 ? 'bg-yellow-500/20' :
                      'bg-red-500/20'
                    }`}>
                      <Target className={`w-6 h-6 ${
                        currentBrief.org_health_score >= 80 ? 'text-green-400' :
                        currentBrief.org_health_score >= 60 ? 'text-yellow-400' :
                        'text-red-400'
                      }`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm text-[#CED4DA]">Org Health</div>
                      <div className={`text-3xl font-bold ${
                        currentBrief.org_health_score >= 80 ? 'text-green-400' :
                        currentBrief.org_health_score >= 60 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {currentBrief.org_health_score}
                      </div>
                    </div>
                  </div>
                  {currentBrief.operational_summary_json?.delta_pct !== undefined && (
                    <Badge className={`${
                      currentBrief.operational_summary_json.delta_pct > 0 ? 'bg-green-500/20 text-green-400' :
                      currentBrief.operational_summary_json.delta_pct < 0 ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    } border-none text-xs`}>
                      {currentBrief.operational_summary_json.delta_pct > 0 ? '↑' : currentBrief.operational_summary_json.delta_pct < 0 ? '↓' : '→'}
                      {Math.abs(currentBrief.operational_summary_json.delta_pct).toFixed(1)}% WoW
                    </Badge>
                  )}
                </div>

                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-400" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm text-[#CED4DA]">30-Day Revenue</div>
                      <div className="text-2xl font-bold text-white">
                        £{(currentBrief.forecast_summary_json?.projection_30d || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge className={`${
                    currentBrief.forecast_summary_json?.risk_band === 'LOW' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    currentBrief.forecast_summary_json?.risk_band === 'MED' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  } border text-xs`}>
                    {currentBrief.forecast_summary_json?.risk_band || 'N/A'} Risk
                  </Badge>
                </div>

                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-red-400" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm text-[#CED4DA]">Overdue</div>
                      <div className="text-2xl font-bold text-red-400">
                        £{(currentBrief.financial_summary_json?.overdue_value || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-[#CED4DA]">
                    {currentBrief.financial_summary_json?.overdue_count || 0} invoices
                  </div>
                </div>
              </div>

              {/* AI Recommendations */}
              {currentBrief.recommendations_json && currentBrief.recommendations_json.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
                    Top AI Recommendations
                  </h3>
                  <div className="space-y-3">
                    {currentBrief.recommendations_json.slice(0, 5).map((rec, idx) => (
                      <div key={idx} className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">
                            {rec.priority === 'urgent' ? '🔴' :
                             rec.priority === 'high' ? '🟠' :
                             rec.priority === 'medium' ? '🟡' :
                             '🟢'}
                          </span>
                          <div className="flex-1">
                            <p className="text-white mb-2">{rec.action}</p>
                            <div className="flex items-center gap-3 text-xs">
                              <Badge className="text-xs">
                                {rec.category}
                              </Badge>
                              <span className="text-[#CED4DA]">
                                Confidence: {Math.round((rec.confidence || 0) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Operational & Financial Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <h3 className="text-lg font-bold text-white mb-4">Operational Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[#CED4DA]">SLA Breaches</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${
                          (currentBrief.operational_summary_json?.sla_breaches || 0) > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {currentBrief.operational_summary_json?.sla_breaches || 0}
                        </span>
                        {currentBrief.operational_summary_json?.sla_delta !== undefined && (
                          <Badge className={`${
                            currentBrief.operational_summary_json.sla_delta > 0 ? 'bg-red-500/20 text-red-400' :
                            currentBrief.operational_summary_json.sla_delta < 0 ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-500/20 text-gray-400'
                          } border-none text-xs`}>
                            {currentBrief.operational_summary_json.sla_delta > 0 ? '+' : ''}{currentBrief.operational_summary_json.sla_delta}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#CED4DA]">At-Risk Jobs</span>
                      <span className="text-xl font-bold text-yellow-400">
                        {currentBrief.operational_summary_json?.at_risk_jobs || 0}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#CED4DA]">Avg Utilisation</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-white">
                          {currentBrief.operational_summary_json?.avg_utilisation || 0}%
                        </span>
                        {currentBrief.operational_summary_json?.utilisation_delta !== undefined && (
                          <Badge className={`${
                            currentBrief.operational_summary_json.utilisation_delta > 0 ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          } border-none text-xs`}>
                            {currentBrief.operational_summary_json.utilisation_delta > 0 ? '+' : ''}{currentBrief.operational_summary_json.utilisation_delta.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#CED4DA]">Completed Jobs</span>
                      <span className="text-xl font-bold text-green-400">
                        {currentBrief.operational_summary_json?.completed_jobs || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <h3 className="text-lg font-bold text-white mb-4">Financial Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[#CED4DA]">Overdue Value</span>
                      <span className="text-xl font-bold text-red-400">
                        £{(currentBrief.financial_summary_json?.overdue_value || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#CED4DA]">Expected Collections</span>
                      <span className="text-xl font-bold text-green-400">
                        £{(currentBrief.financial_summary_json?.collections_expected || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#CED4DA]">Unbilled (Approved)</span>
                      <span className="text-xl font-bold text-yellow-400">
                        £{(currentBrief.financial_summary_json?.unbilled_value || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#CED4DA]">Expected Margin</span>
                      <span className="text-xl font-bold text-white">
                        £{(currentBrief.forecast_summary_json?.expected_margin || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Marketing Performance */}
              {currentBrief.marketing_summary_json && (
                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <h3 className="text-lg font-bold text-white mb-4">Marketing Performance (7d)</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm text-[#CED4DA] mb-1">Leads</div>
                      <div className="text-2xl font-bold text-white">
                        {currentBrief.marketing_summary_json.leads || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#CED4DA] mb-1">Conversion Rate</div>
                      <div className="text-2xl font-bold text-white">
                        {((currentBrief.marketing_summary_json.conversion_rate || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#CED4DA] mb-1">ROI</div>
                      <div className="text-2xl font-bold text-green-400">
                        {(currentBrief.marketing_summary_json.roi || 0).toFixed(1)}×
                      </div>
                    </div>
                  </div>
                  {currentBrief.marketing_summary_json.top_source && (
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                      <span className="text-sm text-[#CED4DA]">Top Source: </span>
                      <span className="text-white font-semibold">{currentBrief.marketing_summary_json.top_source}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Risk Summary */}
              {currentBrief.risk_summary_json?.critical_issues?.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
                    Critical Issues
                  </h3>
                  <div className="space-y-2">
                    {currentBrief.risk_summary_json.critical_issues.map((issue, idx) => (
                      <div key={idx} className="glass-panel rounded-lg p-3 border border-red-500/30">
                        <div className="text-sm font-semibold text-red-400 mb-1">{issue.title}</div>
                        <div className="text-xs text-[#CED4DA]">{issue.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => window.open(currentBrief.pdf_url, '_blank')}
                  className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                >
                  <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Download Full Report
                </Button>
              </div>
            </>
          ) : (
            <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
              <h3 className="text-xl font-semibold text-white mb-2">No brief available for current week</h3>
              <p className="text-[#CED4DA] mb-6">
                Next automatic generation: Monday 06:00 GMT
              </p>
              <Button
                onClick={handleGenerateBrief}
                disabled={isGenerating}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                Generate Now
              </Button>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-6">
          {historicalBriefs.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
              <h3 className="text-xl font-semibold text-white mb-2">No historical briefs</h3>
              <p className="text-[#CED4DA]">Past briefs will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historicalBriefs.map(brief => (
                <div
                  key={brief.id}
                  className="glass-panel rounded-2xl p-5 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-4 h-4 text-[#CED4DA]" />
                        <span className="font-semibold text-white">
                          Week {format(new Date(brief.week_commencing), 'MMM d, yyyy')}
                        </span>
                        <Badge className="text-xs">
                          {brief.distributed_to?.length || 0} recipients
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-[#CED4DA]">
                          Org Health: <span className="text-white font-semibold">{brief.org_health_score}</span>
                        </span>
                        <span className="text-[#CED4DA]">
                          Revenue: <span className="text-white font-semibold">£{(brief.forecast_summary_json?.projection_30d || 0).toLocaleString()}</span>
                        </span>
                        <span className="text-[#CED4DA]">
                          Overdue: <span className="text-red-400 font-semibold">£{(brief.financial_summary_json?.overdue_value || 0).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => window.open(brief.pdf_url, '_blank')}
                      variant="outline"
                      size="sm"
                      className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                    >
                      <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-[#CED4DA]">
              Manage who receives automated weekly briefings
            </p>
            <Button
              onClick={() => setShowAddRecipientForm(true)}
              size="sm"
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recipient
            </Button>
          </div>

          {recipients.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
              <h3 className="text-xl font-semibold text-white mb-2">No recipients configured</h3>
              <p className="text-[#CED4DA] mb-6">Add executives to receive automated briefings</p>
              <Button
                onClick={() => setShowAddRecipientForm(true)}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Recipient
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipients.map(recipient => (
                <div
                  key={recipient.id}
                  className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-white mb-1">{recipient.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={`${roleColors[recipient.role]} border text-xs`}>
                          {recipient.role}
                        </Badge>
                        <Badge className={`${
                          recipient.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        } text-xs`}>
                          {recipient.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => deleteRecipientMutation.mutate(recipient.id)}
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-[#CED4DA]">
                      <Mail className="w-4 h-4" strokeWidth={1.5} />
                      <span className="truncate">{recipient.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#CED4DA]">
                      {channelIcons[recipient.preferred_channel]}
                      <span className="capitalize">{recipient.preferred_channel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Recipient Dialog */}
      <Dialog open={showAddRecipientForm} onOpenChange={setShowAddRecipientForm}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Executive Recipient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Name *</Label>
              <Input
                value={recipientForm.name}
                onChange={(e) => setRecipientForm({...recipientForm, name: e.target.value})}
                placeholder="John Smith"
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Email *</Label>
              <Input
                type="email"
                value={recipientForm.email}
                onChange={(e) => setRecipientForm({...recipientForm, email: e.target.value})}
                placeholder="john@company.com"
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Role</Label>
              <Select
                value={recipientForm.role}
                onValueChange={(value) => setRecipientForm({...recipientForm, role: value})}
              >
                <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CEO">CEO</SelectItem>
                  <SelectItem value="Director">Director</SelectItem>
                  <SelectItem value="Ops">Operations</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white mb-2 block">Preferred Channel</Label>
              <Select
                value={recipientForm.preferred_channel}
                onValueChange={(value) => setRecipientForm({...recipientForm, preferred_channel: value})}
              >
                <SelectTrigger className="glass-panel border-[rgba(255,255,255,0.08)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="pdf">PDF Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <Button
              variant="outline"
              onClick={() => setShowAddRecipientForm(false)}
              className="flex-1 border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => addRecipientMutation.mutate(recipientForm)}
              disabled={!recipientForm.name || !recipientForm.email || addRecipientMutation.isPending}
              className="flex-1 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              {addRecipientMutation.isPending ? 'Adding...' : 'Add Recipient'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}