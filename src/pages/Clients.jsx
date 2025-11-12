import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  ArrowLeft,
  X,
  TrendingDown
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
import { Textarea } from "@/components/ui/textarea";

export default function ClientsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const clientIdParam = searchParams.get('id'); // specific client ID
  const tabParam = searchParams.get('tab'); // 'health' tab
  const fromPage = searchParams.get('from'); // 'director' or undefined
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_phone: "",
    billing_address: "",
    payment_terms_days: 30,
    requires_po: false,
    status: "active"
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const createClientMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Client.create({
        ...data,
        org_id: user.org_id || 'default-org'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowNewClientForm(false);
      setFormData({
        name: "",
        primary_contact_name: "",
        primary_contact_email: "",
        primary_contact_phone: "",
        billing_address: "",
        payment_terms_days: 30,
        requires_po: false,
        status: "active"
      });
    },
  });

  const handleClearFilters = () => {
    navigate(createPageUrl("Clients"));
  };

  // Highlight specific client if ID is provided
  const highlightedClientId = clientIdParam;

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.primary_contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && client.status === 'active';
  });

  // Sort to put highlighted client first
  if (highlightedClientId) {
    filteredClients.sort((a, b) => {
      if (a.id === highlightedClientId) return -1;
      if (b.id === highlightedClientId) return 1;
      return 0;
    });
  }

  const statusColors = {
    active: 'bg-green-500/20 text-green-200 border-green-300/30',
    inactive: 'bg-gray-500/20 text-gray-200 border-gray-300/30',
    suspended: 'bg-red-500/20 text-red-200 border-red-300/30',
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        {/* Back Link - Show if coming from director dashboard */}
        {fromPage === 'director' && (
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("AIDirector"))}
            className="mb-4 text-[#CED4DA] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
            AI Director
          </Button>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Clients</h1>
            <p className="text-[#CED4DA]">
              {tabParam === 'health' ? 'Client health and relationship monitoring' : 'Manage your client organizations'}
            </p>
          </div>
          <Button
            onClick={() => setShowNewClientForm(true)}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        </div>

        {/* Active Filter Pills */}
        {(clientIdParam || tabParam) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {clientIdParam && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 border flex items-center gap-2">
                Viewing: {clients.find(c => c.id === clientIdParam)?.name || 'Client'}
                <X 
                  className="w-3 h-3 cursor-pointer hover:bg-purple-500/30 rounded-full" 
                  onClick={handleClearFilters}
                />
              </Badge>
            )}
            {tabParam === 'health' && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border flex items-center gap-2">
                <TrendingDown className="w-3 h-3" />
                Health Monitoring
              </Badge>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CED4DA] opacity-50" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Total Clients</div>
          <div className="text-3xl font-semibold text-white">
            {clients.filter(c => c.status === 'active').length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Total Sites</div>
          <div className="text-3xl font-semibold text-white">{sites.length}</div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Require PO</div>
          <div className="text-3xl font-semibold text-white">
            {clients.filter(c => c.requires_po).length}
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#CED4DA]">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No clients found</h3>
            <p className="text-[#CED4DA] mb-6">Add your first client to get started</p>
            <Button
              onClick={() => setShowNewClientForm(true)}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>
        ) : (
          filteredClients.map((client) => {
            const clientSites = sites.filter(s => s.client_id === client.id);
            const isHighlighted = client.id === highlightedClientId;
            
            return (
              <div
                key={client.id}
                className={`glass-panel rounded-2xl p-6 border transition-all cursor-pointer ${
                  isHighlighted 
                    ? 'border-[#E1467C] shadow-lg shadow-[#E1467C]/20' 
                    : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg glass-panel border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-[#CED4DA]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{client.name}</h3>
                      <Badge className={`${statusColors[client.status]} border text-xs mt-1`}>
                        {client.status}
                      </Badge>
                    </div>
                  </div>
                  {isHighlighted && tabParam === 'health' && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border">
                      At Risk
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-[#CED4DA] mb-4">
                  {client.primary_contact_name && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" strokeWidth={1.5} />
                      <span>{client.primary_contact_name}</span>
                    </div>
                  )}
                  {client.primary_contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" strokeWidth={1.5} />
                      <span>{client.primary_contact_phone}</span>
                    </div>
                  )}
                  {clientSites.length > 0 && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" strokeWidth={1.5} />
                      <span>{clientSites.length} site{clientSites.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#CED4DA]">Payment Terms</span>
                    <span className="text-white">{client.payment_terms_days || 30} days</span>
                  </div>
                  {client.requires_po && (
                    <div className="flex items-center gap-2 text-xs text-[#E1467C]">
                      <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
                      <span>PO Required</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Client Dialog */}
      <Dialog open={showNewClientForm} onOpenChange={setShowNewClientForm}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Client Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Acme Corporation"
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Contact Name</Label>
                <Input
                  value={formData.primary_contact_name}
                  onChange={(e) => setFormData({...formData, primary_contact_name: e.target.value})}
                  placeholder="John Smith"
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">Contact Phone</Label>
                <Input
                  value={formData.primary_contact_phone}
                  onChange={(e) => setFormData({...formData, primary_contact_phone: e.target.value})}
                  placeholder="+44 20 1234 5678"
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
                />
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Contact Email</Label>
              <Input
                type="email"
                value={formData.primary_contact_email}
                onChange={(e) => setFormData({...formData, primary_contact_email: e.target.value})}
                placeholder="contact@acme.com"
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Billing Address</Label>
              <Textarea
                value={formData.billing_address}
                onChange={(e) => setFormData({...formData, billing_address: e.target.value})}
                placeholder="123 Business Street, London, SW1A 1AA"
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Payment Terms (Days)</Label>
              <Input
                type="number"
                value={formData.payment_terms_days}
                onChange={(e) => setFormData({...formData, payment_terms_days: parseInt(e.target.value)})}
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requires_po"
                checked={formData.requires_po}
                onChange={(e) => setFormData({...formData, requires_po: e.target.checked})}
                className="w-4 h-4 rounded border-[rgba(255,255,255,0.08)]"
              />
              <Label htmlFor="requires_po" className="text-white cursor-pointer">
                Require Purchase Order before job start
              </Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <Button
              variant="outline"
              onClick={() => setShowNewClientForm(false)}
              className="flex-1 border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createClientMutation.mutate(formData)}
              disabled={!formData.name || createClientMutation.isPending}
              className="flex-1 bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}