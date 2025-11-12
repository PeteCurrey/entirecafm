import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import {
  MessageCircle,
  Send,
  Mic,
  Square,
  TrendingUp,
  DollarSign,
  Target,
  FileText,
  Zap,
  User,
  Bot,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function AIAssistantPage() {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const chatMutation = useMutation({
    mutationFn: async (message) => {
      return base44.functions.invoke('aiChatHandler', {
        message,
        session_id: sessionId
      });
    },
    onSuccess: (result) => {
      if (result.data?.session_id && !sessionId) {
        setSessionId(result.data.session_id);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.data?.response || 'Error processing request',
        module: result.data?.module,
        confidence: result.data?.confidence,
        timestamp: new Date()
      }]);
    },
  });

  const voiceMutation = useMutation({
    mutationFn: async (audioBlob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-input.webm');
      if (sessionId) formData.append('session_id', sessionId);

      const response = await fetch('/api/aiVoiceHandler', {
        method: 'POST',
        body: formData
      });

      return response.json();
    },
    onSuccess: (result) => {
      if (result.session_id && !sessionId) {
        setSessionId(result.session_id);
      }

      // Add transcript as user message
      setMessages(prev => [...prev, {
        role: 'user',
        content: result.transcript,
        isVoice: true,
        timestamp: new Date()
      }]);

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.response,
        confidence: result.confidence,
        timestamp: new Date()
      }]);

      // Speak response (if browser supports)
      if ('speechSynthesis' in window && result.tts_text) {
        const utterance = new SpeechSynthesisUtterance(result.tts_text);
        utterance.rate = 0.95;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    },
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }]);

    // Send to AI
    chatMutation.mutate(inputMessage);
    setInputMessage('');
  };

  const handleQuickCommand = (command) => {
    setInputMessage(command);
    setMessages(prev => [...prev, {
      role: 'user',
      content: command,
      timestamp: new Date()
    }]);
    chatMutation.mutate(command);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        voiceMutation.mutate(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

    } catch (error) {
      console.error('Recording error:', error);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const quickCommands = [
    { icon: TrendingUp, label: 'Show Director Summary', command: 'Give me the director dashboard summary' },
    { icon: DollarSign, label: 'List Overdue Invoices', command: 'Show me all overdue invoices' },
    { icon: Target, label: 'Marketing ROI', command: 'What is our marketing ROI this week?' },
    { icon: FileText, label: 'Generate Executive Brief', command: 'Generate this week\'s executive brief' },
  ];

  return (
    <div className="p-6 lg:p-8 h-screen flex flex-col">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#E1467C]/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-[#E1467C]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">EntireCAFM AI Assistant</h1>
              <p className="text-sm text-[#CED4DA]">
                Ask about operations, finances, marketing, or revenue
              </p>
            </div>
          </div>
          {sessionId && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
              Session Active
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Commands */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {quickCommands.map((cmd, idx) => (
          <Button
            key={idx}
            onClick={() => handleQuickCommand(cmd.command)}
            disabled={chatMutation.isPending}
            variant="outline"
            className="border-[rgba(255,255,255,0.08)] text-[#CED4DA] hover:bg-[rgba(255,255,255,0.04)] h-auto py-3"
          >
            <cmd.icon className="w-4 h-4 mr-2" strokeWidth={1.5} />
            <span className="text-xs">{cmd.label}</span>
          </Button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 glass-panel rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] mb-6 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[#CED4DA] opacity-30" />
            <h3 className="text-xl font-semibold text-white mb-2">Start a conversation</h3>
            <p className="text-[#CED4DA] mb-6">
              Ask me anything about your operations, finances, marketing, or forecasts
            </p>
            <div className="text-left max-w-md mx-auto space-y-2 text-sm text-[#CED4DA]">
              <p>💡 Try asking:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>"What's our current org health score?"</li>
                <li>"Show me overdue invoices"</li>
                <li>"What's my marketing ROI this week?"</li>
                <li>"Generate the executive brief"</li>
                <li>"How many jobs are at SLA risk?"</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-[#E1467C]/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-[#E1467C] text-white'
                      : 'glass-panel border border-[rgba(255,255,255,0.08)] text-white'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                      {msg.module && (
                        <Badge className="text-xs">
                          {msg.module}
                        </Badge>
                      )}
                      {msg.confidence && (
                        <Badge className={`${
                          msg.confidence >= 0.8 ? 'bg-green-500/20 text-green-400' :
                          msg.confidence >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        } text-xs`}>
                          {Math.round(msg.confidence * 100)}% confidence
                        </Badge>
                      )}
                      <span className="text-xs text-[#CED4DA]">
                        {msg.timestamp?.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {msg.isVoice && (
                    <Badge className="text-xs mt-2">
                      🎤 Voice
                    </Badge>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            ))}
            
            {(chatMutation.isPending || voiceMutation.isPending) && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E1467C]/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#E1467C]" strokeWidth={1.5} />
                </div>
                <div className="glass-panel border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 text-[#CED4DA] animate-spin" strokeWidth={1.5} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="glass-panel rounded-2xl p-4 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-end gap-3">
          {/* Voice Button */}
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={voiceMutation.isPending}
            className={`${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-[#E1467C] hover:bg-[#E1467C]/90'
            } text-white px-4`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 mr-2" strokeWidth={1.5} />
                {recordingTime}s
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Voice
              </>
            )}
          </Button>

          {/* Text Input */}
          <div className="flex-1">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about operations, finances, marketing, or forecasts..."
              disabled={chatMutation.isPending || isRecording}
              className="glass-panel border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#CED4DA] resize-none"
              rows={2}
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || chatMutation.isPending}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white px-6"
          >
            <Send className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>

        {/* Helper Text */}
        <div className="mt-3 flex items-center justify-between text-xs text-[#CED4DA]">
          <div className="flex items-center gap-4">
            <span>Press Enter to send • Shift+Enter for new line</span>
            {chatMutation.isPending && (
              <Badge className="text-xs">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Processing...
              </Badge>
            )}
          </div>
          <span>{messages.length} messages</span>
        </div>
      </div>
    </div>
  );
}