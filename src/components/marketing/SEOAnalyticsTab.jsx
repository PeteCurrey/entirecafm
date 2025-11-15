import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Search,
  Plus,
  RefreshCw,
  BarChart3
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
  ResponsiveContainer 
} from 'recharts';

export default function SEOAnalyticsTab({ orgId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ keyword: '', url: '' });

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ['seo-keywords', orgId],
    queryFn: () => base44.entities.SEOKeyword.filter({ org_id: orgId }),
  });

  const trackKeywordMutation = useMutation({
    mutationFn: async (data) => {
      return base44.functions.invoke('seoTracker', {
        org_id: orgId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seo-keywords']);
      setShowAddDialog(false);
      setNewKeyword({ keyword: '', url: '' });
    },
  });

  const handleAddKeyword = () => {
    if (!newKeyword.keyword) return;
    trackKeywordMutation.mutate(newKeyword);
  };

  const handleRefreshAll = async () => {
    for (const kw of keywords.slice(0, 5)) {
      await trackKeywordMutation.mutateAsync({
        keyword: kw.keyword,
        url: kw.url
      });
    }
  };

  const getRankBadge = (rank) => {
    if (rank <= 10) return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'TOP 10' };
    if (rank <= 20) return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'PAGE 1' };
    if (rank <= 50) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'PAGE 2-5' };
    return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'PAGE 5+' };
  };

  const getChangeBadge = (change) => {
    if (change < 0) return { icon: TrendingUp, color: 'text-green-400', label: `+${Math.abs(change)}` };
    if (change > 0) return { icon: TrendingDown, color: 'text-red-400', label: `-${change}` };
    return { icon: Minus, color: 'text-gray-400', label: '0' };
  };

  // Top gains and losses
  const topGains = [...keywords]
    .filter(k => k.change_7d < 0)
    .sort((a, b) => a.change_7d - b.change_7d)
    .slice(0, 3);

  const topLosses = [...keywords]
    .filter(k => k.change_7d > 0)
    .sort((a, b) => b.change_7d - a.change_7d)
    .slice(0, 3);

  // Trend chart data (mock - in production, fetch historical data)
  const trendData = Array.from({ length: 7 }, (_, i) => ({
    day: `Day ${i + 1}`,
    avgRank: keywords.length > 0 
      ? Math.round(keywords.reduce((sum, k) => sum + (k.rank || 50), 0) / keywords.length)
      : 50
  }));

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">SEO Analytics</h3>
          <p className="text-sm text-[#CED4DA]">Track keyword rankings and SERP performance</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRefreshAll}
            disabled={trackKeywordMutation.isPending || keywords.length === 0}
            variant="outline"
            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${trackKeywordMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Track Keyword
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Total Keywords</div>
          <div className="text-3xl font-bold text-white">{keywords.length}</div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Avg Rank</div>
          <div className="text-3xl font-bold text-white">
            {keywords.length > 0 
              ? Math.round(keywords.reduce((sum, k) => sum + (k.rank || 50), 0) / keywords.length)
              : '-'}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Top 10 Rankings</div>
          <div className="text-3xl font-bold text-green-400">
            {keywords.filter(k => k.rank <= 10).length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Improving</div>
          <div className="text-3xl font-bold text-green-400">
            {keywords.filter(k => k.change_7d < 0).length}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#E1467C]" />
          Average Rank Trend
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="day" stroke="#CED4DA" />
            <YAxis reversed stroke="#CED4DA" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(13, 17, 23, 0.95)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff'
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="avgRank" 
              stroke="#E1467C" 
              strokeWidth={2}
              dot={{ fill: '#E1467C' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Gains/Losses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Top Gains
          </h4>
          {topGains.length === 0 ? (
            <p className="text-[#CED4DA] text-sm">No improvements yet</p>
          ) : (
            <div className="space-y-3">
              {topGains.map((kw, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-[#CED4DA] text-sm truncate flex-1">{kw.keyword}</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border ml-2">
                    +{Math.abs(kw.change_7d)} positions
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            Top Losses
          </h4>
          {topLosses.length === 0 ? (
            <p className="text-[#CED4DA] text-sm">No declines</p>
          ) : (
            <div className="space-y-3">
              {topLosses.map((kw, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-[#CED4DA] text-sm truncate flex-1">{kw.keyword}</span>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border ml-2">
                    -{kw.change_7d} positions
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Keywords Table */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h4 className="text-lg font-bold text-white mb-4">All Keywords</h4>
        {keywords.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No keywords tracked</h3>
            <p className="text-[#CED4DA] mb-6">Start tracking keywords to monitor your SERP performance</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Keyword
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {keywords.map((kw) => {
              const rankBadge = getRankBadge(kw.rank);
              const changeBadge = getChangeBadge(kw.change_7d);
              const ChangeIcon = changeBadge.icon;

              return (
                <div key={kw.id} className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold">{kw.keyword}</span>
                        <Badge className={`${rankBadge.bg} ${rankBadge.text} border-0`}>
                          {rankBadge.label}
                        </Badge>
                      </div>
                      {kw.url && (
                        <span className="text-xs text-[#CED4DA] opacity-50">{kw.url}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">#{kw.rank}</div>
                        <div className="text-xs text-[#CED4DA]">Current Rank</div>
                      </div>
                      <div className={`flex items-center gap-1 ${changeBadge.color}`}>
                        <ChangeIcon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{changeBadge.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#CED4DA]">
                    <span>Volume: {kw.search_volume?.toLocaleString() || 'N/A'}</span>
                    <span>Competition: {kw.competition || 'N/A'}</span>
                    {kw.last_checked && (
                      <span>Last checked: {new Date(kw.last_checked).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Keyword Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Track New Keyword</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#CED4DA] mb-2 block">Keyword Phrase</Label>
              <Input
                placeholder="e.g. facilities management software"
                value={newKeyword.keyword}
                onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>
            <div>
              <Label className="text-[#CED4DA] mb-2 block">Target URL (optional)</Label>
              <Input
                placeholder="https://yoursite.com/page"
                value={newKeyword.url}
                onChange={(e) => setNewKeyword({ ...newKeyword, url: e.target.value })}
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => setShowAddDialog(false)}
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddKeyword}
                disabled={!newKeyword.keyword || trackKeywordMutation.isPending}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {trackKeywordMutation.isPending ? 'Tracking...' : 'Track Keyword'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}