'use strict';

// Tests for src/web/quizClient.js's pure buildRoutingLinks() function -- the
// same function gets inlined verbatim into index.html's own <script> tag
// (no bundler on this site), but it is plain, DOM-free logic testable
// directly here, against the real content/focuses.json data.

const test = require('node:test');
const assert = require('node:assert/strict');

const quiz = require('../src/web/quizClient.js');
const focuses = require('../content/focuses.json');

test('buildRoutingLinks() resolves the focus and drill hrefs from a real focus id', () => {
  const links = quiz.buildRoutingLinks('Mid', 'death-cause', focuses);
  assert.equal(links.focusHref, 'focus-menu.html#death-cause');
  assert.equal(links.drillHref, 'drills.html#death-audit');
});

test('buildRoutingLinks() resolves every real focus id in content/focuses.json, not just one sample', () => {
  for (const f of focuses) {
    const links = quiz.buildRoutingLinks('Mid', f.id, focuses);
    assert.equal(links.focusHref, `focus-menu.html#${f.id}`);
    assert.equal(links.drillHref, `drills.html#${f.drillId}`);
  }
});

test('buildRoutingLinks() returns null (not a guess/fallback link) for an unrecognized focus id', () => {
  assert.equal(quiz.buildRoutingLinks('Mid', 'not-a-real-focus', focuses), null);
});

test('buildRoutingLinks() maps every one of the 5 tracker roles to a real warmup id from content/warmups.json', () => {
  const warmups = require('../content/warmups.json');
  const warmupIds = new Set(warmups.map(w => w.id));
  for (const role of ['Top', 'Jungle', 'Mid', 'ADC', 'Support']) {
    const links = quiz.buildRoutingLinks(role, focuses[0].id, focuses);
    assert.ok(links.warmupHref, `expected a warmup href for role: ${role}`);
    const warmupId = links.warmupHref.replace('warmup.html#', '');
    assert.ok(warmupIds.has(warmupId), `role "${role}" mapped to warmup id "${warmupId}", which is not a real warmup id`);
  }
});

test('buildRoutingLinks() returns a null warmupHref (not a guess) for an unrecognized role, while still resolving focus/drill', () => {
  const links = quiz.buildRoutingLinks('NotARole', focuses[0].id, focuses);
  assert.equal(links.warmupHref, null);
  assert.equal(links.focusHref, `focus-menu.html#${focuses[0].id}`);
});
