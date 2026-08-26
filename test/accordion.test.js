'use strict';

// Tests for the drill/warmup card accordion (mobile-first priority for
// drills.html/warmup.html). The interactive
// expand/collapse itself is a native <details>/<summary> browser feature,
// not custom JS - nothing to unit test there. What IS this repo's own
// code: that every card is actually wrapped this way with the right id,
// and that ACCORDION_ANCHOR_SCRIPT is present so the site's own
// `<page>#<id>` deep-linking convention still lands on visible content.
// The real auto-expand-on-navigation behavior was verified once by hand in
// a real headless browser during this build (qa.md's real-browser-testing
// requirement) - not re-run here as a committed test, since it needs a
// real DOM/script execution environment this suite doesn't otherwise use.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build: buildSite, DIST } = require('../src/web/buildSite.js');
const drills = require('../content/drills.json');
const warmups = require('../content/warmups.json');

function readDist(name) {
  return fs.readFileSync(path.join(DIST, name), 'utf8');
}

buildSite();
const drillsHtml = readDist('drills.html');
const warmupHtml = readDist('warmup.html');

test('every drill on drills.html is wrapped in a <details class="card-accordion"> with its real id and name as the summary', () => {
  for (const d of drills) {
    // Not an exact-string match on the opening tag: drill accordions also
    // carry item 3's own data-roles attribute after class="card-accordion"
    // (see test/roleFilter.test.js for that attribute's own dedicated
    // check) - this regex only pins down id+class, tolerant of whatever
    // else the tag carries.
    const tagPattern = new RegExp(`<details id="${d.id}" class="card-accordion"[^>]*>`);
    assert.ok(tagPattern.test(drillsHtml), `drill ${d.id} is not wrapped in a card-accordion <details>`);
    assert.ok(drillsHtml.includes(`<summary>${d.name}</summary>`), `drill ${d.id}'s summary should be its real name: ${d.name}`);
  }
});

test('every warmup on warmup.html is wrapped in a <details class="card-accordion"> with its real id and title as the summary', () => {
  for (const w of warmups) {
    assert.ok(warmupHtml.includes(`<details id="${w.id}" class="card-accordion">`), `warmup ${w.id} is not wrapped in a card-accordion <details>`);
    assert.ok(warmupHtml.includes(`<summary>${w.title}</summary>`), `warmup ${w.id}'s summary should be its real title: ${w.title}`);
  }
});

test('no <details> is server-rendered with the open attribute (collapsed by default, per this item\'s own point)', () => {
  assert.equal((drillsHtml.match(/<details[^>]*\bopen\b/g) || []).length, 0, 'drills.html should render every accordion collapsed by default');
  assert.equal((warmupHtml.match(/<details[^>]*\bopen\b/g) || []).length, 0, 'warmup.html should render every accordion collapsed by default');
});

test('both pages inline the anchor-auto-open script, so this site\'s own #<id> deep-linking convention still lands on visible content', () => {
  for (const html of [drillsHtml, warmupHtml]) {
    assert.ok(html.includes('el.tagName === \'DETAILS\''), 'missing the anchor-auto-open script');
    assert.ok(html.includes('window.addEventListener(\'hashchange\''), 'missing the hashchange listener (same-page jump-list clicks, not just fresh navigation)');
  }
});

test('every real focus-menu.html anchor into drills.html (each focus\'s own drillId) resolves to a real accordion id', () => {
  const focuses = require('../content/focuses.json');
  const drillIds = new Set(drills.map(d => d.id));
  for (const f of focuses) {
    assert.ok(drillIds.has(f.drillId), `focus ${f.id}'s drillId "${f.drillId}" does not match a real drill accordion id`);
  }
});
