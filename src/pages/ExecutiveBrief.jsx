import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Download,
  RefreshCw,
  Plus,
  Mail,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Trash2,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [recipientForm, setRecipientForm] = useState({
    name: '',
    email: '',
    role: 'Director',
    active: true,
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
      setIsGenerating(false);
    },
  });

  const createRecipientMutation = useMutation({
    mutationFn: (data) => base44.entities.ExecutiveRecipient.create({
      ...data,
      org_id: user.org_id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['executive-recipients']);
      setShowRecipientForm(false);
      setRecipientForm({
        name: '',
        email: '',
        role: 'Director',
        active: true,
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
    } catch (error) {
      console.error("Error generating brief:", error);
      setIsGenerating(false);
    }
  };

  const sortedBriefs = [...briefs].sort((a, b) => 
    new Date(b.week_commencing) - new Date(a.week_commencing)
  );

  const currentBrief = sortedBriefs[0];
  const historicalBriefs = sortedBriefs.slice(1);

  const roleColors = {
    CEO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Director: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Ops: 'bg-green-500/20 text-green-400 border-green-500/30',
    Finance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Marketing: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Executive AI Briefing</h1>
            <p className="text-[#CED4DA]">Automated weekly performance summaries</p>
          </div>
          <Button
            onClick={handleGenerateBrief}
            disabled={isGenerating}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            Generate Brief Now
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
            <div className="text-sm text-[#CED4DA] mb-1">Total Briefs</div>
            <div className="text-3xl font-bold text-white">{briefs.length}</div>
          </div>
          <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
            <div className="text-sm text-[#CED4DA] mb-1">Active Recipients</div>
            <div className="text-3xl font-bold text-white">
              {recipients.filter(r => r.active).length}
            </div>
          </div>
          <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
            <div className="text-sm text-[#CED4DA] mb-1">Last Generated</div>
            <div className="text-lg font-bold text-white">
              {currentBrief ? format(new Date(currentBrief.generated_at), 'MMM d, yyyy') : 'Never'}
            </div>
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
              {/* Brief Header */}
              <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Week Commencing {format(new Date(currentBrief.week_commencing), 'MMMM d, yyyy')}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-[#CED4DA]">
                      <span>Generated: {format(new Date(currentBrief.generated_at), 'MMM d, h:mm a')}</span>
                      {currentBrief.distributed_to?.length > 0 && (
                        <Badge className="text-xs">
                          <Mail className="w-3 h-3 mr-1" />
                          Sent to {currentBrief.distributed_to.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => window.open(currentBrief.pdf_url, '_blank')}
                    variant="outline"
                    className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                  >
                    <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    View Report
                  </Button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className={`glass-panel rounded-xl p-5 border ${
                  currentBrief.org_health_score >= 80 ? 'border-green-500/30' :
                  currentBrief.org_health_score >= 60 ? 'border-yellow-500/30' :
                  'border-red-500/30'
                }`}>
                  <div className="text-sm text-[#CED4DA] mb-1">Org Health</div>
                  <div className={`text-4xl font-bold ${
                    currentBrief.org_health_score >= 80 ? 'text-green-400' :
                    currentBrief.org_health_score >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {currentBrief.org_health_score || 0}
                  </div>
                </div>

                <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">30-Day Revenue</div>
                  <div className="text-3xl font-bold text-white">
                    £{(currentBrief.forecast_summary_json?.projection_30d || 0).toLocaleString()}
                  </div>
                  <Badge className={`${
                    currentBrief.forecast_summary_json?.risk_band === 'LOW' ? 'badge-green' :
                    currentBrief.forecast_summary_json?.risk_band === 'MED' ? 'badge-yellow' :
                    'badge-red'
                  } text-xs mt-1`}>
                    {currentBrief.forecast_summary_json?.risk_band || 'N/A'} RISK
                  </Badge>
                </div>

                <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">Expected Margin</div>
                  <div className="text-3xl font-bold text-green-400">
                    £{(currentBrief.forecast_summary_json?.expected_margin || 0).toLocaleString()}
                  </div>
                </div>

                <div className="glass-panel rounded-xl p-5 border border-red-500/30 bg-red-500/5">
                  <div className="text-sm text-[#CED4DA] mb-1">Overdue Invoices</div>
                  <div className="text-3xl font-bold text-red-400">
                    £{(currentBrief.financial_summary_json?.overdue_value || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#CED4DA] mt-1">
                    {currentBrief.financial_summary_json?.overdue_count || 0} invoices
                  </div>
                </div>

                <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">SLA Breaches</div>
                  <div className={`text-3xl font-bold ${
                    (currentBrief.operational_summary_json?.sla_breaches || 0) === 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentBrief.operational_summary_json?.sla_breaches || 0}
                  </div>
                  {currentBrief.operational_summary_json?.delta_sla_pct && (
                    <div className={`text-xs font-semibold mt-1 ${
                      currentBrief.operational_summary_json.delta_sla_pct > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {currentBrief.operational_summary_json.delta_sla_pct > 0 ? '↑' : '↓'} 
                      {Math.abs(currentBrief.operational_summary_json.delta_sla_pct).toFixed(0)}% vs last week
                    </div>
                  )}
                </div>

                <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">Marketing ROI</div>
                  <div className="text-3xl font-bold text-white">
                    {(currentBrief.marketing_summary_json?.avg_roi || 0).toFixed(1)}×
                  </div>
                  <div className="text-xs text-[#CED4DA] mt-1">
                    {currentBrief.marketing_summary_json?.conversion_rate 
                      ? (currentBrief.marketing_summary_json.conversion_rate * 100).toFixed(0) 
                      : 0}% conversion
                  </div>
                </div>
              </div>

              {/* Risk Summary */}
              {currentBrief.risk_summary_json?.top_risks?.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
                    Risk Flags ({currentBrief.risk_summary_json.active_alerts || 0} active alerts)
                  </h3>
                  <div className="space-y-3">
                    {currentBrief.risk_summary_json.top_risks.map((risk, idx) => (
                      <div key={idx} className="glass-panel rounded-lg p-4 border border-red-500/30">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-white">{risk.title}</h4>
                          <Badge className={`${
                            risk.severity === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          } border text-xs`}>
                            {risk.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#CED4DA]">{risk.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              {currentBrief.recommendations_json?.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
                    AI Recommendations
                  </h3>
                  <div className="space-y-3">
                    {currentBrief.recommendations_json.map((rec, idx) => (
                      <div key={idx} className="glass-panel rounded-lg p-4 border border-[#E1467C]/30 bg-[#E1467C]/5">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-white">{rec.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={`${
                              rec.priority === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              rec.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            } border text-xs`}>
                              {rec.priority}
                            </Badge>
                            {rec.confidence && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border text-xs">
                                {Math.round(rec.confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-[#CED4DA]">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
              <h3 className="text-xl font-semibold text-white mb-2">No Brief Generated</h3>
              <p className="text-[#CED4DA] mb-6">Generate your first executive briefing</p>
              <Button
                onClick={handleGenerateBrief}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Generate Brief Now
              </Button>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-6">
          {historicalBriefs.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
              <h3 className="text-xl font-semibold text-white mb-2">No Historical Briefs</h3>
              <p className="text-[#CED4DA]">Previous briefs will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historicalBriefs.map(brief => (
                <div
                  key={brief.id}
                  className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-white">
                          Week of {format(new Date(brief.week_commencing), 'MMMM d, yyyy')}
                        </h3>
                        <Badge className={`${
                          brief.org_health_score >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          brief.org_health_score >= 60 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        } border`}>
                          Health: {brief.org_health_score}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-[#CED4DA]">Revenue:</span>
                          <span className="text-white font-semibold ml-2">
                            £{(brief.forecast_summary_json?.projection_30d || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#CED4DA]">Margin:</span>
                          <span className="text-white font-semibold ml-2">
                            £{(brief.forecast_summary_json?.expected_margin || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#CED4DA]">Overdue:</span>
                          <span className="text-red-400 font-semibold ml-2">
                            £{(brief.financial_summary_json?.overdue_value || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#CED4DA]">Alerts:</span>
                          <span className="text-white font-semibold ml-2">
                            {brief.risk_summary_json?.active_alerts || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => window.open(brief.pdf_url, '_blank')}
                      size="sm"
                      variant="outline"
                      className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] ml-4"
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
            <p className="text-sm text-[#CED4DA]">
              Manage who receives weekly executive briefings
            </p>
            <Button
              onClick={() => setShowRecipientForm(true)}
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
              <h3 className="text-xl font-semibold text-white mb-2">No Recipients</h3>
              <p className="text-[#CED4DA] mb-6">Add recipients to distribute weekly briefs</p>
              <Button
                onClick={() => setShowRecipientForm(true)}
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
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{recipient.name}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${roleColors[recipient.role]} border text-xs`}>
                          {recipient.role}
                        </Badge>
                        <Badge className={`${
                          recipient.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        } text-xs`}>
                          {recipient.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-[#CED4DA] space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" strokeWidth={1.5} />
                          <span className="truncate">{recipient.email}</span>
                        </div>
                        <div className="text-xs">
                          Channel: {recipient.preferred_channel || 'email'}
                        </div>
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
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Recipient Dialog */}
      <Dialog open={showRecipientForm} onOpenChange={setShowRecipientForm}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Recipient</DialogTitle>
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
                placeholder="john.smith@company.com"
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Role</Label>
              <Select value={recipientForm.role} onValueChange={(v) => setRecipientForm({...recipientForm, role: v})}>
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
              <Select value={recipientForm.preferred_channel} onValueChange={(v) => setRecipientForm({...recipientForm, preferred_channel: v})}>
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
              onClick={() => setShowRecipientForm(false)}
              className="flex-1 border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createRecipientMutation.mutate(recipientForm)}
              disabled={!recipientForm.name || !recipientForm.email || createRecipientMutation.isPending}
              className="flex-1 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              {createRecipientMutation.isPending ? 'Adding...' : 'Add Recipient'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}