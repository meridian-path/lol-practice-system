'use strict';

// Tests for the role filter's server-rendered side on focus-menu.html and
// drills.html (src/web/contentPages.js's renderRoleFilterBar()/
// renderFocusCardsWithDrillLinks(), src/web/drillWarmupPages.js's own
// duplicate renderRoleFilterBar()/renderDrillCard()) - the client script's
// own pure matching logic is covered directly by
// test/roleFilterClient.test.js. Real interactive behavior (clicking a
// role button, watching cards hide/show, cross-page persistence via
// localStorage) was verified once by hand in a real headless browser
// during this build (qa.md's real-browser-testing requirement), including
// catching and fixing a real test-script bug (a fresh browser.newPage()
// call creates its own isolated localStorage, unlike real same-tab
// navigation) before trusting the persistence result.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build: buildSite, DIST } = require('../src/web/buildSite.js');
const focuses = require('../content/focuses.json');
const roleFilterClientSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'web', 'roleFilterClient.js'), 'utf8');

function readDist(name) {
  return fs.readFileSync(path.join(DIST, name), 'utf8');
}

buildSite();
const focusMenuHtml = readDist('focus-menu.html');
const drillsHtml = readDist('drills.html');

test('content/focuses.json: every focus declares a real, non-empty roles array drawn only from the 5 real roles', () => {
  const REAL_ROLES = new Set(['Top', 'Jungle', 'Mid', 'ADC', 'Support']);
  for (const f of focuses) {
    assert.ok(Array.isArray(f.roles) && f.roles.length > 0, `${f.id} missing a real roles array`);
    for (const r of f.roles) {
      assert.ok(REAL_ROLES.has(r), `${f.id}'s roles array contains an unrecognized role: ${r}`);
    }
  }
});

test('jungle-efficiency is scoped to Jungle only, matching its own whatItIs text ("jungle role only")', () => {
  const f = focuses.find(x => x.id === 'jungle-efficiency');
  assert.deepEqual(f.roles, ['Jungle']);
});

test('both focus-menu.html and drills.html inline the real roleFilterClient.js source verbatim', () => {
  assert.ok(focusMenuHtml.includes(roleFilterClientSource), 'focus-menu.html should inline roleFilterClient.js\'s exact current source');
  assert.ok(drillsHtml.includes(roleFilterClientSource), 'drills.html should inline roleFilterClient.js\'s exact current source');
});

test('focus-menu.html\'s focus cards each carry a real data-roles attribute matching content/focuses.json exactly', () => {
  for (const f of focuses) {
    const expected = `id="${f.id}" data-roles="${f.roles.join(',')}"`;
    assert.ok(focusMenuHtml.includes(expected), `focus card ${f.id} missing or mismatched data-roles attribute (expected: ${expected})`);
  }
});

test('drills.html\'s drill cards each carry a data-roles attribute inherited from their matching focus', () => {
  const drills = require('../content/drills.json');
  const focusByDrillId = new Map(focuses.map(f => [f.drillId, f]));
  for (const d of drills) {
    const focus = focusByDrillId.get(d.id);
    const expectedRoles = focus ? focus.roles.join(',') : ['Top', 'Jungle', 'Mid', 'ADC', 'Support'].join(',');
    // Not an exact-string match: drill cards are also item 7's own
    // <details class="card-accordion"> wrapper (see test/accordion.test.js
    // for that structure's own dedicated check) - this only pins down
    // id+data-roles appearing together on the same opening tag.
    const tagPattern = new RegExp(`<details id="${d.id}"[^>]*data-roles="${expectedRoles.replace(/,/g, '\\,')}"`);
    assert.ok(tagPattern.test(drillsHtml), `drill card ${d.id} missing or mismatched data-roles attribute (expected roles: ${expectedRoles})`);
  }
});

test('both pages carry the role-filter hooks and a button for every real role plus "All"', () => {
  for (const html of [focusMenuHtml, drillsHtml]) {
    assert.ok(html.includes('data-role-filter'), 'missing data-role-filter container');
    assert.ok(html.includes('data-role-btn=""'), 'missing the "All" button');
    for (const role of ['Top', 'Jungle', 'Mid', 'ADC', 'Support']) {
      assert.ok(html.includes(`data-role-btn="${role}"`), `missing the ${role} button`);
    }
  }
});
