
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Share2, 
  Calendar,
  Check,
  Clock,
  Linkedin,
  Twitter,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function SocialAutomationTab({ orgId }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['linkedin']);
  const [selectedBrief, setSelectedBrief] = useState(null);

  const { data: scheduledPosts = [], isLoading } = useQuery({
    queryKey: ['social-posts', orgId],
    queryFn: async () => {
      const events = await base44.entities.CommunicationEvent.filter({ 
        org_id: orgId,
        event_type: 'social_post'
      });
      return events;
    },
  });

  const { data: briefs = [] } = useQuery({
    queryKey: ['executive-briefs', orgId],
    queryFn: () => base44.entities.ExecutiveBrief.filter({ org_id: orgId }),
  });

  const createPostsMutation = useMutation({
    mutationFn: async (data) => {
      return base44.functions.invoke('socialPoster', {
        org_id: orgId,
        brief_id: data.brief_id,
        platforms: data.platforms
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['social-posts']);
      setShowCreateDialog(false);
      setSelectedPlatforms(['linkedin']);
      setSelectedBrief(null);
    },
  });

  const handleCreatePosts = () => {
    if (selectedPlatforms.length === 0) return;
    
    createPostsMutation.mutate({
      brief_id: selectedBrief,
      platforms: selectedPlatforms
    });
  };

  const handleTogglePlatform = (platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getPlatformIcon = (channel) => {
    if (channel === 'linkedin') return <Linkedin className="w-4 h-4" />;
    if (channel === 'twitter') return <Twitter className="w-4 h-4" />;
    return <Share2 className="w-4 h-4" />;
  };

  const getPlatformColor = (channel) => {
    if (channel === 'linkedin') return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
    if (channel === 'twitter') return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getStatusBadge = (status) => {
    if (status === 'scheduled') return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock };
    if (status === 'sent') return { bg: 'bg-green-500/20', text: 'text-green-400', icon: Check };
    return { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Calendar };
  };

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
        <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#CED4DA]">Loading social automation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Social Automation</h3>
          <p className="text-sm text-[#CED4DA]">AI-powered social media post generation and scheduling</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Create Posts
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Total Posts</div>
          <div className="text-3xl font-bold text-white">{scheduledPosts.length}</div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Scheduled</div>
          <div className="text-3xl font-bold text-yellow-400">
            {scheduledPosts.filter(p => p.status === 'scheduled').length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Published</div>
          <div className="text-3xl font-bold text-green-400">
            {scheduledPosts.filter(p => p.status === 'sent').length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Platforms</div>
          <div className="flex items-center gap-2 mt-2">
            <Linkedin className="w-5 h-5 text-blue-400" />
            <Twitter className="w-5 h-5 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Integration Status */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h4 className="text-lg font-bold text-white mb-4">Platform Connections</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <Linkedin className="w-6 h-6 text-blue-400" />
              <div>
                <div className="text-white font-semibold">LinkedIn</div>
                <div className="text-xs text-[#CED4DA]">Professional network</div>
              </div>
            </div>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">
              OAuth Required
            </Badge>
          </div>
          <div className="flex items-center justify-between glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <Twitter className="w-6 h-6 text-sky-400" />
              <div>
                <div className="text-white font-semibold">X (Twitter)</div>
                <div className="text-xs text-[#CED4DA]">Microblogging platform</div>
              </div>
            </div>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">
              OAuth Required
            </Badge>
          </div>
        </div>
        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            <strong>Note:</strong> In production, OAuth tokens would be securely stored and validated. 
            For demo purposes, posts are created in scheduled status.
          </p>
        </div>
      </div>

      {/* Scheduled Posts */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h4 className="text-lg font-bold text-white mb-4">Scheduled & Published Posts</h4>
        {scheduledPosts.length === 0 ? (
          <div className="text-center py-12">
            <Share2 className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
            <p className="text-[#CED4DA] mb-6">Create AI-generated social media posts from your executive briefs</p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Create First Post
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledPosts.map((post) => {
              const statusBadge = getStatusBadge(post.status);
              const StatusIcon = statusBadge.icon;

              return (
                <div key={post.id} className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${getPlatformColor(post.channel)} border`}>
                          {getPlatformIcon(post.channel)}
                          <span className="ml-1 capitalize">{post.channel}</span>
                        </Badge>
                        <Badge className={`${statusBadge.bg} ${statusBadge.text} border-0`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-white text-sm mb-2 whitespace-pre-wrap">{post.message_text}</p>
                      {post.metadata?.hashtags && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {post.metadata.hashtags.map((tag, idx) => (
                            <span key={idx} className="text-xs text-blue-400">#{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[#CED4DA]">
                        {post.metadata?.scheduled_time && (
                          <span>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(post.metadata.scheduled_time).toLocaleString()}
                          </span>
                        )}
                        {post.metadata?.engagement_prediction && (
                          <span>Est. Engagement: {post.metadata.engagement_prediction}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(post.message_text)}
                      variant="ghost"
                      size="sm"
                      className="text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Posts Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#E1467C]" />
              Create Social Media Posts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#CED4DA] mb-3 block">Select Platforms</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)]">
                  <Checkbox 
                    checked={selectedPlatforms.includes('linkedin')}
                    onCheckedChange={() => handleTogglePlatform('linkedin')}
                  />
                  <Linkedin className="w-5 h-5 text-blue-400" />
                  <Label className="text-white font-normal cursor-pointer flex-1">
                    LinkedIn (Professional, 1500-2000 chars)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 glass-panel rounded-lg p-3 border border-[rgba(255,255,255,0.08)]">
                  <Checkbox 
                    checked={selectedPlatforms.includes('twitter')}
                    onCheckedChange={() => handleTogglePlatform('twitter')}
                  />
                  <Twitter className="w-5 h-5 text-sky-400" />
                  <Label className="text-white font-normal cursor-pointer flex-1">
                    X / Twitter (Concise, max 280 chars)
                  </Label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-[#CED4DA] mb-2 block">Source Brief (optional)</Label>
              <select
                value={selectedBrief || ''}
                onChange={(e) => setSelectedBrief(e.target.value || null)}
                className="w-full glass-panel border border-[rgba(255,255,255,0.08)] text-white rounded-lg p-2"
              >
                <option value="">Use Latest Brief</option>
                {briefs.map((brief) => (
                  <option key={brief.id} value={brief.id}>
                    {new Date(brief.created_date).toLocaleDateString()} - {brief.summary_text?.slice(0, 50)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-green-400">
                <strong>AI will generate:</strong> Platform-optimized posts with hashtags, 
                optimal posting time recommendation, and engagement prediction.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePosts}
                disabled={selectedPlatforms.length === 0 || createPostsMutation.isPending}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {createPostsMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Generate Posts
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
