import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Mail, Trash2, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function UserManagement({ clientId }) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['client-users', clientId],
    queryFn: () => base44.entities.ClientUser.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (userData) => {
      // Create ClientUser record
      await base44.entities.ClientUser.create({
        client_id: clientId,
        email: userData.email,
        full_name: userData.name,
        role: 'user',
        invited_date: new Date().toISOString()
      });
      
      // Invite user via Base44
      await base44.users.inviteUser(userData.email, 'client');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-users']);
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteName("");
      toast.success('User invited successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to invite user');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.ClientUser.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['client-users']);
      toast.success('User removed');
    },
    onError: () => {
      toast.error('Failed to remove user');
    }
  });

  const handleInvite = () => {
    if (!inviteEmail || !inviteName) {
      toast.error('Please fill in all fields');
      return;
    }
    inviteUserMutation.mutate({ email: inviteEmail, name: inviteName });
  };

  if (isLoading) {
    return (
      <div className="glass-panel rounded-xl p-6 border border-[rgba(255,255,255,0.08)] text-center">
        <p className="text-[#CED4DA]">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Team Members</h3>
          <p className="text-sm text-[#CED4DA]">Manage who has access to your portal</p>
        </div>
        <Button
          onClick={() => setShowInviteDialog(true)}
          className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      <div className="space-y-2">
        {users.length === 0 ? (
          <div className="glass-panel rounded-xl p-8 border border-[rgba(255,255,255,0.08)] text-center">
            <User className="w-12 h-12 mx-auto mb-3 text-[#CED4DA] opacity-30" />
            <p className="text-[#CED4DA]">No team members yet</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E41E65] to-[#C13666] flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">{user.full_name}</div>
                  <div className="text-sm text-[#CED4DA]">{user.email}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border text-xs">
                  {user.role || 'user'}
                </Badge>
                {user.role !== 'admin' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteUserMutation.mutate(user.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Team Member</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-[#CED4DA] mb-2">Full Name</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Smith"
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>

            <div>
              <Label className="text-[#CED4DA] mb-2">Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="john@company.com"
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>

            <div className="glass-panel rounded-lg p-3 border border-blue-500/30 bg-blue-500/10">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-400 mt-0.5" />
                <p className="text-xs text-blue-400">
                  An invitation email will be sent with instructions to access the portal
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowInviteDialog(false)}
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleInvite}
                disabled={inviteUserMutation.isPending}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {inviteUserMutation.isPending ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}