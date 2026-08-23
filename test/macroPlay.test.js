'use strict';

// Tests for src/web/macroPlay.js (macro-play.html) -- a standalone
// content-gap page, not derived from content/guide.js like
// src/web/contentPages.js's pages.

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderMacroPlay } = require('../src/web/macroPlay.js');
const site = require('../src/site.js');

const html = renderMacroPlay();

test('macro-play.html has exactly one <h1> and no heading level is skipped', () => {
  const h1Count = (html.match(/<h1[ >]/g) || []).length;
  assert.equal(h1Count, 1, `expected exactly one <h1>, found ${h1Count}`);
  const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] - levels[i - 1] <= 1, `heading level skipped: ...${levels[i - 1]} -> ${levels[i]}...`);
  }
});

test('macro-play.html carries the canonical link, JSON-LD, and a title/description within the site\'s length caps', () => {
  assert.ok(html.includes(`<link rel="canonical" href="${site.absoluteUrl('macro-play.html')}">`));
  assert.ok(html.includes('application/ld+json'));
  const titleMatch = /<title>([^<]*)<\/title>/.exec(html);
  const descMatch = /<meta name="description" content="([^"]*)">/.exec(html);
  assert.ok(titleMatch && titleMatch[1].length <= 60, 'title missing or over 60 chars');
  assert.ok(descMatch && descMatch[1].length <= 160, 'description missing or over 160 chars');
});

test('macro-play.html links to tracker.html, downloads.html, and the focus menu', () => {
  assert.ok(html.includes(site.url('tracker.html')));
  assert.ok(html.includes(site.url('downloads.html')));
  assert.ok(html.includes(site.url('focus-menu.html')));
});

test('macro-play.html links to real drill anchors and real focus-menu anchors, not made-up ids', () => {
  const drills = require('../content/drills.json');
  const focuses = require('../content/focuses.json');
  const drillIds = new Set(drills.map(d => d.id));
  const focusIds = new Set(focuses.map(f => f.id));

  const drillHrefs = [...html.matchAll(/href="[^"]*drills\.html#([^"]+)"/g)].map(m => m[1]);
  assert.ok(drillHrefs.length > 0, 'expected at least one drills.html#<id> link');
  for (const id of drillHrefs) {
    assert.ok(drillIds.has(id), `drills.html#${id} does not match a real drill id`);
  }

  const focusHrefs = [...html.matchAll(/href="[^"]*focus-menu\.html#([^"]+)"/g)].map(m => m[1]);
  assert.ok(focusHrefs.length > 0, 'expected at least one focus-menu.html#<id> link');
  for (const id of focusHrefs) {
    assert.ok(focusIds.has(id), `focus-menu.html#${id} does not match a real focus id`);
  }
});

test('macro-play.html carries no manual ad-slot placeholder', () => {
  assert.equal((html.match(/class="ad-slot"/g) || []).length, 0);
});

test('program.html and focus-menu.html both link to macro-play.html', () => {
  const { CONTENT_PAGES } = require('../src/web/contentPages.js');
  const rendered = new Map(CONTENT_PAGES.map(([name, render]) => [name, render()]));
  assert.ok(rendered.get('program.html').includes(site.url('macro-play.html')), 'program.html should link to macro-play.html');
  assert.ok(rendered.get('focus-menu.html').includes(site.url('macro-play.html')), 'focus-menu.html should link to macro-play.html');
});
