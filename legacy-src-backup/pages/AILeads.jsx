import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Mail,
  Clock,
  RefreshCw,
  Plus,
  Send,
  Eye
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AILeadsPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showJourneyDialog, setShowJourneyDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const { data: leads = [] } = useQuery({
    queryKey: ['lead-profiles', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.LeadProfile.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: journeyEvents = [] } = useQuery({
    queryKey: ['journey-events', selectedLead?.id],
    queryFn: async () => {
      if (!selectedLead) return [];
      return base44.entities.LeadJourneyEvent.filter({ lead_id: selectedLead.id });
    },
    enabled: !!selectedLead,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.LeadEmailTemplate.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
  });

  const runLifecycleMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('lead_lifecycle', {
        org_id: user.org_id,
        action: 'all'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lead-profiles']);
    },
  });

  const runScoringMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('leadScoring', {
        org_id: user.org_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lead-profiles']);
    },
  });

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      await runLifecycleMutation.mutateAsync();
      await runScoringMutation.mutateAsync();
    } finally {
      setIsProcessing(false);
    }
  };

  const statusColors = {
    NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
    DORMANT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    CLOSED_WON: 'bg-green-500/20 text-green-400 border-green-500/30',
    CLOSED_LOST: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Calculate summary metrics
  const newLeads = leads.filter(l => l.status === 'NEW').length;
  const activeLeads = leads.filter(l => l.status === 'ACTIVE').length;
  const dormantLeads = leads.filter(l => l.status === 'DORMANT').length;
  const conversions = leads.filter(l => l.status === 'CLOSED_WON').length;
  const avgScore = leads.length > 0
    ? leads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / leads.length
    : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Lead Lifecycle</h1>
          <p className="text-[#CED4DA]">Automated lead nurturing, scoring, and conversion tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleProcess}
            disabled={isProcessing}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Processing...' : 'Process Leads'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="glass-panel border-[rgba(255,255,255,0.08)]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Lead Table</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="glass-panel rounded-xl p-5 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-blue-400" />
                <div className="text-sm text-[#CED4DA]">New Leads</div>
              </div>
              <div className="text-3xl font-bold text-blue-400">{newLeads}</div>
            </div>

            <div className="glass-panel rounded-xl p-5 border border-green-500/30">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div className="text-sm text-[#CED4DA]">Active</div>
              </div>
              <div className="text-3xl font-bold text-green-400">{activeLeads}</div>
            </div>

            <div className="glass-panel rounded-xl p-5 border border-yellow-500/30">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <div className="text-sm text-[#CED4DA]">Dormant</div>
              </div>
              <div className="text-3xl font-bold text-yellow-400">{dormantLeads}</div>
            </div>

            <div className="glass-panel rounded-xl p-5 border border-green-500/30">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div className="text-sm text-[#CED4DA]">Conversions</div>
              </div>
              <div className="text-3xl font-bold text-green-400">{conversions}</div>
            </div>

            <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-white" />
                <div className="text-sm text-[#CED4DA]">Avg Score</div>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>
                {avgScore.toFixed(0)}
              </div>
            </div>
          </div>

          {/* Lead Funnel */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <h3 className="text-lg font-bold text-white mb-4">Lead Funnel</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-[#CED4DA]">New</div>
                <div className="flex-1 h-8 bg-blue-500/20 rounded-lg relative overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-lg transition-all"
                    style={{ width: `${leads.length > 0 ? (newLeads / leads.length) * 100 : 0}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-semibold">
                    {newLeads}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-[#CED4DA]">Active</div>
                <div className="flex-1 h-8 bg-green-500/20 rounded-lg relative overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-lg transition-all"
                    style={{ width: `${leads.length > 0 ? (activeLeads / leads.length) * 100 : 0}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-semibold">
                    {activeLeads}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-[#CED4DA]">Converted</div>
                <div className="flex-1 h-8 bg-green-500/20 rounded-lg relative overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-lg transition-all"
                    style={{ width: `${leads.length > 0 ? (conversions / leads.length) * 100 : 0}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-semibold">
                    {conversions}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-6 mt-6">
          {leads.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
              <h3 className="text-xl font-semibold text-white mb-2">No leads yet</h3>
              <p className="text-[#CED4DA] mb-6">Leads are automatically created from quotes and client interactions</p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <div className="space-y-3">
                {leads.map(lead => {
                  const client = clients.find(c => c.id === lead.client_id);
                  const daysSinceActivity = lead.last_activity_date
                    ? Math.floor((new Date() - new Date(lead.last_activity_date)) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <div
                      key={lead.id}
                      className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-white font-semibold">{client?.name || 'Unknown Client'}</h4>
                            <Badge className={`${statusColors[lead.status]} border`}>
                              {lead.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[#CED4DA] mb-2">
                            {lead.contact_email && <span>📧 {lead.contact_email}</span>}
                            {daysSinceActivity !== null && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {daysSinceActivity}d ago
                              </span>
                            )}
                          </div>
                          {lead.next_action && (
                            <div className="text-sm text-[#CED4DA] italic">
                              Next: {lead.next_action}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(lead.lead_score || 0)}`}>
                              {lead.lead_score || 0}
                            </div>
                            <div className="text-xs text-[#CED4DA]">Score</div>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowJourneyDialog(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Journey
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 mt-6">
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Email Templates</h3>
              <Button
                onClick={() => setShowTemplateDialog(true)}
                size="sm"
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-[#CED4DA]">
                No templates created yet. Create one to automate follow-ups.
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <div key={template.id} className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">{template.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-[#CED4DA] mb-2">
                          <Badge className="text-xs">{template.trigger_condition}</Badge>
                          <span>Tone: {template.tone}</span>
                          {template.is_active && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-[#CED4DA]">
                          Subject: {template.subject}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Journey Dialog */}
      <Dialog open={showJourneyDialog} onOpenChange={setShowJourneyDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Lead Journey</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                <div className="text-sm text-[#CED4DA] mb-1">Client</div>
                <div className="text-white font-semibold">
                  {clients.find(c => c.id === selectedLead.client_id)?.name || 'Unknown'}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Journey Timeline</h4>
                <div className="space-y-2">
                  {journeyEvents.length === 0 ? (
                    <p className="text-[#CED4DA] text-sm">No events recorded yet</p>
                  ) : (
                    journeyEvents
                      .sort((a, b) => new Date(b.event_timestamp) - new Date(a.event_timestamp))
                      .map(event => (
                        <div key={event.id} className="flex items-start gap-3 glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)]">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-semibold text-sm">
                              {event.event_type.replace(/_/g, ' ')}
                            </div>
                            <div className="text-xs text-[#CED4DA]">
                              {new Date(event.event_timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}