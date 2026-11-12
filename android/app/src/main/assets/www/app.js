/**
 * Blossom Trade Journal - Premium Mobile Client Application Logic
 * Pure Vanilla JavaScript (ES6+) - 100% Offline Compatible
 */

const STORAGE_KEY = 'blossom_trade_journal_v3';
const LEGACY_KEYS = ['blossom_trade_journal_v2', 'blossom_trade_journal', 'tj'];

// Emotion tags & mistakes
const EMOTION_TAGS = ['Confident', 'Calm', 'Patient', 'Disciplined', 'Fearful', 'Anxious', 'Greedy', 'Frustrated'];
const SESSIONS = ['Sydney', 'Tokyo', 'London', 'New York'];
const MISTAKE_FLAGS = [
  ['fomo', 'FOMO entry?'],
  ['rev', 'Revenge trade?'],
  ['over', 'Overtraded?'],
  ['fear', 'Closed out of fear?']
];

// Initial state
const INITIAL_STATE = {
  set: { tg: 0, ml: 0, cur: 'USD', mt: 0 },
  goals: {
    overall: "• Build consistent discipline and protect trading capital.\n• Risk max 1% per trade with 1:2+ risk/reward ratio.\n• Become a consistently funded and profitable professional trader.",
    monthly: {}
  },
  rules: [
    { id: 'r1', t: 'do', x: 'Follow my strategy and wait for high-probability setups' },
    { id: 'r2', t: 'do', x: 'Always define and respect stop loss before entering' },
    { id: 'r3', t: 'dont', x: 'Never revenge trade after a loss' },
    { id: 'r4', t: 'dont', x: 'Never overtrade or exceed daily risk limit' }
  ],
  days: {},
  notes: [],
  th: 'dark'
};

let S = JSON.parse(JSON.stringify(INITIAL_STATE));
let activeTab = 'dash';
let currentDate = getTodayDate();
let currentMonth = getTodayDate().slice(0, 7);
let historySubtab = 'list'; // 'list' or 'cal'
let moreSubtab = 'rules'; // 'rules', 'notes', or 'set'
let historyFilters = { q: '', p: '', o: '' };
let quickTradeDraft = { side: 'Buy', fol: 'Yes' };
let editingGoals = { overall: false, monthly: false };

