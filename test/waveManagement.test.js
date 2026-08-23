'use strict';

// Tests for src/web/waveManagement.js (wave-management.html) -- a
// standalone content-gap page, not derived from content/guide.js like
// src/web/contentPages.js's pages. Mirrors test/earlyGame.test.js's
// pattern, plus dedicated coverage for laneDiagram() (the one genuinely
// new piece of UI this page introduces) and a check on antithesis-
// construction density (design-standards.md's Distinctiveness Gate item 3),
// since that pattern is what bounced this session's first two page builds.

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderWaveManagement } = require('../src/web/waveManagement.js');
const site = require('../src/site.js');

const html = renderWaveManagement();

test('wave-management.html has exactly one <h1> and no heading level is skipped', () => {
  const h1Count = (html.match(/<h1[ >]/g) || []).length;
  assert.equal(h1Count, 1, `expected exactly one <h1>, found ${h1Count}`);
  const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] - levels[i - 1] <= 1, `heading level skipped: ...${levels[i - 1]} -> ${levels[i]}...`);
  }
});

test('wave-management.html carries the canonical link, JSON-LD, and a title/description within the site\'s length caps', () => {
  assert.ok(html.includes(`<link rel="canonical" href="${site.absoluteUrl('wave-management.html')}">`));
  assert.ok(html.includes('application/ld+json'));
  const titleMatch = /<title>([^<]*)<\/title>/.exec(html);
  const descMatch = /<meta name="description" content="([^"]*)">/.exec(html);
  assert.ok(titleMatch && titleMatch[1].length <= 60, 'title missing or over 60 chars');
  assert.ok(descMatch && descMatch[1].length <= 160, 'description missing or over 160 chars');
});

test('wave-management.html links to tracker.html, downloads.html, and the focus menu', () => {
  assert.ok(html.includes(site.url('tracker.html')));
  assert.ok(html.includes(site.url('downloads.html')));
  assert.ok(html.includes(site.url('focus-menu.html')));
});

test('wave-management.html links to a real drill anchor and real focus-menu anchors, not made-up ids', () => {
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

test('wave-management.html carries no manual ad-slot placeholder', () => {
  assert.equal((html.match(/class="ad-slot"/g) || []).length, 0);
});

test('program.html and focus-menu.html both link to wave-management.html', () => {
  const { CONTENT_PAGES } = require('../src/web/contentPages.js');
  const rendered = new Map(CONTENT_PAGES.map(([name, render]) => [name, render()]));
  assert.ok(rendered.get('program.html').includes(site.url('wave-management.html')), 'program.html should link to wave-management.html');
  assert.ok(rendered.get('focus-menu.html').includes(site.url('wave-management.html')), 'focus-menu.html should link to wave-management.html');
});

test('wave-management.html embeds exactly 3 lane diagrams, each with a real accessible name and description', () => {
  const svgOpenTags = [...html.matchAll(/<svg role="img" aria-labelledby="([^"]+)"/g)];
  assert.equal(svgOpenTags.length, 3, `expected 3 wave-state diagrams (freeze/slow-push/fast-push), found ${svgOpenTags.length}`);
  for (const [, labelledBy] of svgOpenTags) {
    const [titleId, descId] = labelledBy.split(' ');
    assert.ok(titleId && descId, `aria-labelledby "${labelledBy}" should reference both a title id and a desc id`);
    assert.ok(html.includes(`<title id="${titleId}">`), `missing <title id="${titleId}"> referenced by aria-labelledby`);
    assert.ok(html.includes(`<desc id="${descId}">`), `missing <desc id="${descId}"> referenced by aria-labelledby`);
  }
});

test('wave-management.html\'s three diagrams place the clash point at increasing lane positions (freeze < slow push < fast push)', () => {
  const dotClusterCounts = [...html.matchAll(/<figcaption class="wave-diagram-caption">(Freeze|Slow Push|Fast Push): /g)].map(m => m[1]);
  assert.deepEqual(dotClusterCounts, ['Freeze', 'Slow Push', 'Fast Push'], 'diagrams should appear in freeze -> slow push -> fast push order');
});

test('wave-management.html keeps the not-X-but-Y antithesis construction rare (design-standards.md Distinctiveness Gate item 3)', () => {
  const text = html.replace(/<[^>]+>/g, ' ');
  const literalTell = /[Ii]t'?s not (just )?.{0,60}(it'?s|it is|but)/g;
  const broadShape = /\bnot\b[^.]{0,60}(,|-)\s*(it'?s|it is|just|but)\b/gi;
  const literalHits = text.match(literalTell) || [];
  const broadHits = text.match(broadShape) || [];
  assert.equal(literalHits.length, 0, `literal antithesis tell found: ${literalHits.join(' | ')}`);
  assert.ok(broadHits.length <= 3, `antithesis construction used ${broadHits.length} times, over the 3-use budget: ${broadHits.join(' | ')}`);
});
