import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { Shield, Wrench, Send, Loader2, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';

const AGENTS = [
  {
    name: 'system_tester',
    label: 'System Tester',
    icon: Shield,
    color: '#C89B3C',
    description: 'Audits the entire system — forensic, visual, operational, E2E, deep paths. Reports scores and issues.',
    placeholder: 'Run a full system audit on the latest clone...',
  },
  {
    name: 'auto_fixer',
    label: 'Auto-Fixer',
    icon: Wrench,
    color: '#237A4B',
    description: 'Repairs anything the tester finds — heals clones, fixes security, cleans orphans, forces 100% parity.',
    placeholder: 'Fix all issues found in the last audit...',
  },
];

const FunctionCall = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status;
  const isFailed = status === 'failed' || status === 'error';
  const isRunning = status === 'pending' || status === 'running' || status === 'in_progress';
  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;

  const statusIcon = isFailed ? <XCircle size={14} className="text-red-500" />
    : status === 'success' || status === 'completed' ? <CheckCircle2 size={14} className="text-green-600" />
    : isRunning ? <Loader2 size={14} className="text-amber-500 animate-spin" />
    : <Clock size={14} className="text-slate-400" />;

  const label = isRunning ? (proj.active_label || 'Running...') : isFailed ? (proj.error_label || 'Failed') : (proj.label || 'Done');

  let parsedArgs = toolCall.arguments_string;
  try { parsedArgs = JSON.parse(toolCall.arguments_string); } catch {}
  let parsedResults = toolCall.results;
  try { if (typeof parsedResults === 'string') parsedResults = JSON.parse(parsedResults); } catch {}

  return (
    <div className="mt-2 text-xs border border-slate-200 rounded-lg overflow-hidden">
      <button onClick={() => !hideDetails && setExpanded(!expanded)} className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition">
        {statusIcon}
        {!hideDetails && (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        <span className="font-mono font-semibold text-slate-700">{toolCall.name}</span>
        <span className={`ml-auto text-xs ${isFailed ? 'text-red-500' : status === 'success' || status === 'completed' ? 'text-green-600' : 'text-amber-500'}`}>{label}</span>
      </button>
      {expanded && !hideDetails && (
        <div className="px-3 py-2 bg-white border-t border-slate-200 space-y-2">
          {parsedArgs && Object.keys(parsedArgs).length > 0 && (
            <div>
              <p className="font-semibold text-slate-500 mb-1">Parameters:</p>
              <pre className="bg-slate-50 p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(parsedArgs, null, 2)}</pre>
            </div>
          )}
          {parsedResults != null && (
            <div>
              <p className="font-semibold text-slate-500 mb-1">Result:</p>
              <pre className="bg-slate-50 p-2 rounded text-xs overflow-auto max-h-60">{typeof parsedResults === 'string' ? parsedResults : JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={isUser ? 'max-w-[80%]' : 'max-w-[90%] w-full'}>
        {message.content && (isUser
          ? <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm">{message.content}</div>
          : <div className="prose prose-sm max-w-none"><ReactMarkdown>{message.content}</ReactMarkdown></div>)}
        {message.tool_calls?.map((tc, i) => <FunctionCall key={i} toolCall={tc} />)}
      </div>
    </div>
  );
};

export default function AgentConsole() {
  const [activeAgent, setActiveAgent] = useState(AGENTS[0].name);
  const [conversations, setConversations] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convoId, setConvoId] = useState(null);
  const scrollRef = useRef(null);

  const agent = AGENTS.find(a => a.name === activeAgent);

  useEffect(() => {
    let unsub = () => {};
    if (convoId) {
      unsub = base44.agents.subscribeToConversation(convoId, (data) => {
        setMessages(data.messages || []);
        setLoading(false);
      });
    }
    return () => unsub();
  }, [convoId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = async (agentName, prompt) => {
    try {
      const convo = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: { name: `${AGENTS.find(a => a.name === agentName).label} — ${new Date().toLocaleTimeString()}` }
      });
      setConvoId(convo.id);
      setConversations(prev => ({ ...prev, [agentName]: convo.id }));
      setMessages([]);
      await base44.agents.addMessage(convo, { role: 'user', content: prompt });
      setLoading(true);
    } catch (e) {
      console.error('Failed to start conversation:', e);
      setLoading(false);
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput('');
    if (!convoId || conversations[activeAgent] !== convoId) {
      await startConversation(activeAgent, prompt);
    } else {
      const convo = await base44.agents.getConversation(convoId);
      await base44.agents.addMessage(convo, { role: 'user', content: prompt });
      setLoading(true);
    }
  };

  const switchAgent = (name) => {
    setActiveAgent(name);
    if (conversations[name]) {
      setConvoId(conversations[name]);
      base44.agents.getConversation(conversations[name]).then(c => setMessages(c.messages || []));
    } else {
      setConvoId(null);
      setMessages([]);
    }
  };

  const quickActions = activeAgent === 'system_tester'
    ? [
        { label: 'Full Audit', prompt: 'Run a full system audit on the most recent clone. Test forensic, visual, operational, E2E, and deep paths. Report all scores.' },
        { label: 'Quick Check', prompt: 'Quick check — just run the recursive E2E validator on the latest clone and report the summary.' },
        { label: 'Deep Paths', prompt: 'Test deep path resolution on 5 category paths: /graphic-templates/compatible-with-adobe-photoshop, /video-templates/compatible-with-after-effects, /presentation-templates/compatible-with-powerpoint, /audio/music-packs, /fonts/serif' },
      ]
    : [
        { label: 'Fix All', prompt: 'Find and fix all issues from the most recent QA report. Heal clones, fix security, force 100% parity, and verify.' },
        { label: 'Heal Clones', prompt: 'Heal all clones that are below 100% parity. Run healAllClonesTo100 and then forceClonesTo100 if needed.' },
        { label: 'Clean Up', prompt: 'Clean up orphaned Vercel projects and broken clones to free up quota.' },
      ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900">Agent Console</h1>
        <p className="text-sm text-slate-500">Autonomous testing & auto-fix agents for the clone system</p>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Agent selector */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2">
          {AGENTS.map(a => {
            const Icon = a.icon;
            const active = a.name === activeAgent;
            return (
              <button key={a.name} onClick={() => switchAgent(a.name)}
                className={`text-left p-3 rounded-xl border transition ${active ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: a.color + '20' }}>
                    <Icon size={16} style={{ color: a.color }} />
                  </div>
                  <span className="font-semibold text-sm text-slate-900">{a.label}</span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">{a.description}</p>
              </button>
            );
          })}
          <div className="mt-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-2">Workflow:</p>
            <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
              <li>Run <b>Tester</b> to audit</li>
              <li>Run <b>Fixer</b> to repair</li>
              <li>Re-run <b>Tester</b> to verify</li>
            </ol>
          </div>
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: agent.color + '15' }}>
                  {React.createElement(agent.icon, { size: 28, style: { color: agent.color } })}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">{agent.label}</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">{agent.description}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.map(qa => (
                    <button key={qa.label} onClick={() => startConversation(activeAgent, qa.prompt)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition">
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={agent.placeholder}
                disabled={loading}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 disabled:opacity-50"
              />
              <button onClick={send} disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}