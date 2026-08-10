import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ReactMarkdown from 'react-markdown';
import {
  Bot, Send, X, ChevronRight, ChevronLeft, Loader2, Plus,
  MessageSquare, Sparkles, Zap, RotateCcw
} from 'lucide-react';

const AGENT_NAME = 'xtreme_commander';

const SUGGESTIONS = [
  { label: 'Add a site to the clone queue', icon: Plus, prompt: 'Add https://example.com to the clone queue and start processing it' },
  { label: 'Heal all failing clones', icon: Zap, prompt: 'Run the full audit, analyze, fix, heal, and harden cycle on all failing clones to push them to 100/100' },
  { label: 'Show me system status', icon: MessageSquare, prompt: 'Give me a full status report on all clones, queue items, and system health' },
  { label: 'Discover top sites in an industry', icon: Sparkles, prompt: 'Discover the top-performing websites in the epoxy flooring industry and add the best ones to the clone queue' },
];

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [toolExpanded, setToolExpanded] = useState({});

  const renderToolCall = (toolCall, idx) => {
    const status = toolCall.status || 'pending';
    const isFailed = status === 'failed' || status === 'error';
    const isRunning = ['pending', 'running', 'in_progress'].includes(status);
    const isDone = status === 'completed' || status === 'success';

    let statusColor = '#999';
    let statusText = 'Pending';
    if (isRunning) { statusColor = '#B88214'; statusText = 'Running…'; }
    if (isDone) { statusColor = '#237A4B'; statusText = 'Done'; }
    if (isFailed) { statusColor = '#C63D34'; statusText = 'Failed'; }

    const proj = toolCall.display_projection || {};
    const hideDetails = proj.hide_details && proj.details_redacted;
    const expanded = toolExpanded[idx];

    let parsedArgs = toolCall.arguments_string;
    try { parsedArgs = JSON.parse(toolCall.arguments_string); } catch { /* keep raw */ }
    let parsedResults = toolCall.results;
    if (typeof parsedResults === 'string') {
      try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
    }

    const label = proj.label || toolCall.name || 'tool';

    return (
      <div key={idx} style={{ marginTop: 8, fontSize: 12, border: '1px solid #eee', borderRadius: 6, overflow: 'hidden' }}>
        <button
          onClick={() => !hideDetails && setToolExpanded(p => ({ ...p, [idx]: !p[idx] }))}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', background: '#f8f7f4', border: 0, cursor: hideDetails ? 'default' : 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          {isRunning ? <Loader2 size={12} className="animate-spin" style={{ color: statusColor }} /> :
           isDone ? <Sparkles size={12} style={{ color: statusColor }} /> :
           <X size={12} style={{ color: statusColor }} />}
          <b style={{ fontSize: 11, color: '#555' }}>{label}</b>
          <span style={{ fontSize: 10, color: statusColor, marginLeft: 'auto', fontWeight: 600 }}>{statusText}</span>
        </button>
        {expanded && !hideDetails && (
          <div style={{ padding: '10px', background: '#fff', borderTop: '1px solid #eee' }}>
            {parsedArgs && (
              <div style={{ marginBottom: 6 }}>
                <small style={{ fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em' }}>Parameters</small>
                <pre style={{ fontSize: 10, color: '#555', margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 120, overflow: 'auto' }}>
                  {typeof parsedArgs === 'object' ? JSON.stringify(parsedArgs, null, 2) : parsedArgs}
                </pre>
              </div>
            )}
            {parsedResults !== undefined && parsedResults !== null && (
              <div>
                <small style={{ fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em' }}>Result</small>
                <pre style={{ fontSize: 10, color: '#555', margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160, overflow: 'auto' }}>
                  {typeof parsedResults === 'object' ? JSON.stringify(parsedResults, null, 2) : String(parsedResults)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
      <div style={{
        maxWidth: '88%',
        padding: '12px 14px',
        borderRadius: 10,
        background: isUser ? '#0a0a0a' : '#fff',
        color: isUser ? '#fff' : '#111',
        border: isUser ? '0' : '1px solid #e5e1da',
        fontSize: 13,
        lineHeight: 1.5,
      }}>
        {!isUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Bot size={13} style={{ color: '#C89B3C' }} />
            <b style={{ fontSize: 10, color: '#C89B3C', textTransform: 'uppercase', letterSpacing: '.06em' }}>Commander</b>
          </div>
        )}
        {message.content && (
          isUser
            ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
            : <div style={{ margin: 0 }}><ReactMarkdown>{message.content}</ReactMarkdown></div>
        )}
        {message.tool_calls?.map((tc, i) => renderToolCall(tc, i))}
      </div>
    </div>
  );
}

export default function XtremeAIChat({ expanded, onToggle }) {
  const { user } = useAuth();
  const setExpanded = onToggle;
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversation list on mount
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
    } catch (e) {
      // ignore — may be empty
    }
  };

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [conversation?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (expanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [expanded]);

  const startNewConversation = useCallback(async () => {
    try {
      setError('');
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'New Command Session', description: 'Xtreme Commander chat' },
      });
      setConversation(conv);
      setMessages([]);
      setShowHistory(false);
    } catch (e) {
      setError(e.message || 'Failed to start conversation');
    }
  }, []);

  const loadConversation = async (convId) => {
    try {
      const conv = await base44.agents.getConversation(convId);
      setConversation(conv);
      setMessages(conv.messages || []);
      setShowHistory(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    // Ensure we have a conversation
    let conv = conversation;
    if (!conv) {
      try {
        conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: content.slice(0, 40), description: 'Xtreme Commander chat' },
        });
        setConversation(conv);
      } catch (e) {
        setError(e.message);
        return;
      }
    }

    setInput('');
    setLoading(true);
    setError('');

    // Optimistic: add user message immediately
    setMessages(prev => [...prev, { role: 'user', content }]);

    try {
      await base44.agents.addMessage(conv, { role: 'user', content });
      // Subscription will update messages and clear loading
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  // Collapsed state — floating button
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed', right: 20, bottom: 80, zIndex: 100,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
          border: '3px solid #fff', boxShadow: '0 8px 24px rgba(200,155,60,.4)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#111', fontFamily: 'inherit',
        }}
        title="Open AI Commander"
      >
        <Bot size={24} />
      </button>
    );
  }

  // Expanded state — full panel
  return (
    <>
      {/* Backdrop on mobile */}
      <div
        onClick={() => setExpanded(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 99,
          display: window.innerWidth < 900 ? 'block' : 'none',
        }}
      />
      <aside style={{
        position: 'fixed', right: 0, top: 60, bottom: 0, width: 420, zIndex: 100,
        background: '#f7f7f5', borderLeft: '1px solid #ddd',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,.08)',
      }}>
        {/* Header */}
        <div style={{
          background: '#0a0a0a', color: '#fff', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
            display: 'grid', placeItems: 'center', color: '#111',
          }}>
            <Bot size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 14, fontFamily: "'Libre Caslon Display', serif" }}>Xtreme Commander</b>
            <p style={{ fontSize: 10, color: '#888', margin: 0 }}>Full-access AI · read · write · execute</p>
          </div>
          <button
            onClick={() => setShowHistory(s => !s)}
            title="Conversation history"
            style={{
              background: 'none', border: '1px solid #333', borderRadius: 6, padding: 6,
              cursor: 'pointer', color: '#888', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
            }}
          >
            <MessageSquare size={14} />
          </button>
          <button
            onClick={startNewConversation}
            title="New conversation"
            style={{
              background: 'none', border: '1px solid #333', borderRadius: 6, padding: 6,
              cursor: 'pointer', color: '#888', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
            }}
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            title="Collapse panel"
            style={{
              background: 'none', border: '1px solid #333', borderRadius: 6, padding: 6,
              cursor: 'pointer', color: '#888', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* History dropdown */}
        {showHistory && (
          <div style={{
            position: 'absolute', top: 58, right: 60, width: 260, maxHeight: 320, overflow: 'auto',
            background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.15)',
            zIndex: 10, padding: 6,
          }}>
            {conversations.length === 0 ? (
              <p style={{ fontSize: 12, color: '#999', padding: 14, textAlign: 'center', margin: 0 }}>No conversations yet</p>
            ) : conversations.map(c => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 6, border: 0,
                  background: conversation?.id === c.id ? '#f0ede5' : 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <MessageSquare size={12} style={{ color: '#C89B3C', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.metadata?.name || 'Untitled'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Messages area */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16, paddingBottom: 4 }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', display: 'grid', placeItems: 'center', color: '#111',
              }}>
                <Bot size={28} />
              </div>
              <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: '0 0 6px' }}>Xtreme Commander</h3>
              <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px', lineHeight: 1.5 }}>
                I have full access to every function in this system — cloning, editing, queue management, discovery, generation, deployment, healing, and more.
              </p>
              <div style={{ display: 'grid', gap: 8, textAlign: 'left' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.prompt)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                      background: '#fff', border: '1px solid #e5e1da', borderRadius: 8,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', fontSize: 12, color: '#555',
                      transition: 'border-color .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#C89B3C'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e1da'}
                  >
                    <s.icon size={15} style={{ color: '#C89B3C', flexShrink: 0 }} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {loading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
              <div style={{
                padding: '12px 14px', borderRadius: 10, background: '#fff', border: '1px solid #e5e1da',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#888',
              }}>
                <Loader2 size={14} className="animate-spin" style={{ color: '#C89B3C' }} />
                <span>Working on it…</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#f5d8d5', border: '1px solid #C63D34',
              fontSize: 12, color: '#a52d23', marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: 12, background: '#fff', borderTop: '1px solid #ddd', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Command me to do anything… (e.g. 'add site.com to queue and clone it')"
              rows={1}
              style={{
                flex: 1, padding: '12px 14px', border: '1px solid #ddd', borderRadius: 8,
                fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none',
                maxHeight: 120, minHeight: 42, lineHeight: 1.4,
                background: '#f8f7f4',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 42, height: 42, borderRadius: 8, border: 0, cursor: loading ? 'wait' : 'pointer',
                background: (!input.trim() || loading) ? '#ccc' : '#0a0a0a', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p style={{ fontSize: 10, color: '#aaa', margin: '6px 0 0', textAlign: 'center' }}>
            Press Enter to send · Shift+Enter for new line · Full read/write/execute access
          </p>
        </div>
      </aside>
    </>
  );
}