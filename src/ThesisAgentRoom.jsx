import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Zap, GitBranch, Calendar, FileSearch, TrendingUp, Shield, Database, MessageSquare, ChevronDown, ChevronRight, Copy, Trash2, Sparkles, Plus, FolderOpen, X, GitFork, Globe, FileText, Edit3, Check } from 'lucide-react';

// ────── AGENT DEFINITIONS ──────
const AGENTS = {
  macro: {
    id: 'macro', name: 'Macro Strategist', code: 'MAC', icon: TrendingUp, color: '#d4a574',
    needsSearch: true,
    system: `You are a top-down macro strategist in the mold of Druckenmiller and Soros. Your job is to identify the dominant macro forces — capital flows, monetary regime, fiscal posture, demographics, geopolitics — and connect them to investable themes. You think in regimes and inflection points. You name specific assets and sectors. You distinguish between consensus narratives and what's actually happening on the ground. You write in tight, direct prose. No hedging, no fluff. When you have web search available, USE IT to ground your view in current data — recent CB statements, fund flows, positioning data, recent macro releases. When you don't know something, say so.`,
  },
  sector: {
    id: 'sector', name: 'Sector Specialist', code: 'SEC', icon: GitBranch, color: '#b8956a',
    needsSearch: true,
    system: `You are a deep sector specialist with operating experience in the relevant industry. You understand unit economics, competitive dynamics, supply chains, and regulatory structure. You know which companies actually have the moat versus which just claim to. You speak the industry's vocabulary precisely. You identify the 2-3 variables that actually drive the sector and ignore the noise. Be specific about company names, market shares, and economic structure. When web search is available, USE IT to verify recent industry data — pricing, capacity, market share shifts, recent deals.`,
  },
  quant: {
    id: 'quant', name: 'Quant Screener', code: 'QNT', icon: Database, color: '#9d8460',
    needsSearch: true,
    system: `You are a quantitative analyst who finds investable names through screens, factor analysis, and statistical patterns. You think in terms of valuation multiples, factor exposures, dispersion, positioning, and crowding. You generate name lists with specific tickers, current valuations, and the screen logic that surfaced them. You flag which names are crowded vs. uncrowded. You provide sizing math when relevant. Output specific tickers, never vague categories. When web search is available, USE IT to pull current multiples, recent earnings, and factor data.`,
  },
  contrarian: {
    id: 'contrarian', name: "Devil's Advocate", code: 'CON', icon: Zap, color: '#c47a5a',
    needsSearch: true,
    system: `You are a ruthless contrarian whose only job is to destroy the thesis being proposed. You find the weakest assumptions, the historical analogies that broke, the structural reasons it might not work. You're not pessimistic for sport — you're trying to save the PM from a blow-up. You name specific failure modes: what if rates stay high, what if regulators act, what if the customer churns, what if the moat is illusory. You cite specific cases where similar theses failed. Be ruthless but specific. No generic "macro risk" — name the actual mechanism of failure. When web search is available, USE IT to find the disconfirming evidence — bear research, regulatory filings, recent failures of similar theses.`,
  },
  catalyst: {
    id: 'catalyst', name: 'Catalyst Hunter', code: 'CAT', icon: Calendar, color: '#a8956c',
    needsSearch: true,
    system: `You are an event-driven analyst who maps the calendar of catalysts that force re-pricing. You identify earnings dates, regulatory decisions, policy meetings, product launches, contract renewals, index rebalances, lockup expiries, and macro releases. For each catalyst you give: specific date or window, what gets re-priced, the asymmetry around the event, and how to position. You distinguish between catalysts that move things (binary, dated, material) and noise (vague, undated, already-priced). When web search is available, USE IT aggressively to find actual upcoming dates — earnings calendars, FDA dates, court dates, central bank meetings, expiries. Real dates only.`,
  },
  forensic: {
    id: 'forensic', name: 'Forensic Analyst', code: 'FOR', icon: FileSearch, color: '#8b9d7a',
    needsSearch: true,
    system: `You are a forensic accounting and filings analyst. You read 10-Ks, 10-Qs, 8-Ks, S-1s, proxy statements, and footnotes for what management is hiding or revealing. You spot: deteriorating working capital, capitalized vs expensed costs, related-party transactions, segment shifts, accounting changes, insider sales, customer concentration, off-balance-sheet items. You provide specific things a thesis should look for in filings of named companies. You're skeptical and detail-obsessed. Cite specific line items and disclosures when relevant. When web search is available, USE IT to pull recent filings, 8-K disclosures, and insider transactions.`,
  },
  risk: {
    id: 'risk', name: 'Risk Manager', code: 'RSK', icon: Shield, color: '#7a8b9d',
    needsSearch: false,
    system: `You are a senior risk manager focused on portfolio construction and downside protection. You think about position sizing (Kelly, conviction-weighted), correlation, factor exposures, tail risk, drawdown scenarios, and what a 2008/2020/2022-style shock would do to this thesis. You design the kill criteria — specific, measurable, dated conditions for exit. You think about hedges, not just the trade. You speak in terms of basis points, vol, and dollar risk. Be precise about position sizing recommendations and stop levels.`,
  },
  synth: {
    id: 'synth', name: 'Synthesizer', code: 'SYN', icon: MessageSquare, color: '#d4a574',
    needsSearch: false,
    system: `You are the portfolio manager. You take inputs from multiple specialist agents and synthesize them into a coherent, actionable investment thesis. You weigh disagreements honestly. You highlight where the variant view actually lives. You produce a final thesis with: the core insight, the variant view, 2-3 highest-conviction names with sizing, the kill criteria, and what to monitor. You write in tight institutional prose. You acknowledge what the team disagrees on rather than papering over it.`,
  },
};

