import React, { useState, useRef, useEffect } from 'react';
import {
  analyzeRecoveryWithAgent,
  getRecoveryMetrics,
  getRecoveryOpportunities,
  getLatestBenchmark,
  compareStrategies,
  simulateRecovery,
} from '../api';
import { Send, Mic, MicOff, Activity } from 'lucide-react';

const fmt  = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const pct  = (n) => n != null ? `${Number(n).toFixed(1)}%` : '—';

// ── Voice support detection ─────────────────────────────────
const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;
const VOICE_AVAILABLE = Boolean(SpeechRecognitionAPI);

// ── Structured intents ──────────────────────────────────────
const INTENTS = [
  { id: 'highest_value',    label: 'Highest-value payment' },
  { id: 'explain',          label: 'Explain recommendation' },
  { id: 'compare',          label: 'Compare strategies' },
  { id: 'simulate',         label: 'Simulate recovery' },
  { id: 'mission_summary',  label: 'Summarize mission' },
  { id: 'blocked',          label: 'Show blocked actions' },
  { id: 'benchmark',        label: 'Benchmark results' },
];

// ── Intent resolver → structured message ────────────────────
const resolveIntent = async (intentId, query) => {
  switch (intentId) {

    case 'highest_value': {
      const res = await getRecoveryOpportunities({ limit: 1 });
      const opp = res.data?.[0];
      if (!opp) return 'No active recovery opportunities were found. Run a revenue risk scan to populate the queue.';
      return [
        `Payment **${opp.paymentId}** has **${fmt(opp.amount)}** at risk.`,
        `Calibrated recovery probability: **${pct((opp.recoveryProbability ?? 0) * 100)}**`,
        `Expected recovery value: **${fmt(opp.expectedValue)}**`,
        `PulsePay recommends: **${(opp.recommendedAction || opp.recommendedStrategy || '—').replace(/_/g, ' ')}**`,
        `Safety status: **${opp.policyStatus || '—'}**`,
      ].join('\n');
    }

    case 'explain': {
      const res = await getRecoveryOpportunities({ limit: 1 });
      const opp = res.data?.[0];
      if (!opp) return 'No active opportunities to explain. Run a revenue risk scan first.';
      const lines = [
        `For payment **${opp.paymentId}** (${fmt(opp.amount)}):`,
        `- Raw ML probability: **${pct((opp.rawProbability ?? opp.recoveryProbability ?? 0) * 100)}**`,
        `- Calibrated probability (Isotonic Regression): **${pct((opp.recoveryProbability ?? 0) * 100)}**`,
        `- Expected value: **${fmt(opp.expectedValue)}**`,
        `- Recommended: **${(opp.recommendedAction || '—').replace(/_/g, ' ')}**`,
      ];
      if (opp.policyStatus) lines.push(`- Safety policy: **${opp.policyStatus}**`);
      lines.push(`\nPulsePay does not blindly retry. ML estimates probability; deterministic safety policies control whether the action is permitted.`);
      return lines.join('\n');
    }

    case 'compare': {
      const oppsRes = await getRecoveryOpportunities({ limit: 1 });
      const opp = oppsRes.data?.[0];
      if (!opp) return 'No opportunities available for strategy comparison.';
      const res = await compareStrategies({
        paymentId: opp.paymentId,
        amount: opp.amount,
        recoveryProbability: opp.recoveryProbability,
        failureReason: opp.failureReason || opp.failureType,
        paymentMethod: opp.paymentMethod,
        retryCount: opp.retryCount || 0,
        expectedValue: opp.expectedValue,
      });
      const d = res.data;
      const lines = [
        `Strategy comparison for **${opp.paymentId}**:`,
        ...( d.strategies || []).map(s =>
          `- **${s.name}**: EV ${fmt(s.expectedValue)} · ${s.safetyStatus === 'BLOCKED' ? '🔴 Blocked' : '🟢 Permitted'}${s.selected ? ' · ✓ Selected' : ''}`
        ),
        `\nSelected: **${d.selectedStrategyName || d.selectedStrategy}**`,
        d.whySelected ? `Reason: ${d.whySelected}` : '',
      ].filter(Boolean);
      return lines.join('\n');
    }

    case 'simulate': {
      const res = await getRecoveryOpportunities({ limit: 1 });
      const opp = res.data?.[0];
      if (!opp) return 'No opportunities to simulate.';
      const sim = await simulateRecovery({ opportunityIds: [opp.opportunityId || opp.paymentId] });
      const d = sim.data;
      return [
        `Simulation for **${opp.paymentId}**:`,
        `- Opportunities targeted: **${d.transactionsTargeted ?? '—'}**`,
        `- Expected recovery: **${fmt(d.expectedRecoveredAmount)}**`,
        `- Policy blocked: **${d.policyBlockedCount ?? '—'}**`,
        `\nThis is a simulation only. Execution requires explicit confirmation.`,
      ].join('\n');
    }

    case 'mission_summary': {
      const res = await getRecoveryMetrics();
      const d = res.data || {};
      return [
        `Recovery Mission Summary:`,
        `- Total recovered: **${fmt(d.totalRecovered ?? d.actualRecoveredAmount)}**`,
        `- Revenue at risk: **${fmt(d.totalRevenueAtRisk ?? d.revenueAtRisk)}**`,
        `- Eligible opportunities: **${d.eligibleOpportunities ?? d.totalOpportunities ?? '—'}**`,
        `- Unsafe actions prevented by safety policy: **${d.unsafeActionsPrevented ?? '—'}**`,
      ].join('\n');
    }

    case 'blocked': {
      const res = await getRecoveryOpportunities({ policyStatus: 'BLOCKED', limit: 5 });
      const opps = res.data || [];
      if (opps.length === 0) return 'No blocked opportunities found in the current queue.';
      const lines = [
        `Blocked recovery actions (${opps.length} shown):`,
        ...opps.map(o => `- **${o.paymentId}** · ${fmt(o.amount)} · ${(o.failureReason || o.failureType || '—').replace(/_/g, ' ')}`),
      ];
      return lines.join('\n');
    }

    case 'benchmark': {
      const res = await getLatestBenchmark();
      const b = res.data;
      if (!b) return 'No benchmark results available. Run a benchmark from the Experiments page.';
      return [
        `Benchmark results (${b.benchmarkId || 'latest'}):`,
        `- Dataset: **${b.datasetSize?.toLocaleString() ?? '—'}** records · **${b.trainingCount?.toLocaleString() ?? '—'}** train / **${b.evaluationCount?.toLocaleString() ?? '—'}** eval`,
        `- PulsePay net recovery: **${fmt(b.netRecoveredRevenue)}**`,
        `- Blind retry net recovery: **${fmt(b.baselineComparison?.blindRetryNetRecovery)}**`,
        `- Net lift: **+${Number(b.baselineComparison?.netImprovementPercentage ?? 0).toFixed(1)}%**`,
        `- Recovery precision: **${pct(b.recoveryPrecision)}**`,
        `- Duplicate charges (PulsePay): **${b.calibrationComparison?.duplicateChargesAfter ?? '—'}**`,
        `- Calibration: ECE improved from **${pct((b.calibrationComparison?.eceBefore ?? 0) * 100)}** to **${pct((b.calibrationComparison?.eceAfter ?? 0) * 100)}**`,
      ].join('\n');
    }

    default: {
      // Fallback to agent analysis for free-form queries
      const res = await analyzeRecoveryWithAgent({ query, limit: 10 });
      const d = res.data || {};
      const parts = [d.summary || 'Analysis complete.'];
      if (d.facts?.length)    parts.push('\n**Facts:**\n' + d.facts.map(f => `- ${f}`).join('\n'));
      if (d.limitations)      parts.push(`\n*${d.limitations}*`);
      return parts.join('\n');
    }
  }
};

