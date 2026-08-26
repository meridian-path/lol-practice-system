'use strict';

// Client-side logic for the web tracker (tracker.html). Written to run
// unmodified in BOTH environments: inlined verbatim into the browser as a
// plain <script> tag (no bundler on this site, matching
// src/web/shell.js's THEME_TOGGLE_SCRIPT/THEME_PREPAINT_SCRIPT convention),
// and required() directly by test/trackerClient.test.js for real unit
// coverage of the pure calculation functions with no DOM needed. The
// `if (typeof module...)` guard at the bottom is dead code in the browser
// (module is undefined there) and is what makes the Node require() path
// work without a build step.
//
// All data lives in localStorage only -- no account, no network request,
// nothing entered here ever leaves the visitor's own browser. Mirrors the
// three most-used sheets of the existing tracker.xlsx (Baseline, Game Log,
// and Game Log's own rolling-average formulas) rather than all six sheets --
// Champion Pool and Benchmarks are reference/optional sheets there too, and
// stay xlsx-only.

var TRACKER_STORAGE_KEY = 'lol-practice-tracker-v1';
var TRACKER_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Pure calculation functions -- no DOM, no localStorage, fully unit-testable.
// ---------------------------------------------------------------------------

function csPerMin(cs10, minutes) {
  var cs = Number(cs10);
  var min = Number(minutes);
  if (!cs10 && cs10 !== 0) return null;
  if (!minutes && minutes !== 0) return null;
  if (!isFinite(cs) || !isFinite(min) || min === 0) return null;
  return cs / min;
}

function average(numbers) {
  var real = numbers.filter(function (n) { return typeof n === 'number' && isFinite(n); });
  if (real.length === 0) return null;
  var sum = real.reduce(function (a, b) { return a + b; }, 0);
  return sum / real.length;
}

// Mirrors workbook.js's buildBaselineSheet(): average CS/min across every
// baseline row that has both cs10 and minutes filled in.
function baselineAverageCsPerMin(baselineRows) {
  var values = baselineRows.map(function (r) { return csPerMin(r.cs10, r.minutes); });
  return average(values.filter(function (v) { return v !== null; }));
}

// Mirrors Baseline!C3's INDEX/MATCH benchmark lookup -- exact rank-name
// match against benchmarks.ranks, jungler adjustment applied identically to
// workbook.js's own documented -1/-1 shift on both ends of the band.
function benchmarkForRank(rank, benchmarksData, isJungler) {
  var entry = null;
  for (var i = 0; i < benchmarksData.ranks.length; i++) {
    if (benchmarksData.ranks[i].rank === rank) { entry = benchmarksData.ranks[i]; break; }
  }
  if (!entry) return null;
  var min = entry.csPerMinMin;
  var max = entry.csPerMinMax;
  if (isJungler && benchmarksData.junglerAdjustment) {
    min += benchmarksData.junglerAdjustment.amount;
    max += benchmarksData.junglerAdjustment.amount;
  }
  return { min: min, max: max };
}

// Mirrors Game Log!D5/D6's OFFSET-based "most recent N logged games"
// rolling average -- gameLogRows is assumed chronological (oldest first,
// same order new entries get appended in), so "most recent" is the tail.
function rollingAverage(gameLogRows, field, n) {
  var count = typeof n === 'number' ? n : 10;
  var recent = gameLogRows.slice(Math.max(0, gameLogRows.length - count));
  var values = recent.map(function (r) {
    if (field === 'csPerMin') return csPerMin(r.cs10, r.minutes);
    var v = Number(r[field]);
    return isFinite(v) ? v : null;
  });
  return average(values.filter(function (v) { return v !== null; }));
}

// Mirrors Game Log!D3/D4's COUNTIFS-based win rate split by adherence
// threshold (>=4 counts as "adherent", matching workbook.js exactly).
function adherentWinRate(gameLogRows, wantAdherent) {
  var filtered = gameLogRows.filter(function (r) {
    var a = Number(r.adherence);
    if (!isFinite(a)) return false;
    return wantAdherent ? a >= 4 : a < 4;
  });
  if (filtered.length === 0) return null;
  var wins = filtered.filter(function (r) { return r.result === 'W'; }).length;
  return wins / filtered.length;
}

