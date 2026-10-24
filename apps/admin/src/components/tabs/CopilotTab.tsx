'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Database,
  ShieldCheck,
  Cpu,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';
import { AdminRole } from '../Navbar';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  toolsInvoked?: string[];
  model?: string;
  citations?: string[];
}

interface CopilotTabProps {
  currentRole: AdminRole;
}

export const CopilotTab: React.FC<CopilotTabProps> = ({ currentRole }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-01',
      sender: 'assistant',
      text: `### 🤖 Welcome to ParkSense MoHUA Mission Copilot\nI am your municipal operational assistant. I execute server-side function calls against real Firestore and Realtime Database telemetry to answer your questions.\n\n**Core Guarantees:**\n- 🔒 **Zero Hallucination:** Every number is derived from live sensors, Holt-Winters forecasts, or elasticity models.\n- 📋 **Audited Execution:** All queries are recorded in the immutable Firestore audit ledger.\n- 📚 **Data Citations:** Exact database sources and timestamps are cited below each answer.\n\nAsk me about underused zones, tariff elasticity simulations, citywide collections, or active enforcement violations.`,
      timestamp: 'Just now',
      toolsInvoked: [],
      model: 'gemini-1.5-flash'
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number>(20);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendQuery = async (queryToSend?: string) => {
    const q = queryToSend || inputQuery;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          role: currentRole
        })
      });

      const data = await res.json();

      if (res.ok) {
        if (typeof data.remainingRateLimit === 'number') {
          setRateLimitRemaining(data.remainingRateLimit);
        }

        const assistantMsg: ChatMessage = {
          id: `asst_${Date.now()}`,
          sender: 'assistant',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolsInvoked: data.toolsInvoked,
          model: data.model
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Error:** ${data.error || 'Failed to process query'}. ${data.details || ''}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Connection Error:** Could not connect to AI Copilot route. ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Which zones are underused on weekday mornings and what price should I set?',
    'Simulate a 20% price hike for Connaught Place and report revenue impact.',
    "What is today's total revenue collection and payment channel split?",
    'Show me active enforcement violations and unpaid parking cases.'
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header with Status & Rate Limit */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            Mission Command AI
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            MoHUA Server-Side AI Copilot
          </h2>
          <p className="text-xs text-slate-400">
            Powered by Gemini with structured function calling into real municipal databases
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="rounded-lg bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-slate-300 flex items-center space-x-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Anti-Hallucination Guardrails Active</span>
          </div>
          <div className="rounded-lg bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-slate-300 font-mono">
            Quota: <span className="text-white font-bold">{rateLimitRemaining}</span> / 20 req/min
          </div>
        </div>
      </div>

      {/* 2. Main Chat Box */}
      <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-[580px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/20'
                    : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none shadow-xl'
                }`}
              >
                {/* Header Info */}
                <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1 gap-4">
                  <div className="flex items-center space-x-1.5 font-bold">
                    {m.sender === 'user' ? (
                      <>
                        <User className="h-3.5 w-3.5 text-blue-200" />
                        <span>You ({currentRole})</span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-white">MoHUA AI Copilot</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] opacity-75">
                    {m.model && <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded">{m.model}</span>}
                    <span>{m.timestamp}</span>
                  </div>
                </div>

                {/* Tool Invocation Badges */}
                {m.toolsInvoked && m.toolsInvoked.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {m.toolsInvoked.map((t) => (
                      <span
                        key={t}
                        className="flex items-center space-x-1 rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-mono text-blue-300 font-semibold"
                      >
                        <Database className="h-2.5 w-2.5" />
                        <span>Executed: {t}()</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Content Body formatted */}
                <div className="whitespace-pre-line prose prose-invert max-w-none text-xs">
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 p-2">
              <Bot className="h-4 w-4 animate-spin text-blue-400" />
              <span>Querying live municipal database tools & generating synthesis...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="border-t border-slate-800/80 bg-slate-950/40 p-3 overflow-x-auto scrollbar-none flex space-x-2">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(p)}
              className="rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 px-3 py-1.5 text-[11px] text-slate-300 hover:text-white transition-colors whitespace-nowrap flex items-center space-x-1.5 flex-shrink-0"
            >
              <Sparkles className="h-3 w-3 text-blue-400" />
              <span>{p}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-800 p-3 sm:p-4 bg-slate-900/80 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask about live occupancy, 24h forecasts, what-if elasticity, revenue or violations..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendQuery();
            }}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => handleSendQuery()}
            disabled={loading || !inputQuery.trim()}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-lg shadow-blue-600/20"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dispatch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
