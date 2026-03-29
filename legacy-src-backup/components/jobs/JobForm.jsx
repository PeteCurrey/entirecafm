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

export default function JobForm({ onSuccess, onCancel, initialData = {} }) {
  const [formData, setFormData] = useState({
    title: initialData.title || "",
    description: initialData.description || "",
    job_type: initialData.job_type || "reactive",
    priority: initialData.priority || "medium",
    client_id: initialData.client_id || "",
    site_id: initialData.site_id || "",
    building_id: initialData.building_id || "",
    asset_id: initialData.asset_id || "",
    assigned_engineer_id: initialData.assigned_engineer_id || "",
    scheduled_date: initialData.scheduled_date || "",
    scheduled_time: initialData.scheduled_time || "",
    po_number: initialData.po_number || "",
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

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
    enabled: !!formData.site_id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const engineers = users.filter(u => u.role === 'user' || u.engineer_details);

  const filteredBuildings = buildings.filter(b => b.site_id === formData.site_id);
  const filteredAssets = assets.filter(a => a.site_id === formData.site_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const jobNumber = `JOB-${Date.now().toString().slice(-8)}`;
      
      // Calculate SLA due date (24 hours from now as default)
      const slaDate = new Date();
      slaDate.setHours(slaDate.getHours() + 24);

      const jobData = {
        ...formData,
        job_number: jobNumber,
        sla_due_date: slaDate.toISOString(),
        status: formData.assigned_engineer_id ? 'assigned' : 'raised',
      };

      await base44.entities.Job.create(jobData);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-white/90">Job Title *</Label>
        <Input
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50"
          placeholder="e.g. Boiler maintenance required"
        />
      </div>

      <div>
        <Label className="text-white/90">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
          placeholder="Provide detailed information about the job..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Job Type *</Label>
          <Select value={formData.job_type} onValueChange={(value) => setFormData({ ...formData, job_type: value })}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reactive">Reactive</SelectItem>
              <SelectItem value="ppm">PPM</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-white/90">Priority *</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger className="glass-effect border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-white/90">Site *</Label>
        <Select value={formData.site_id} onValueChange={(value) => setFormData({ ...formData, site_id: value, building_id: "", asset_id: "" })}>
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

      {formData.site_id && filteredAssets.length > 0 && (
        <div>
          <Label className="text-white/90">Asset (Optional)</Label>
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
      )}

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white/90">Scheduled Date</Label>
          <Input
            type="date"
            value={formData.scheduled_date}
            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            className="glass-effect border-white/20 text-white"
          />
        </div>
        <div>
          <Label className="text-white/90">Scheduled Time</Label>
          <Input
            type="time"
            value={formData.scheduled_time}
            onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
            className="glass-effect border-white/20 text-white"
          />
        </div>
      </div>

      <div>
        <Label className="text-white/90">PO Number (Optional)</Label>
        <Input
          value={formData.po_number}
          onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
          className="glass-effect border-white/20 text-white placeholder:text-white/50"
          placeholder="Purchase Order Number"
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
          {saving ? "Creating..." : "Create Job"}
        </Button>
      </div>
    </form>
  );
}