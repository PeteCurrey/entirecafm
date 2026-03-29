import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home,
  Briefcase,
  FileText,
  MessageCircle,
  User,
  Upload,
  Camera,
  ChevronRight,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Bell,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ClientMobilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadUser();
    
    // Network status listeners
    window.addEventListener('online', () => {
      setIsOnline(true);
      toast.success("Back online");
    });
    window.addEventListener('offline', () => {
      setIsOnline(false);
      toast.error("No internet connection");
    });

    return () => {
      window.removeEventListener('online', () => {});
      window.removeEventListener('offline', () => {});
    };
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      if (userData.client_id) {
        setClientId(userData.client_id);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['client-mobile-dashboard', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const result = await base44.functions.invoke('getClientDashboard', { client_id: clientId });
      return result.data?.dashboard;
    },
    enabled: !!clientId,
    refetchInterval: 15000 // Real-time updates every 15s
  });

  const { data: recentJobs = [] } = useQuery({
    queryKey: ['client-mobile-jobs', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.Job.filter({ client_id: clientId }, '-updated_date', 20);
    },
    enabled: !!clientId,
    refetchInterval: 15000
  });

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['client-unread-messages', clientId],
    queryFn: async () => {
      if (!clientId) return 0;
      const messages = await base44.entities.ClientMessage.filter({
        client_id: clientId,
        read_by_client: false,
        sender_type: { $ne: 'client' }
      });
      return messages.length;
    },
    enabled: !!clientId,
    refetchInterval: 10000
  });

  const handleRefresh = async () => {
    toast.promise(refetch(), {
      loading: "Refreshing...",
      success: "Updated!",
      error: "Failed to refresh"
    });
  };

  const statusColors = {
    new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    on_route: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    on_site: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  const renderHomeTab = () => (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover-glow">
          <div className="text-xs text-[#CED4DA] mb-2">Open Jobs</div>
          <div className="text-2xl font-bold text-white">{dashboardData?.jobs_open || 0}</div>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] hover-glow">
          <div className="text-xs text-[#CED4DA] mb-2">SLA Score</div>
          <div className={`text-2xl font-bold ${
            (dashboardData?.sla_score || 0) >= 90 ? 'text-green-400' : 
            (dashboardData?.sla_score || 0) >= 70 ? 'text-yellow-400' : 
            'text-red-400'
          }`}>
            {dashboardData?.sla_score || 0}%
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Recent Jobs</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-[#CED4DA] h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {recentJobs.slice(0, 5).map(job => (
            <div
              key={job.id}
              onClick={() => navigate(`${createPageUrl("ClientJobDetail")}?id=${job.id}`)}
              className="glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)] active:scale-[0.98] transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate mb-1">
                    {job.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#CED4DA]">
                    <Clock className="w-3 h-3" />
                    {new Date(job.updated_date).toLocaleDateString()}
                  </div>
                </div>
                <Badge className={`${statusColors[job.status] || 'bg-gray-500/20 text-gray-400'} border text-xs`}>
                  {job.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={() => setActiveTab("jobs")}
          variant="outline"
          className="w-full mt-3 border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
        >
          View All Jobs
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
        <h3 className="text-sm font-bold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate(createPageUrl("ClientRequestJob"))}
            className="glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)] active:scale-[0.98] transition-all text-center"
          >
            <AlertCircle className="w-5 h-5 text-[#E1467C] mx-auto mb-1" />
            <div className="text-xs text-white">New Request</div>
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className="glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)] active:scale-[0.98] transition-all text-center"
          >
            <Upload className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <div className="text-xs text-white">Upload Doc</div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderJobsTab = () => (
    <div className="space-y-3">
      {recentJobs.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 border border-[rgba(255,255,255,0.08)] text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-[#CED4DA] opacity-30" />
          <p className="text-[#CED4DA]">No jobs yet</p>
        </div>
      ) : (
        recentJobs.map(job => (
          <div
            key={job.id}
            onClick={() => navigate(`${createPageUrl("ClientJobDetail")}?id=${job.id}`)}
            className="glass-panel rounded-xl p-4 border border-[rgba(255,255,255,0.08)] active:scale-[0.98] transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white mb-1">{job.title}</h4>
                <p className="text-sm text-[#CED4DA] line-clamp-1">
                  {job.description || 'No description'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#CED4DA] flex-shrink-0" />
            </div>
            
            <div className="flex items-center justify-between">
              <Badge className={`${statusColors[job.status] || 'bg-gray-500/20 text-gray-400'} border text-xs`}>
                {job.status.replace('_', ' ')}
              </Badge>
              {job.scheduled_date && (
                <div className="flex items-center gap-1 text-xs text-[#CED4DA]">
                  <Clock className="w-3 h-3" />
                  {new Date(job.scheduled_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-[#E1467C] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#CED4DA]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] pb-20">
      {/* Header */}
      <div className="glass-panel-strong border-b border-[rgba(255,255,255,0.08)] sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-white">Client Portal</h1>
              <p className="text-xs text-[#CED4DA]">{user?.full_name}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                  Offline
                </Badge>
              )}
              {unreadMessages > 0 && (
                <button
                  onClick={() => setActiveTab("messages")}
                  className="relative"
                >
                  <Bell className="w-5 h-5 text-[#CED4DA]" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E1467C] rounded-full text-[10px] text-white flex items-center justify-center">
                    {unreadMessages}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "home" && renderHomeTab()}
        {activeTab === "jobs" && renderJobsTab()}
        {activeTab === "documents" && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-3 text-[#CED4DA] opacity-30" />
            <p className="text-[#CED4DA] mb-4">Document management</p>
            <Button
              onClick={() => navigate(createPageUrl("ClientDocuments"))}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              Open Documents
            </Button>
          </div>
        )}
        {activeTab === "messages" && (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-[#CED4DA] opacity-30" />
            <p className="text-[#CED4DA] mb-4">Secure messaging</p>
            <Button
              onClick={() => navigate(createPageUrl("ClientMessages"))}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              Open Messages
            </Button>
          </div>
        )}
        {activeTab === "profile" && (
          <div className="glass-panel rounded-xl p-6 border border-[rgba(255,255,255,0.08)]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E41E65] to-[#C13666] flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">{user?.full_name}</h3>
              <p className="text-sm text-[#CED4DA]">{user?.email}</p>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => navigate(createPageUrl("Settings"))}
                variant="outline"
                className="w-full border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                Settings
              </Button>
              <Button
                onClick={() => base44.auth.logout()}
                variant="outline"
                className="w-full border-red-500/30 text-red-400"
              >
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass-panel-strong border-t border-[rgba(255,255,255,0.08)] safe-area-inset-bottom">
        <div className="grid grid-cols-5 gap-1 p-2">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'jobs', icon: Briefcase, label: 'Jobs' },
            { id: 'documents', icon: FileText, label: 'Docs' },
            { id: 'messages', icon: MessageCircle, label: 'Messages', badge: unreadMessages },
            { id: 'profile', icon: User, label: 'Profile' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all relative ${
                  isActive ? 'bg-[#E1467C]/20 text-[#E1467C]' : 'text-[#CED4DA]'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="absolute top-1 right-2 w-4 h-4 bg-[#E1467C] rounded-full text-[9px] text-white flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        @media (hover: none) {
          * {
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}