import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export default function OrgSelector() {
  const [currentOrg, setCurrentOrg] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ['organisations'],
    queryFn: () => base44.entities.Organisation.list(),
    enabled: user?.role === 'admin',
  });

  useEffect(() => {
    if (user?.org_id) {
      const org = orgs.find(o => o.id === user.org_id);
      setCurrentOrg(org);
    }
  }, [user, orgs]);

  const handleOrgChange = async (orgId) => {
    try {
      // Update user's active org
      await base44.auth.updateMe({ org_id: orgId });
      
      // Reload page to refresh all org-scoped data
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  // Hide selector if not admin or only one org
  if (user?.role !== 'admin' || orgs.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-[#96A0AA]" />
      <Select value={currentOrg?.id} onValueChange={handleOrgChange}>
        <SelectTrigger className="w-48 glass-panel border-[rgba(255,255,255,0.06)] text-[#F5F7FA]">
          <SelectValue placeholder="Select organization">
            {currentOrg?.name || 'Select org'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="glass-panel-strong border-[rgba(255,255,255,0.1)]">
          {orgs.map(org => (
            <SelectItem 
              key={org.id} 
              value={org.id}
              className="text-[#F5F7FA] hover:bg-[rgba(255,255,255,0.08)]"
            >
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}