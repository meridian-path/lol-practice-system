'use strict';

// Tests for task-mt83rhrh-759f27 item 8: a real lead magnet (the Focus
// Card) named as a concrete subscribe incentive, replacing the vague "get
// updates" ask - without a client-side gate on the file itself, since this
// site repeatedly, explicitly promises every download is free with no
// email/account required (see src/render/pages.js's renderFocusCard() own
// header comment for the full reasoning).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build: buildPrint, DIST: PRINT_DIST } = require('../src/build.js');
const { build: buildSite, DIST: SITE_DIST } = require('../src/web/buildSite.js');

function readPrintFile(name) {
  return fs.readFileSync(path.join(PRINT_DIST, name), 'utf8');
}
function readSiteFile(name) {
  return fs.readFileSync(path.join(SITE_DIST, name), 'utf8');
}

test('the print pack produces 08-focus-card.html with real fillable content, not a stub', () => {
  buildPrint();
  const html = readPrintFile('08-focus-card.html');
  assert.match(html, /Focus Card/);
  // A real 10-game tracker, not a placeholder - one checklist row per game.
  for (let i = 1; i <= 10; i++) {
    assert.match(html, new RegExp(`Game ${i}:`));
  }
  assert.match(html, /Graduation bar/);
});

test('downloads.html lists the Focus Card as a real download alongside the other sheets', () => {
  buildPrint();
  buildSite();
  const html = readSiteFile('downloads.html');
  assert.match(html, /Focus Card/);
  assert.match(html, /08-focus-card/);
});

test('the newsletter signup names the Focus Card as a concrete incentive, not a vague "get updates" line', () => {
  buildSite();
  const html = readSiteFile('index.html');
  assert.match(html, /Focus Card/);
  // The old vague copy should be gone, not just supplemented.
  assert.doesNotMatch(html, /Get program updates by email/);
});

test('the newsletter copy is honest that the download itself is not actually gated, matching every other download\'s standing "no email required" promise on this site', () => {
  buildSite();
  const html = readSiteFile('index.html');
  assert.match(html, /no email required/i);
});
