/**
 * Blossom Trade Journal - Client-Side Data & UI Application Logic
 * Pure Vanilla JavaScript (ES6+) - Clean & Empty State Ready for User Input
 */

const STORAGE_KEY = 'blossom_trade_journal_v2';
const LEGACY_STORAGE_KEYS = ['blossom_trade_journal', 'tj'];

// Emotion tags & mistakes
const NEGATIVE_EMOTIONS = ['Fearful', 'Anxious', 'Greedy', 'Frustrated'];
const EMOTION_TAGS = ['Confident', 'Calm', 'Patient', 'Disciplined', ...NEGATIVE_EMOTIONS];
const SESSIONS = ['Sydney', 'Tokyo', 'London', 'New York'];
const NOTE_CATEGORIES = ['General', 'Lesson', 'Reminder', 'Strategy'];
const MISTAKE_FLAGS = [
  ['fomo', 'Did I experience FOMO?'],
  ['rev', 'Did I revenge trade?'],
  ['over', 'Did I overtrade?'],
  ['fear', 'Did I close a trade out of fear?'],
  ['plan', 'Did I follow my plan despite my emotions?']
];
const MISTAKE_LABELS = {
  fomo: 'FOMO entries',
  rev: 'Revenge trading',
  over: 'Overtrading',
  fear: 'Closing out of fear'
};

const NAVIGATION_ITEMS = [
  ['dash', '▦ Dashboard'],
  ['jr', '✎ Daily Journal'],
  ['hist', '☰ Trade History'],
  ['rules', '✔ Trading Rules'],
  ['cal', '▤ Calendar'],
  ['an', '◔ Monthly Analytics'],
  ['gr', '↗ Trading Growth'],
  ['notes', '✐ Notes'],
  ['set', '⚙ Settings']
];

// Clean initial application state - empty like a brand new app
const INITIAL_EMPTY_STATE = {
  set: { tg: 0, ml: 0, cur: 'USD', mt: 0 },
  rules: [],
  days: {},
  notes: [],
  th: 'dark'
};

let S = JSON.parse(JSON.stringify(INITIAL_EMPTY_STATE));
let currentView = 'dash';
let currentDate = getTodayDateString();
let currentMonth = getTodayDateString().slice(0, 7);
let filters = {};
let tradeDraft = {};
let saveTimeout = null;

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

