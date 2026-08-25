'use strict';

// Tests for src/web/trackerClient.js's pure calculation functions -- the
// same functions get inlined verbatim into tracker.html's own <script> tag
// (no bundler on this site), but every one of them is plain, DOM-free logic
// testable directly here. Each test's expected value is worked out by hand
// against the exact formula it mirrors in src/xlsx/workbook.js, not just
// re-implemented and trusted.

const test = require('node:test');
const assert = require('node:assert/strict');

const tracker = require('../src/web/trackerClient.js');
const benchmarks = require('../content/benchmarks.json');

test('csPerMin() divides CS@10 by minutes, and returns null for missing/zero inputs', () => {
  assert.equal(tracker.csPerMin(90, 10), 9);
  assert.equal(tracker.csPerMin(0, 10), 0);
  assert.equal(tracker.csPerMin('', 10), null);
  assert.equal(tracker.csPerMin(90, ''), null);
  assert.equal(tracker.csPerMin(90, 0), null);
  assert.equal(tracker.csPerMin(undefined, undefined), null);
});

test('average() ignores non-numeric entries and returns null for an empty/all-invalid list', () => {
  assert.equal(tracker.average([2, 4, 6]), 4);
  assert.equal(tracker.average([2, null, 4, NaN, 6]), 4);
  assert.equal(tracker.average([]), null);
  assert.equal(tracker.average([null, NaN]), null);
});

test('baselineAverageCsPerMin() matches Baseline!G20\'s AVERAGE(G9:G18) formula shape - averages only rows with real CS/min', () => {
  const rows = [
    { cs10: 80, minutes: 10 },  // 8
    { cs10: 100, minutes: 10 }, // 10
    { cs10: '', minutes: '' }   // incomplete row, excluded, same as the xlsx's IF(...,"") blank
  ];
  assert.equal(tracker.baselineAverageCsPerMin(rows), 9);
});

test('benchmarkForRank() looks up the exact rank band from content/benchmarks.json, real data not a fixture', () => {
  const gold = benchmarks.ranks.find(r => r.rank === 'Gold');
  const result = tracker.benchmarkForRank('Gold', benchmarks, false);
  assert.deepEqual(result, { min: gold.csPerMinMin, max: gold.csPerMinMax });
  assert.equal(tracker.benchmarkForRank('Not A Rank', benchmarks, false), null);
});

test('benchmarkForRank() applies the jungler adjustment to both ends of the band, matching workbook.js\'s documented -1/-1 shift', () => {
  const gold = benchmarks.ranks.find(r => r.rank === 'Gold');
  const result = tracker.benchmarkForRank('Gold', benchmarks, true);
  assert.equal(result.min, gold.csPerMinMin + benchmarks.junglerAdjustment.amount);
  assert.equal(result.max, gold.csPerMinMax + benchmarks.junglerAdjustment.amount);
});

test('rollingAverage() averages only the most recent N rows (tail of a chronological array), matching Game Log\'s OFFSET formula', () => {
  const rows = [
    { cs10: 50, minutes: 10 },  // 5 -- outside the most-recent-2 window
    { cs10: 70, minutes: 10 },  // 7
    { cs10: 90, minutes: 10 }   // 9
  ];
  assert.equal(tracker.rollingAverage(rows, 'csPerMin', 2), 8); // avg(7, 9)
  assert.equal(tracker.rollingAverage(rows, 'csPerMin', 10), 7); // all 3 rows, avg(5,7,9)
});

test('rollingAverage() works on a plain numeric field (deaths), not just the computed csPerMin field', () => {
  const rows = [{ deaths: 2 }, { deaths: 4 }, { deaths: 6 }];
  assert.equal(tracker.rollingAverage(rows, 'deaths', 10), 4);
});

test('adherentWinRate() splits win rate by the adherence>=4 threshold, matching Game Log!D3/D4\'s COUNTIFS split exactly', () => {
  const rows = [
    { adherence: 5, result: 'W' },
    { adherence: 4, result: 'L' },
    { adherence: 2, result: 'W' },
    { adherence: 1, result: 'L' },
    { adherence: 1, result: 'L' }
  ];
  assert.equal(tracker.adherentWinRate(rows, true), 0.5);  // 1 of 2 adherent games won
  assert.equal(tracker.adherentWinRate(rows, false), 1 / 3); // 1 of 3 non-adherent games won
  assert.equal(tracker.adherentWinRate([], true), null);
});

test('focusAdherencePercent() is the share of adherence-entered rows at or above 4, matching Game Log!D7', () => {
  const rows = [{ adherence: 5 }, { adherence: 3 }, { adherence: '' }, { adherence: 4 }];
  // 2 of 3 rows that actually have an adherence value are >=4 - the blank row is excluded from the denominator too
  assert.equal(tracker.focusAdherencePercent(rows), 2 / 3);
  assert.equal(tracker.focusAdherencePercent([{ adherence: '' }]), null);
});

test('progressBoxes() returns exactly 30 boxes, marks box N filled once at least N games are logged, and caps at 30 even with more games logged', () => {
  const boxes5 = tracker.progressBoxes(new Array(5).fill({}));
  assert.equal(boxes5.length, 30);
  assert.equal(boxes5.filter(b => b.filled).length, 5);
  assert.equal(boxes5[4].filled, true);
  assert.equal(boxes5[5].filled, false);

  const boxesOver = tracker.progressBoxes(new Array(45).fill({}));
  assert.equal(boxesOver.filter(b => b.filled).length, 30);
});

test('progressBoxes() groups boxes into 3 blocks of 10, matching program.html\'s own 3-block structure', () => {
  const boxes = tracker.progressBoxes([]);
  assert.equal(boxes[0].block, 1);
  assert.equal(boxes[9].block, 1);
  assert.equal(boxes[10].block, 2);
  assert.equal(boxes[19].block, 2);
  assert.equal(boxes[20].block, 3);
  assert.equal(boxes[29].block, 3);
});

test('emptyState() returns the current schema version with empty arrays, never null/undefined fields', () => {
  const state = tracker.emptyState();
  assert.equal(state.version, tracker.TRACKER_SCHEMA_VERSION);
  assert.deepEqual(state.baseline, []);
  assert.deepEqual(state.gameLog, []);
});

test('loadState() returns emptyState() when localStorage is unavailable or throws, never lets the exception escape', () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = {
    getItem() { throw new Error('simulated private-browsing quota error'); }
  };
  try {
    const state = tracker.loadState();
    assert.deepEqual(state, tracker.emptyState());
  } finally {
    global.localStorage = originalLocalStorage;
  }
});

test('loadState() discards a stored value from a different/future schema version rather than misreading it', () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = {
    getItem() { return JSON.stringify({ version: 999, baseline: [{ fake: true }], gameLog: [] }); }
  };
  try {
    const state = tracker.loadState();
    assert.deepEqual(state, tracker.emptyState());
  } finally {
    global.localStorage = originalLocalStorage;
  }
});

test('saveState() returns false instead of throwing when localStorage.setItem fails (e.g. quota exceeded)', () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = {
    setItem() { throw new Error('simulated quota exceeded'); }
  };
  try {
    assert.equal(tracker.saveState(tracker.emptyState()), false);
  } finally {
    global.localStorage = originalLocalStorage;
  }
});
