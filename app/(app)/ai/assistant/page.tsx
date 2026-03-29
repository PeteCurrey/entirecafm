'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, User, Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED = [
  "What are my most critical open jobs?",
  "Show me overdue PPM tasks",
  "How is our revenue looking this month?",
  "Which client has the most outstanding invoices?",
  "What's the compliance score across all sites?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ I encountered an error fetching live data. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[900px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-[#334155] mb-4 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E91E8C] to-[#9333EA] flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-white font-inter tracking-tight">EntireCAFM AI Assistant</h1>
          <p className="text-xs text-[#94A3B8]">Connected to live data — ask anything about your operation</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-[#22C55E] font-bold uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          Live Data Active
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E91E8C]/20 to-[#9333EA]/20 border border-[#E91E8C]/30 flex items-center justify-center">
              <Brain className="w-10 h-10 text-[#E91E8C]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">How can I help?</h2>
              <p className="text-[#94A3B8] text-sm max-w-md">I have access to your live jobs, clients, compliance scores, engineer workloads, and financial data. Just ask.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTED.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} className="text-left p-3 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] hover:border-[#E91E8C]/50 text-sm text-[#94A3B8] hover:text-white transition-all text-left group">
                  <Zap className="w-3 h-3 text-[#E91E8C] inline mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              m.role === 'user' ? 'bg-[#334155]' : 'bg-gradient-to-br from-[#E91E8C] to-[#9333EA]'
            )}>
              {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
              m.role === 'user'
                ? 'bg-[#E91E8C] text-white rounded-tr-sm'
                : 'bg-[#1E293B] text-[#E2E8F0] rounded-tl-sm border border-[#334155]'
            )}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E91E8C] to-[#9333EA] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-[#94A3B8] text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#E91E8C]" />
              <span>Querying live data&hellip;</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 mt-4 pt-4 border-t border-[#334155]">
        <div className="relative flex gap-3">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about jobs, clients, compliance, revenue…"
            rows={2}
            className="flex-1 bg-[#1E293B] border-[#334155] text-white resize-none text-sm focus:border-[#E91E8C] pr-14"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="h-full bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold px-4 shadow-lg shadow-[#E91E8C]/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-[#475569] mt-2 text-center">Enter to send • Shift+Enter for new line • Connected to live Prisma data</p>
      </div>
    </div>
  );
}
