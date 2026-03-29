import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  Wrench,
  RefreshCw,
  Settings,
  Plus,
  Eye,
  Package
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AssetsPredictPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [siteFilter, setSiteFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [autoAdjust, setAutoAdjust] = useState(false);
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
          channel: `pafe.org.${user.org_id}`
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'predictions_updated') {
          queryClient.invalidateQueries(['asset-scores']);
        }
      };

      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => setWsConnected(false);
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  };

  const { data: scores = [] } = useQuery({
    queryKey: ['asset-scores', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.AssetFailureScore.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id,
    refetchInterval: 30000
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list()
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list()
  });

  const { data: forecasts = [] } = useQuery({
    queryKey: ['parts-forecasts', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      return base44.entities.PartsDemandForecast.filter({ org_id: user.org_id });
    },
    enabled: !!user?.org_id
  });

  const runPredictionMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('pafe_computeAssetFeatures', { org_id: user.org_id });
      return base44.functions.invoke('pafe_predictFailure', { org_id: user.org_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['asset-scores']);
    }
  });

  const createPPMMutation = useMutation({
    mutationFn: async (assetId) => {
      const score = scores.find(s => s.asset_id === assetId);
      const asset = assets.find(a => a.id === assetId);
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (score?.next_ppm_recommendation_days || 14));

      return base44.entities.Job.create({
        org_id: user.org_id,
        job_number: `PAFE-${Date.now()}-${assetId.slice(0, 6)}`,
        title: `Proactive PPM - ${asset?.name}`,
        description: `Manual PAFE-triggered maintenance (risk: ${score?.risk_score.toFixed(2)})`,
        job_type: 'ppm',
        priority: 'high',
        status: 'new',
        site_id: asset?.site_id,
        asset_id: assetId,
        scheduled_date: dueDate.toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
    }
  });

  // Filter scores
  const filteredScores = scores.filter(score => {
    const asset = assets.find(a => a.id === score.asset_id);
    const siteMatch = siteFilter === 'all' || asset?.site_id === siteFilter;
    const riskMatch = riskFilter === 'all' || score.risk_band === riskFilter;
    return siteMatch && riskMatch;
  });

  // Calculate metrics
  const highRisk = scores.filter(s => s.risk_band === 'HIGH').length;
  const medRisk = scores.filter(s => s.risk_band === 'MED').length;
  const avgRUL = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.rul_days, 0) / scores.length)
    : 0;

  const riskColors = {
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
    MED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Predictive Asset Failure Engine</h1>
          <p className="text-[#CED4DA]">AI-powered failure prediction and proactive maintenance planning</p>
        </div>
        <div className="flex items-center gap-3">
          {wsConnected && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
              LIVE
            </Badge>
          )}
          <Button
            onClick={() => runPredictionMutation.mutate()}
            disabled={runPredictionMutation.isPending}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${runPredictionMutation.isPending ? 'animate-spin' : ''}`} />
            Run Prediction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-5 border border-red-500/30">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="text-sm text-[#CED4DA]">High Risk</div>
          </div>
          <div className="text-3xl font-bold text-red-400">{highRisk}</div>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-yellow-500/30">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-yellow-400" />
            <div className="text-sm text-[#CED4DA]">Medium Risk</div>
          </div>
          <div className="text-3xl font-bold text-yellow-400">{medRisk}</div>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <div className="text-sm text-[#CED4DA]">Avg RUL</div>
          </div>
          <div className="text-3xl font-bold text-white">{avgRUL}d</div>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-5 h-5 text-green-400" />
            <div className="text-sm text-[#CED4DA]">Assets Tracked</div>
          </div>
          <div className="text-3xl font-bold text-white">{scores.length}</div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="glass-panel border-[rgba(255,255,255,0.08)]">
          <TabsTrigger value="overview">Risk Overview</TabsTrigger>
          <TabsTrigger value="forecasts">Parts Forecast</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="flex gap-4">
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-48 glass-panel border-[rgba(255,255,255,0.08)] text-white">
                <SelectValue placeholder="Filter by site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-48 glass-panel border-[rgba(255,255,255,0.08)] text-white">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="HIGH">High Risk</SelectItem>
                <SelectItem value="MED">Medium Risk</SelectItem>
                <SelectItem value="LOW">Low Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assets Table */}
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            {filteredScores.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
                <h3 className="text-xl font-semibold text-white mb-2">No predictions yet</h3>
                <p className="text-[#CED4DA] mb-6">Run prediction to analyze asset failure risk</p>
                <Button
                  onClick={() => runPredictionMutation.mutate()}
                  className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Prediction
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredScores.map(score => {
                  const asset = assets.find(a => a.id === score.asset_id);
                  const site = sites.find(s => s.id === asset?.site_id);

                  return (
                    <div
                      key={score.id}
                      className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-white font-semibold">{asset?.name || 'Unknown Asset'}</h4>
                            <Badge className={`${riskColors[score.risk_band]} border`}>
                              {score.risk_band} RISK
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[#CED4DA] mb-2">
                            <span>📍 {site?.name || 'Unknown Site'}</span>
                            <span>Type: {asset?.asset_type || 'N/A'}</span>
                            <span>RUL: {score.rul_days} days</span>
                            <span>Next PPM: {score.next_ppm_recommendation_days}d</span>
                          </div>
                          {score.top_drivers?.length > 0 && (
                            <div className="text-xs text-[#CED4DA]">
                              Drivers: {score.top_drivers.slice(0, 3).join(' • ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${
                              score.risk_score >= 0.7 ? 'text-red-400' :
                              score.risk_score >= 0.45 ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {(score.risk_score * 100).toFixed(0)}
                            </div>
                            <div className="text-xs text-[#CED4DA]">Score</div>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedAsset(score);
                              setShowDetailDialog(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Details
                          </Button>
                          {score.risk_band === 'HIGH' && (
                            <Button
                              onClick={() => createPPMMutation.mutate(score.asset_id)}
                              disabled={createPPMMutation.isPending}
                              size="sm"
                              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create PPM
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-6 mt-6">
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <h3 className="text-lg font-bold text-white mb-4">90-Day Parts Demand Forecast</h3>
            {forecasts.length === 0 ? (
              <p className="text-[#CED4DA] text-center py-8">No forecasts available yet</p>
            ) : (
              <div className="space-y-3">
                {forecasts.map(forecast => (
                  <div key={forecast.id} className="flex items-center justify-between glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                    <div>
                      <div className="text-white font-semibold">{forecast.part_name}</div>
                      <div className="text-xs text-[#CED4DA]">
                        SKU: {forecast.part_sku} • Asset Type: {forecast.asset_type}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{forecast.expected_usage_qty}</div>
                        <div className="text-xs text-[#CED4DA]">Expected Qty</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">{(forecast.confidence * 100).toFixed(0)}%</div>
                        <div className="text-xs text-[#CED4DA]">Confidence</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Order
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <h3 className="text-lg font-bold text-white mb-4">PAFE Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Auto-Adjust PPM Schedules</div>
                  <div className="text-sm text-[#CED4DA]">
                    Automatically create PPM jobs for high-risk assets and adjust intervals
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoAdjust}
                  onChange={(e) => setAutoAdjust(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </div>
              <div className="pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <div className="text-sm text-[#CED4DA] space-y-2">
                  <p>• High Risk: Create PPM job immediately</p>
                  <p>• Medium Risk: Reduce interval by 15%</p>
                  <p>• Low Risk: Extend interval by 10%</p>
                  <p>• Minimum PPM interval: 30 days</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Asset Risk Detail</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                <div className="text-sm text-[#CED4DA] mb-1">Asset</div>
                <div className="text-white font-semibold">
                  {assets.find(a => a.id === selectedAsset.asset_id)?.name || 'Unknown'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">Risk Score</div>
                  <div className={`text-2xl font-bold ${
                    selectedAsset.risk_score >= 0.7 ? 'text-red-400' :
                    selectedAsset.risk_score >= 0.45 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {(selectedAsset.risk_score * 100).toFixed(0)}
                  </div>
                </div>
                <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">RUL</div>
                  <div className="text-2xl font-bold text-white">{selectedAsset.rul_days}d</div>
                </div>
                <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                  <div className="text-sm text-[#CED4DA] mb-1">Next PPM</div>
                  <div className="text-2xl font-bold text-blue-400">{selectedAsset.next_ppm_recommendation_days}d</div>
                </div>
              </div>
              <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                <div className="text-sm text-[#CED4DA] mb-2">Risk Drivers</div>
                <div className="space-y-2">
                  {selectedAsset.top_drivers?.map((driver, idx) => (
                    <div key={idx} className="text-white text-sm">• {driver}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}