'use strict';

// Tests for src/web/drillWarmupPages.js (drills.html, warmup.html) and the
// noindex + canonical pair added to the matchup/VOD print sheets.
// build.js's build() runs first where the print pack is
// needed, mirroring `npm run build:all`'s real order.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build: buildPrint, DIST: PRINT_DIST } = require('../src/build.js');
const { build: buildSite, DIST } = require('../src/web/buildSite.js');
const site = require('../src/site.js');

const drills = require('../content/drills.json');
const focuses = require('../content/focuses.json');
const warmups = require('../content/warmups.json');

test('drills.html renders every drill in content/drills.json as its own anchor id', () => {
  buildSite();
  const html = fs.readFileSync(path.join(DIST, 'drills.html'), 'utf8');
  for (const d of drills) {
    assert.ok(html.includes(`id="${d.id}"`), `drills.html missing anchor id="${d.id}" (${d.name})`);
    assert.ok(html.includes(d.name), `drills.html missing the drill name "${d.name}"`);
  }
});

test('every drill card on drills.html links back to the Focus Menu card it trains', () => {
  buildSite();
  const html = fs.readFileSync(path.join(DIST, 'drills.html'), 'utf8');
  for (const f of focuses) {
    const expectedHref = site.url(`focus-menu.html#${f.id}`);
    assert.ok(html.includes(expectedHref), `drills.html missing a back-link to focus-menu.html#${f.id} (for "${f.title}")`);
  }
});

test("drills.html's back-links resolve to the exact scroll position on focus-menu.html, not just the top of the page", () => {
  buildSite();
  const drillsHtml = fs.readFileSync(path.join(DIST, 'drills.html'), 'utf8');
  const focusMenuHtml = fs.readFileSync(path.join(DIST, 'focus-menu.html'), 'utf8');
  for (const f of focuses) {
    const fragment = `focus-menu.html#${f.id}`;
    assert.ok(drillsHtml.includes(fragment), `drills.html should still link to ${fragment}`);
    // The fragment after "#" must be a real anchor id present in
    // focus-menu.html's own output -- a back-link to a fragment nothing
    // defines silently degrades to "top of page" instead of erroring.
    assert.ok(
      focusMenuHtml.includes(`id="${f.id}"`),
      `focus-menu.html has no element with id="${f.id}" -- drills.html's back-link for "${f.title}" would land on the top of the page, not the card`
    );
  }
});

test('warmup.html renders every warmup in content/warmups.json as its own anchor id', () => {
  buildSite();
  const html = fs.readFileSync(path.join(DIST, 'warmup.html'), 'utf8');
  for (const w of warmups) {
    assert.ok(html.includes(`id="${w.id}"`), `warmup.html missing anchor id="${w.id}" (${w.title})`);
    assert.ok(html.includes(w.title), `warmup.html missing the warmup title "${w.title}"`);
  }
});

test('drills.html and warmup.html each carry exactly one Article JSON-LD block matching their own canonical URL', () => {
  buildSite();
  for (const file of ['drills.html', 'warmup.html']) {
    const html = fs.readFileSync(path.join(DIST, file), 'utf8');
    const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(matches.length, 1, `${file} should carry exactly one JSON-LD block, found ${matches.length}`);
    const data = JSON.parse(matches[0][1]);
    assert.equal(data['@context'], 'https://schema.org');
    assert.equal(data['@type'], 'Article');
    assert.equal(data.mainEntityOfPage['@id'], site.absoluteUrl(file));
  }
});

test('drills.html and warmup.html carry no manual ad-slot placeholder (Auto ads loads unconditionally, so the old empty placeholder wells were removed rather than left visually coexisting with it)', () => {
  buildSite();
  for (const file of ['drills.html', 'warmup.html']) {
    const html = fs.readFileSync(path.join(DIST, file), 'utf8');
    assert.ok(!html.includes('class="ad-slot"'), `${file} should not carry a manual ad-slot placeholder`);
  }
});

test('drills.html and warmup.html headings are sequential (h1 then h2 before any h3)', () => {
  buildSite();
  for (const file of ['drills.html', 'warmup.html']) {
    const html = fs.readFileSync(path.join(DIST, file), 'utf8');
    const main = html.split('<main')[1].split('</main>')[0];
    const levels = [...main.matchAll(/<(h[1-6])[ >]/g)].map((m) => Number(m[1][1]));
    assert.equal(levels[0], 1, `${file} should open with an h1`);
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] - levels[i - 1] <= 1, `${file} skips a heading level: ...h${levels[i - 1]} -> h${levels[i]}...`);
    }
  }
});

test('the matchup study sheet and VOD review sheet print pages carry noindex and a canonical link, and no ad slot', () => {
  buildPrint();
  const cases = [
    ['06-matchup-study-sheet.html', site.absoluteUrl('downloads.html')],
    ['07-vod-review-sheet.html', site.absoluteUrl('vod-review.html')]
  ];
  for (const [file, expectedCanonical] of cases) {
    const html = fs.readFileSync(path.join(PRINT_DIST, file), 'utf8');
    assert.ok(html.includes('<meta name="robots" content="noindex">'), `${file} missing noindex`);
    assert.ok(html.includes(`<link rel="canonical" href="${expectedCanonical}">`), `${file} missing/incorrect canonical (expected ${expectedCanonical})`);
    assert.ok(!html.includes('class="ad-slot"'), `${file} should not carry an ad slot -- print pages get zero ads`);
  }
});

test('the remaining print documents (readme, quick-start, program-guide, warmup-cards, drill-library) also carry noindex and a canonical link to their web equivalent', () => {
  buildPrint();
  const cases = [
    ['00-readme.html', site.absoluteUrl('downloads.html')],
    ['01-quick-start.html', site.absoluteUrl('program.html')],
    ['02-program-guide.html', site.absoluteUrl('program.html')],
    ['03-warmup-cards.html', site.absoluteUrl('warmup.html')],
    ['04-drill-library.html', site.absoluteUrl('drills.html')]
  ];
  for (const [file, expectedCanonical] of cases) {
    const html = fs.readFileSync(path.join(PRINT_DIST, file), 'utf8');
    assert.ok(html.includes('<meta name="robots" content="noindex">'), `${file} missing noindex`);
    assert.ok(html.includes(`<link rel="canonical" href="${expectedCanonical}">`), `${file} missing/incorrect canonical (expected ${expectedCanonical})`);
  }
});