function getTodayDateString(d) {
  d = d || new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function formatNumber(num) {
  const n = Number(num) || 0;
  return (n < 0 ? '−' : '') + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getNestedProp(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? '';
}

function setNestedProp(obj, path, val) {
  const parts = path.split('.');
  const last = parts.pop();
  for (const part of parts) {
    obj = obj[part] ??= {};
  }
  obj[last] = val;
}

function showStatus(text) {
  const el = $('#st');
  if (el) el.textContent = text;
}

function getDayRecord(dateKey) {
  const d = S.days[dateKey] ??= { trades: [], emo: {}, rv: {}, rc: {} };
  return d;
}

// Day Statistics Calculation
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
  const hasActivity = trades.length || ruleChecks.length || mistakeCount;
  const maxTradesBreached = settings.mt > 0 && trades.length > settings.mt;
  const disciplineScore = hasActivity ? Math.max(0, (planAdherence ?? 100) - 10 * mistakeCount - (lossBreached ? 20 : 0)) : null;

  return {
    d,
    trades,
    n: trades.length,
    w: trades.filter(t => t.out === 'Win').length,
    l: trades.filter(t => t.out === 'Loss').length,
    b: trades.filter(t => t.out === 'Breakeven').length,
    pr: profit,
    lo: loss,
    net: profit - loss,
    ad: planAdherence,
    fl: mistakeCount,
    br: lossBreached,
    mx: maxTradesBreached,
    sc: disciplineScore
  };
}

// Monthly Statistics Calculation
function calculateMonthSummary(yearMonth) {
  const daysInMonth = Object.keys(S.days)
    .filter(k => k.startsWith(yearMonth))
    .sort()
    .map(k => ({ k, ...calculateDaySummary(k) }));

  const tradingDays = daysInMonth.filter(x => x.n > 0);
  const allTrades = daysInMonth.flatMap(x => x.trades);
  const countByOutcome = outcome => allTrades.filter(t => t.out === outcome).length;

  const countOccurrences = arr => {
    const counts = {};
    arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const percentage = (a, b) => b ? Math.round(100 * a / b) : null;
  const sumMetric = key => daysInMonth.reduce((acc, x) => acc + x[key], 0);
  const scoredDays = daysInMonth.filter(x => x.sc != null);
  const getEmo = x => x.d.emo || {};

  const [year, month] = yearMonth.split('-').map(Number);
  let weekdaysCount = 0;
  for (let i = 1, daysCount = new Date(year, month, 0).getDate(); i <= daysCount; i++) {
    const dt = new Date(year, month - 1, i);
    if (dt <= new Date() && dt.getDay() % 6 !== 0) weekdaysCount++;
  }

  const profitSum = sumMetric('pr');
  const lossSum = sumMetric('lo');
  const netSum = sumMetric('net');

  return {
    daysInMonth,
    tradingDays,
    n: allTrades.length,
    w: countByOutcome('Win'),
    l: countByOutcome('Loss'),
    b: countByOutcome('Breakeven'),
    pr: profitSum,
    lo: lossSum,
    net: netSum,
    pd: tradingDays.filter(x => x.net > 0).length,
    ld: tradingDays.filter(x => x.net < 0).length,
    best: tradingDays.length ? tradingDays.reduce((a, b) => b.net > a.net ? b : a) : null,
    worst: tradingDays.length ? tradingDays.reduce((a, b) => b.net < a.net ? b : a) : null,
    avg: tradingDays.length ? netSum / tradingDays.length : 0,
    plan: daysInMonth.filter(x => x.ad >= 80).length,
    pa: daysInMonth.filter(x => x.ad != null).length,
    disc: scoredDays.length ? Math.round(scoredDays.reduce((acc, x) => acc + x.sc, 0) / scoredDays.length) : null,
    emo: countOccurrences(daysInMonth.flatMap(x => getEmo(x).tags || [])),
    mis: countOccurrences([
      ...daysInMonth.flatMap(x => ['fomo', 'rev', 'over', 'fear'].filter(z => getEmo(x)[z] === 'y').map(z => MISTAKE_LABELS[z])),
      ...daysInMonth.flatMap(x => S.rules.filter(r => x.d.rc?.[r.id]?.v === '0').map(r => 'Broke rule: ' + r.x))
    ]),
    emn: percentage(daysInMonth.filter(x => getEmo(x).plan === 'y').length, daysInMonth.filter(x => getEmo(x).plan).length),
    pat: percentage(daysInMonth.filter(x => getEmo(x).over !== 'y' && getEmo(x).fomo !== 'y').length, daysInMonth.length),
    str: percentage(allTrades.filter(t => t.fol === 'Yes').length, allTrades.length),
    risk: percentage(tradingDays.filter(x => !x.br && !x.mx).length, tradingDays.length),
    jc: weekdaysCount ? Math.min(100, percentage(daysInMonth.length, weekdaysCount)) : null,
    imp: daysInMonth.length ? +(daysInMonth.reduce((acc, x) => acc + x.fl, 0) / daysInMonth.length).toFixed(2) : null
  };
}

// SVG Chart Generation
function renderSvgChart(values, isBarChart) {
  const hasNonZero = values.some(v => v !== 0);
  if (!values.length || !hasNonZero) {
    return '<p class="mu" style="padding:16px 0;text-align:center">No trades recorded yet. Your P/L curve will appear as you log trades.</p>';
  }
  const W = 300, Q = 110;
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(0, ...values);
  const spread = (maxVal - minVal) || 1;
  const getY = val => Q - 8 - (val - minVal) / spread * (Q - 16);
  const n = values.length;

  let svg = `<svg viewBox="0 0 ${W} ${Q}" style="width:100%;height:auto"><line x1="0" x2="${W}" y1="${getY(0)}" y2="${getY(0)}" style="stroke:var(--bd)"/>`;
  if (isBarChart) {
    values.forEach((val, i) => {
      const x = 8 + i * (W - 16) / n;
      const y = Math.min(getY(val), getY(0));
      const w = (W - 16) / n * 0.7;
      const h = Math.max(1, Math.abs(getY(val) - getY(0)));
      svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" style="fill:var(--${val < 0 ? 'r' : 'g'})"/>`;
    });
  } else {
    const points = values.map((val, i) => {
      const x = n < 2 ? W / 2 : 8 + i * (W - 16) / (n - 1);
      return `${x},${getY(val)}`;
    }).join(' ');
    svg += `<polyline fill="none" style="stroke:var(--ac);stroke-width:2" points="${points}"/>`;
  }
  svg += `</svg><div class="mu">Range ${formatNumber(minVal)} to ${formatNumber(maxVal)}</div>`;
  return svg;
}

// HTML Component Generators
const CardKPI = (label, val, cls = '') =>
  `<div class="c k"><small>${label}</small><b class="${cls}">${val}</b></div>`;

const ViewHeader = title =>
  `<div class="row"><h2 style="margin:0;flex:3 1 200px">${title}</h2><span id="st" class="mu" style="text-align:right"></span></div>`;

const SelectField = (key, options, selectedVal, attrType = 'k') =>
  `<select data-${attrType}="${key}">${options.map(opt => {
    const [val, text] = Array.isArray(opt) ? opt : [opt, opt];
    return `<option value="${val}"${val === selectedVal ? ' selected' : ''}>${text}</option>`;
  }).join('')}</select>`;

const FormField = (label, inputHtml) =>
  `<div><label>${label}</label>${inputHtml}</div>`;

const YesNoSelect = (key, val) =>
  SelectField(key, [['', '–'], ['y', 'Yes'], ['n', 'No']], val);

const InputField = (key, label, val, opts = {}) =>
  `<div><label>${label}</label>${opts.ta
    ? `<textarea rows="${opts.r || 2}" data-k="${key}">${escapeHtml(val)}</textarea>`
    : `<input data-k="${key}" type="${opts.t || 'text'}" value="${escapeHtml(val)}">`
  }</div>`;

const ChipGroup = (key, list, selected = []) =>
  list.map(v => `<span class="chip${(selected || []).includes(v) ? ' on' : ''}" data-a="chip" data-k="${key}" data-v="${v}">${v}</span>`).join('');

const MonthNav = () => {
  const monthName = new Date(currentMonth + '-01T00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return `<div class="row n"><button class="s" data-a="mon" data-v="-1">‹</button><b>${monthName}</b><button class="s" data-a="mon" data-v="1">›</button></div>`;
};

// -------------------------------------------------------------
// loadData()
// Loads stored application data from localStorage with fallbacks
// -------------------------------------------------------------
function loadData() {
  // Clear any legacy demo/sample keys if present
  LEGACY_STORAGE_KEYS.forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });

  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn('localStorage read error:', err);
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      S = {
        ...INITIAL_EMPTY_STATE,
        ...parsed,
        set: { ...INITIAL_EMPTY_STATE.set, ...(parsed.set || {}) },
        rules: parsed.rules || [],
        days: parsed.days || {},
        notes: parsed.notes || []
      };
    } catch (e) {
      console.error('Failed to parse stored data:', e);
      S = JSON.parse(JSON.stringify(INITIAL_EMPTY_STATE));
    }
  } else {
    // Brand new clean app
    S = JSON.parse(JSON.stringify(INITIAL_EMPTY_STATE));
  }
}

