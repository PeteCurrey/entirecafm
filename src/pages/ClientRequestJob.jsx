import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function ClientRequestJobPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    site_id: '',
    building_id: '',
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      if (userData.client_details?.primary_site_id) {
        setFormData(prev => ({ ...prev, site_id: userData.client_details.primary_site_id }));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const { data: sites = [] } = useQuery({
    queryKey: ['client-sites'],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Site.filter({ client_id: user.id });
    },
    enabled: !!user,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings', formData.site_id],
    queryFn: () => base44.entities.Building.filter({ site_id: formData.site_id }),
    enabled: !!formData.site_id,
  });

  const createJobMutation = useMutation({
    mutationFn: async (jobData) => {
      return base44.entities.Job.create({
        ...jobData,
        client_id: user.id,
        status: 'raised',
        job_type: 'reactive',
      });
    },
    onSuccess: () => {
      toast.success('Job request submitted successfully');
      navigate(createPageUrl("ClientJobs"));
    },
    onError: (error) => {
      toast.error('Failed to submit job request');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.site_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    createJobMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-[#0D1117] p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-panel rounded-2xl p-6 border border-divider">
          <Link to={createPageUrl("ClientPortal")}>
            <button className="flex items-center gap-2 text-body hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              Back to Dashboard
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Request New Job</h1>
          <p className="text-body">Submit a maintenance or service request</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 border border-divider space-y-6">
          <div>
            <Label className="text-white mb-2">Job Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Boiler not heating"
              className="glass-panel border-divider text-white"
              required
            />
          </div>

          <div>
            <Label className="text-white mb-2">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please describe the issue in detail..."
              className="glass-panel border-divider text-white h-32"
            />
          </div>

          <div>
            <Label className="text-white mb-2">Site *</Label>
            <Select
              value={formData.site_id}
              onValueChange={(value) => setFormData({ ...formData, site_id: value })}
            >
              <SelectTrigger className="glass-panel border-divider text-white">
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

          {buildings.length > 0 && (
            <div>
              <Label className="text-white mb-2">Building (Optional)</Label>
              <Select
                value={formData.building_id}
                onValueChange={(value) => setFormData({ ...formData, building_id: value })}
              >
                <SelectTrigger className="glass-panel border-divider text-white">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-white mb-2">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger className="glass-panel border-divider text-white">
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

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("ClientPortal"))}
              className="flex-1 border-divider text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createJobMutation.isPending}
              className="flex-1 accent-magenta"
            >
              <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}