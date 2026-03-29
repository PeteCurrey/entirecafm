import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Upload, X, Image as ImageIcon } from "lucide-react";
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
    asset_id: '',
    preferred_date: '',
    contact_name: '',
    contact_phone: '',
    attachments: []
  });
  const [uploadingFiles, setUploadingFiles] = useState(false);

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

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', formData.site_id],
    queryFn: () => base44.entities.Asset.filter({ site_id: formData.site_id }),
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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...uploadedUrls] }));
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

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

          {assets.length > 0 && (
            <div>
              <Label className="text-white mb-2">Asset (Optional)</Label>
              <Select
                value={formData.asset_id}
                onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
              >
                <SelectTrigger className="glass-panel border-divider text-white">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} - {asset.asset_type}
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

          <div>
            <Label className="text-white mb-2">Preferred Date</Label>
            <Input
              type="date"
              value={formData.preferred_date}
              onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
              className="glass-panel border-divider text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white mb-2">Contact Name</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Your name"
                className="glass-panel border-divider text-white"
              />
            </div>
            <div>
              <Label className="text-white mb-2">Contact Phone</Label>
              <Input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="Your phone number"
                className="glass-panel border-divider text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-white mb-2">Attachments</Label>
            <div className="glass-panel rounded-lg p-4 border border-dashed border-divider">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf,.doc,.docx"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer py-4"
              >
                <Upload className="w-8 h-8 text-[#CED4DA] mb-2" />
                <p className="text-sm text-[#CED4DA]">
                  {uploadingFiles ? 'Uploading...' : 'Click to upload photos or documents'}
                </p>
              </label>
              
              {formData.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.attachments.map((url, index) => (
                    <div key={index} className="flex items-center justify-between glass-panel rounded p-2 border border-divider">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#E1467C]" />
                        <span className="text-sm text-white">Attachment {index + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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