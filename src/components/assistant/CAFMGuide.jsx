import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CAFMGuide({ user, currentPage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (isOpen && !conversation) {
      initConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentPage) {
      generateSuggestions();
    }
  }, [isOpen, currentPage]);

  const initConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'cafm_guide',
        metadata: {
          user_role: user?.role,
          current_page: currentPage
        }
      });
      setConversation(conv);
      setMessages(conv.messages || []);
    } catch (error) {
      console.error('Failed to init conversation:', error);
    }
  };

  const generateSuggestions = () => {
    const suggestionsByPage = {
      'Dashboard': [
        'Show me at-risk jobs',
        'What\'s my team utilization?',
        'Any overdue invoices?'
      ],
      'Jobs': [
        'Which jobs need urgent attention?',
        'Show job completion trends',
        'List unassigned jobs'
      ],
      'Compliance': [
        'What tests are overdue?',
        'Show ESG score breakdown',
        'When is next compliance report?'
      ],
      'AIDirector': [
        'Summarize org health',
        'Top 3 action items',
        'Compare to last month'
      ]
    };

    setSuggestions(suggestionsByPage[currentPage] || [
      'What can you help me with?',
      'Show system overview',
      'What should I focus on today?'
    ]);
  };

  const sendMessage = async (text) => {
    if (!text.trim() || !conversation) return;

    setIsSending(true);
    setInput('');

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: text
      });

      // Subscribe to updates
      const unsubscribe = base44.agents.subscribeToConversation(
        conversation.id,
        (data) => {
          setMessages(data.messages);
        }
      );

      setTimeout(unsubscribe, 30000); // Auto-unsubscribe after 30s
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#E41E65] to-[#C13666] flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-50"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] glass-panel-strong rounded-2xl border border-[rgba(255,255,255,0.1)] flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E41E65] to-[#C13666] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">CAFM Guide</h3>
            <Badge className="bg-green-500/20 text-green-400 text-[10px]">Online</Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="text-[#CED4DA] hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-[#CED4DA] opacity-30" />
            <p className="text-sm text-[#CED4DA] mb-4">
              Hi {user?.full_name}! I'm your CAFM assistant.
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  className="w-full text-left px-3 py-2 rounded-lg glass-panel border border-[rgba(255,255,255,0.08)] text-xs text-[#CED4DA] hover:border-[rgba(255,255,255,0.15)] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-[#E1467C] text-white'
                  : 'glass-panel border border-[rgba(255,255,255,0.08)] text-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.08)]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask me anything..."
            disabled={isSending}
            className="flex-1 glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA]"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={isSending || !input.trim()}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}