// -------------------------------------------------------------
// saveData()
// Persists the current state to localStorage
// -------------------------------------------------------------
function saveData(immediate = false) {
  clearTimeout(saveTimeout);
  const executeSave = () => {
    try {
      const serialized = JSON.stringify(S);
      localStorage.setItem(STORAGE_KEY, serialized);
      showStatus('Saved ✓');
    } catch (err) {
      showStatus('Could not save: ' + (err.message || 'Storage error'));
    }
  };

  if (immediate) {
    executeSave();
  } else {
    saveTimeout = setTimeout(executeSave, 400);
  }
}

// -------------------------------------------------------------
// updateHeroStats()
// Updates summary statistics displayed in the dashboard hero section
// -------------------------------------------------------------
function updateHeroStats() {
  const todayKey = getTodayDateString();
  const summary = calculateDaySummary(todayKey);
  const settings = S.set;
  const targetPct = settings.tg > 0 ? Math.min(100, Math.max(0, summary.net) / settings.tg * 100) : 0;
  const lossPct = settings.ml > 0 ? Math.min(100, summary.lo / settings.ml * 100) : 0;

  // 30-day cumulative trend
  const cumulativeTrend = [];
  let runningTotal = 0;
  for (let i = 29; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    runningTotal += calculateDaySummary(getTodayDateString(dt)).net;
    cumulativeTrend.push(runningTotal);
  }

  const totalTradesLogged = Object.values(S.days).reduce((acc, d) => acc + (d.trades?.length || 0), 0);
  const hasData = totalTradesLogged > 0 || Object.keys(S.days).length > 0;
  const dateFormatted = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return ViewHeader('Dashboard') +
    `<p class="mu">${dateFormatted} · amounts in ${escapeHtml(settings.cur || 'USD')}</p>` +
    (hasData ? '' : `
      <div class="c" style="border-left:4px solid var(--ac);padding:18px">
        <h3 style="margin:0 0 6px;font-size:17px">Welcome to Blossom Trade Journal! 🌸</h3>
        <p class="mu" style="margin:0 0 14px">Your journal is clean and ready. Fill in your daily trading limits in Settings, write your core rules, or start journaling today.</p>
        <div class="row n" style="justify-content:flex-start;gap:8px">
          <button data-a="nav" data-v="jr">Start today’s journal</button>
          <button class="s" data-a="nav" data-v="rules">Set trading rules</button>
          <button class="s" data-a="nav" data-v="set">Configure limits</button>
        </div>
      </div>
    `) +
    `<div class="g">
      ${CardKPI('Trades today', summary.n)}
      ${CardKPI('Wins', summary.w, 'pos')}
      ${CardKPI('Losses', summary.l, 'neg')}
      ${CardKPI('Profit', formatNumber(summary.pr), 'pos')}
      ${CardKPI('Loss', formatNumber(summary.lo), 'neg')}
      ${CardKPI('Net', formatNumber(summary.net), summary.net < 0 ? 'neg' : 'pos')}
    </div>
    <div class="c">
      <b>Daily profit target</b> · ${settings.tg > 0 ? formatNumber(settings.tg) : '<span class="mu">Not set yet (<a data-a="nav" data-v="set" style="cursor:pointer;text-decoration:underline">set in Settings</a>)</span>'}
      <div class="bar"><i style="width:${targetPct}%"></i></div>
      ${settings.tg > 0 ? `${targetPct.toFixed(0)}% achieved · ${summary.net >= settings.tg ? '<b class="pos">Target reached ✓</b>' : 'not reached yet'}` : '<span class="mu">Enter your profit target in Settings to track your goal</span>'}
    </div>
    <div class="c">
      <b>Daily loss limit</b> · ${settings.ml > 0 ? formatNumber(settings.ml) : '<span class="mu">Not set yet (<a data-a="nav" data-v="set" style="cursor:pointer;text-decoration:underline">set in Settings</a>)</span>'}
      <div class="bar"><i style="width:${lossPct}%;background:var(--r)"></i></div>
      ${settings.ml > 0 ? (summary.br ? '<b class="neg">Limit breached ✗</b>' : 'Respected ✓') : '<span class="mu">Enter your maximum loss limit in Settings to protect your capital</span>'}
      ${summary.mx && settings.mt > 0 ? ` · <b class="neg">Exceeded ${settings.mt}-trade maximum</b>` : ''}
    </div>
    <div class="g">
      ${CardKPI('Discipline score', summary.sc == null ? '–' : summary.sc + '/100')}
      ${CardKPI('Plan adherence', summary.ad == null ? '–' : summary.ad + '%')}
    </div>
    <div class="c">
      <b>Cumulative P/L, last 30 days</b>
      ${renderSvgChart(cumulativeTrend, false)}
    </div>`;
}