// ── Message renderer (bold markdown support) ─────────────────
const renderMsg = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
};

const MsgBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`msg ${isUser ? 'msg-user' : ''}`}>
      <div className={`msg-avatar ${isUser ? 'msg-avatar-user' : 'msg-avatar-system'}`}>
        {isUser ? 'You' : 'PP'}
      </div>
      <div className={`msg-bubble ${isUser ? 'msg-bubble-user' : 'msg-bubble-system'}`}>
        {msg.loading
          ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
              <Activity size={12} className="animate-spin" /> Analyzing…
            </span>
          : msg.text.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {renderMsg(line)}
                {i < msg.text.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))
        }
      </div>
    </div>
  );
};

// ── Main Copilot component ───────────────────────────────────
const Copilot = () => {
  const messageIdRef = useRef(1);
  const [messages, setMessages] = useState([{
    id: 0, role: 'system',
    text: 'I\'m the PulsePay Operations Copilot. Ask me about recovery opportunities, decisions, strategy comparisons, simulations, safety blocks, or benchmark results. I only use data from PulsePay\'s existing services — I never fabricate values.',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const detectIntent = (text) => {
    const t = text.toLowerCase();
    if (t.includes('highest') || t.includes('best') || t.includes('top payment')) return 'highest_value';
    if (t.includes('explain') || t.includes('why') || t.includes('decision')) return 'explain';
    if (t.includes('compar') || t.includes('alternative') || t.includes('strategy') || t.includes('what if')) return 'compare';
    if (t.includes('simulat')) return 'simulate';
    if (t.includes('mission') || t.includes('summary') || t.includes('report')) return 'mission_summary';
    if (t.includes('block') || t.includes('prevent')) return 'blocked';
    if (t.includes('benchmark') || t.includes('experiment') || t.includes('performance') || t.includes('metric')) return 'benchmark';
    return 'free_form';
  };

  const addMsg = (role, text, loading = false) => {
    const id = messageIdRef.current++;
    setMessages(prev => [...prev, { id, role, text, loading }]);
    return id;
  };

  const updateMsg = (id, text) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text, loading: false } : m));
  };

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    addMsg('user', q);
    const responseId = addMsg('system', '', true);
    setLoading(true);
    try {
      const intentId = detectIntent(q);
      const response = await resolveIntent(intentId, q);
      updateMsg(responseId, response);
    } catch (err) {
      updateMsg(responseId, `Unable to complete the request. ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!VOICE_AVAILABLE) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRecognitionAPI();
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <div className="page-stack" style={{ gap: 16 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Operations Copilot</h1>
          <p>Controlled interface to PulsePay's recovery engine. Grounded in actual service data.</p>
        </div>
        {VOICE_AVAILABLE && (
          <div className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>Voice available</div>
        )}
      </div>

      {/* ── Chat shell ─────────────────────────────────────── */}
      <div className="decision-section copilot-shell">

        {/* Intent chips */}
        <div className="copilot-prompt-chips">
          {INTENTS.map(intent => (
            <button
              key={intent.id}
              className="btn btn-secondary btn-sm"
              onClick={() => send(intent.label)}
              disabled={loading}
              id={`intent-${intent.id}`}
            >
              {intent.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="copilot-messages">
          {messages.map(msg => <MsgBubble key={msg.id} msg={msg} />)}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="copilot-input-row">
          {VOICE_AVAILABLE && (
            <button
              type="button"
              className={`btn btn-secondary btn-sm`}
              onClick={toggleVoice}
              title={listening ? 'Stop listening' : 'Start voice input'}
              id="voice-btn"
              style={{ borderColor: listening ? 'var(--color-danger)' : undefined }}
            >
              {listening ? <MicOff size={15} color="var(--color-danger)" /> : <Mic size={15} />}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about recovery, decisions, strategy, or benchmark…"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={loading}
            id="copilot-input"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            id="copilot-send"
          >
            <Send size={14} />
            {loading ? 'Analyzing…' : 'Send'}
          </button>
        </div>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────── */}
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        All responses are grounded in PulsePay's existing recovery engine and safety policies. No values are fabricated.
        {VOICE_AVAILABLE ? ' Voice uses browser SpeechRecognition API. Voice never executes actions without explicit confirmation.' : ''}
      </div>
    </div>
  );
};

export default Copilot;