// Utility functions
function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function getTodayDate(d) {
  d = d || new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function formatNumber(num) {
  const n = Number(num) || 0;
  return (n < 0 ? '−' : '') + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getDayRecord(dateKey) {
  return (S.days[dateKey] ??= { trades: [], emo: {}, rv: {}, rc: {} });
}

// Day Summary Calculations
function calculateDaySummary(dateKey) {
  const d = S.days[dateKey] || {};
  const trades = d.trades || [];
  const settings = S.set;
  const profit = trades.reduce((acc, t) => acc + Math.max(+t.pl || 0, 0), 0);
  const loss = -trades.reduce((acc, t) => acc + Math.min(+t.pl || 0, 0), 0);
  const emo = d.emo || {};
  const ruleChecks = S.rules.map(r => d.rc?.[r.id]?.v).filter(v => v === '1' || v === '0');
  const planAdherence = ruleChecks.length ? Math.round(100 * ruleChecks.filter(v => v === '1').length / ruleChecks.length) : null;
  const mistakeCount = ['fomo', 'rev', 'over', 'fear'].filter(z => emo[z] === 'y').length;
  const lossBreached = settings.ml > 0 && loss > settings.ml;
  const maxTradesBreached = settings.mt > 0 && trades.length > settings.mt;
  const disciplineScore = (trades.length || ruleChecks.length || mistakeCount)
    ? Math.max(0, (planAdherence ?? 100) - 10 * mistakeCount - (lossBreached ? 20 : 0))
    : null;

  return {
    trades,
    n: trades.length,
    w: trades.filter(t => t.out === 'Win').length,
    l: trades.filter(t => t.out === 'Loss').length,
    b: trades.filter(t => t.out === 'Breakeven').length,
    pr: profit,
    lo: loss,
    net: profit - loss,
    ad: planAdherence,
    sc: disciplineScore,
    br: lossBreached,
    mx: maxTradesBreached
  };
}

// Monthly Summary Calculations
function calculateMonthSummary(yearMonth) {
  const dayKeys = Object.keys(S.days).filter(k => k.startsWith(yearMonth)).sort();
  const daySummaries = dayKeys.map(k => ({ k, ...calculateDaySummary(k) }));
  const tradingDays = daySummaries.filter(x => x.n > 0);
  const allTrades = daySummaries.flatMap(x => x.trades);

  const profitSum = daySummaries.reduce((acc, x) => acc + x.pr, 0);
  const lossSum = daySummaries.reduce((acc, x) => acc + x.lo, 0);
  const netSum = profitSum - lossSum;
  const winCount = allTrades.filter(t => t.out === 'Win').length;
  const scoredDays = daySummaries.filter(x => x.sc != null);

  return {
    n: allTrades.length,
    w: winCount,
    l: allTrades.filter(t => t.out === 'Loss').length,
    b: allTrades.filter(t => t.out === 'Breakeven').length,
    winRate: allTrades.length ? Math.round((winCount / allTrades.length) * 100) : 0,
    pr: profitSum,
    lo: lossSum,
    net: netSum,
    pd: tradingDays.filter(x => x.net > 0).length,
    ld: tradingDays.filter(x => x.net < 0).length,
    avg: tradingDays.length ? netSum / tradingDays.length : 0,
    disc: scoredDays.length ? Math.round(scoredDays.reduce((a, b) => a + b.sc, 0) / scoredDays.length) : null,
    tradingDays
  };
}

// SVG Curve Chart
function renderSvgChart(values) {
  const hasData = values.some(v => v !== 0);
  if (!values.length || !hasData) {
    return `<div style="text-align:center;padding:24px 10px;color:var(--tx-muted);font-size:13px">
      No trades recorded yet. Your 30-day equity curve will appear as you trade.
    </div>`;
  }
  const W = 320, H = 100;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const spread = (max - min) || 1;
  const getY = v => H - 10 - ((v - min) / spread) * (H - 20);
  const n = values.length;

  const points = values.map((v, i) => `${(i / (n - 1)) * (W - 20) + 10},${getY(v)}`).join(' ');
  const zeroY = getY(0);

  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
      <defs>
        <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fb7185" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#fb7185" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <line x1="10" x2="${W - 10}" y1="${zeroY}" y2="${zeroY}" stroke="var(--bd)" stroke-dasharray="3,3"/>
      <polygon points="10,${H} ${points} ${W - 10},${H}" fill="url(#chartGrad)"/>
      <polyline points="${points}" fill="none" stroke="#fb7185" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx-muted);margin-top:6px">
      <span>Low: ${formatNumber(min)}</span>
      <span>High: ${formatNumber(max)}</span>
    </div>
  `;
}

// Storage
function loadData() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const k of LEGACY_KEYS) {
        raw = localStorage.getItem(k);
        if (raw) break;
      }
    }
  } catch (e) {}

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      S = {
        ...INITIAL_STATE,
        ...parsed,
        set: { ...INITIAL_STATE.set, ...(parsed.set || {}) },
        goals: { ...INITIAL_STATE.goals, ...(parsed.goals || {}) },
        rules: parsed.rules?.length ? parsed.rules : INITIAL_STATE.rules,
        days: parsed.days || {},
        notes: parsed.notes || []
      };
    } catch (e) {
      S = JSON.parse(JSON.stringify(INITIAL_STATE));
    }
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  } catch (e) {}
}

// ------------------------------------------------------------------
// VIEW RENDERING: DASHBOARD
// ------------------------------------------------------------------
function renderDashboardView() {
  const summary = calculateDaySummary(currentDate);
  const monthSummary = calculateMonthSummary(currentMonth);
  const settings = S.set;
  const targetPct = settings.tg > 0 ? Math.min(100, Math.max(0, summary.net) / settings.tg * 100) : 0;
  const lossPct = settings.ml > 0 ? Math.min(100, summary.lo / settings.ml * 100) : 0;

  // 30-day cumulative trend
  const cumulativeValues = [];
  let running = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    running += calculateDaySummary(getTodayDate(d)).net;
    cumulativeValues.push(running);
  }

  const overallGoals = S.goals.overall || '';
  const currentMonthName = new Date(currentMonth + '-01T00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const monthlyGoal = S.goals.monthly[currentMonth] || '';

  return `
    <!-- Top Greeting & Quick Actions -->
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div>
        <h2 style="font-size:22px;font-weight:800;letter-spacing:-0.02em">Welcome back 👋</h2>
        <p style="font-size:13px;color:var(--tx-muted)">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
      </div>
      <button class="btn btn-primary" style="width:auto;padding:8px 14px;font-size:13px" onclick="openAddTradeModal()">
        ➕ Log Trade
      </button>
    </div>

    <!-- 1. General Overall Goals Card -->
    <div class="card card-glow">
      <div class="card-header">
        <div>
          <div class="card-title">🎯 My Overall Trading Goals</div>
          <div class="card-subtitle">Your core vision, principles & targets</div>
        </div>
        <button class="card-action-btn" onclick="toggleEditGoal('overall')">
          ${editingGoals.overall ? '💾 Save' : '✏️ Edit'}
        </button>
      </div>

      <div class="goal-box">
        <div class="goal-header-row">
          <span class="goal-tag">Long-Term Vision</span>
        </div>
        ${editingGoals.overall ? `
          <textarea id="overallGoalInput" class="goal-edit-area" rows="3" placeholder="Enter your overall trading goals (e.g. risk rules, target funding, discipline mindset)...">${escapeHtml(overallGoals)}</textarea>
        ` : `
          <div class="goal-text">${overallGoals ? escapeHtml(overallGoals) : '<span class="goal-empty-text">No overall trading goals set yet. Tap Edit to write down what you want to achieve!</span>'}</div>
        `}
      </div>
    </div>

    <!-- 2. Monthly Trading Goals Card -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">📅 ${currentMonthName} Goals</div>
          <div class="card-subtitle">Focus & objectives for this month</div>
        </div>
        <button class="card-action-btn" onclick="toggleEditGoal('monthly')">
          ${editingGoals.monthly ? '💾 Save' : '✏️ Edit'}
        </button>
      </div>

      <div class="goal-box">
        <div class="goal-header-row">
          <span class="goal-tag" style="background:var(--g-bg);color:var(--g)">Monthly Focus</span>
          <span style="font-size:12px;color:var(--tx-muted)">${monthSummary.n} trades logged</span>
        </div>
        ${editingGoals.monthly ? `
          <textarea id="monthlyGoalInput" class="goal-edit-area" rows="2" placeholder="What are your primary goals for ${currentMonthName}? (e.g. Target profit, 80%+ plan adherence, zero FOMO)...">${escapeHtml(monthlyGoal)}</textarea>
        ` : `
          <div class="goal-text">${monthlyGoal ? escapeHtml(monthlyGoal) : `<span class="goal-empty-text">Set your targets for ${currentMonthName} to stay disciplined. Tap Edit above.</span>`}</div>
        `}
      </div>
    </div>

    <!-- 3. Today's Performance Snapshot -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">⚡ Today's Performance</div>
          <div class="card-subtitle">Real-time daily trade tracking</div>
        </div>
        <span class="goal-tag" style="background:var(--in);color:var(--tx-muted)">${summary.n} Trade${summary.n === 1 ? '' : 's'}</span>
      </div>

      <div style="text-align:center;padding:12px 0">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--tx-muted);font-weight:700">Net Profit / Loss</div>
        <div style="font-size:36px;font-weight:800;letter-spacing:-0.03em" class="${summary.net < 0 ? 'neg' : summary.net > 0 ? 'pos' : ''}">
          ${formatNumber(summary.net)} <span style="font-size:18px;font-weight:600">${escapeHtml(settings.cur)}</span>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Wins / Losses</span>
          <span class="kpi-val"><span class="pos">${summary.w}W</span> · <span class="neg">${summary.l}L</span></span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Discipline Score</span>
          <span class="kpi-val">${summary.sc == null ? '–' : summary.sc + '<span style="font-size:14px;color:var(--tx-muted)">/100</span>'}</span>
        </div>
      </div>

      <!-- Risk Limits Progress -->
      <div class="progress-wrap" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600">
          <span>Profit Target (${settings.tg > 0 ? formatNumber(settings.tg) : 'Not set'})</span>
          <span>${settings.tg > 0 ? targetPct.toFixed(0) + '%' : '–'}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill green" style="width:${targetPct}%"></div>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-top:10px">
          <span>Loss Limit (${settings.ml > 0 ? formatNumber(settings.ml) : 'Not set'})</span>
          <span class="${summary.br ? 'neg' : ''}">${summary.br ? '⚠️ BREACHED' : 'Respected ✓'}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill red" style="width:${lossPct}%"></div>
        </div>
      </div>
    </div>

    <!-- 4. 30-Day Cumulative Chart Card -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">📈 30-Day Equity Curve</div>
          <div class="card-subtitle">Cumulative account growth</div>
        </div>
      </div>
      ${renderSvgChart(cumulativeValues)}
    </div>
  `;
}

// ------------------------------------------------------------------
// VIEW RENDERING: DAILY JOURNAL
// ------------------------------------------------------------------
function renderJournalView() {
  const dateKey = currentDate;
  const day = getDayRecord(dateKey);
  const trades = day.trades || [];
  const summary = calculateDaySummary(dateKey);
  const settings = S.set;
  const isToday = dateKey === getTodayDate();

  return `
    <!-- Date Header Switcher -->
    <div class="card" style="padding:12px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button class="icon-btn" onclick="shiftDate(-1)">‹</button>
        <div style="text-align:center">
          <div style="font-weight:700;font-size:16px">${isToday ? 'Today, ' : ''}${new Date(dateKey + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <input type="date" value="${dateKey}" onchange="changeDate(this.value)" style="border:none;background:transparent;font-size:11px;color:var(--tx-muted);text-align:center;padding:0;cursor:pointer">
        </div>
        <button class="icon-btn" onclick="shiftDate(1)">›</button>
      </div>
    </div>

    <!-- Today's Trades List -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">📋 Trades Logged (${trades.length})</div>
          <div class="card-subtitle">Net: <b class="${summary.net < 0 ? 'neg' : summary.net > 0 ? 'pos' : ''}">${formatNumber(summary.net)} ${escapeHtml(settings.cur)}</b></div>
        </div>
        <button class="btn btn-primary" style="width:auto;padding:6px 12px;font-size:12px" onclick="openAddTradeModal()">
          + Add Trade
        </button>
      </div>

      ${trades.length > 0 ? trades.map((t, i) => `
        <div class="trade-card">
          <div class="trade-left">
            <div class="trade-pair">
              ${escapeHtml(t.p)}
              <span class="trade-side-badge ${t.s === 'Buy' ? 'side-buy' : 'side-sell'}">${t.s}</span>
            </div>
            <div style="font-size:12px;color:var(--tx-muted)">
              ${t.pips ? escapeHtml(t.pips) + ' pips · ' : ''}${t.fol ? 'Plan: ' + t.fol : ''}
            </div>
            ${t.why ? `<div style="font-size:12px;color:var(--tx);margin-top:2px;font-style:italic">"${escapeHtml(t.why)}"</div>` : ''}
          </div>
          <div class="trade-right">
            <span class="trade-pl ${t.pl < 0 ? 'neg' : t.pl > 0 ? 'pos' : ''}">${formatNumber(+t.pl)}</span>
            <button style="background:transparent;border:none;color:var(--tx-dim);cursor:pointer;font-size:14px;padding:4px" onclick="deleteTrade(${i})" title="Delete trade">🗑️</button>
          </div>
        </div>
      `).join('') : `
        <div style="text-align:center;padding:24px 10px;color:var(--tx-muted);font-size:13.5px">
          No trades logged for this date yet. Tap <b>+ Add Trade</b> above or use the center button below to log your trade!
        </div>
      `}
    </div>

    <!-- Sessions & Notes -->
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">☀️ Sessions & Observations</div>
      <label>Sessions Traded</label>
      <div class="btn-pill-group">
        ${SESSIONS.map(s => {
          const active = (day.sess || []).includes(s);
          return `<button class="pill-btn ${active ? 'active' : ''}" onclick="toggleSession('${s}')">${s}</button>`;
        }).join('')}
      </div>

      <label style="margin-top:12px">Market Context & Observations</label>
      <textarea rows="2" placeholder="Key news, volatility, market sentiment..." onchange="updateDayField('obs', this.value)">${escapeHtml(day.obs || '')}</textarea>
    </div>

    <!-- Psychology & Rule Checks -->
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">🧠 Emotional State & Discipline</div>
      <label>How did you feel today?</label>
      <div class="btn-pill-group">
        ${EMOTION_TAGS.map(tag => {
          const active = (day.emo?.tags || []).includes(tag);
          return `<button class="pill-btn ${active ? 'active' : ''}" onclick="toggleEmotionTag('${tag}')">${tag}</button>`;
        }).join('')}
      </div>

      <label style="margin-top:14px">Psychological Checklist</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${MISTAKE_FLAGS.map(([key, label]) => {
          const val = day.emo?.[key] || 'n';
          const isYes = val === 'y';
          return `
            <button class="pill-btn ${isYes ? 'active' : ''}" style="${isYes ? 'background:var(--r);border-color:var(--r)' : ''}" onclick="toggleMistake('${key}')">
              ${isYes ? '⚠️ ' : ''}${label}
            </button>
          `;
        }).join('')}
      </div>

      ${S.rules.length > 0 ? `
        <label style="margin-top:16px">Trading Rules Checklist</label>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${S.rules.map(r => {
            const status = day.rc?.[r.id]?.v || '';
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;background:var(--in);padding:8px 12px;border-radius:8px">
                <span style="font-size:13px">${r.t === 'do' ? '✅' : '⛔'} ${escapeHtml(r.x)}</span>
                <select style="width:auto;padding:4px 8px;font-size:12px" onchange="setRuleCheck('${r.id}', this.value)">
                  <option value="" ${status === '' ? 'selected' : ''}>–</option>
                  <option value="1" ${status === '1' ? 'selected' : ''}>Followed ✓</option>
                  <option value="0" ${status === '0' ? 'selected' : ''}>Broke ✗</option>
                </select>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>

    <!-- Daily Reflection -->
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">📝 End-of-Day Review</div>
      <label>What went well? What can I improve tomorrow?</label>
      <textarea rows="3" placeholder="Key takeaways and lesson of the day..." onchange="updateDayField('rv.text', this.value)">${escapeHtml(day.rv?.text || '')}</textarea>
    </div>
  `;
}

// ------------------------------------------------------------------
// VIEW RENDERING: HISTORY & CALENDAR
// ------------------------------------------------------------------
function renderHistoryView() {
  const allDays = Object.keys(S.days).sort().reverse();
  const allTrades = [];
  allDays.forEach(date => {
    (S.days[date].trades || []).forEach(t => allTrades.push({ date, ...t }));
  });

  const query = (historyFilters.q || '').toLowerCase();
  const pair = (historyFilters.p || '').toUpperCase();
  const filtered = allTrades.filter(t => {
    if (query && !(t.p + ' ' + (t.why || '')).toLowerCase().includes(query)) return false;
    if (pair && !t.p.includes(pair)) return false;
    if (historyFilters.o && t.out !== historyFilters.o) return false;
    return true;
  });

  return `
    <div class="subtabs">
      <button class="subtab-btn ${historySubtab === 'list' ? 'active' : ''}" onclick="setHistorySubtab('list')">
        📜 Trade List (${filtered.length})
      </button>
      <button class="subtab-btn ${historySubtab === 'cal' ? 'active' : ''}" onclick="setHistorySubtab('cal')">
        📅 Calendar Heatmap
      </button>
    </div>

    ${historySubtab === 'list' ? `
      <!-- Search & Filters -->
      <div class="card" style="padding:14px 16px">
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">
          <input type="text" placeholder="Search pairs or notes..." value="${escapeHtml(historyFilters.q)}" oninput="historyFilters.q = this.value; render()">
          <select onchange="historyFilters.o = this.value; render()">
            <option value="" ${!historyFilters.o ? 'selected' : ''}>All</option>
            <option value="Win" ${historyFilters.o === 'Win' ? 'selected' : ''}>Wins</option>
            <option value="Loss" ${historyFilters.o === 'Loss' ? 'selected' : ''}>Losses</option>
          </select>
        </div>
      </div>

      <!-- Trade Cards -->
      <div class="card">
        ${filtered.length > 0 ? filtered.map((t, idx) => `
          <div class="trade-card" onclick="openDayJournal('${t.date}')" style="cursor:pointer">
            <div class="trade-left">
              <div class="trade-pair">
                ${escapeHtml(t.p)}
                <span class="trade-side-badge ${t.s === 'Buy' ? 'side-buy' : 'side-sell'}">${t.s}</span>
              </div>
              <div style="font-size:12px;color:var(--tx-muted)">
                ${t.date} · ${t.pips ? escapeHtml(t.pips) + ' pips' : 'Plan: ' + (t.fol || 'Yes')}
              </div>
              ${t.why ? `<div style="font-size:12px;color:var(--tx-muted);font-style:italic">"${escapeHtml(t.why)}"</div>` : ''}
            </div>
            <div class="trade-right">
              <span class="trade-pl ${t.pl < 0 ? 'neg' : t.pl > 0 ? 'pos' : ''}">${formatNumber(+t.pl)}</span>
              <span style="font-size:11px;color:var(--tx-muted)">${t.out}</span>
            </div>
          </div>
        `).join('') : `
          <div style="text-align:center;padding:30px 10px;color:var(--tx-muted);font-size:13.5px">
            No trades match your search criteria.
          </div>
        `}
      </div>
    ` : `
      <!-- Calendar View -->
      ${renderCalendarGrid()}
    `}
  `;
}

function renderCalendarGrid() {
  const [year, month] = currentMonth.split('-').map(Number);
  const totalDays = new Date(year, month, 0).getDate();
  const startDay = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const monthName = new Date(currentMonth + '-01T00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayStr = getTodayDate();

  let daysHtml = '';
  for (let i = 0; i < startDay; i++) {
    daysHtml += `<div style="opacity:0.2;padding:4px"></div>`;
  }

  for (let d = 1; d <= totalDays; d++) {
    const dStr = currentMonth + '-' + String(d).padStart(2, '0');
    const summary = calculateDaySummary(dStr);
    const hasTrades = summary.n > 0;
    const isWin = summary.net > 0;
    const isLoss = summary.net < 0;
    const isToday = dStr === todayStr;

    daysHtml += `
      <div class="cal-day ${isWin ? 'w' : isLoss ? 'l' : ''} ${isToday ? 'today' : ''}" onclick="openDayJournal('${dStr}')">
        <span style="font-weight:700">${d}</span>
        ${hasTrades ? `<span style="font-size:10px;font-weight:800;color:var(--${isWin ? 'g' : isLoss ? 'r' : 'tx-muted'})">${formatNumber(summary.net)}</span>` : ''}
      </div>
    `;
  }

  return `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <button class="icon-btn" onclick="shiftMonth(-1)">‹</button>
        <h3 style="font-size:16px;font-weight:700">${monthName}</h3>
        <button class="icon-btn" onclick="shiftMonth(1)">›</button>
      </div>

      <div class="cal-grid" style="margin-bottom:8px">
        ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => `<div style="text-align:center;font-size:11px;font-weight:700;color:var(--tx-muted);padding-bottom:4px">${day}</div>`).join('')}
        ${daysHtml}
      </div>
      <div style="font-size:11.5px;color:var(--tx-muted);text-align:center;margin-top:10px">
        🟢 Profitable Day · 🔴 Losing Day · Tap any date to view journal
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------
// VIEW RENDERING: MORE / SETTINGS / RULES
// ------------------------------------------------------------------
function renderMoreView() {
  const settings = S.set;
  return `
    <div class="subtabs">
      <button class="subtab-btn ${moreSubtab === 'rules' ? 'active' : ''}" onclick="setMoreSubtab('rules')">
        ✔ Rules
      </button>
      <button class="subtab-btn ${moreSubtab === 'notes' ? 'active' : ''}" onclick="setMoreSubtab('notes')">
        ✐ Notes
      </button>
      <button class="subtab-btn ${moreSubtab === 'set' ? 'active' : ''}" onclick="setMoreSubtab('set')">
        ⚙ Settings
      </button>
    </div>

    ${moreSubtab === 'rules' ? `
      <!-- Trading Rules Management -->
      <div class="card">
        <div class="card-title">✅ Things I MUST DO</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
          ${S.rules.filter(r => r.t === 'do').map(r => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--in);padding:10px 12px;border-radius:10px">
              <span style="font-size:13.5px;font-weight:600">${escapeHtml(r.x)}</span>
              <button style="background:transparent;border:none;color:var(--tx-dim);cursor:pointer;font-size:14px" onclick="deleteRule('${r.id}')">✕</button>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <input id="newDoRuleInput" placeholder="Add a 'Must Do' rule...">
          <button class="btn btn-primary" style="width:auto;padding:8px 14px" onclick="addRule('do')">Add</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">⛔ Things I MUST NOT DO</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
          ${S.rules.filter(r => r.t === 'dont').map(r => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--in);padding:10px 12px;border-radius:10px">
              <span style="font-size:13.5px;font-weight:600">${escapeHtml(r.x)}</span>
              <button style="background:transparent;border:none;color:var(--tx-dim);cursor:pointer;font-size:14px" onclick="deleteRule('${r.id}')">✕</button>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <input id="newDontRuleInput" placeholder="Add a 'Must Not Do' rule...">
          <button class="btn btn-primary" style="width:auto;padding:8px 14px" onclick="addRule('dont')">Add</button>
        </div>
      </div>
    ` : moreSubtab === 'notes' ? `
      <!-- Notes Section -->
      <div class="card">
        <div class="card-title">✍️ New Lesson or Note</div>
        <input id="noteTitleInput" placeholder="Note Title (e.g. London Open Strategy)" style="margin-top:8px">
        <textarea id="noteBodyInput" rows="3" placeholder="Key trading insight, reminder, mistake learned..." style="margin-top:8px"></textarea>
        <button class="btn btn-primary" style="margin-top:10px" onclick="addNote()">Save Note</button>
      </div>

      <div class="card">
        <div class="card-title">📚 Saved Notes (${S.notes.length})</div>
        ${S.notes.length > 0 ? S.notes.map(n => `
          <div style="background:var(--card-elevated);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin-top:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <b style="font-size:14px">${escapeHtml(n.t)}</b>
              <button style="background:transparent;border:none;color:var(--tx-dim);cursor:pointer" onclick="deleteNote('${n.id}')">✕</button>
            </div>
            <p style="font-size:13px;color:var(--tx);margin:6px 0">${escapeHtml(n.x)}</p>
            <span style="font-size:11px;color:var(--tx-muted)">${n.d}</span>
          </div>
        `).join('') : '<p style="color:var(--tx-muted);font-size:13px;margin-top:10px">No notes saved yet.</p>'}
      </div>
    ` : `
      <!-- Settings Section -->
      <div class="card">
        <div class="card-title">⚙️ Risk & Trading Limits</div>
        <label>Daily Profit Target ($)</label>
        <input type="number" value="${settings.tg || ''}" placeholder="100" onchange="S.set.tg = +this.value || 0; saveData();">

        <label>Daily Loss Limit ($)</label>
        <input type="number" value="${settings.ml || ''}" placeholder="50" onchange="S.set.ml = +this.value || 0; saveData();">

        <label>Preferred Currency Symbol</label>
        <input type="text" value="${escapeHtml(settings.cur || 'USD')}" onchange="S.set.cur = this.value.toUpperCase(); saveData();">

        <label>Max Trades Per Day (0 = Unlimited)</label>
        <input type="number" value="${settings.mt || ''}" placeholder="5" onchange="S.set.mt = +this.value || 0; saveData();">
      </div>

      <div class="card">
        <div class="card-title">💾 Backup & Data Management</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
          <button class="btn btn-secondary" onclick="exportTradesCSV()">📥 Export Trades as CSV</button>
          <button class="btn btn-secondary" onclick="exportJournalCSV()">📥 Export Journal as CSV</button>
          <button class="btn btn-secondary" style="color:var(--r);border-color:var(--r-bg)" onclick="resetAllData()">⚠️ Clear All Data</button>
        </div>
      </div>
    `}
  `;
}

// ------------------------------------------------------------------
// MASTER RENDER
// ------------------------------------------------------------------
function render() {
  document.documentElement.dataset.theme = S.th || 'dark';

  // Update navigation active state
  document.querySelectorAll('.app-bottom-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === activeTab);
  });

  const main = $('#main-content');
  if (!main) return;

  if (activeTab === 'dash') {
    main.innerHTML = renderDashboardView();
  } else if (activeTab === 'jr') {
    main.innerHTML = renderJournalView();
  } else if (activeTab === 'hist') {
    main.innerHTML = renderHistoryView();
  } else if (activeTab === 'more') {
    main.innerHTML = renderMoreView();
  }
}

// ------------------------------------------------------------------
// USER ACTIONS & HANDLERS
// ------------------------------------------------------------------
window.switchTab = function(tab) {
  activeTab = tab;
  render();
  window.scrollTo(0, 0);
};

window.shiftDate = function(days) {
  const d = new Date(currentDate + 'T00:00');
  d.setDate(d.getDate() + days);
  currentDate = getTodayDate(d);
  render();
};

window.changeDate = function(newDate) {
  if (newDate) {
    currentDate = newDate;
    render();
  }
};

window.openDayJournal = function(dateStr) {
  currentDate = dateStr;
  activeTab = 'jr';
  render();
  window.scrollTo(0, 0);
};

window.shiftMonth = function(delta) {
  const [y, m] = currentMonth.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  currentMonth = getTodayDate(dt).slice(0, 7);
  render();
};

window.setHistorySubtab = function(tab) {
  historySubtab = tab;
  render();
};

window.setMoreSubtab = function(tab) {
  moreSubtab = tab;
  render();
};

// Goals Handlers
window.toggleEditGoal = function(type) {
  if (editingGoals[type]) {
    // Save
    if (type === 'overall') {
      const input = $('#overallGoalInput');
      if (input) S.goals.overall = input.value.trim();
    } else if (type === 'monthly') {
      const input = $('#monthlyGoalInput');
      if (input) S.goals.monthly[currentMonth] = input.value.trim();
    }
    saveData();
    editingGoals[type] = false;
  } else {
    editingGoals[type] = true;
  }
  render();
};

// Trade Handlers
window.openAddTradeModal = function() {
  const modal = $('#addTradeModal');
  if (modal) {
    modal.classList.add('open');
    $('#qtPair').focus();
  }
};

window.closeAddTradeModal = function() {
  const modal = $('#addTradeModal');
  if (modal) modal.classList.remove('open');
};

window.deleteTrade = function(idx) {
  const trades = getDayRecord(currentDate).trades;
  trades.splice(idx, 1);
  saveData();
  render();
};

window.toggleSession = function(sess) {
  const d = getDayRecord(currentDate);
  d.sess = d.sess || [];
  const idx = d.sess.indexOf(sess);
  if (idx < 0) d.sess.push(sess);
  else d.sess.splice(idx, 1);
  saveData();
  render();
};

window.toggleEmotionTag = function(tag) {
  const d = getDayRecord(currentDate);
  d.emo = d.emo || {};
  d.emo.tags = d.emo.tags || [];
  const idx = d.emo.tags.indexOf(tag);
  if (idx < 0) d.emo.tags.push(tag);
  else d.emo.tags.splice(idx, 1);
  saveData();
  render();
};

window.toggleMistake = function(key) {
  const d = getDayRecord(currentDate);
  d.emo = d.emo || {};
  d.emo[key] = d.emo[key] === 'y' ? 'n' : 'y';
  saveData();
  render();
};

window.setRuleCheck = function(ruleId, val) {
  const d = getDayRecord(currentDate);
  d.rc = d.rc || {};
  d.rc[ruleId] = { v: val };
  saveData();
  render();
};

window.updateDayField = function(field, val) {
  const d = getDayRecord(currentDate);
  if (field === 'obs') d.obs = val;
  else if (field === 'rv.text') {
    d.rv = d.rv || {};
    d.rv.text = val;
  }
  saveData();
};

window.addRule = function(type) {
  const input = type === 'do' ? $('#newDoRuleInput') : $('#newDontRuleInput');
  const txt = input ? input.value.trim() : '';
  if (txt) {
    S.rules.push({ id: 'r_' + Date.now().toString(36), t: type, x: txt });
    saveData();
    render();
  }
};

window.deleteRule = function(id) {
  S.rules = S.rules.filter(r => r.id !== id);
  saveData();
  render();
};

window.addNote = function() {
  const title = $('#noteTitleInput')?.value.trim();
  const body = $('#noteBodyInput')?.value.trim();
  if (title || body) {
    S.notes.unshift({ id: 'n_' + Date.now(), t: title || 'Trading Note', x: body, d: getTodayDate() });
    saveData();
    render();
  }
};

window.deleteNote = function(id) {
  S.notes = S.notes.filter(n => n.id !== id);
  saveData();
  render();
};

window.exportTradesCSV = function() {
  const rows = [['Date', 'Pair', 'Side', 'Outcome', 'P/L', 'Pips', 'Strategy_Followed', 'Notes']];
  Object.keys(S.days).sort().forEach(date => {
    (S.days[date].trades || []).forEach(t => {
      rows.push([date, t.p, t.s, t.out, t.pl, t.pips || '', t.fol || '', t.why || '']);
    });
  });
  downloadCsv(rows, 'blossom_trades.csv');
};

window.exportJournalCSV = function() {
  const rows = [['Date', 'Trades_Count', 'Net_PL', 'Sessions', 'Observations', 'Review']];
  Object.keys(S.days).sort().forEach(date => {
    const d = S.days[date];
    const sum = calculateDaySummary(date);
    rows.push([date, sum.n, sum.net, (d.sess || []).join('; '), d.obs || '', d.rv?.text || '']);
  });
  downloadCsv(rows, 'blossom_journal.csv');
};

function downloadCsv(data, filename) {
  const csvContent = data.map(r => r.map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

window.resetAllData = function() {
  if (confirm('Clear all trades, goals, and journal records? This cannot be undone.')) {
    S = JSON.parse(JSON.stringify(INITIAL_STATE));
    saveData();
    render();
  }
};

// ------------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------------
function init() {
  loadData();

  // Bottom Navigation Delegation
  document.querySelectorAll('.app-bottom-nav .nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const tab = el.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // Theme Toggle Button
  const themeBtn = $('#themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      S.th = S.th === 'light' ? 'dark' : 'light';
      saveData();
      render();
    });
  }

  // Quick Trade Modal
  const openFabBtn = $('#openAddTradeModalBtn');
  if (openFabBtn) openFabBtn.addEventListener('click', openAddTradeModal);

  const closeBtn = $('#closeAddTradeModalBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeAddTradeModal);

  // Quick Trade Side / Followed Pills
  $('#qtSidePills')?.addEventListener('click', e => {
    const btn = e.target.closest('.pill-btn');
    if (btn) {
      document.querySelectorAll('#qtSidePills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      quickTradeDraft.side = btn.dataset.val;
    }
  });

  $('#qtFollowedPills')?.addEventListener('click', e => {
    const btn = e.target.closest('.pill-btn');
    if (btn) {
      document.querySelectorAll('#qtFollowedPills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      quickTradeDraft.fol = btn.dataset.val;
    }
  });

  // Quick Trade Submit
  const form = $('#quickTradeForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const pair = $('#qtPair').value.trim().toUpperCase();
      const amount = Math.abs(+$('#qtAmount').value || 0);
      const outcome = $('#qtOutcome').value;
      const pips = $('#qtPips').value.trim();
      const why = $('#qtWhy').value.trim();

      if (!pair) return;

      const newTrade = {
        id: 'tr_' + Date.now().toString(36),
        p: pair,
        s: quickTradeDraft.side || 'Buy',
        out: outcome,
        pl: outcome === 'Win' ? amount : outcome === 'Loss' ? -amount : 0,
        pips: pips,
        fol: quickTradeDraft.fol || 'Yes',
        why: why
      };

      getDayRecord(currentDate).trades.push(newTrade);
      saveData();

      // Reset form
      $('#qtPair').value = '';
      $('#qtAmount').value = '';
      $('#qtPips').value = '';
      $('#qtWhy').value = '';
      closeAddTradeModal();

      render();
    });
  }

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