// -------------------------------------------------------------
// renderInsights()
// Calculates and updates monthly performance metrics & growth trends
// -------------------------------------------------------------
function renderInsights() {
  if (currentView === 'an') {
    const m = calculateMonthSummary(currentMonth);
    let runningNet = 0;
    const formatDayInfo = dayObj => dayObj ? dayObj.k.slice(8) + ' · ' + formatNumber(dayObj.net) : '–';

    return ViewHeader('Monthly Performance') + MonthNav() +
      `<div class="g">
        ${CardKPI('Trades', m.n)}
        ${CardKPI('Wins', m.w, 'pos')}
        ${CardKPI('Losses', m.l, 'neg')}
        ${CardKPI('Breakeven', m.b)}
        ${CardKPI('Win rate', m.n ? (100 * m.w / m.n).toFixed(1) + '%' : '–')}
        ${CardKPI('Total profit', formatNumber(m.pr), 'pos')}
        ${CardKPI('Total loss', formatNumber(m.lo), 'neg')}
        ${CardKPI('Net', formatNumber(m.net), m.net < 0 ? 'neg' : 'pos')}
        ${CardKPI('Profitable days', m.pd)}
        ${CardKPI('Losing days', m.ld)}
        ${CardKPI('Best day', formatDayInfo(m.best))}
        ${CardKPI('Worst day', formatDayInfo(m.worst))}
        ${CardKPI('Avg per trading day', formatNumber(m.avg))}
        ${CardKPI('Plan respected (80%+)', m.pa ? m.plan + ' of ' + m.pa + ' days' : '–')}
        ${CardKPI('Avg discipline', m.disc ?? '–')}
        ${CardKPI('Top emotion', m.emo[0]?.[0] || '–')}
      </div>
      <div class="c">
        <b>Cumulative P/L</b>
        ${renderSvgChart(m.tradingDays.map(x => runningNet += x.net), false)}
      </div>
      <div class="c">
        <b>Daily P/L</b>
        ${renderSvgChart(m.tradingDays.map(x => x.net), true)}
      </div>
      <div class="c">
        <b>Emotions</b><br>
        ${m.emo.map(([k, c]) => `<span class="chip">${k} ×${c}</span>`).join('') || '<span class="mu">No emotions tagged for this month yet.</span>'}
        <br><br>
        <b>Most frequent mistakes</b><br>
        ${m.mis.slice(0, 8).map(([k, c]) => `<span class="chip">${escapeHtml(k)} ×${c}</span>`).join('') || '<span class="mu">No mistakes recorded for this month.</span>'}
      </div>`;
  }

  if (currentView === 'gr') {
    const curSummary = calculateMonthSummary(currentMonth);
    const [y, m] = currentMonth.split('-').map(Number);
    const prevMonthKey = getTodayDateString(new Date(y, m - 2, 1)).slice(0, 7);
    const prevSummary = calculateMonthSummary(prevMonthKey);
    const negEmotions = curSummary.emo.filter(z => NEGATIVE_EMOTIONS.includes(z[0]));
    const observations = [];

    const metricsList = [
      ['Emotional management', 'emn', '%'],
      ['Patience', 'pat', '%'],
      ['Strategy adherence', 'str', '%'],
      ['Risk management', 'risk', '%'],
      ['Trading discipline (avg score)', 'disc', '/100'],
      ['Journaling consistency', 'jc', '%'],
      ['Impulsive flags per journaled day', 'imp', '', true]
    ];

    const formatTrend = (metricKey, isLowerBetter) => {
      const p = curSummary[metricKey];
      const q = prevSummary[metricKey];
      if (p == null || q == null) return '–';
      const diff = p - q;
      if (diff === 0) return '＝';
      const isPositive = isLowerBetter ? diff < 0 : diff > 0;
      return `<span class="${isPositive ? 'pos' : 'neg'}">${diff > 0 ? '▲' : '▼'} ${Math.abs(+diff.toFixed(2))}</span>`;
    };

    if (curSummary.pa) {
      observations.push(`You followed your trading plan (80%+ of applicable rules) on ${Math.round(100 * curSummary.plan / curSummary.pa)}% of the ${curSummary.pa} days you checked your rules.`);
    }
    if (curSummary.imp != null && prevSummary.imp != null) {
      observations.push(
        curSummary.imp < prevSummary.imp
          ? 'You recorded fewer impulsive-trade flags per journaled day than last month.'
          : curSummary.imp > prevSummary.imp
          ? 'Impulsive-trade flags per journaled day rose versus last month — that’s the area to watch.'
          : 'Impulsive-trade flags are unchanged from last month.'
      );
    }
    if (negEmotions[0]) {
      observations.push(`Your most common emotional challenge was ${negEmotions[0][0].toLowerCase()} (${negEmotions[0][1]} day${negEmotions[0][1] > 1 ? 's' : ''}).`);
    }
    if (curSummary.jc != null) {
      observations.push(`You journaled on ${curSummary.jc}% of weekdays so far this month${prevSummary.jc == null ? '.' : curSummary.jc > prevSummary.jc ? ' — better than last month.' : curSummary.jc < prevSummary.jc ? ' — down from last month.' : ' — the same as last month.'}`);
    }

    return ViewHeader('Trading Growth') + MonthNav() +
      `<div class="c tbl">
        <table>
          <tr><th>Metric</th><th>This month</th><th>Last month</th><th>Trend</th></tr>
          ${metricsList.map(([label, key, unit, isLowerBetter]) => `
            <tr>
              <td>${label}</td>
              <td>${curSummary[key] == null ? '–' : curSummary[key] + unit}</td>
              <td>${prevSummary[key] == null ? '–' : prevSummary[key] + unit}</td>
              <td>${formatTrend(key, isLowerBetter)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
      <div class="c">
        <b>What your records say</b>
        <ul>
          ${observations.length ? observations.map(x => `<li>${x}</li>`).join('') : '<li>Not enough entries this month to draw honest conclusions yet. Start logging your trades and daily reviews to track your behavioral growth!</li>'}
        </ul>
        <p class="mu">Calculated directly from your trade journal records. Discipline score = rule adherence − 10 per impulsive flag − 20 for a loss-limit breach.</p>
      </div>`;
  }

  return '';
}

// -------------------------------------------------------------
// renderList()
// Generates dynamic record lists, tables, and empty states
// -------------------------------------------------------------
function renderList() {
  const container = $('#res');

  // Trade History Filtered List
  if (currentView === 'hist') {
    if (!container) return;
    const query = (filters.q || '').toLowerCase();
    const pairFilter = (filters.p || '').toUpperCase();
    const tradeRows = [];
    const matchingDays = [];

    const sortedDates = Object.keys(S.days).sort().reverse();
    sortedDates.forEach(dateKey => {
      const dayData = S.days[dateKey];
      if (filters.dt && filters.dt !== dateKey) return;
      if (filters.m && !(dayData.emo?.tags || []).includes(filters.m)) return;
      if (query && !(dateKey + JSON.stringify(dayData)).toLowerCase().includes(query)) return;

      const matchedTrades = (dayData.trades || []).filter(t => {
        const matchesPair = !pairFilter || t.p.includes(pairFilter);
        const matchesOutcome = !filters.o || t.out === filters.o;
        return matchesPair && matchesOutcome;
      });

      if ((pairFilter || filters.o) && !matchedTrades.length) return;
      matchingDays.push(dateKey);
      matchedTrades.forEach(trade => tradeRows.push([dateKey, trade]));
    });

    if (tradeRows.length === 0) {
      container.innerHTML = `<div class="c"><p class="mu" style="text-align:center;padding:12px 0">No trades recorded yet. Enter your trades in the Daily Journal to start building your history.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="c">
        <b>${matchingDays.length} matching day(s)</b><br>
        ${matchingDays.slice(0, 30).map(k => `<span class="chip" data-a="open" data-v="${k}">${k}</span>`).join('')}
      </div>
      <div class="c tbl">
        <table>
          <tr><th>Date</th><th>Pair</th><th>Side</th><th>Outcome</th><th>P/L</th><th>Pips</th><th>Followed Strategy?</th></tr>
          ${tradeRows.map(([dateKey, trade]) => `
            <tr data-a="open" data-v="${dateKey}" style="cursor:pointer" title="Click to view journal">
              <td>${dateKey}</td>
              <td><b>${escapeHtml(trade.p)}</b></td>
              <td>${trade.s}</td>
              <td><span class="${trade.out === 'Win' ? 'pos' : trade.out === 'Loss' ? 'neg' : 'mu'}">${trade.out}</span></td>
              <td class="${trade.pl < 0 ? 'neg' : trade.pl > 0 ? 'pos' : ''}">${formatNumber(+trade.pl)}</td>
              <td>${trade.pips ? escapeHtml(trade.pips) + ' pips' : '–'}</td>
              <td>${trade.fol || 'Yes'}</td>
            </tr>
          `).join('')}
        </table>
      </div>`;
  }

  // Notes Filtered List
  if (currentView === 'notes') {
    if (!container) return;
    const query = (filters.q || '').toLowerCase();
    const matchedNotes = S.notes.filter(n => {
      const matchesCat = !filters.c || n.c === filters.c;
      const matchesText = (n.t + ' ' + n.x).toLowerCase().includes(query);
      return matchesCat && matchesText;
    });

    if (matchedNotes.length === 0) {
      container.innerHTML = `<div class="c"><p class="mu" style="text-align:center;padding:12px 0">No notes found. Use the form above to save lessons, trading rules, or reminders.</p></div>`;
      return;
    }

    container.innerHTML = matchedNotes.map(n => `
      <div class="c">
        <div class="row">
          <input data-n="${n.id}:t" value="${escapeHtml(n.t)}">
          ${SelectField(n.id + ':c', NOTE_CATEGORIES, n.c, 'n')}
          <button class="s" style="flex:none" data-a="delnote" data-v="${n.id}">Delete</button>
        </div>
        <textarea rows="3" data-n="${n.id}:x">${escapeHtml(n.x)}</textarea>
        <div class="mu" style="font-size:12px;margin-top:6px">${n.d || ''}</div>
      </div>
    `).join('');
  }
}

// Render Daily Journal View
function renderDailyJournal() {
  const dateKey = currentDate;
  const dayData = S.days[dateKey] || {};
  const trades = dayData.trades || [];
  const emo = dayData.emo || {};
  const ruleChecks = dayData.rc || {};
  const summary = calculateDaySummary(dateKey);
  const settings = S.set;
  const getVal = path => getNestedProp(dayData, path);

  return ViewHeader('Daily Journal') +
    `<div class="row">
      <input id="jd" type="date" value="${dateKey}">
      <button data-a="save" style="flex:none">Save entry</button>
    </div>
    <div class="c row n" style="justify-content:flex-start;gap:18px">
      <span>Net <b class="${summary.net < 0 ? 'neg' : 'pos'}">${formatNumber(summary.net)} ${escapeHtml(settings.cur || 'USD')}</b></span>
      <span>Trades <b>${summary.n}</b></span>
      <span>Plan <b>${summary.ad == null ? '–' : summary.ad + '%'}</b></span>
      <span>Discipline <b>${summary.sc ?? '–'}</b></span>
      <span>${settings.tg > 0 ? (summary.net >= settings.tg ? '🎯 target hit' : 'target not hit') : '–'}</span>
      <span>${settings.ml > 0 ? (summary.br ? '⚠ loss limit breached' : 'loss limit OK') : '–'}</span>
    </div>
    <div class="c">
      <b>Today's Session</b>
      ${InputField('act', 'What did I trade or observe today?', getVal('act'), { ta: true })}
      <label>Sessions Traded</label>
      ${ChipGroup('sess', SESSIONS, dayData.sess)}
      ${InputField('obs', 'Market observations & context', getVal('obs'), { ta: true })}
    </div>
    <div class="c">
      <b>Trades Logged (${summary.n})</b>
      ${trades.length > 0 ? `
        <div class="tbl">
          <table>
            <tr><th>Pair</th><th>Side</th><th>Outcome</th><th>P/L</th><th>Pips</th><th>Followed Strategy?</th><th>Action</th></tr>
            ${trades.map((t, idx) => `
              <tr>
                <td><b>${escapeHtml(t.p)}</b></td>
                <td>${t.s}</td>
                <td><span class="${t.out === 'Win' ? 'pos' : t.out === 'Loss' ? 'neg' : 'mu'}">${t.out}</span></td>
                <td class="${t.pl < 0 ? 'neg' : t.pl > 0 ? 'pos' : ''}">${formatNumber(+t.pl)}</td>
                <td>${t.pips ? escapeHtml(t.pips) + ' pips' : '–'}</td>
                <td>${t.fol}</td>
                <td><a data-a="deltrade" data-v="${idx}" style="cursor:pointer;color:var(--r);font-weight:600">✕</a></td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : '<p class="mu">No trades logged for this date yet. Fill in the form below to add your first trade.</p>'}
      
      <p style="margin-top:16px"><b>Add a Trade</b> <span class="mu">— enter the amount as a positive number; outcome sets the sign.</span></p>
      <div class="row">
        ${InputField('t.p', 'Pair (e.g. EURUSD, XAUUSD)', tradeDraft.p || '')}
        ${FormField('Side', SelectField('t.s', ['Buy', 'Sell'], tradeDraft.s || 'Buy'))}
        ${FormField('Outcome', SelectField('t.out', ['Win', 'Loss', 'Breakeven'], tradeDraft.out || 'Win'))}
        ${InputField('t.a', 'P/L Amount', tradeDraft.a || '', { t: 'number' })}
        ${InputField('t.pips', 'Pips (optional)', tradeDraft.pips || '')}
        ${FormField('Followed my strategy?', SelectField('t.fol', ['Yes', 'Partly', 'No'], tradeDraft.fol || 'Yes'))}
      </div>
      ${InputField('t.why', 'Why I entered, how it went, and what I could do better', tradeDraft.why || '', { ta: true, r: 3 })}
      <p><button data-a="addtrade">Add trade</button></p>
    </div>
    <div class="c">
      <b>Emotions & Mindset</b>
      <label>How did you feel?</label>
      ${ChipGroup('emo.tags', EMOTION_TAGS, emo.tags)}
      <div class="row">
        ${MISTAKE_FLAGS.map(([key, label]) => FormField(label, YesNoSelect('emo.' + key, emo[key]))).join('')}
      </div>
      ${InputField('emo.note', 'Additional psychological reflections', getVal('emo.note'), { ta: true })}
    </div>
    <div class="c">
      <b>Trading Rules Checklist</b> <span class="mu">Check adherence to your rules.</span>
      ${S.rules.length > 0 ? S.rules.map(r => {
        const rc = ruleChecks[r.id] || {};
        return `
          <div class="row" style="align-items:center;margin-top:8px">
            <div style="flex:2 1 220px">${r.t === 'do' ? '✅' : '⛔'} ${escapeHtml(r.x)}</div>
            ${FormField('', SelectField('rc.' + r.id + '.v', [['', 'N/A'], ['1', 'Followed'], ['0', 'Broke it']], rc.v || ''))}
            ${rc.v === '0' ? `<div style="flex:3 1 200px"><input data-k="rc.${r.id}.why" placeholder="Why did I break it?" value="${escapeHtml(rc.why || '')}"></div>` : ''}
          </div>`;
      }).join('') : `
        <p class="mu" style="margin-top:10px">You haven't defined any trading rules yet. <a data-a="nav" data-v="rules" style="cursor:pointer;text-decoration:underline">Go to Trading Rules</a> to set up your rules checklist.</p>
      `}
    </div>
    <div class="c">
      <b>End-of-Day Review</b>
      ${InputField('rv.text', 'How did today go? What went well, what did I learn, what’s my plan for tomorrow?', getVal('rv.text'), { ta: true, r: 4 })}
      ${FormField('If I had to grade today’s trading (1–10)', SelectField('rv.grade', [['', '–'], ...Array.from({ length: 10 }, (_, i) => i + 1)], getVal('rv.grade')))}
    </div>`;
}

// Render Trading Rules View
function renderRulesView() {
  const ruleColumn = type => {
    const list = S.rules.filter(r => r.t === type);
    return `
      <div class="c">
        <b>${type === 'do' ? '✅ Things I MUST DO' : '⛔ Things I MUST NOT DO'}</b>
        <div style="margin-top:10px">
          ${list.length > 0 ? list.map(r => `
            <div class="row" style="flex-wrap:nowrap;margin-bottom:8px">
              <input data-r="${r.id}" value="${escapeHtml(r.x)}">
              <button class="s" style="flex:none" data-a="delrule" data-v="${r.id}">✕</button>
            </div>
          `).join('') : `<p class="mu" style="margin:10px 0">No ${type === 'do' ? 'MUST DO' : 'MUST NOT DO'} rules added yet.</p>`}
        </div>
        <div class="row" style="flex-wrap:nowrap;margin-top:12px">
          <input id="nr-${type}" placeholder="Add a new rule...">
          <button style="flex:none" data-a="addrule" data-v="${type}">Add</button>
        </div>
      </div>`;
  };

  return ViewHeader('My Trading Rules') +
    '<div class="g" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">' +
    ruleColumn('do') + ruleColumn('dont') +
    '</div>';
}

// Render Calendar View
function renderCalendarView() {
  const [year, month] = currentMonth.split('-').map(Number);
  const totalDays = new Date(year, month, 0).getDate();
  const startDayOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const todayStr = getTodayDateString();

  let calHtml = ViewHeader('Calendar') + MonthNav() +
    '<div class="c"><div class="cal">' +
    'MTWTFSS'.split('').map(d => `<small class="mu" style="text-align:center">${d}</small>`).join('') +
    '<i></i>'.repeat(startDayOffset);

  for (let i = 1; i <= totalDays; i++) {
    const dayKey = currentMonth + '-' + String(i).padStart(2, '0');
    const daySummary = calculateDaySummary(dayKey);
    const isWeekend = (new Date(year, month - 1, i).getDay() % 6) === 0;
    const dayRecord = S.days[dayKey];
    let cssClass = '';

    if (daySummary.n > 0) {
      cssClass = daySummary.net > 0 ? 'w' : daySummary.net < 0 ? 'l' : 'b';
    } else if (dayRecord && (dayRecord.act || dayRecord.obs || dayRecord.rv?.text)) {
      cssClass = '';
    }

    calHtml += `
      <div class="d ${cssClass}${isWeekend ? ' we' : ''}${dayKey === todayStr ? ' td' : ''}" data-a="open" data-v="${dayKey}">
        ${i}
        ${daySummary.n ? `<br><b class="${daySummary.net < 0 ? 'neg' : 'pos'}">${formatNumber(daySummary.net)}</b>` : ''}
        ${daySummary.n && !dayRecord?.rv?.grade ? ' ⚠' : ''}
      </div>`;
  }

  calHtml += '</div><p class="mu" style="margin-top:12px">Green = profit · red = loss · grey = breakeven · plain = journaled · ⚠ = review unfinished</p></div>';
  return calHtml;
}

// Render Settings View
function renderSettingsView() {
  const settings = S.set;
  const settingInput = (key, label, type = 'number') =>
    FormField(label, `<input data-s="${key}" type="${type}" step="any" placeholder="0" value="${escapeHtml(settings[key] || '')}">`);

  return ViewHeader('Settings') +
    `<div class="c">
      <b>My Daily Trading Limits</b>
      <p class="mu" style="margin:4px 0 12px">Set your risk boundaries to let the app monitor your plan adherence automatically.</p>
      <div class="row">
        ${settingInput('tg', 'Daily profit target ($)')}
        ${settingInput('ml', 'Maximum daily loss limit ($)')}
        ${settingInput('cur', 'Preferred currency', 'text')}
        ${settingInput('mt', 'Max trades per day (0 = no limit)')}
      </div>
    </div>
    <div class="c">
      <b>Appearance</b>
      ${FormField('Theme', SelectField('th', [['dark', 'Dark navy'], ['light', 'Light']], S.th || 'dark', 's'))}
    </div>
    <div class="c">
      <b>Data Management</b>
      <p class="mu">Your records are stored privately in your browser’s localStorage.</p>
      <div class="row n" style="justify-content:flex-start;gap:8px">
        <button class="s" data-a="csv" data-v="t">Export trades CSV</button>
        <button class="s" data-a="csv" data-v="j">Export journal CSV</button>
        <button class="s" data-a="reset" style="color:var(--r)">Clear All Data (Reset)</button>
      </div>
    </div>`;
}

// CSV Export Utility
function exportCSV(type) {
  const escapeCsv = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const dates = Object.keys(S.days).sort();
  let rows = [];

  if (type === 't') {
    rows.push(['date', 'pair', 'side', 'outcome', 'pl', 'pips', 'followed_strategy', 'notes']);
    dates.forEach(k => {
      (S.days[k].trades || []).forEach(t => {
        rows.push([k, t.p, t.s, t.out, t.pl, t.pips, t.fol, t.why || '']);
      });
    });
  } else {
    rows.push(['date', 'activities', 'pairs', 'sessions', 'observations', 'emotion_tags', 'fomo', 'revenge', 'overtrade', 'fear_close', 'discipline_score', 'review']);
    dates.forEach(k => {
      const d = S.days[k];
      const em = d.emo || {};
      const sum = calculateDaySummary(k);
      rows.push([
        k,
        d.act || '',
        [...new Set((d.trades || []).map(t => t.p))].join(', '),
        (d.sess || []).join('; '),
        d.obs || '',
        (em.tags || []).join('; '),
        em.fomo || '',
        em.rev || '',
        em.over || '',
        em.fear || '',
        sum.sc ?? '',
        d.rv?.text || ''
      ]);
    });
  }

  const csvContent = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `blossom_tradejournal_${type === 't' ? 'trades' : 'journal'}_${getTodayDateString()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showStatus('Exported ✓');
}

// Master Render Handler
function render() {
  document.documentElement.dataset.theme = S.th || 'dark';

  // Render Sidebar Navigation
  const navEl = $('#nv');
  if (navEl) {
    navEl.innerHTML = '<h1>🌸 Blossom Trade Journal</h1>' +
      NAVIGATION_ITEMS.map(([key, label]) => `
        <a data-a="nav" data-v="${key}" class="${key === currentView ? 'on' : ''}">${label}</a>
      `).join('');
  }

  // Render Main View
  const mainEl = $('#mn');
  if (mainEl) {
    switch (currentView) {
      case 'dash':
        mainEl.innerHTML = updateHeroStats();
        break;
      case 'jr':
        mainEl.innerHTML = renderDailyJournal();
        break;
      case 'hist':
        mainEl.innerHTML = ViewHeader('Trade History') +
          `<div class="c">
            <div class="row">
              <input data-f="q" placeholder="Search pairs, notes, reviews..." value="${escapeHtml(filters.q || '')}">
              <input data-f="p" placeholder="Pair, e.g. EURUSD" value="${escapeHtml(filters.p || '')}">
              <input data-f="dt" type="date" value="${filters.dt || ''}">
              ${SelectField('o', [['', 'Any outcome'], 'Win', 'Loss', 'Breakeven'], filters.o || '', 'f')}
              ${SelectField('m', [['', 'Any emotion'], ...EMOTION_TAGS], filters.m || '', 'f')}
            </div>
            <div class="row n" style="margin-top:10px">
              <button class="s" data-a="csv" data-v="t">Export trades CSV</button>
              <button class="s" data-a="csv" data-v="j">Export journal CSV</button>
            </div>
          </div>
          <div id="res"></div>`;
        break;
      case 'rules':
        mainEl.innerHTML = renderRulesView();
        break;
      case 'cal':
        mainEl.innerHTML = renderCalendarView();
        break;
      case 'an':
      case 'gr':
        mainEl.innerHTML = renderInsights();
        break;
      case 'notes':
        mainEl.innerHTML = ViewHeader('Notes & Reflections') +
          `<div class="c">
            <div class="row">
              <input id="nt" placeholder="Note Title">
              <select id="nc">${NOTE_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select>
            </div>
            <textarea id="nx" rows="3" placeholder="Lesson, reminder, strategy nuance..." style="margin:8px 0 12px"></textarea>
            <button data-a="addnote">Save note</button>
          </div>
          <div class="row">
            <input data-f="q" placeholder="Search notes..." value="${escapeHtml(filters.q || '')}">
            ${SelectField('c', [['', 'All categories'], ...NOTE_CATEGORIES], filters.c || '', 'f')}
          </div>
          <div id="res"></div>`;
        break;
      case 'set':
        mainEl.innerHTML = renderSettingsView();
        break;
      default:
        mainEl.innerHTML = updateHeroStats();
    }
  }

  renderList();
}

// Action Handlers
const ActionHandlers = {
  nav: target => {
    currentView = target.v;
    filters = {};
    render();
    window.scrollTo(0, 0);
  },
  open: target => {
    currentDate = target.v;
    currentView = 'jr';
    render();
    window.scrollTo(0, 0);
  },
  mon: target => {
    const [year, month] = currentMonth.split('-').map(Number);
    currentMonth = getTodayDateString(new Date(year, month - 1 + +target.v, 1)).slice(0, 7);
    render();
  },
  chip: target => {
    const dayObj = getDayRecord(currentDate);
    const existing = [...(getNestedProp(dayObj, target.k) || [])];
    const idx = existing.indexOf(target.v);
    if (idx < 0) {
      existing.push(target.v);
    } else {
      existing.splice(idx, 1);
    }
    setNestedProp(dayObj, target.k, existing);
    saveData();
    render();
  },
  addtrade: () => {
    const draft = tradeDraft;
    if (!draft.p?.trim()) {
      showStatus('Enter a currency pair first');
      return;
    }
    const amount = Math.abs(+draft.a || 0);
    const outcome = draft.out || 'Win';
    const dayTrades = getDayRecord(currentDate).trades;

    const newTrade = {
      id: 'tr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      status: outcome,
      p: draft.p.trim().toUpperCase(),
      s: draft.s || 'Buy',
      out: outcome,
      pl: outcome === 'Win' ? amount : outcome === 'Loss' ? -amount : 0,
      pips: draft.pips || '',
      fol: draft.fol || 'Yes',
      why: draft.why || ''
    };

    dayTrades.push(newTrade);
    tradeDraft = {};
    saveData(true);
    render();
  },
  deltrade: target => {
    const dayTrades = getDayRecord(currentDate).trades;
    dayTrades.splice(+target.v, 1);
    saveData(true);
    render();
  },
  save: () => {
    saveData(true);
  },
  addrule: target => {
    const input = $(`#nr-${target.v}`);
    const text = input ? input.value.trim() : '';
    if (text) {
      S.rules.push({
        id: 'r_' + Date.now().toString(36),
        t: target.v,
        x: text
      });
      saveData(true);
      render();
    }
  },
  delrule: target => {
    S.rules = S.rules.filter(r => r.id !== target.v);
    saveData(true);
    render();
  },
  addnote: () => {
    const titleInput = $('#nt');
    const textInput = $('#nx');
    const catInput = $('#nc');
    const title = titleInput ? titleInput.value.trim() : '';
    const body = textInput ? textInput.value.trim() : '';
    const category = catInput ? catInput.value : 'General';

    if (title || body) {
      S.notes.unshift({
        id: 'n_' + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        status: 'active',
        t: title || 'Untitled Note',
        x: body,
        c: category,
        d: getTodayDateString()
      });
      saveData(true);
      render();
    }
  },
  delnote: target => {
    S.notes = S.notes.filter(n => n.id !== target.v);
    saveData(true);
    renderList();
  },
  reset: () => {
    if (confirm('Are you sure you want to clear all data and reset to a clean state?')) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        LEGACY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
      S = JSON.parse(JSON.stringify(INITIAL_EMPTY_STATE));
      saveData(true);
      render();
      showStatus('App reset to clean state ✓');
    }
  },
  csv: target => {
    exportCSV(target.v);
  }
};

// -------------------------------------------------------------
// init()
// Application bootstrap: loads data, registers event listeners, and renders UI
// -------------------------------------------------------------
function init() {
  loadData();

  // Update dynamic footer year
  const footerYear = document.querySelector('#footer-year');
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  // Click event delegation
  document.addEventListener('click', ev => {
    const actionEl = ev.target.closest('[data-a]');
    if (actionEl) {
      const actionName = actionEl.dataset.a;
      if (ActionHandlers[actionName]) {
        ActionHandlers[actionName](actionEl.dataset);
      }
    }
  });

  // Input & filter event delegation
  document.addEventListener('input', ev => {
    const target = ev.target;
    const dataset = target.dataset;

    if (dataset.k) {
      if (dataset.k.startsWith('t.')) {
        tradeDraft[dataset.k.slice(2)] = target.value;
      } else {
        setNestedProp(getDayRecord(currentDate), dataset.k, target.value);
        saveData();
      }
    } else if (dataset.s === 'th') {
      S.th = target.value;
      saveData();
      render();
    } else if (dataset.s) {
      S.set[dataset.s] = dataset.s === 'cur' ? target.value.toUpperCase() : +target.value || 0;
      saveData();
    } else if (dataset.r) {
      const rule = S.rules.find(r => r.id === dataset.r);
      if (rule) {
        rule.x = target.value;
        saveData();
      }
    } else if (dataset.n) {
      const [id, field] = dataset.n.split(':');
      const note = S.notes.find(n => n.id === id);
      if (note) {
        note[field] = target.value;
        saveData();
      }
    } else if (dataset.f) {
      filters[dataset.f] = target.value;
      renderList();
    }
  });

  // Change event delegation (selects, dates)
  document.addEventListener('change', ev => {
    const target = ev.target;
    if (target.id === 'jd') {
      currentDate = target.value || getTodayDateString();
      render();
    } else if (target.tagName === 'SELECT' && (target.dataset.k || target.dataset.s === 'th')) {
      render();
    }
  });

  render();
}

// Bootstrap on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
