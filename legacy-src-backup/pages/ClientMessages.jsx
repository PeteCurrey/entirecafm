import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Paperclip,
  Loader2,
  User,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function ClientMessagesPage() {
  const [user, setUser] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    if (userData.client_id) {
      setClientId(userData.client_id);
    }
  };

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['client-messages', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.ClientMessage.filter({ client_id: clientId });
    },
    enabled: !!clientId,
    refetchInterval: 5000 // Real-time updates every 5s
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['client-jobs-messaging', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.Job.filter({ client_id: clientId });
    },
    enabled: !!clientId
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      return base44.entities.ClientMessage.create(messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-messages']);
      setNewMessage("");
      scrollToBottom();
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !clientId) return;

    sendMessageMutation.mutate({
      client_id: clientId,
      job_id: selectedJob?.id || null,
      sender_type: "client",
      sender_name: user.full_name || user.email,
      sender_id: user.id,
      message: newMessage,
      sent_at: new Date().toISOString(),
      read_by_client: true,
      read_by_engineer: false
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredMessages = selectedJob 
    ? messages.filter(m => m.job_id === selectedJob.id)
    : messages.filter(m => !m.job_id);

  const sortedMessages = [...filteredMessages].sort(
    (a, b) => new Date(a.sent_at) - new Date(b.sent_at)
  );

  const unreadCount = messages.filter(m => 
    m.sender_type !== "client" && !m.read_by_client
  ).length;

  return (
    <div className="min-h-screen bg-[#0D1117] p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl("ClientPortal")}>
            <Button variant="ghost" className="mb-4 text-[#CED4DA]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                Secure Messaging
                {unreadCount > 0 && (
                  <Badge className="bg-[#E1467C] text-white">
                    {unreadCount} new
                  </Badge>
                )}
              </h1>
              <p className="text-[#CED4DA]">Chat with engineers and support team</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Job Selector Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-2xl p-4 border border-[rgba(255,255,255,0.08)]">
              <h3 className="text-sm font-semibold text-white mb-3">Conversations</h3>
              
              <button
                onClick={() => setSelectedJob(null)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-all ${
                  !selectedJob 
                    ? 'bg-[#E1467C] text-white' 
                    : 'glass-panel border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] text-[#CED4DA]'
                }`}
              >
                <div className="font-semibold text-sm">General Support</div>
                <div className="text-xs opacity-70">General inquiries</div>
              </button>

              <div className="space-y-2">
                {jobs.filter(j => !['completed', 'cancelled'].includes(j.status)).map(job => {
                  const jobMessages = messages.filter(m => m.job_id === job.id);
                  const unread = jobMessages.filter(m => m.sender_type !== "client" && !m.read_by_client).length;
                  
                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedJob?.id === job.id
                          ? 'bg-[#E1467C] text-white'
                          : 'glass-panel border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] text-[#CED4DA]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-sm truncate">{job.title}</div>
                        {unread > 0 && (
                          <Badge className="bg-white text-[#E1467C] text-xs ml-2">
                            {unread}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs opacity-70 truncate">
                        Job #{job.job_number || job.id.slice(0, 8)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-3">
            <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.08)] h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
                <h3 className="text-white font-semibold">
                  {selectedJob ? selectedJob.title : 'General Support'}
                </h3>
                {selectedJob && (
                  <p className="text-xs text-[#CED4DA]">
                    Job #{selectedJob.job_number || selectedJob.id.slice(0, 8)}
                  </p>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-[#E1467C]" />
                  </div>
                ) : sortedMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
                      <p className="text-[#CED4DA]">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  sortedMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${
                        msg.sender_type === 'client' 
                          ? 'bg-[#E1467C] text-white' 
                          : 'glass-panel border border-[rgba(255,255,255,0.08)] text-white'
                      } rounded-lg p-3`}>
                        <div className="flex items-center gap-2 mb-1">
                          {msg.sender_type !== 'client' && (
                            <User className="w-3 h-3" />
                          )}
                          <span className="text-xs font-semibold opacity-90">
                            {msg.sender_name}
                          </span>
                          <Badge className={`text-xs ${
                            msg.sender_type === 'engineer' ? 'bg-blue-500/20 text-blue-400' :
                            msg.sender_type === 'support' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-white/20 text-white'
                          }`}>
                            {msg.sender_type}
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">{msg.message}</p>
                        <div className="flex items-center gap-1 text-xs opacity-70">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.sent_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-[rgba(255,255,255,0.08)]">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 glass-panel border-[rgba(255,255,255,0.08)] text-white resize-none"
                    rows={2}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-[#CED4DA] mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}