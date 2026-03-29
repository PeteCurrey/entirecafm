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

export default function PPMScheduleForm({ onSuccess, onCancel, initialData = {} }) {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    asset_id: initialData.asset_id || "",
    site_id: initialData.site_id || "",
    frequency: initialData.frequency || "monthly",
    next_due_date: initialData.next_due_date || "",
    assigned_engineer_id: initialData.assigned_engineer_id || "",
    task_description: initialData.task_description || "",
    estimated_duration_minutes: initialData.estimated_duration_minutes || 60,
  });

  const [saving, setSaving] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const filteredAssets = formData.site_id 
    ? assets.filter(a => a.site_id === formData.site_id)
    : assets;

  const engineers = users.filter(u => u.role === 'user' || u.engineer_details);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await base44.entities.PPMSchedule.create({
        ...formData,
        is_active: true,
      });
      onSuccess?.();
    } catch (error) {
      console.error("Error creating PPM schedule:", error);
      alert("Failed to create schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-white/90">Schedule Name *</Label>
        <Input
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50"
          placeholder="e.g. Quarterly HVAC Inspection"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Site *</Label>
          <Select value={formData.site_id} onValueChange={(value) => setFormData({ ...formData, site_id: value, asset_id: "" })}>
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

        <div>
          <Label className="text-white/90">Asset *</Label>
          <Select value={formData.asset_id} onValueChange={(value) => setFormData({ ...formData, asset_id: value })}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue placeholder="Select asset" />
            </SelectTrigger>
            <SelectContent>
              {filteredAssets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-white/90">Task Description</Label>
        <Textarea
          value={formData.task_description}
          onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
          placeholder="Describe the maintenance tasks to be performed..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Frequency *</Label>
          <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="biannual">Bi-annual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-white/90">Next Due Date *</Label>
          <Input
            required
            type="date"
            value={formData.next_due_date}
            onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
            className="glass-effect border-white/20 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Assign Engineer (Optional)</Label>
          <Select value={formData.assigned_engineer_id} onValueChange={(value) => setFormData({ ...formData, assigned_engineer_id: value })}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue placeholder="Select engineer" />
            </SelectTrigger>
            <SelectContent>
              {engineers.map((engineer) => (
                <SelectItem key={engineer.id} value={engineer.id}>
                  {engineer.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-white/90">Estimated Duration (minutes)</Label>
          <Input
            type="number"
            min="15"
            step="15"
            value={formData.estimated_duration_minutes}
            onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 60 })}
            className="glass-effect border-white/20 text-white"
          />
        </div>
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
          {saving ? "Creating..." : "Create Schedule"}
        </Button>
      </div>
    </form>
  );
}