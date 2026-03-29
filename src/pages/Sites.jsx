import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin, Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SitesPage() {
  const queryClient = useQueryClient();
  const [showNewSiteForm, setShowNewSiteForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    postcode: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    access_notes: "",
  });

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list('-created_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const createSiteMutation = useMutation({
    mutationFn: (data) => base44.entities.Site.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sites']);
      setShowNewSiteForm(false);
      setFormData({
        name: "",
        address: "",
        postcode: "",
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        access_notes: "",
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    createSiteMutation.mutate({
      ...formData,
      client_id: "default-client", // In production, select from dropdown
    });
  };

  const filteredSites = sites.filter(site =>
    site.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSiteStats = (siteId) => {
    const siteBuildings = buildings.filter(b => b.site_id === siteId).length;
    const siteAssets = assets.filter(a => a.site_id === siteId).length;
    return { buildings: siteBuildings, assets: siteAssets };
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sites</h1>
            <p className="text-white/70">Manage client locations and buildings</p>
          </div>
          <Button
            onClick={() => setShowNewSiteForm(true)}
            className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Site
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <Input
            placeholder="Search sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass-effect border-white/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70">Loading sites...</p>
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="col-span-full glass-effect rounded-2xl p-12 border border-white/20 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <h3 className="text-xl font-semibold text-white mb-2">No sites found</h3>
            <p className="text-white/60 mb-6">Create your first site to get started</p>
            <Button
              onClick={() => setShowNewSiteForm(true)}
              className="glass-effect-strong border border-white/30 text-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Site
            </Button>
          </div>
        ) : (
          filteredSites.map((site) => {
            const stats = getSiteStats(site.id);
            return (
              <div
                key={site.id}
                className="glass-effect rounded-2xl p-6 border border-white/20 glass-hover cursor-pointer"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl glass-effect-strong flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white mb-1 truncate">{site.name}</h3>
                    {site.address && (
                      <p className="text-sm text-white/70 line-clamp-2">{site.address}</p>
                    )}
                  </div>
                </div>

                {site.contact_name && (
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <p className="text-xs text-white/50 mb-1">Contact</p>
                    <p className="text-sm text-white/90">{site.contact_name}</p>
                    {site.contact_phone && (
                      <p className="text-xs text-white/70">{site.contact_phone}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-white/70" />
                    <span className="text-sm text-white/90">{stats.buildings} Buildings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/90">{stats.assets} Assets</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Site Dialog */}
      <Dialog open={showNewSiteForm} onOpenChange={setShowNewSiteForm}>
        <DialogContent className="glass-effect-strong border-white/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Site</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-white/90">Site Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="glass-effect border-white/20 text-white placeholder:text-white/50"
                placeholder="e.g. Head Office"
              />
            </div>

            <div>
              <Label className="text-white/90">Address *</Label>
              <Textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="glass-effect border-white/20 text-white placeholder:text-white/50"
                placeholder="Full address"
              />
            </div>

            <div>
              <Label className="text-white/90">Postcode</Label>
              <Input
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                className="glass-effect border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90">Contact Name</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="glass-effect border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <Label className="text-white/90">Contact Phone</Label>
                <Input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="glass-effect border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            <div>
              <Label className="text-white/90">Contact Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="glass-effect border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            <div>
              <Label className="text-white/90">Access Notes</Label>
              <Textarea
                value={formData.access_notes}
                onChange={(e) => setFormData({ ...formData, access_notes: e.target.value })}
                className="glass-effect border-white/20 text-white placeholder:text-white/50"
                placeholder="Access instructions, key codes, parking info..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewSiteForm(false)}
                className="flex-1 glass-effect border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSiteMutation.isPending}
                className="flex-1 glass-effect-strong border-white/30 text-white hover:bg-white/20"
              >
                {createSiteMutation.isPending ? "Creating..." : "Create Site"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}