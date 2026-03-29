import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Save,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // User settings
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [slaAlerts, setSlaAlerts] = useState(true);
  const [jobAssignments, setJobAssignments] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      setFullName(userData.full_name || "");
      setEmail(userData.email || "");
      setPhone(userData.phone || "");
      
      // Load notification preferences
      setEmailNotifications(userData.email_notifications !== false);
      setPushNotifications(userData.push_notifications !== false);
      setSlaAlerts(userData.sla_alerts !== false);
      setJobAssignments(userData.job_assignments !== false);

      // Load org
      if (userData.org_id) {
        const orgs = await base44.entities.Organisation.filter({ id: userData.org_id });
        if (orgs[0]) setOrg(orgs[0]);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      full_name: fullName,
      phone: phone
    });
  };

  const handleSaveNotifications = () => {
    updateProfileMutation.mutate({
      email_notifications: emailNotifications,
      push_notifications: pushNotifications,
      sla_alerts: slaAlerts,
      job_assignments: jobAssignments
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#E1467C]" />
          <p className="text-[#CED4DA]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-[#E1467C]" strokeWidth={1.5} />
          Settings
        </h1>
        <p className="text-[#CED4DA]">Manage your account and application preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="glass-panel border-[rgba(255,255,255,0.08)]">
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="organization" className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" />
              Organization
            </TabsTrigger>
          )}
          <TabsTrigger value="security" className="data-[state=active]:bg-[#E1467C] data-[state=active]:text-white">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <h3 className="text-lg font-bold text-white mb-6">Profile Information</h3>
            
            <div className="space-y-4 max-w-xl">
              <div>
                <Label className="text-[#CED4DA] mb-2 block">Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
                />
              </div>

              <div>
                <Label className="text-[#CED4DA] mb-2 block">Email Address</Label>
                <Input
                  value={email}
                  disabled
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-[#CED4DA] opacity-50"
                />
                <p className="text-xs text-[#CED4DA] mt-1">Email cannot be changed</p>
              </div>

              <div>
                <Label className="text-[#CED4DA] mb-2 block">Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
                />
              </div>

              <div>
                <Label className="text-[#CED4DA] mb-2 block">Role</Label>
                <Input
                  value={user?.role || "user"}
                  disabled
                  className="glass-panel border-[rgba(255,255,255,0.08)] text-[#CED4DA] opacity-50 capitalize"
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <h3 className="text-lg font-bold text-white mb-6">Notification Preferences</h3>
            
            <div className="space-y-6 max-w-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">Email Notifications</p>
                  <p className="text-sm text-[#CED4DA]">Receive notifications via email</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">Push Notifications</p>
                  <p className="text-sm text-[#CED4DA]">Receive browser push notifications</p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">SLA Alerts</p>
                  <p className="text-sm text-[#CED4DA]">Get notified about SLA breaches</p>
                </div>
                <Switch
                  checked={slaAlerts}
                  onCheckedChange={setSlaAlerts}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">Job Assignments</p>
                  <p className="text-sm text-[#CED4DA]">Get notified when assigned to jobs</p>
                </div>
                <Switch
                  checked={jobAssignments}
                  onCheckedChange={setJobAssignments}
                />
              </div>

              <Button
                onClick={handleSaveNotifications}
                disabled={updateProfileMutation.isPending}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Organization Tab */}
        {user?.role === 'admin' && (
          <TabsContent value="organization">
            <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
              <h3 className="text-lg font-bold text-white mb-6">Organization Details</h3>
              
              {org ? (
                <div className="space-y-4 max-w-xl">
                  <div>
                    <Label className="text-[#CED4DA] mb-2 block">Organization Name</Label>
                    <Input
                      value={org.name}
                      disabled
                      className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[#CED4DA] mb-2 block">Type</Label>
                    <Input
                      value={org.type}
                      disabled
                      className="glass-panel border-[rgba(255,255,255,0.08)] text-white capitalize"
                    />
                  </div>

                  {org.address && (
                    <div>
                      <Label className="text-[#CED4DA] mb-2 block">Address</Label>
                      <Input
                        value={org.address}
                        disabled
                        className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
                      />
                    </div>
                  )}

                  <p className="text-xs text-[#CED4DA]">
                    Contact support to modify organization details
                  </p>
                </div>
              ) : (
                <p className="text-[#CED4DA]">No organization information available</p>
              )}
            </div>
          </TabsContent>
        )}

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
            <h3 className="text-lg font-bold text-white mb-6">Security & Privacy</h3>
            
            <div className="space-y-6 max-w-xl">
              <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                <p className="text-white font-semibold mb-2">Password</p>
                <p className="text-sm text-[#CED4DA] mb-3">
                  Password management is handled by Base44 authentication
                </p>
                <Button
                  onClick={() => toast.info("Password reset emails are sent from Base44")}
                  variant="outline"
                  className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                >
                  Request Password Reset
                </Button>
              </div>

              <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                <p className="text-white font-semibold mb-2">Session</p>
                <p className="text-sm text-[#CED4DA] mb-3">
                  Sign out from all devices and clear your session
                </p>
                <Button
                  onClick={() => base44.auth.logout()}
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}