// Mirrors Game Log!D7's focus-adherence percentage (adherence>=4 out of
// every row with an adherence value entered at all, not just logged games
// overall).
function focusAdherencePercent(gameLogRows) {
  var withAdherence = gameLogRows.filter(function (r) { return r.adherence !== '' && r.adherence != null && isFinite(Number(r.adherence)); });
  if (withAdherence.length === 0) return null;
  var adherent = withAdherence.filter(function (r) { return Number(r.adherence) >= 4; }).length;
  return adherent / withAdherence.length;
}

// Progress visibility (item 5): maps the 30-day/3-block program directly
// onto gameLog length, sharing the same data as the tracker above rather
// than a separate counter a visitor could get out of sync. Box N is "done"
// once at least N games are logged, capped at 30 -- deliberately simple and
// honest about what it measures (games logged, not games actually played
// under a held focus, which focusAdherencePercent above covers separately).
function progressBoxes(gameLogRows) {
  var logged = Math.min(30, gameLogRows.length);
  var boxes = [];
  for (var i = 1; i <= 30; i++) {
    boxes.push({ index: i, filled: i <= logged, block: Math.ceil(i / 10) });
  }
  return boxes;
}

function emptyState() {
  return { version: TRACKER_SCHEMA_VERSION, rank: '', isJungler: false, baseline: [], gameLog: [] };
}

// ---------------------------------------------------------------------------
// localStorage read/write -- every call defensive (private browsing, quota,
// or a corrupted value must never throw past this module and break the
// page), matching src/web/shell.js's THEME_PREPAINT_SCRIPT's own
// try/catch-around-localStorage convention.
// ---------------------------------------------------------------------------

