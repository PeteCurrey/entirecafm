import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  Sparkles, 
  Eye,
  ExternalLink,
  Plus,
  Trash2
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

export default function ContentEngineTab({ orgId }) {
  const queryClient = useQueryClient();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [generateForm, setGenerateForm] = useState({ topic: '', keywords: '' });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['content-posts', orgId],
    queryFn: () => base44.entities.ContentPost.filter({ org_id: orgId }),
  });

  const generateContentMutation = useMutation({
    mutationFn: async (data) => {
      return base44.functions.invoke('contentGenerator', {
        org_id: orgId,
        topic: data.topic,
        target_keywords: data.keywords.split(',').map(k => k.trim()).filter(k => k)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['content-posts']);
      setShowGenerateDialog(false);
      setGenerateForm({ topic: '', keywords: '' });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId) => base44.entities.ContentPost.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-posts']);
    },
  });

  const handleGenerate = () => {
    if (!generateForm.topic) return;
    generateContentMutation.mutate(generateForm);
  };

  const handlePreview = (post) => {
    setSelectedPost(post);
    setShowPreviewDialog(true);
  };

  const handlePublish = async (post, platform) => {
    // In production, integrate with Webflow/WordPress APIs
    alert(`Publishing to ${platform}...\n\nIn production, this would:\n1. Authenticate with ${platform} API\n2. Create/update post\n3. Upload images\n4. Set SEO metadata\n5. Schedule or publish immediately`);
    
    // Update post status
    await base44.entities.ContentPost.update(post.id, {
      status: 'published',
      platform,
      published_date: new Date().toISOString(),
      published_url: `https://${platform}.com/blog/${post.title.toLowerCase().replace(/\s+/g, '-')}`
    });
    
    queryClient.invalidateQueries(['content-posts']);
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-500/20 text-gray-400',
      published: 'bg-green-500/20 text-green-400',
      archived: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || colors.draft;
  };

  const getQualityColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-12 border border-[rgba(255,255,255,0.08)] text-center">
        <div className="w-12 h-12 border-4 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#CED4DA]">Loading content library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Content Engine</h3>
          <p className="text-sm text-[#CED4DA]">AI-powered blog post generation with SEO optimization</p>
        </div>
        <Button
          onClick={() => setShowGenerateDialog(true)}
          className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Content
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Total Posts</div>
          <div className="text-3xl font-bold text-white">{posts.length}</div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Drafts</div>
          <div className="text-3xl font-bold text-gray-400">
            {posts.filter(p => p.status === 'draft').length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Published</div>
          <div className="text-3xl font-bold text-green-400">
            {posts.filter(p => p.status === 'published').length}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-[#CED4DA] mb-1">Avg Quality</div>
          <div className="text-3xl font-bold text-white">
            {posts.length > 0 
              ? Math.round(posts.reduce((sum, p) => sum + (p.ai_score || 0), 0) / posts.length)
              : '-'}
          </div>
        </div>
      </div>

      {/* Content Posts List */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)]">
        <h4 className="text-lg font-bold text-white mb-4">Content Library</h4>
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">No content yet</h3>
            <p className="text-[#CED4DA] mb-6">Generate AI-powered blog posts optimized for SEO</p>
            <Button
              onClick={() => setShowGenerateDialog(true)}
              className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate First Post
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="glass-panel rounded-xl p-5 border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-semibold">{post.title}</h4>
                      <Badge className={`${getStatusBadge(post.status)} border-0`}>
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#CED4DA] mb-2">{post.meta_description}</p>
                    <div className="flex items-center gap-4 text-xs text-[#CED4DA]">
                      <span>{post.word_count} words</span>
                      <span className={getQualityColor(post.ai_score)}>
                        Quality: {post.ai_score}/100
                      </span>
                      <span>Topic: {post.topic}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      onClick={() => handlePreview(post)}
                      variant="outline"
                      size="sm"
                      className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    {post.status === 'draft' && (
                      <>
                        <Button
                          onClick={() => handlePublish(post, 'webflow')}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Publish to Webflow
                        </Button>
                        <Button
                          onClick={() => handlePublish(post, 'wordpress')}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Publish to WordPress
                        </Button>
                      </>
                    )}
                    {post.published_url && (
                      <Button
                        onClick={() => window.open(post.published_url, '_blank')}
                        size="sm"
                        variant="outline"
                        className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Live
                      </Button>
                    )}
                    <Button
                      onClick={() => deletePostMutation.mutate(post.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-[#CED4DA] border-[rgba(255,255,255,0.08)]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Content Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#E1467C]" />
              Generate AI Content
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#CED4DA] mb-2 block">Content Topic</Label>
              <Input
                placeholder="e.g. Preventive Maintenance Best Practices"
                value={generateForm.topic}
                onChange={(e) => setGenerateForm({ ...generateForm, topic: e.target.value })}
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white"
              />
            </div>
            <div>
              <Label className="text-[#CED4DA] mb-2 block">Target Keywords (comma-separated)</Label>
              <Textarea
                placeholder="facilities management, CAFM software, preventive maintenance, asset tracking"
                value={generateForm.keywords}
                onChange={(e) => setGenerateForm({ ...generateForm, keywords: e.target.value })}
                className="glass-panel border-[rgba(255,255,255,0.08)] text-white h-24"
              />
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                <strong>AI will generate:</strong> 1200-1500 word SEO-optimized blog post with H2/H3 structure, 
                meta description, tags, and quality score.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => setShowGenerateDialog(false)}
                variant="outline"
                className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!generateForm.topic || generateContentMutation.isPending}
                className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
              >
                {generateContentMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="glass-panel-strong border-[rgba(255,255,255,0.1)] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedPost?.title}</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                <div className="text-sm text-[#CED4DA] mb-1">Meta Description</div>
                <p className="text-white">{selectedPost.meta_description}</p>
              </div>
              <div className="glass-panel rounded-lg p-4 border border-[rgba(255,255,255,0.08)]">
                <div className="text-sm text-[#CED4DA] mb-2">Content Preview</div>
                <div 
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedPost.draft_html }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}