const AGENT_LIST = ['macro', 'sector', 'quant', 'catalyst', 'forensic', 'contrarian', 'risk', 'synth'];

// ────── STORAGE HELPERS ──────
const STORAGE_PREFIX = 'thesis:';

async function listTheses() {
  try {
    const result = await window.storage.list(STORAGE_PREFIX);
    return result?.keys || [];
  } catch (e) {
    return [];
  }
}

async function loadThesis(id) {
  try {
    const result = await window.storage.get(`${STORAGE_PREFIX}${id}`);
    return result ? JSON.parse(result.value) : null;
  } catch (e) {
    return null;
  }
}

async function saveThesis(id, data) {
  try {
    await window.storage.set(`${STORAGE_PREFIX}${id}`, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

async function deleteThesis(id) {
  try {
    await window.storage.delete(`${STORAGE_PREFIX}${id}`);
    return true;
  } catch (e) {
    return false;
  }
}

// ────── MAIN APP ──────
export default function ThesisAgentRoom() {
  const [thesisList, setThesisList] = useState([]);
  const [activeThesisId, setActiveThesisId] = useState(null);
  const [thesisName, setThesisName] = useState('Untitled Thesis');
  const [editingName, setEditingName] = useState(false);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [activeAgents, setActiveAgents] = useState(new Set());
  const [mode, setMode] = useState('parallel');
  const [selectedSingle, setSelectedSingle] = useState('macro');
  const [enableCritique, setEnableCritique] = useState(true);
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [running, setRunning] = useState(false);
  const [showThesisDrawer, setShowThesisDrawer] = useState(false);
  const [branch, setBranch] = useState(null);
  const messagesEndRef = useRef(null);
  const branchEndRef = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    refreshThesisList();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (activeThesisId && messages.length > 0) {
      saveThesis(activeThesisId, {
        id: activeThesisId,
        name: thesisName,
        messages,
        updatedAt: Date.now(),
      });
    }
  }, [messages, thesisName, activeThesisId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    branchEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [branch?.messages]);

  const refreshThesisList = async () => {
    const keys = await listTheses();
    const list = await Promise.all(
      keys.map(async k => {
        const id = k.replace(STORAGE_PREFIX, '');
        const data = await loadThesis(id);
        return data ? { id, name: data.name || 'Untitled', updatedAt: data.updatedAt || 0, msgCount: data.messages?.length || 0 } : null;
      })
    );
    setThesisList(list.filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const newThesis = async () => {
    const id = `t_${Date.now()}`;
    const name = `Thesis ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    setActiveThesisId(id);
    setThesisName(name);
    setMessages([]);
    setBranch(null);
    setShowThesisDrawer(false);
    await saveThesis(id, { id, name, messages: [], updatedAt: Date.now() });
    refreshThesisList();
  };

  const switchThesis = async (id) => {
    const data = await loadThesis(id);
    if (data) {
      setActiveThesisId(id);
      setThesisName(data.name);
      setMessages(data.messages || []);
      setBranch(null);
      setShowThesisDrawer(false);
    }
  };

  const removeThesis = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this thesis permanently?')) return;
    await deleteThesis(id);
    if (activeThesisId === id) {
      setActiveThesisId(null);
      setMessages([]);
      setThesisName('Untitled Thesis');
    }
    refreshThesisList();
  };

  // ────── AGENT CALLS ──────
  const buildContext = (msgs) => {
    return msgs
      .filter(m => m.type === 'agent' && !m.isCritique)
      .map(m => `[${AGENTS[m.agent].name}]: ${m.content}`)
      .join('\n\n');
  };

  const callAgent = async (agentId, userPrompt, contextOverride = null) => {
    const agent = AGENTS[agentId];
    const ctx = contextOverride !== null ? contextOverride : buildContext(messages);

    const useSearch = enableWebSearch && agent.needsSearch;
    const fullPrompt = ctx
      ? `PRIOR ANALYSIS FROM OTHER AGENTS:\n${ctx}\n\n———\n\nCURRENT REQUEST:\n${userPrompt}\n\nProvide your specialist analysis. Be concise (4-8 sentences unless detail is essential). Name specific things — companies, sectors, dates, levels, mechanisms.${useSearch ? ' Use web search for current data where it strengthens your analysis.' : ''}`
      : `${userPrompt}\n\nProvide your specialist analysis. Be concise (4-8 sentences unless detail is essential). Name specific things — companies, sectors, dates, levels, mechanisms.${useSearch ? ' Use web search for current data where it strengthens your analysis.' : ''}`;

    try {
      const body = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: agent.system,
        messages: [{ role: "user", content: fullPrompt }],
      };
      if (useSearch) {
        body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];
      }

      const res = await fetch("/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      const textBlocks = data.content.filter(b => b.type === "text").map(b => b.text);
      const searchCount = data.content.filter(b => b.type === "server_tool_use" && b.name === "web_search").length;

      return {
        text: textBlocks.join("\n").trim(),
        searched: searchCount > 0,
        searchCount,
      };
    } catch (e) {
      return { text: `[${agent.name} unavailable: ${e.message}]`, searched: false, searchCount: 0 };
    }
  };

  const callCritique = async (criticId, targetAgentId, targetContent, originalPrompt) => {
    const critic = AGENTS[criticId];
    const target = AGENTS[targetAgentId];
    const critiquePrompt = `The original question was: "${originalPrompt}"

The ${target.name} responded:
"${targetContent}"

As the ${critic.name}, briefly critique this response from your specialist angle (2-4 sentences). What's missing? What's wrong? What does your domain reveal that they missed? Be sharp and specific. If you genuinely agree, say "Concur" and give one supporting point. Don't pad.`;

    try {
      const res = await fetch("/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: critic.system,
          messages: [{ role: "user", content: critiquePrompt }],
        }),
      });
      const data = await res.json();
      return data.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    } catch (e) {
      return null;
    }
  };

  const ensureThesis = async () => {
    if (!activeThesisId) {
      const id = `t_${Date.now()}`;
      const name = `Thesis ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      setActiveThesisId(id);
      setThesisName(name);
      await saveThesis(id, { id, name, messages: [], updatedAt: Date.now() });
      refreshThesisList();
      return id;
    }
    return activeThesisId;
  };

  // ────── RUN MODES ──────
  const runParallel = async () => {
    if (!prompt.trim()) return;
    await ensureThesis();
    const userMsg = { id: `u-${Date.now()}`, type: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);
    const currentPrompt = prompt;
    setPrompt('');
    setRunning(true);

    const agentsToRun = activeAgents.size > 0 ? [...activeAgents] : AGENT_LIST.filter(a => a !== 'synth');

    const baseTime = Date.now();
    const loadingMsgs = agentsToRun.map((id, i) => ({
      id: `${baseTime}-${id}-${i}`,
      type: 'agent', agent: id, content: '', loading: true,
    }));
    setMessages(prev => [...prev, ...loadingMsgs]);

    const results = await Promise.all(
      agentsToRun.map(id => callAgent(id, currentPrompt, ''))
    );

    setMessages(prev => {
      const next = [...prev];
      loadingMsgs.forEach((lm, idx) => {
        const i = next.findIndex(m => m.id === lm.id);
        if (i !== -1) {
          next[i] = { ...next[i], content: results[idx].text, loading: false, searched: results[idx].searched, searchCount: results[idx].searchCount };
        }
      });
      return next;
    });

    if (enableCritique && agentsToRun.length > 1) {
      await runCritiqueRound(agentsToRun, results.map(r => r.text), currentPrompt);
    }

    setRunning(false);
  };

  const runCritiqueRound = async (agentsRun, agentResults, originalPrompt) => {
    const critiques = [];
    for (let i = 0; i < agentsRun.length; i++) {
      const criticId = agentsRun[(i + 1) % agentsRun.length];
      const targetId = agentsRun[i];
      if (criticId === targetId) continue;
      critiques.push({ criticId, targetId, targetContent: agentResults[i], originalPrompt });
    }

    const baseTime = Date.now();
    const loadingCritiques = critiques.map((c, i) => ({
      id: `crit-${baseTime}-${i}`,
      type: 'agent', agent: c.criticId, content: '', loading: true,
      isCritique: true, critiqueOf: c.targetId,
    }));
    setMessages(prev => [...prev, ...loadingCritiques]);

    const results = await Promise.all(
      critiques.map(c => callCritique(c.criticId, c.targetId, c.targetContent, c.originalPrompt))
    );

    setMessages(prev => {
      const next = [...prev];
      loadingCritiques.forEach((lc, idx) => {
        const i = next.findIndex(m => m.id === lc.id);
        if (i !== -1 && results[idx]) {
          next[i] = { ...next[i], content: results[idx], loading: false };
        } else if (i !== -1) {
          next.splice(i, 1);
        }
      });
      return next;
    });
  };

  const runPipeline = async () => {
    if (!prompt.trim()) return;
    await ensureThesis();
    const userMsg = { id: `u-${Date.now()}`, type: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);
    const currentPrompt = prompt;
    setPrompt('');
    setRunning(true);

    const sequence = activeAgents.size > 0 ? [...activeAgents] : ['macro', 'sector', 'catalyst', 'quant', 'forensic', 'contrarian', 'risk', 'synth'];

    let accumulatedContext = '';
    for (const agentId of sequence) {
      const loadingMsg = {
        id: `pipe-${Date.now()}-${agentId}`,
        type: 'agent', agent: agentId, content: '', loading: true,
      };
      setMessages(prev => [...prev, loadingMsg]);

      const result = await callAgent(agentId, currentPrompt, accumulatedContext);
      accumulatedContext += `\n\n[${AGENTS[agentId].name}]: ${result.text}`;

      setMessages(prev => {
        const next = [...prev];
        const i = next.findIndex(m => m.id === loadingMsg.id);
        if (i !== -1) next[i] = { ...next[i], content: result.text, loading: false, searched: result.searched, searchCount: result.searchCount };
        return next;
      });
    }
    setRunning(false);
  };

  const runSingle = async () => {
    if (!prompt.trim()) return;
    await ensureThesis();
    const userMsg = { id: `u-${Date.now()}`, type: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);
    const currentPrompt = prompt;
    setPrompt('');
    setRunning(true);

    const loadingMsg = {
      id: `single-${Date.now()}`,
      type: 'agent', agent: selectedSingle, content: '', loading: true,
    };
    setMessages(prev => [...prev, loadingMsg]);

    const result = await callAgent(selectedSingle, currentPrompt);

    setMessages(prev => {
      const next = [...prev];
      const i = next.findIndex(m => m.id === loadingMsg.id);
      if (i !== -1) next[i] = { ...next[i], content: result.text, loading: false, searched: result.searched, searchCount: result.searchCount };
      return next;
    });
    setRunning(false);
  };

  const run = () => {
    if (mode === 'parallel') runParallel();
    else if (mode === 'pipeline') runPipeline();
    else runSingle();
  };

  const synthesize = async () => {
    await ensureThesis();
    setRunning(true);
    const loadingMsg = {
      id: `synth-${Date.now()}`,
      type: 'agent', agent: 'synth', content: '', loading: true, isSynthesis: true,
    };
    setMessages(prev => [...prev, loadingMsg]);

    const ctx = buildContext(messages);
    const synthPrompt = `Below is the full record of specialist analysis from the team. Synthesize this into a final, coherent investment thesis.

Structure:
1. **Core Insight** (2-3 sentences) — what's the central bet
2. **Variant View** (2-3 sentences) — where consensus is wrong
3. **Highest-Conviction Names** (2-3 specific tickers with brief logic + suggested sizing tier)
4. **Key Catalysts** (dated, specific)
5. **Kill Criteria** (3-4 measurable conditions for exit)
6. **What to Monitor** (leading indicators)

Acknowledge any genuine disagreements between agents — don't paper over them. Be tight and institutional.`;

    const result = await callAgent('synth', synthPrompt, ctx);

    setMessages(prev => {
      const next = [...prev];
      const i = next.findIndex(m => m.id === loadingMsg.id);
      if (i !== -1) next[i] = { ...next[i], content: result.text, loading: false };
      return next;
    });
    setRunning(false);
  };

  // ────── BRANCHING ──────
  const startBranch = (sourceMessage) => {
    setBranch({
      sourceMessageId: sourceMessage.id,
      sourceAgentId: sourceMessage.agent,
      sourceContent: sourceMessage.content,
      messages: [],
      prompt: '',
    });
  };

  const sendBranch = async () => {
    if (!branch?.prompt?.trim()) return;
    const currentPrompt = branch.prompt;
    const userMsg = { id: `bu-${Date.now()}`, type: 'user', content: currentPrompt };

    const loadingMsg = {
      id: `bagent-${Date.now()}`,
      type: 'agent', agent: branch.sourceAgentId, content: '', loading: true,
    };

    setBranch(prev => ({ ...prev, prompt: '', messages: [...prev.messages, userMsg, loadingMsg] }));

    const branchContext = `Your earlier response in the main thesis room was:
"${branch.sourceContent}"

Continuing this side conversation:
${branch.messages.filter(m => m.type === 'agent' && !m.loading).map((m, i) => {
  const userIdx = branch.messages.indexOf(m) - 1;
  const userM = userIdx >= 0 ? branch.messages[userIdx] : null;
  return userM ? `Q: ${userM.content}\nA: ${m.content}` : '';
}).filter(Boolean).join('\n\n')}`;

    const result = await callAgent(branch.sourceAgentId, currentPrompt, branchContext);

    setBranch(prev => {
      if (!prev) return prev;
      const next = [...prev.messages];
      const i = next.findIndex(m => m.id === loadingMsg.id);
      if (i !== -1) next[i] = { ...next[i], content: result.text, loading: false, searched: result.searched, searchCount: result.searchCount };
      return { ...prev, messages: next };
    });
  };

  const mergeBranchToMain = () => {
    if (!branch || branch.messages.length === 0) return;
    const summary = `[Branched from ${AGENTS[branch.sourceAgentId].code}]`;
    const newMessages = [
      { id: `bmark-${Date.now()}`, type: 'branch-marker', content: summary, agent: branch.sourceAgentId },
      ...branch.messages.map(m => ({ ...m, fromBranch: true })),
    ];
    setMessages(prev => [...prev, ...newMessages]);
    setBranch(null);
  };

  const closeBranch = () => {
    if (branch?.messages.length > 0) {
      if (!confirm('Close branch without merging? Branch content will be lost.')) return;
    }
    setBranch(null);
  };

  const toggleAgent = (id) => {
    setActiveAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportThesis = () => {
    const text = `# ${thesisName}\n\n` + messages.map(m => {
      if (m.type === 'user') return `\n\n## YOU\n${m.content}`;
      if (m.type === 'branch-marker') return `\n\n--- ${m.content} ---`;
      const agent = AGENTS[m.agent];
      const tag = m.isCritique ? `${agent.name} → critique of ${AGENTS[m.critiqueOf]?.name}` : agent.name;
      return `\n\n### ${tag}\n${m.content}`;
    }).join('');
    navigator.clipboard.writeText(text);
    alert('Thesis transcript copied to clipboard');
  };

  const handleNameSave = async () => {
    setEditingName(false);
    if (activeThesisId) {
      await saveThesis(activeThesisId, { id: activeThesisId, name: thesisName, messages, updatedAt: Date.now() });
      refreshThesisList();
    }
  };

  return (
    <div style={styles.app}>
      <style>{cssAnimations}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.drawerBtn} onClick={() => setShowThesisDrawer(!showThesisDrawer)}>
            <FolderOpen size={14} />
          </button>
          <div style={styles.logoMark}>◈</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  style={styles.nameInput}
                  value={thesisName}
                  onChange={e => setThesisName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                  autoFocus
                />
                <button style={styles.iconBtnSm} onClick={handleNameSave}><Check size={12} /></button>
              </div>
            ) : (
              <div style={styles.titleRow}>
                <div style={styles.headerTitle}>{thesisName}</div>
                <button style={styles.iconBtnSm} onClick={() => setEditingName(true)}><Edit3 size={11} /></button>
              </div>
            )}
            <div style={styles.headerSub}>
              {activeThesisId ? `${messages.length} msg · auto-saved` : 'Eight specialists. One thesis.'}
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.headerBtn} onClick={newThesis}>
            <Plus size={11} /> NEW
          </button>
          <button style={styles.headerBtn} onClick={exportThesis} disabled={messages.length === 0}>
            <Copy size={11} /> EXPORT
          </button>
        </div>
      </header>

      <div style={styles.body}>
        {/* Thesis Drawer */}
        {showThesisDrawer && (
          <div style={styles.drawerOverlay} onClick={() => setShowThesisDrawer(false)}>
            <aside style={styles.drawer} onClick={e => e.stopPropagation()}>
              <div style={styles.drawerHeader}>
                <div style={styles.drawerTitle}>THESES</div>
                <button style={styles.iconBtnSm} onClick={() => setShowThesisDrawer(false)}><X size={12} /></button>
              </div>
              <button style={styles.newThesisBtn} onClick={newThesis}>
                <Plus size={12} /> NEW THESIS
              </button>
              <div style={styles.drawerList}>
                {thesisList.length === 0 && (
                  <div style={styles.drawerEmpty}>No saved theses yet.</div>
                )}
                {thesisList.map(t => (
                  <div key={t.id}
                    style={{
                      ...styles.thesisItem,
                      ...(t.id === activeThesisId ? styles.thesisItemActive : {}),
                    }}
                    onClick={() => switchThesis(t.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.thesisItemName}>{t.name}</div>
                      <div style={styles.thesisItemMeta}>
                        {t.msgCount} msg · {new Date(t.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <button style={styles.deleteBtn} onClick={e => removeThesis(t.id, e)}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarLabel}>EXECUTION MODE</div>
            <div style={styles.modeToggle}>
              <button onClick={() => setMode('parallel')} style={{ ...styles.modeBtn, ...(mode === 'parallel' ? styles.modeBtnActive : {}) }}>Parallel</button>
              <button onClick={() => setMode('pipeline')} style={{ ...styles.modeBtn, ...(mode === 'pipeline' ? styles.modeBtnActive : {}) }}>Pipeline</button>
              <button onClick={() => setMode('single')} style={{ ...styles.modeBtn, ...(mode === 'single' ? styles.modeBtnActive : {}) }}>Single</button>
            </div>
            <div style={styles.modeHint}>
              {mode === 'parallel' && 'All agents respond independently, then critique each other.'}
              {mode === 'pipeline' && 'Agents run in sequence, each sees prior outputs.'}
              {mode === 'single' && 'One agent only. For deep dives.'}
            </div>
          </div>

          {mode === 'single' && (
            <div style={styles.sidebarSection}>
              <div style={styles.sidebarLabel}>SELECT AGENT</div>
              <select value={selectedSingle} onChange={e => setSelectedSingle(e.target.value)} style={styles.select}>
                {Object.values(AGENTS).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {mode !== 'single' && (
            <div style={styles.sidebarSection}>
              <div style={styles.sidebarLabel}>
                AGENTS {activeAgents.size > 0 ? `(${activeAgents.size})` : '(ALL)'}
              </div>
              <div style={styles.agentGrid}>
                {AGENT_LIST.filter(id => id !== 'synth').map(id => {
                  const a = AGENTS[id];
                  const Icon = a.icon;
                  const active = activeAgents.has(id);
                  return (
                    <button key={id} onClick={() => toggleAgent(id)}
                      style={{ ...styles.agentChip, ...(active ? { ...styles.agentChipActive, borderColor: a.color, color: a.color } : {}) }}>
                      <Icon size={11} style={{ color: active ? a.color : '#6a6558' }} />
                      <span>{a.code}</span>
                      <span style={styles.agentChipName}>{a.name}</span>
                    </button>
                  );
                })}
              </div>
              <div style={styles.modeHint}>None selected = all run.</div>
            </div>
          )}

          <div style={styles.sidebarSection}>
            <label style={styles.checkRow}>
              <input type="checkbox" checked={enableWebSearch} onChange={e => setEnableWebSearch(e.target.checked)} />
              <Globe size={11} />
              <span>Web search</span>
            </label>
            <div style={styles.modeHint}>Agents pull live data when enabled.</div>
          </div>

          {mode === 'parallel' && (
            <div style={styles.sidebarSection}>
              <label style={styles.checkRow}>
                <input type="checkbox" checked={enableCritique} onChange={e => setEnableCritique(e.target.checked)} />
                <span>Cross-agent critique</span>
              </label>
              <div style={styles.modeHint}>Each agent critiques the next.</div>
            </div>
          )}

          <div style={styles.sidebarSection}>
            <button style={styles.synthBtn} onClick={synthesize} disabled={running || messages.filter(m => m.type === 'agent' && !m.isCritique).length === 0}>
              <Sparkles size={12} /> SYNTHESIZE THESIS
            </button>
            <div style={styles.modeHint}>PM synthesizes prior outputs into a final thesis.</div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ ...styles.main, ...(branch ? { width: '50%' } : {}) }}>
          {messages.length === 0 ? <EmptyState mode={mode} /> : (
            <div style={styles.messages}>
              {messages.map(m => (
                <Message key={m.id} message={m} onBranch={startBranch} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div style={styles.inputBar}>
            <textarea
              style={styles.promptInput}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
              placeholder={mode === 'single' ? `Ask ${AGENTS[selectedSingle].name}...` : 'State your theme or question. The room responds.'}
              disabled={running}
            />
            <button style={styles.sendBtn} onClick={run} disabled={running || !prompt.trim()}>
              {running ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              {running ? 'RUNNING' : 'DISPATCH'}
            </button>
          </div>
        </main>

        {/* Branch Panel */}
        {branch && (
          <aside style={styles.branchPanel}>
            <div style={styles.branchHeader}>
              <div style={styles.branchHeaderLeft}>
                <GitFork size={14} style={{ color: AGENTS[branch.sourceAgentId].color }} />
                <div>
                  <div style={{ ...styles.branchTitle, color: AGENTS[branch.sourceAgentId].color }}>
                    BRANCH / {AGENTS[branch.sourceAgentId].code}
                  </div>
                  <div style={styles.branchSub}>Side conversation with {AGENTS[branch.sourceAgentId].name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button style={styles.iconBtnSm} title="Merge to main" onClick={mergeBranchToMain} disabled={branch.messages.length === 0}>
                  <Check size={12} />
                </button>
                <button style={styles.iconBtnSm} title="Close branch" onClick={closeBranch}>
                  <X size={12} />
                </button>
              </div>
            </div>

            <div style={styles.branchSource}>
              <div style={styles.branchSourceLabel}>FORKED FROM:</div>
              <div style={styles.branchSourceContent}>{branch.sourceContent.slice(0, 200)}{branch.sourceContent.length > 200 ? '...' : ''}</div>
            </div>

            <div style={styles.branchMessages}>
              {branch.messages.length === 0 && (
                <div style={styles.branchEmpty}>
                  Ask a follow-up. Only {AGENTS[branch.sourceAgentId].name} will respond. Merge when done.
                </div>
              )}
              {branch.messages.map(m => <Message key={m.id} message={m} onBranch={null} compact />)}
              <div ref={branchEndRef} />
            </div>

            <div style={styles.branchInputBar}>
              <textarea
                style={styles.branchInput}
                value={branch.prompt}
                onChange={e => setBranch(prev => ({ ...prev, prompt: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendBranch(); } }}
                placeholder={`Follow up with ${AGENTS[branch.sourceAgentId].name}...`}
              />
              <button style={styles.branchSendBtn} onClick={sendBranch} disabled={!branch.prompt?.trim()}>
                <Send size={12} />
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ────── EMPTY STATE ──────
function EmptyState({ mode }) {
  const examples = [
    "AI infrastructure capex is plateauing — what's the trade?",
    "Live events demand will outgrow consensus through 2027",
    "Find me 5 names long the physical-originals premium thesis",
    "Stress-test long Palantir at current multiple",
  ];
  return (
    <div style={styles.empty}>
      <div style={styles.emptyMark}>◈</div>
      <div style={styles.emptyTitle}>The room is quiet.</div>
      <div style={styles.emptySub}>
        Mode: <strong>{mode.toUpperCase()}</strong>. State your theme below to dispatch the team.
      </div>
      <div style={styles.examplesLabel}>TRY:</div>
      <div style={styles.examples}>
        {examples.map((ex, i) => <div key={i} style={styles.example}>"{ex}"</div>)}
      </div>
    </div>
  );
}

// ────── MESSAGE ──────
function Message({ message, onBranch, compact }) {
  const [expanded, setExpanded] = useState(true);

  if (message.type === 'branch-marker') {
    return (
      <div style={styles.branchMarker}>
        <GitFork size={11} style={{ color: AGENTS[message.agent]?.color }} />
        <span>{message.content}</span>
      </div>
    );
  }

  if (message.type === 'user') {
    return (
      <div style={styles.userMsg}>
        <div style={styles.userMsgLabel}>YOU</div>
        <div style={styles.userMsgContent}>{message.content}</div>
      </div>
    );
  }

  const agent = AGENTS[message.agent];
  const Icon = agent.icon;

  return (
    <div style={{
      ...styles.agentMsg,
      ...(message.isCritique ? styles.agentMsgCritique : {}),
      ...(message.isSynthesis ? styles.agentMsgSynth : {}),
      ...(message.fromBranch ? styles.agentMsgFromBranch : {}),
      borderLeftColor: agent.color,
    }}>
      <div style={styles.agentMsgHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.agentMsgHeaderLeft}>
          <Icon size={13} style={{ color: agent.color }} />
          <span style={{ ...styles.agentMsgName, color: agent.color }}>
            {agent.code} / {agent.name}
          </span>
          {message.isCritique && (
            <span style={styles.critiqueBadge}>critique of {AGENTS[message.critiqueOf]?.code}</span>
          )}
          {message.isSynthesis && <span style={styles.synthBadge}>synthesis</span>}
          {message.searched && (
            <span style={styles.searchBadge} title={`Used web search ${message.searchCount} time${message.searchCount > 1 ? 's' : ''}`}>
              <Globe size={9} /> {message.searchCount}
            </span>
          )}
          {message.fromBranch && <span style={styles.branchBadge}>branched</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {!message.loading && !message.isCritique && !compact && onBranch && (
            <button style={styles.branchIconBtn} onClick={(e) => { e.stopPropagation(); onBranch(message); }} title="Fork into a branch">
              <GitFork size={11} />
            </button>
          )}
          {!message.loading && (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        </div>
      </div>

      {expanded && (
        <div style={styles.agentMsgContent}>
          {message.loading ? (
            <div style={styles.loadingDots}>
              <Loader2 size={12} className="spin" style={{ color: agent.color }} />
              <span style={{ color: agent.color }}>thinking...</span>
            </div>
          ) : (
            <div style={styles.agentMsgText}>{message.content}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ────── STYLES ──────
const cssAnimations = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap');

* { box-sizing: border-box; }
body { margin: 0; }
input, textarea, select, button { font-family: 'JetBrains Mono', monospace; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #d4a574 !important; }
button:hover:not(:disabled) { filter: brightness(1.15); }
button:disabled { opacity: 0.4; cursor: not-allowed; }
::placeholder { color: #5a5a5a; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0e0d0a; }
::-webkit-scrollbar-thumb { background: #2a2620; }
::-webkit-scrollbar-thumb:hover { background: #3a342c; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
`;

const styles = {
  app: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    background: '#0e0d0a', color: '#e8e3d8',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(212, 165, 116, 0.04) 0%, transparent 40%)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px', borderBottom: '1px solid #1f1d18',
    background: 'rgba(14, 13, 10, 0.95)', flexShrink: 0, gap: 16,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  drawerBtn: {
    background: '#15130f', color: '#9a9080', border: '1px solid #2a2620',
    width: 32, height: 32, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoMark: { fontSize: 22, color: '#d4a574', fontFamily: "'Fraunces', serif", flexShrink: 0 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, letterSpacing: '0.02em',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400,
  },
  headerSub: { fontSize: 9, color: '#7a7568', letterSpacing: '0.15em', marginTop: 2 },
  nameInput: {
    background: '#15130f', color: '#e8e3d8', border: '1px solid #d4a574',
    padding: '6px 10px', fontSize: 14, fontFamily: "'Fraunces', serif",
    fontWeight: 600, minWidth: 280,
  },
  iconBtnSm: {
    background: 'transparent', color: '#9a9080', border: '1px solid #2a2620',
    width: 26, height: 26, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerRight: { display: 'flex', gap: 8, flexShrink: 0 },
  headerBtn: {
    background: '#15130f', color: '#9a9080', border: '1px solid #2a2620',
    padding: '7px 12px', fontSize: 10, letterSpacing: '0.15em', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' },
  drawerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)', zIndex: 100,
    animation: 'fadeIn 0.2s ease',
  },
  drawer: {
    width: 320, height: '100%', background: '#13110d',
    borderRight: '1px solid #2a2620', padding: 20,
    display: 'flex', flexDirection: 'column',
    animation: 'slideIn 0.25s ease',
  },
  drawerHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 11, color: '#d4a574', letterSpacing: '0.25em', fontWeight: 600,
  },
  newThesisBtn: {
    background: 'linear-gradient(135deg, #d4a574, #b8956a)',
    color: '#0e0d0a', border: 'none', padding: '10px 14px',
    fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginBottom: 16,
  },
  drawerList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 },
  drawerEmpty: {
    fontSize: 11, color: '#6a6558', textAlign: 'center', padding: 30,
    fontFamily: "'Fraunces', serif", fontStyle: 'italic',
  },
  thesisItem: {
    background: '#15130f', border: '1px solid #1f1d18',
    padding: '12px 14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    transition: 'all 0.15s',
  },
  thesisItemActive: {
    background: 'rgba(212, 165, 116, 0.08)', borderColor: '#d4a574',
  },
  thesisItemName: {
    fontSize: 12, color: '#e8e3d8', fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontFamily: "'Fraunces', serif",
  },
  thesisItemMeta: { fontSize: 9, color: '#6a6558', marginTop: 3, letterSpacing: '0.1em' },
  deleteBtn: {
    background: 'transparent', color: '#7a7568', border: 'none',
    width: 24, height: 24, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sidebar: {
    width: 260, flexShrink: 0,
    borderRight: '1px solid #1f1d18', background: '#100f0c',
    overflowY: 'auto', padding: 18,
  },
  sidebarSection: { marginBottom: 24 },
  sidebarLabel: {
    fontSize: 9, color: '#7a7568', letterSpacing: '0.2em',
    fontWeight: 600, marginBottom: 10,
  },
  modeToggle: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 8 },
  modeBtn: {
    background: '#15130f', color: '#7a7568', border: '1px solid #2a2620',
    padding: '7px 8px', fontSize: 10, letterSpacing: '0.1em',
    cursor: 'pointer', textTransform: 'uppercase',
  },
  modeBtnActive: {
    background: 'rgba(212, 165, 116, 0.1)', color: '#d4a574', borderColor: '#d4a574',
  },
  modeHint: {
    fontSize: 10, color: '#6a6558', lineHeight: 1.5,
    fontStyle: 'italic', fontFamily: "'Fraunces', serif",
    marginTop: 8,
  },
  select: {
    width: '100%', background: '#15130f', color: '#e8e3d8',
    border: '1px solid #2a2620', padding: '8px 10px', fontSize: 11,
  },
  agentGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  agentChip: {
    background: '#15130f', color: '#7a7568', border: '1px solid #2a2620',
    padding: '7px 9px', fontSize: 10,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
    transition: 'all 0.15s', textAlign: 'left',
  },
  agentChipActive: { background: 'rgba(212, 165, 116, 0.06)' },
  agentChipName: {
    fontSize: 9, color: 'inherit', opacity: 0.7,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  checkRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 11, color: '#c8bfae', cursor: 'pointer',
  },
  synthBtn: {
    width: '100%', background: 'linear-gradient(135deg, #d4a574, #b8956a)',
    color: '#0e0d0a', border: 'none', padding: '11px 14px',
    fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  messages: {
    flex: 1, overflowY: 'auto', padding: '20px 28px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 40, textAlign: 'center',
  },
  emptyMark: {
    fontSize: 56, color: '#d4a574', fontFamily: "'Fraunces', serif",
    opacity: 0.3, marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 500,
    fontStyle: 'italic', color: '#e8e3d8', marginBottom: 8,
  },
  emptySub: {
    fontSize: 12, color: '#9a9080', marginBottom: 32,
    fontFamily: "'Fraunces', serif",
  },
  examplesLabel: { fontSize: 9, color: '#7a7568', letterSpacing: '0.25em', marginBottom: 12 },
  examples: {
    display: 'flex', flexDirection: 'column', gap: 8,
    maxWidth: 500, width: '100%',
  },
  example: {
    background: '#15130f', border: '1px solid #1f1d18',
    padding: '10px 14px', fontSize: 11, color: '#c8bfae',
    fontFamily: "'Fraunces', serif", fontStyle: 'italic',
    textAlign: 'left',
  },
  userMsg: {
    background: 'rgba(212, 165, 116, 0.05)',
    border: '1px solid #2a2620', borderLeft: '3px solid #d4a574',
    padding: '12px 16px', alignSelf: 'flex-end', maxWidth: '75%',
    animation: 'fadeIn 0.3s ease',
  },
  userMsgLabel: {
    fontSize: 9, color: '#d4a574', letterSpacing: '0.25em',
    fontWeight: 600, marginBottom: 6,
  },
  userMsgContent: { fontSize: 13, color: '#e8e3d8', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  agentMsg: {
    background: '#13110d', border: '1px solid #1f1d18',
    borderLeft: '3px solid', padding: 0,
    animation: 'fadeIn 0.3s ease',
  },
  agentMsgCritique: { background: '#100f0c', marginLeft: 32, opacity: 0.92 },
  agentMsgSynth: {
    background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.08), transparent)',
    border: '1px solid #d4a57440', borderLeft: '3px solid #d4a574',
  },
  agentMsgFromBranch: {
    background: 'rgba(157, 132, 96, 0.04)',
    borderStyle: 'dashed',
  },
  agentMsgHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 14px', cursor: 'pointer',
    borderBottom: '1px dashed #1f1d18',
  },
  agentMsgHeaderLeft: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  agentMsgName: { fontSize: 10, letterSpacing: '0.2em', fontWeight: 600 },
  critiqueBadge: {
    fontSize: 9, color: '#c47a5a', background: 'rgba(196, 122, 90, 0.1)',
    padding: '2px 7px', letterSpacing: '0.1em',
    border: '1px solid #c47a5a40',
  },
  synthBadge: {
    fontSize: 9, color: '#0e0d0a', background: '#d4a574',
    padding: '2px 7px', letterSpacing: '0.15em', fontWeight: 700,
  },
  searchBadge: {
    fontSize: 9, color: '#7a8b9d', background: 'rgba(122, 139, 157, 0.1)',
    padding: '2px 6px', letterSpacing: '0.1em',
    border: '1px solid #7a8b9d40',
    display: 'flex', alignItems: 'center', gap: 3,
  },
  branchBadge: {
    fontSize: 9, color: '#9d8460', background: 'rgba(157, 132, 96, 0.1)',
    padding: '2px 7px', letterSpacing: '0.1em',
    border: '1px solid #9d846040',
  },
  branchIconBtn: {
    background: 'transparent', color: '#7a7568', border: 'none',
    width: 22, height: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  agentMsgContent: { padding: '12px 16px' },
  agentMsgText: {
    fontSize: 12, color: '#d8d2c3', lineHeight: 1.65,
    whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace",
  },
  loadingDots: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 11, fontStyle: 'italic',
    fontFamily: "'Fraunces', serif",
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  branchMarker: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 14px', fontSize: 10, color: '#9d8460',
    letterSpacing: '0.15em', fontStyle: 'italic',
    fontFamily: "'Fraunces', serif",
    borderTop: '1px dashed #2a2620', borderBottom: '1px dashed #2a2620',
    margin: '8px 0',
  },
  inputBar: {
    display: 'flex', gap: 8, padding: '14px 20px',
    borderTop: '1px solid #1f1d18',
    background: 'rgba(14, 13, 10, 0.95)', flexShrink: 0,
  },
  promptInput: {
    flex: 1, background: '#15130f', color: '#e8e3d8',
    border: '1px solid #2a2620', padding: '11px 13px',
    fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
    resize: 'none', minHeight: 48, maxHeight: 150,
    transition: 'border-color 0.2s',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #d4a574, #b8956a)',
    color: '#0e0d0a', border: 'none', padding: '0 20px',
    fontSize: 10, letterSpacing: '0.2em', fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
    flexShrink: 0,
  },
  branchPanel: {
    width: '50%', flexShrink: 0,
    borderLeft: '1px solid #2a2620',
    background: '#0e0d0a',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    animation: 'slideInRight 0.25s ease',
  },
  branchHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', borderBottom: '1px solid #1f1d18',
    background: 'rgba(20, 18, 14, 0.9)',
  },
  branchHeaderLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  branchTitle: { fontSize: 11, letterSpacing: '0.2em', fontWeight: 600 },
  branchSub: { fontSize: 10, color: '#7a7568', marginTop: 2, fontStyle: 'italic', fontFamily: "'Fraunces', serif" },
  branchSource: {
    padding: '12px 18px', borderBottom: '1px dashed #2a2620',
    background: 'rgba(20, 18, 14, 0.5)',
  },
  branchSourceLabel: {
    fontSize: 9, color: '#7a7568', letterSpacing: '0.2em', marginBottom: 6,
  },
  branchSourceContent: {
    fontSize: 11, color: '#9a9080', lineHeight: 1.5, fontStyle: 'italic',
    fontFamily: "'Fraunces', serif",
  },
  branchMessages: {
    flex: 1, overflowY: 'auto', padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  branchEmpty: {
    fontSize: 11, color: '#6a6558', textAlign: 'center', padding: 30,
    fontFamily: "'Fraunces', serif", fontStyle: 'italic',
  },
  branchInputBar: {
    display: 'flex', gap: 6, padding: '12px 18px',
    borderTop: '1px solid #1f1d18',
    background: 'rgba(14, 13, 10, 0.95)',
  },
  branchInput: {
    flex: 1, background: '#15130f', color: '#e8e3d8',
    border: '1px solid #2a2620', padding: '10px 12px',
    fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
    resize: 'none', minHeight: 42, maxHeight: 120,
  },
  branchSendBtn: {
    background: 'linear-gradient(135deg, #d4a574, #b8956a)',
    color: '#0e0d0a', border: 'none', width: 42,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
};
