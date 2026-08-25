'use strict';

// Tests for tracker.html's server-rendered side (src/web/pagesB3.js's
// renderTracker()) -- the page wiring around the client-side tracker
// (src/web/trackerClient.js, whose own pure calculation logic is covered
// directly by test/trackerClient.test.js). This file checks that the page
// actually assembles correctly: the client script is inlined, the data
// script tags carry real parseable JSON, both forms are present with every
// field the client script's event listeners expect by `name`, and the
// workbook download stays as a real secondary option, not removed.
//
// The interactive behavior itself (submitting a form, watching stats
// recompute, surviving a reload) was verified once by hand in a real
// headless browser via Playwright during this feature's own build (per
// qa.md's "real browser testing required" note for this item) - not
// re-run here as a committed test, since a full page-load + DOM-interaction
// suite would meaningfully slow down every future `npm test` run for a
// page whose actual logic is already unit-tested directly above.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build: buildSite, DIST } = require('../src/web/buildSite.js');
const trackerClientSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'web', 'trackerClient.js'), 'utf8');

function readDist(name) {
  return fs.readFileSync(path.join(DIST, name), 'utf8');
}

buildSite();
const html = readDist('tracker.html');

test('tracker.html inlines the real trackerClient.js source verbatim, not a stale/partial copy', () => {
  assert.ok(html.includes(trackerClientSource), 'tracker.html should contain trackerClient.js\'s exact current source inside a <script> tag');
});

test('tracker.html carries valid, parseable JSON for the benchmarks data script tag', () => {
  const match = /<script id="tracker-benchmarks-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(match, 'expected the tracker-benchmarks-data script tag');
  const parsed = JSON.parse(match[1]);
  assert.ok(Array.isArray(parsed.ranks) && parsed.ranks.length > 0, 'parsed benchmarks data should carry a real ranks array');
});

test('tracker.html\'s baseline form carries every field name the client script reads via FormData', () => {
  const formMatch = /<form class="tracker-form" data-baseline-form>([\s\S]*?)<\/form>/.exec(html);
  assert.ok(formMatch, 'expected the baseline form');
  for (const field of ['date', 'champion', 'role', 'result', 'cs10', 'minutes', 'deaths', 'visionScore']) {
    assert.ok(formMatch[1].includes(`name="${field}"`), `baseline form missing field: ${field}`);
  }
});

test('tracker.html\'s game log form carries every field name the client script reads via FormData', () => {
  const formMatch = /<form class="tracker-form" data-gamelog-form>([\s\S]*?)<\/form>/.exec(html);
  assert.ok(formMatch, 'expected the game log form');
  for (const field of ['date', 'champion', 'role', 'result', 'focus', 'adherence', 'cs10', 'minutes', 'deaths', 'deathCause', 'visionScore', 'lesson']) {
    assert.ok(formMatch[1].includes(`name="${field}"`), `game log form missing field: ${field}`);
  }
});

test('tracker.html\'s focus datalist offers every real focus title, not a hard-coded/stale list', () => {
  const focuses = require('../content/focuses.json');
  for (const f of focuses) {
    assert.ok(html.includes(`<option value="${f.title}">`), `focus datalist missing real focus title: ${f.title}`);
  }
});

test('tracker.html\'s death-cause dropdown offers every entry from content/deathCauses.json, the same list src/xlsx/workbook.js\'s Game Log sheet uses', () => {
  const deathCauses = require('../content/deathCauses.json');
  for (const cause of deathCauses) {
    assert.ok(html.includes(`>${cause}</option>`), `death-cause dropdown missing: ${cause}`);
  }
});

test('tracker.html still offers the xlsx workbook download as a real secondary option, not removed', () => {
  assert.ok(/href="[^"]*\.xlsx"/.test(html), 'expected a real .xlsx download link to remain on the page');
});

test('tracker.html carries the required data-* hooks the client script queries at init', () => {
  for (const hook of ['data-tracker-app', 'data-rank-select', 'data-jungler-checkbox', 'data-baseline-table-slot', 'data-baseline-stats-slot', 'data-gamelog-table-slot', 'data-gamelog-stats-slot', 'data-progress-slot', 'data-clear-tracker']) {
    assert.ok(html.includes(hook), `missing required hook: ${hook}`);
  }
});

test('src/xlsx/workbook.js and tracker.html both source death causes from the same content/deathCauses.json file, not two independently-maintained lists', () => {
  const workbookSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'xlsx', 'workbook.js'), 'utf8');
  assert.ok(/require\(.*deathCauses\.json.*\)/.test(workbookSource), 'workbook.js should require content/deathCauses.json rather than defining its own literal list');
});
