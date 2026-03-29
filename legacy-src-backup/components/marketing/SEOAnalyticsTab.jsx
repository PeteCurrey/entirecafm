import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown,
  Search,
  Plus,
  X,
  LineChart as LineChartIcon,
  Award,
  AlertCircle,
  ExternalLink,
  Users,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SEOAnalyticsTab({ orgId }) {
  const queryClient = useQueryClient();
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  const [showCompetitorDialog, setShowCompetitorDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [formData, setFormData] = useState({
    keyword: '',
    url: '',
    competitor_name: '',
    competitor_domain: ''
  });

  // Fetch primary website setting (stored in User entity)
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const primaryWebsite = user?.primary_website || '';

  // Fetch SEO keywords
  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ['seo-keywords', orgId],
    queryFn: async () => {
      const kw = await base44.entities.SEOKeyword.filter({ org_id: orgId });
      return kw.sort((a, b) => (b.rank || 100) - (a.rank || 100));
    },
  });

  // Fetch competitors
  const { data: competitors = [] } = useQuery({
    queryKey: ['seo-competitors', orgId],
    queryFn: () => base44.entities.SEOCompetitor.filter({ org_id: orgId }),
  });

  // Fetch historical data for selected keyword
  const { data: keywordHistory = [] } = useQuery({
    queryKey: ['seo-history', selectedKeyword?.id],
    queryFn: async () => {
      if (!selectedKeyword) return [];
      return base44.entities.SEOKeywordHistory.filter({ 
        keyword_id: selectedKeyword.id 
      });
    },
    enabled: !!selectedKeyword,
  });

  // Fetch latest audit
  const { data: latestAudit } = useQuery({
    queryKey: ['seo-audit', orgId, primaryWebsite],
    queryFn: async () => {
      if (!primaryWebsite) return null;
      const audits = await base44.entities.SEOAudit.filter({ 
        org_id: orgId,
        url: primaryWebsite
      });
      return audits.sort((a, b) => 
        new Date(b.audit_date) - new Date(a.audit_date)
      )[0] || null;
    },
    enabled: !!primaryWebsite,
  });

  // Track keyword mutation
  const trackKeywordMutation = useMutation({
    mutationFn: async (data) => {
      return base44.functions.invoke('seoTracker', {
        org_id: orgId,
        keyword: data.keyword,
        url: data.url,
        check_competitors: true,
        run_audit: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seo-keywords']);
      queryClient.invalidateQueries(['seo-history']);
      setShowTrackDialog(false);
      setFormData({ ...formData, keyword: '', url: '' });
    },
  });

  // Add competitor mutation
  const addCompetitorMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.SEOCompetitor.create({
        org_id: orgId,
        domain: data.competitor_domain,
        name: data.competitor_name,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seo-competitors']);
      setShowCompetitorDialog(false);
      setFormData({ ...formData, competitor_name: '', competitor_domain: '' });
    },
  });

  // Remove competitor mutation
  const removeCompetitorMutation = useMutation({
    mutationFn: (competitorId) => base44.entities.SEOCompetitor.delete(competitorId),
    onSuccess: () => {
      queryClient.invalidateQueries(['seo-competitors']);
    },
  });

  // Run audit mutation
  const runAuditMutation = useMutation({
    mutationFn: async () => {
      if (!primaryWebsite) throw new Error('Primary website not set');
      
      // Pick a representative keyword for audit
      const mainKeyword = keywords[0]?.keyword || 'business services';
      
      return base44.functions.invoke('seoTracker', {
        org_id: orgId,
        keyword: mainKeyword,
        url: primaryWebsite,
        check_competitors: false,
        run_audit: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seo-audit']);
      setShowAuditDialog(false);
    },
  });

  // Update primary website
  const updateWebsiteMutation = useMutation({
    mutationFn: async (website) => {
      return base44.auth.updateMe({ primary_website: website });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
    },
  });

  // Prepare chart data for selected keyword
  const chartData = keywordHistory
    .filter(h => !h.is_competitor)
    .sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at))
    .map(h => ({
      date: new Date(h.checked_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      rank: h.rank || 100,
      timestamp: h.checked_at
    }));

  // Add competitor lines to chart
  const competitorChartData = selectedKeyword ? competitors.map(comp => {
    const compHistory = keywordHistory
      .filter(h => h.is_competitor && h.url === comp.domain)
      .sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at))
      .map(h => ({
        date: new Date(h.checked_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        rank: h.rank || 100,
        timestamp: h.checked_at
      }));
    
    return { competitor: comp, data: compHistory };
  }) : [];

  // Merge all chart data by timestamp
  const mergedChartData = chartData.map(point => {
    const merged = { ...point };
    competitorChartData.forEach(({ competitor, data }) => {
      const match = data.find(d => d.timestamp === point.timestamp);
      merged[competitor.name || competitor.domain] = match?.rank || null;
    });
    return merged;
  });

  // Calculate summary metrics
  const avgRank = keywords.length > 0
    ? keywords.reduce((sum, k) => sum + (k.rank || 100), 0) / keywords.length
    : 0;

  const topRankers = keywords.filter(k => k.rank && k.rank <= 10).length;
  const improvements = keywords.filter(k => k.change_7d && k.change_7d > 0).length;
  const declines = keywords.filter(k => k.change_7d && k.change_7d < 0).length;

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
        <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#CED4DA]">Loading SEO analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Website Setup */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">SEO Analytics & Tracking</h3>
          <p className="text-sm text-[#CED4DA] mb-3">Monitor keyword rankings, track competitors, and audit on-page SEO</p>
          
          {/* Primary Website Input */}
          <div className="flex items-center gap-2 max-w-md">
            <Globe className="w-4 h-4 text-[#CED4DA]" />
            <Input
              placeholder="Your primary website (e.g., example.com)"
              value={primaryWebsite}
              onChange={(e) => updateWebsiteMutation.mutate(e.target.value)}
              className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCompetitorDialog(true)}
            variant="outline"
            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
          >
            <Users className="w-4 h-4 mr-2" />
            Competitors ({competitors.filter(c => c.is_active).length})
          </Button>
          {primaryWebsite && (
            <Button
              onClick={() => runAuditMutation.mutate()}
              disabled={runAuditMutation.isPending}
              variant="outline"
              className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
            >
              {runAuditMutation.isPending ? 'Running...' : 'Run Audit'}
            </Button>
          )}
          <Button
            onClick={() => setShowTrackDialog(true)}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Track Keyword
          </Button>
        </div>
      </div>

      {/* Tabs: Overview | Historical Trends | Audit */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="glass-panel border-[rgba(255,255,255,0.08)]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Historical Trends</TabsTrigger>
          {latestAudit && <TabsTrigger value="audit">SEO Audit</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
              <div className="text-sm text-[#CED4DA] mb-1">Keywords Tracked</div>
              <div className="text-3xl font-bold text-white">{keywords.length}</div>
            </div>
            <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
              <div className="text-sm text-[#CED4DA] mb-1">Average Position</div>
              <div className="text-3xl font-bold text-blue-400">{avgRank.toFixed(1)}</div>
            </div>
            <div className="glass-panel rounded-xl p-5 border border-green-500/30">
              <div className="text-sm text-[#CED4DA] mb-1">Top 10 Rankings</div>
              <div className="text-3xl font-bold text-green-400">{topRankers}</div>
            </div>
            <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
              <div className="text-sm text-[#CED4DA] mb-1">7-Day Changes</div>
              <div className="flex items-center gap-3 text-xl font-bold">
                <span className="text-green-400">↑{improvements}</span>
                <span className="text-red-400">↓{declines}</span>
              </div>
            </div>
          </div>

          {/* Keywords Table */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <h4 className="text-lg font-bold text-white mb-4">Keyword Performance</h4>
            {keywords.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
                <h3 className="text-xl font-semibold text-white mb-2">No keywords tracked yet</h3>
                <p className="text-[#CED4DA] mb-6">Start tracking keywords to monitor your SERP performance</p>
                <Button
                  onClick={() => setShowTrackDialog(true)}
                  className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Track First Keyword
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {keywords.map((kw) => (
                  <div
                    key={kw.id}
                    onClick={() => setSelectedKeyword(kw)}
                    className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="text-white font-semibold">{kw.keyword}</h5>
                          <Badge className="text-xs">{kw.competition}</Badge>
                          {kw.rank && kw.rank <= 3 && (
                            <Award className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#CED4DA]">
                          <span>Search Volume: {kw.search_volume?.toLocaleString() || 'N/A'}</span>
                          <span>URL: {kw.url}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {kw.change_7d !== undefined && kw.change_7d !== 0 && (
                          <div className={`flex items-center gap-1 ${
                            kw.change_7d > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {kw.change_7d > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="text-sm font-semibold">{Math.abs(kw.change_7d)}</span>
                          </div>
                        )}
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            kw.rank && kw.rank <= 10 ? 'text-green-400' :
                            kw.rank && kw.rank <= 30 ? 'text-yellow-400' :
                            'text-[#CED4DA]'
                          }`}>
                            #{kw.rank || '—'}
                          </div>
                          <div className="text-xs text-[#CED4DA]">Position</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          {!selectedKeyword ? (
            <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
              <LineChartIcon className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a keyword to view trends</h3>
              <p className="text-[#CED4DA]">Click on any keyword in the Overview tab to see its historical performance</p>
            </div>
          ) : (
            <>
              <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Rank Trends: {selectedKeyword.keyword}</h4>
                    <p className="text-sm text-[#CED4DA]">Historical SERP position over time</p>
                  </div>
                  <Button
                    onClick={() => setSelectedKeyword(null)}
                    variant="ghost"
                    size="sm"
                    className="text-[#CED4DA]"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {chartData.length < 2 ? (
                  <div className="h-[300px] flex items-center justify-center text-[#CED4DA]">
                    Not enough historical data yet. Check back after tracking for a few days.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mergedChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#CED4DA" 
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#CED4DA" 
                        style={{ fontSize: '12px' }}
                        reversed
                        domain={[1, 100]}
                        label={{ value: 'Rank Position', angle: -90, position: 'insideLeft', fill: '#CED4DA' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(13, 17, 23, 0.95)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="rank" 
                        name="Your Site"
                        stroke="#E1467C" 
                        strokeWidth={3}
                        dot={{ fill: '#E1467C', r: 4 }}
                      />
                      {competitorChartData.map(({ competitor }, idx) => (
                        <Line 
                          key={competitor.id}
                          type="monotone" 
                          dataKey={competitor.name || competitor.domain}
                          name={competitor.name || competitor.domain}
                          stroke={['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'][idx % 4]}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Competitor Comparison */}
              {competitors.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
                  <h4 className="text-lg font-bold text-white mb-4">Competitor Comparison</h4>
                  <div className="space-y-3">
                    {competitors.map(comp => {
                      const latestRank = keywordHistory
                        .filter(h => h.is_competitor && h.url === comp.domain)
                        .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at))[0];
                      
                      return (
                        <div key={comp.id} className="flex items-center justify-between glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)]">
                          <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-blue-400" />
                            <div>
                              <div className="text-white font-semibold">{comp.name || comp.domain}</div>
                              <div className="text-xs text-[#CED4DA]">{comp.domain}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {latestRank ? (
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-400">#{latestRank.rank || '—'}</div>
                                <div className="text-xs text-[#CED4DA]">Current Rank</div>
                              </div>
                            ) : (
                              <span className="text-[#CED4DA] text-sm">Not tracked yet</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {latestAudit && (
          <TabsContent value="audit" className="space-y-6 mt-6">
            {/* Audit Score Card */}
            <div className={`glass-panel rounded-2xl p-6 border ${
              latestAudit.score >= 80 ? 'border-green-500/30' :
              latestAudit.score >= 60 ? 'border-yellow-500/30' :
              'border-red-500/30'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">On-Page SEO Audit</h4>
                  <p className="text-sm text-[#CED4DA]">
                    {primaryWebsite} • {new Date(latestAudit.audit_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-5xl font-bold mb-1 ${
                    latestAudit.score >= 80 ? 'text-green-400' :
                    latestAudit.score >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {latestAudit.score}
                  </div>
                  <div className="text-xs text-[#CED4DA]">SEO Score</div>
                </div>
              </div>

              {/* Audit Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-xs text-[#CED4DA] mb-1">Title Tag</div>
                  <div className="text-white text-sm mb-1">{latestAudit.title}</div>
                  <div className="text-xs text-[#CED4DA]">
                    {latestAudit.title_length} chars {
                      latestAudit.title_length >= 50 && latestAudit.title_length <= 60 
                        ? '✓' : '⚠️'
                    }
                  </div>
                </div>

                <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-xs text-[#CED4DA] mb-1">Meta Description</div>
                  <div className="text-white text-sm mb-1">
                    {latestAudit.meta_description || 'Missing'}
                  </div>
                  <div className="text-xs text-[#CED4DA]">
                    {latestAudit.meta_description_length || 0} chars {
                      latestAudit.meta_description_length >= 150 && latestAudit.meta_description_length <= 160
                        ? '✓' : '⚠️'
                    }
                  </div>
                </div>

                <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-xs text-[#CED4DA] mb-1">H1 Tags</div>
                  <div className="text-white text-sm">
                    {latestAudit.h1_tags?.join(', ') || 'None'}
                  </div>
                  <div className="text-xs text-[#CED4DA]">
                    {latestAudit.h1_tags?.length || 0} found {
                      latestAudit.h1_tags?.length === 1 ? '✓' : '⚠️'
                    }
                  </div>
                </div>

                <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-xs text-[#CED4DA] mb-1">Content Length</div>
                  <div className="text-white text-2xl font-bold">
                    {latestAudit.word_count?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-[#CED4DA]">
                    words {latestAudit.word_count >= 1000 ? '✓' : '⚠️'}
                  </div>
                </div>
              </div>

              {/* Issues & Recommendations */}
              {latestAudit.issues?.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    Issues Found
                  </h5>
                  <div className="space-y-2">
                    {latestAudit.issues.map((issue, idx) => (
                      <div key={idx} className="text-sm text-red-400 flex items-start gap-2">
                        <span>•</span>
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {latestAudit.recommendations?.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    Recommendations
                  </h5>
                  <div className="space-y-2">
                    {latestAudit.recommendations.map((rec, idx) => (
                      <div key={idx} className="text-sm text-green-400 flex items-start gap-2">
                        <span>•</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Track Keyword Dialog */}
      <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Track New Keyword</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#CED4DA] mb-2 block">Keyword</Label>
              <Input
                placeholder="e.g., facilities management London"
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>
            <div>
              <Label className="text-[#CED4DA] mb-2 block">Target URL</Label>
              <Input
                placeholder={primaryWebsite || "e.g., example.com/services"}
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowTrackDialog(false)}
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => trackKeywordMutation.mutate(formData)}
                disabled={!formData.keyword || !formData.url || trackKeywordMutation.isPending}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {trackKeywordMutation.isPending ? 'Tracking...' : 'Track Keyword'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Competitor Dialog */}
      <Dialog open={showCompetitorDialog} onOpenChange={setShowCompetitorDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Competitors</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add Competitor Form */}
            <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
              <h4 className="text-sm font-semibold text-white mb-3">Add Competitor</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input
                  placeholder="Competitor name"
                  value={formData.competitor_name}
                  onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })}
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
                />
                <Input
                  placeholder="competitor.com"
                  value={formData.competitor_domain}
                  onChange={(e) => setFormData({ ...formData, competitor_domain: e.target.value })}
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
                />
              </div>
              <Button
                onClick={() => addCompetitorMutation.mutate(formData)}
                disabled={!formData.competitor_domain || addCompetitorMutation.isPending}
                size="sm"
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Competitor
              </Button>
            </div>

            {/* Competitor List */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Active Competitors</h4>
              {competitors.length === 0 ? (
                <p className="text-[#CED4DA] text-sm text-center py-4">No competitors added yet</p>
              ) : (
                <div className="space-y-2">
                  {competitors.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)]">
                      <div>
                        <div className="text-white font-semibold">{comp.name || comp.domain}</div>
                        <div className="text-xs text-[#CED4DA]">{comp.domain}</div>
                      </div>
                      <Button
                        onClick={() => removeCompetitorMutation.mutate(comp.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:bg-red-500/20"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}