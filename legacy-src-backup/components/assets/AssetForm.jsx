import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AssetForm({ onSuccess, onCancel, initialData = {} }) {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    site_id: initialData.site_id || "",
    building_id: initialData.building_id || "",
    asset_type: initialData.asset_type || "other",
    manufacturer: initialData.manufacturer || "",
    model: initialData.model || "",
    serial_number: initialData.serial_number || "",
    installation_date: initialData.installation_date || "",
    warranty_expiry: initialData.warranty_expiry || "",
    location_description: initialData.location_description || "",
    service_interval_days: initialData.service_interval_days || "",
  });

  const [saving, setSaving] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
    enabled: !!formData.site_id,
  });

  const filteredBuildings = buildings.filter(b => b.site_id === formData.site_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await base44.entities.Asset.create(formData);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating asset:", error);
      alert("Failed to create asset. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-white/90">Asset Name *</Label>
        <Input
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50"
          placeholder="e.g. Main Boiler Unit 1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Asset Type *</Label>
          <Select value={formData.asset_type} onValueChange={(value) => setFormData({ ...formData, asset_type: value })}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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

        <div>
          <Label className="text-white/90">Site *</Label>
          <Select value={formData.site_id} onValueChange={(value) => setFormData({ ...formData, site_id: value, building_id: "" })}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.site_id && filteredBuildings.length > 0 && (
        <div>
          <Label className="text-white/90">Building (Optional)</Label>
          <Select value={formData.building_id} onValueChange={(value) => setFormData({ ...formData, building_id: value })}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue placeholder="Select building" />
            </SelectTrigger>
            <SelectContent>
              {filteredBuildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-white/90">Location Description</Label>
        <Input
          value={formData.location_description}
          onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50"
          placeholder="e.g. Basement, Room B12"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Manufacturer</Label>
          <Input
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            className="glass-effect border-white/20 text-white placeholder:text-white/50"
          />
        </div>
        <div>
          <Label className="text-white/90">Model</Label>
          <Input
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="glass-effect border-white/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>

      <div>
        <Label className="text-white/90">Serial Number</Label>
        <Input
          value={formData.serial_number}
          onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Installation Date</Label>
          <Input
            type="date"
            value={formData.installation_date}
            onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
            className="glass-effect border-white/20 text-white"
          />
        </div>
        <div>
          <Label className="text-white/90">Warranty Expiry</Label>
          <Input
            type="date"
            value={formData.warranty_expiry}
            onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
            className="glass-effect border-white/20 text-white"
          />
        </div>
      </div>

      <div>
        <Label className="text-white/90">Service Interval (Days)</Label>
        <Input
          type="number"
          value={formData.service_interval_days}
          onChange={(e) => setFormData({ ...formData, service_interval_days: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50"
          placeholder="e.g. 90 for quarterly service"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 glass-effect border-white/30 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="flex-1 glass-effect-strong border-white/30 text-white hover:bg-white/20"
        >
          {saving ? "Adding..." : "Add Asset"}
        </Button>
      </div>
    </form>
  );
}