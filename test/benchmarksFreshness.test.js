'use strict';

// Test for the "last reviewed for patch X.X" freshness line on the
// baseline benchmarks page. The exact patch string
// is a real, dated fact (confirmed via WebSearch when written, not
// guessed) that will go stale over time - this test only checks the line
// exists and looks like a real patch reference, not that it names any
// specific patch number, so it doesn't itself go stale the next time
// someone updates BENCHMARKS_LAST_REVIEWED.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build: buildSite, DIST } = require('../src/web/buildSite.js');

function readDist(name) {
  return fs.readFileSync(path.join(DIST, name), 'utf8');
}

buildSite();

test('baseline.html carries a real "last reviewed for Patch X.X" freshness line', () => {
  const html = readDist('baseline.html');
  assert.match(html, /last reviewed for Patch \d+\.\d+/i, 'expected a real "last reviewed for Patch <number>.<number>" line on baseline.html');
});
