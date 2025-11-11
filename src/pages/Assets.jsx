import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import {
  Plus,
  Search,
  Database,
  MapPin,
  Building2,
  Calendar,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

import AssetForm from "../components/assets/AssetForm";

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [showNewAssetForm, setShowNewAssetForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list('-created_date'),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchTerm || 
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || asset.asset_type === typeFilter;
    
    return matchesSearch && matchesType && asset.is_active !== false;
  });

  const assetTypeColors = {
    hvac: 'bg-blue-500/20 text-blue-200 border-blue-300/30',
    electrical: 'bg-yellow-500/20 text-yellow-200 border-yellow-300/30',
    plumbing: 'bg-cyan-500/20 text-cyan-200 border-cyan-300/30',
    fire_safety: 'bg-red-500/20 text-red-200 border-red-300/30',
    security: 'bg-purple-500/20 text-purple-200 border-purple-300/30',
    lift: 'bg-orange-500/20 text-orange-200 border-orange-300/30',
    boiler: 'bg-pink-500/20 text-pink-200 border-pink-300/30',
    lighting: 'bg-amber-500/20 text-amber-200 border-amber-300/30',
    doors: 'bg-gray-500/20 text-gray-200 border-gray-300/30',
    other: 'bg-slate-500/20 text-slate-200 border-slate-300/30',
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Asset Register</h1>
            <p className="text-white/70">Manage equipment and assets across all sites</p>
          </div>
          <Button
            onClick={() => setShowNewAssetForm(true)}
            className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Asset
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-effect border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue placeholder="Asset Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="hvac">HVAC</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="plumbing">Plumbing</SelectItem>
              <SelectItem value="fire_safety">Fire Safety</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="lift">Lift</SelectItem>
              <SelectItem value="boiler">Boiler</SelectItem>
              <SelectItem value="lighting">Lighting</SelectItem>
              <SelectItem value="doors">Doors</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70">Loading assets...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="col-span-full glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <Database className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <h3 className="text-xl font-semibold text-white mb-2">No assets found</h3>
            <p className="text-white/60 mb-6">Add your first asset to start tracking</p>
            <Button
              onClick={() => setShowNewAssetForm(true)}
              className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const site = sites.find(s => s.id === asset.site_id);
            return (
              <div
                key={asset.id}
                className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer"
              >
                {asset.photo_urls && asset.photo_urls[0] && (
                  <div className="mb-4 -mx-6 -mt-6">
                    <img
                      src={asset.photo_urls[0]}
                      alt={asset.name}
                      className="w-full h-40 object-cover rounded-t-2xl"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{asset.name}</h3>
                    {asset.manufacturer && asset.model && (
                      <p className="text-sm text-white/70">
                        {asset.manufacturer} {asset.model}
                      </p>
                    )}
                  </div>
                  <Badge className={`ml-3 ${assetTypeColors[asset.asset_type]} border`}>
                    {asset.asset_type?.replace('_', ' ')}
                  </Badge>
                </div>

                {site && (
                  <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{site.name}</span>
                  </div>
                )}

                {asset.location_description && (
                  <p className="text-sm text-white/60 mb-3">{asset.location_description}</p>
                )}

                <div className="pt-3 border-t border-white/10 space-y-2">
                  {asset.serial_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Serial #</span>
                      <span className="text-white/90">{asset.serial_number}</span>
                    </div>
                  )}
                  {asset.installation_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Installed</span>
                      <span className="text-white/90">
                        {format(new Date(asset.installation_date), 'MMM yyyy')}
                      </span>
                    </div>
                  )}
                  {asset.last_service_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Last Service</span>
                      <span className="text-white/90">
                        {format(new Date(asset.last_service_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Asset Dialog */}
      <Dialog open={showNewAssetForm} onOpenChange={setShowNewAssetForm}>
        <DialogContent className="glass-effect-strong border-white/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Asset</DialogTitle>
          </DialogHeader>
          <AssetForm
            onSuccess={() => {
              setShowNewAssetForm(false);
              queryClient.invalidateQueries(['assets']);
            }}
            onCancel={() => setShowNewAssetForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}