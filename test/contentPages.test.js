'use strict';

// Tests for the guide-derived content pages (src/web/contentPages.js):
// program.html, baseline.html, focus-menu.html,
// champion-pool.html, vod-review.html, tilt-rules.html, faq.html.

const test = require('node:test');
const assert = require('node:assert/strict');

const { CONTENT_PAGES } = require('../src/web/contentPages.js');
const guide = require('../content/guide.js');
const focuses = require('../content/focuses.json');
const site = require('../src/site.js');

// Render every page once and cache it -- these pages are pure functions of
// static content, so a single render per page is safe to reuse across
// assertions.
const rendered = new Map(CONTENT_PAGES.map(([name, render]) => [name, render()]));

test('every guide section (a1-a11) appears in exactly one content page', () => {
  const sectionIds = guide.sections.map(s => s.id);
  const counts = new Map(sectionIds.map(id => [id, 0]));
  for (const [, html] of rendered) {
    for (const s of guide.sections) {
      // Section titles are unique strings, rendered verbatim inside an <h2>.
      const needle = `<h2>${s.title}</h2>`;
      if (html.includes(needle)) counts.set(s.id, counts.get(s.id) + 1);
    }
  }
  for (const id of sectionIds) {
    assert.equal(counts.get(id), 1, `expected guide section ${id} to appear exactly once across content pages, got ${counts.get(id)}`);
  }
});

test('every content page has exactly one <h1> and no heading level is skipped', () => {
  for (const [name, html] of rendered) {
    const h1Count = (html.match(/<h1[ >]/g) || []).length;
    assert.equal(h1Count, 1, `${name} should have exactly one <h1>, found ${h1Count}`);
    // Heading levels present, in document order.
    const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map(m => Number(m[1]));
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] - levels[i - 1] <= 1, `${name} skips a heading level: ...${levels[i - 1]} -> ${levels[i]}...`);
    }
  }
});

test('a content page\'s <h1> never repeats its first <h2> verbatim', () => {
  for (const [name, html] of rendered) {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (!h1Match || !h2Match) continue;
    assert.notEqual(
      h1Match[1].trim(),
      h2Match[1].trim(),
      `${name}'s <h1> duplicates its first <h2> verbatim ("${h1Match[1].trim()}") - a screen reader (and a sighted skim) hits the same heading twice in a row; reword one`
    );
  }
});

test('every content page carries no manual ad-slot placeholder (Auto ads loads unconditionally, so the old empty placeholder wells were removed rather than left visually coexisting with it)', () => {
  for (const [name, html] of rendered) {
    const count = (html.match(/class="ad-slot"/g) || []).length;
    assert.equal(count, 0, `${name} should have 0 ad-slot placeholders, found ${count}`);
  }
});

test('every content page links to tracker.html and downloads.html', () => {
  for (const [name, html] of rendered) {
    assert.ok(html.includes(site.url('tracker.html')), `${name} missing a link to tracker.html`);
    assert.ok(html.includes(site.url('downloads.html')), `${name} missing a link to downloads.html`);
  }
});

test('focus-menu.html deep-links every focus card to drills.html#<drillId>', () => {
  const html = rendered.get('focus-menu.html');
  for (const f of focuses) {
    const href = site.url(`drills.html#${f.drillId}`);
    assert.ok(html.includes(`href="${href}"`), `focus-menu.html missing a drill link for ${f.id} -> ${href}`);
  }
});

test('every focus card on focus-menu.html carries its own anchor id, so a back-link from drills.html lands on the exact card', () => {
  const html = rendered.get('focus-menu.html');
  for (const f of focuses) {
    assert.ok(
      html.includes(`class="card" id="${f.id}"`),
      `focus-menu.html missing an anchor id ("${f.id}") on the "${f.title}" focus card`
    );
  }
});

test('baseline.html links to drills.html#cs-10min; program.html links to focus-menu/warmup/drills', () => {
  const baseline = rendered.get('baseline.html');
  assert.ok(baseline.includes(site.url('drills.html#cs-10min')), 'baseline.html missing link to drills.html#cs-10min');

  const program = rendered.get('program.html');
  assert.ok(program.includes(`href="${site.url('focus-menu.html')}"`), 'program.html missing link to focus-menu.html');
  assert.ok(program.includes(`href="${site.url('warmup.html')}"`), 'program.html missing link to warmup.html');
  assert.ok(program.includes(`href="${site.url('drills.html')}"`), 'program.html missing link to drills.html');
});

test('vod-review.html links to the printable VOD review sheet', () => {
  const html = rendered.get('vod-review.html');
  assert.ok(html.includes(site.url('print/07-vod-review-sheet.html')), 'vod-review.html missing a link to the printable VOD sheet');
});

test('every content page carries exactly one well-formed JSON-LD block matching its own canonical URL, faq.html using FAQPage and the rest using Article', () => {
  for (const [name, html] of rendered) {
    const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(matches.length, 1, `${name} should carry exactly one JSON-LD block, found ${matches.length}`);
    const data = JSON.parse(matches[0][1]);
    assert.equal(data['@context'], 'https://schema.org');
    if (name === 'faq.html') {
      assert.equal(data['@type'], 'FAQPage');
      assert.ok(Array.isArray(data.mainEntity) && data.mainEntity.length > 0, 'faq.html JSON-LD should carry at least one Q&A entry');
      for (const entry of data.mainEntity) {
        assert.equal(entry['@type'], 'Question');
        assert.ok(entry.name.endsWith('?'), `faq.html JSON-LD question "${entry.name}" should end in "?"`);
        assert.ok(entry.acceptedAnswer.text.length > 0);
      }
    } else {
      assert.equal(data['@type'], 'Article');
      assert.equal(data.mainEntityOfPage['@id'], site.absoluteUrl(name), `${name} JSON-LD url should match its own canonical URL`);
    }
  }
});

test('every content page carries the Riot disclaimer, canonical link, and a unique title/description', () => {
  const seenTitles = new Set();
  const seenDescriptions = new Set();
  for (const [name, html] of rendered) {
    assert.ok(html.includes(site.RIOT_DISCLAIMER), `${name} missing the Riot disclaimer`);
    assert.ok(/<link rel="canonical" href="[^"]+">/.test(html), `${name} missing a canonical link`);
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
    assert.ok(!seenTitles.has(title), `duplicate title across content pages: ${title}`);
    assert.ok(!seenDescriptions.has(description), `duplicate description across content pages: ${description}`);
    seenTitles.add(title);
    seenDescriptions.add(description);
  }
});