function loadState() {
  try {
    var raw = localStorage.getItem(TRACKER_STORAGE_KEY);
    if (!raw) return emptyState();
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.version !== TRACKER_SCHEMA_VERSION) return emptyState();
    if (!Array.isArray(parsed.baseline)) parsed.baseline = [];
    if (!Array.isArray(parsed.gameLog)) parsed.gameLog = [];
    return parsed;
  } catch (e) {
    return emptyState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// DOM wiring -- only runs in a real browser (guarded below). Mirrors
// src/render/html.js's escapeHtml() exactly (duplicated rather than shared,
// same accepted duplication every content-gap page's own standardEndLinks()
// already uses, since there is no bundler on this site to share a browser
// + Node module across the split).
// ---------------------------------------------------------------------------

function escapeHtmlClient(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// The tracker's forms (baseline and game log) are static, server-rendered
// HTML (see src/web/pagesB3.js's renderTracker()) -- every field, dropdown
// option, and the focus datalist is fixed at build time, so none of it
// needs regenerating client-side. This function only ever re-renders the
// parts that actually change after a data edit (tables, computed stats,
// progress boxes, and the baseline form's own visibility once it's full) --
// deliberately never re-renders a <form> itself, so a visitor mid-typing
// one entry never loses it because an unrelated row got deleted elsewhere
// on the page (an earlier draft of this function got that wrong).
function initTracker(root, benchmarksData) {
  var state = loadState();

  function persist() {
    saveState(state);
    renderDynamic();
  }

  function fmtPct(p) {
    return p === null ? 'n/a' : Math.round(p * 100) + '%';
  }
  function fmtNum(n, digits) {
    return n === null ? 'n/a' : n.toFixed(typeof digits === 'number' ? digits : 1);
  }

  function baselineTableHtml() {
    if (state.baseline.length === 0) return '<p class="tracker-note">No baseline games logged yet.</p>';
    var rows = state.baseline.map(function (r, i) {
      var cpm = csPerMin(r.cs10, r.minutes);
      return '<tr><td>' + escapeHtmlClient(r.date) + '</td><td>' + escapeHtmlClient(r.champion) + '</td><td>' + escapeHtmlClient(r.role) + '</td><td>' + escapeHtmlClient(r.result) + '</td><td>' + escapeHtmlClient(r.cs10) + '</td><td>' + escapeHtmlClient(r.minutes) + '</td><td>' + (cpm === null ? 'n/a' : cpm.toFixed(1)) + '</td><td>' + escapeHtmlClient(r.deaths) + '</td><td>' + escapeHtmlClient(r.visionScore) + '</td>' +
        '<td><button type="button" data-delete-baseline="' + i + '" aria-label="Delete this baseline row">Delete</button></td></tr>';
    }).join('');
    return '<table class="data-table"><thead><tr><th scope="col">Date</th><th scope="col">Champion</th><th scope="col">Role</th><th scope="col">Result</th><th scope="col">CS@10</th><th scope="col">Min</th><th scope="col">CS/min</th><th scope="col">Deaths</th><th scope="col">Vision</th><th scope="col"></th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function baselineStatsHtml() {
    var avg = baselineAverageCsPerMin(state.baseline);
    var bench = state.rank ? benchmarkForRank(state.rank, benchmarksData, state.isJungler) : null;
    var avgLine = '<p><strong>Your average CS/min:</strong> ' + fmtNum(avg) + '</p>';
    if (!state.rank) {
      return avgLine + '<p class="tracker-note">Select your rank above to compare against the benchmark.</p>';
    }
    if (!bench) {
      return avgLine + '<p class="tracker-note">Rank not recognized - check the dropdown above.</p>';
    }
    var benchLine = '<p><strong>Benchmark for ' + escapeHtmlClient(state.rank) + (state.isJungler ? ' (jungle-adjusted)' : '') + ':</strong> ' + bench.min + ' - ' + bench.max + ' CS/min</p>';
    var comparison = avg === null
      ? '<p class="tracker-note">Enter your 10 baseline games above to see a comparison.</p>'
      : '<p>' + (avg >= bench.min ? 'At or above the benchmark range.' : 'Below the benchmark range.') + '</p>';
    return avgLine + benchLine + comparison;
  }

  function gameLogTableHtml() {
    if (state.gameLog.length === 0) return '<p class="tracker-note">No games logged yet.</p>';
    var rows = state.gameLog.slice().reverse().map(function (r) {
      var realIndex = state.gameLog.indexOf(r);
      var cpm = csPerMin(r.cs10, r.minutes);
      return '<tr><td>' + escapeHtmlClient(r.date) + '</td><td>' + escapeHtmlClient(r.champion) + '</td><td>' + escapeHtmlClient(r.role) + '</td><td>' + escapeHtmlClient(r.result) + '</td><td>' + escapeHtmlClient(r.focus) + '</td><td>' + escapeHtmlClient(r.adherence) + '</td><td>' + (cpm === null ? 'n/a' : cpm.toFixed(1)) + '</td><td>' + escapeHtmlClient(r.deaths) + '</td><td>' + escapeHtmlClient(r.deathCause) + '</td><td>' + escapeHtmlClient(r.lesson) + '</td>' +
        '<td><button type="button" data-delete-gamelog="' + realIndex + '" aria-label="Delete this game log row">Delete</button></td></tr>';
    }).join('');
    return '<div class="tracker-table-scroll"><table class="data-table"><thead><tr><th scope="col">Date</th><th scope="col">Champion</th><th scope="col">Role</th><th scope="col">Result</th><th scope="col">Focus</th><th scope="col">Adh.</th><th scope="col">CS/min</th><th scope="col">Deaths</th><th scope="col">Death Cause</th><th scope="col">Lesson</th><th scope="col"></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function gameLogStatsHtml() {
    var adherentWr = adherentWinRate(state.gameLog, true);
    var nonAdherentWr = adherentWinRate(state.gameLog, false);
    var rollingCs = rollingAverage(state.gameLog, 'csPerMin', 10);
    var rollingDeaths = rollingAverage(state.gameLog, 'deaths', 10);
    var adherencePct = focusAdherencePercent(state.gameLog);
    return '<ul class="tracker-stats">' +
      '<li>Win rate, focus-adherent games (4-5): <strong>' + fmtPct(adherentWr) + '</strong></li>' +
      '<li>Win rate, non-adherent games (1-3): <strong>' + fmtPct(nonAdherentWr) + '</strong></li>' +
      '<li>Rolling average CS/min (last 10 logged): <strong>' + fmtNum(rollingCs) + '</strong></li>' +
      '<li>Rolling average deaths (last 10 logged): <strong>' + fmtNum(rollingDeaths) + '</strong></li>' +
      '<li>Focus adherence rate: <strong>' + fmtPct(adherencePct) + '</strong></li>' +
      '</ul>';
  }

  function progressHtml() {
    var boxes = progressBoxes(state.gameLog);
    var byBlock = { 1: [], 2: [], 3: [] };
    boxes.forEach(function (b) { byBlock[b.block].push(b); });
    var blocksHtml = [1, 2, 3].map(function (blockNum) {
      var cells = byBlock[blockNum].map(function (b) {
        return '<span class="progress-box' + (b.filled ? ' progress-box-filled' : '') + '" aria-hidden="true"></span>';
      }).join('');
      return '<div class="progress-block"><span class="progress-block-label">Block ' + blockNum + '</span><div class="progress-row">' + cells + '</div></div>';
    }).join('');
    var filledCount = boxes.filter(function (b) { return b.filled; }).length;
    return '<div class="tracker-progress">' + blocksHtml + '</div><p class="tracker-note">' + filledCount + ' of 30 games logged.</p>';
  }

  // Re-renders only the parts driven by state, never the forms themselves.
  function renderDynamic() {
    root.querySelector('[data-rank-select]').value = state.rank || '';
    root.querySelector('[data-jungler-checkbox]').checked = !!state.isJungler;
    var baselineForm = root.querySelector('[data-baseline-form]');
    var baselineFull = state.baseline.length >= 10;
    baselineForm.hidden = baselineFull;
    root.querySelector('[data-baseline-full-note]').hidden = !baselineFull;
    root.querySelector('[data-baseline-table-slot]').innerHTML = baselineTableHtml();
    root.querySelector('[data-baseline-stats-slot]').innerHTML = baselineStatsHtml();
    root.querySelector('[data-gamelog-table-slot]').innerHTML = gameLogTableHtml();
    root.querySelector('[data-gamelog-stats-slot]').innerHTML = gameLogStatsHtml();
    root.querySelector('[data-progress-slot]').innerHTML = progressHtml();
  }

  root.querySelector('[data-rank-select]').addEventListener('change', function (e) {
    state.rank = e.target.value;
    persist();
  });
  root.querySelector('[data-jungler-checkbox]').addEventListener('change', function (e) {
    state.isJungler = e.target.checked;
    persist();
  });
  root.querySelector('[data-baseline-form]').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    state.baseline.push({
      date: fd.get('date'), champion: fd.get('champion'), role: fd.get('role'), result: fd.get('result'),
      cs10: fd.get('cs10'), minutes: fd.get('minutes'), deaths: fd.get('deaths'), visionScore: fd.get('visionScore')
    });
    e.target.reset();
    persist();
  });
  root.querySelector('[data-gamelog-form]').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    state.gameLog.push({
      date: fd.get('date'), champion: fd.get('champion'), role: fd.get('role'), result: fd.get('result'),
      focus: fd.get('focus'), adherence: fd.get('adherence'), cs10: fd.get('cs10'), minutes: fd.get('minutes'),
      deaths: fd.get('deaths'), deathCause: fd.get('deathCause'), visionScore: fd.get('visionScore'), lesson: fd.get('lesson')
    });
    e.target.reset();
    persist();
  });
  root.querySelector('[data-clear-tracker]').addEventListener('click', function () {
    if (!window.confirm('Delete all tracker data stored in this browser? This cannot be undone.')) return;
    state = emptyState();
    persist();
  });
  // Event delegation for delete buttons: the table slots get replaced
  // wholesale on every renderDynamic() call, so binding to the slot's
  // stable parent (root) once, rather than to each button after every
  // re-render, is what keeps delete working after the first edit.
  root.addEventListener('click', function (e) {
    var delBaseline = e.target.closest && e.target.closest('[data-delete-baseline]');
    if (delBaseline) {
      state.baseline.splice(Number(delBaseline.getAttribute('data-delete-baseline')), 1);
      persist();
      return;
    }
    var delGame = e.target.closest && e.target.closest('[data-delete-gamelog]');
    if (delGame) {
      state.gameLog.splice(Number(delGame.getAttribute('data-delete-gamelog')), 1);
      persist();
    }
  });

  renderDynamic();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-tracker-app]');
    if (!root) return;
    var benchmarksData = JSON.parse(document.getElementById('tracker-benchmarks-data').textContent);
    initTracker(root, benchmarksData);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TRACKER_STORAGE_KEY: TRACKER_STORAGE_KEY,
    TRACKER_SCHEMA_VERSION: TRACKER_SCHEMA_VERSION,
    csPerMin: csPerMin,
    average: average,
    baselineAverageCsPerMin: baselineAverageCsPerMin,
    benchmarkForRank: benchmarkForRank,
    rollingAverage: rollingAverage,
    adherentWinRate: adherentWinRate,
    focusAdherencePercent: focusAdherencePercent,
    progressBoxes: progressBoxes,
    emptyState: emptyState,
    loadState: loadState,
    saveState: saveState
  };
}
