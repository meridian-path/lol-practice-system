'use strict';

// Tests for src/web/visionWarding.js (vision.html) -- a standalone
// content-gap page, not derived from content/guide.js like
// src/web/contentPages.js's pages. Mirrors test/waveManagement.test.js's
// pattern, including a check on antithesis-construction density
// (design-standards.md's Distinctiveness Gate item 3) and a check against
// every other content-gap page's own prose for shared sentences (the
// near-identical-template class of defect the role-guide pages were bounced
// for earlier this session).

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderVisionWarding } = require('../src/web/visionWarding.js');
const site = require('../src/site.js');

const html = renderVisionWarding();

test('vision.html has exactly one <h1> and no heading level is skipped', () => {
  const h1Count = (html.match(/<h1[ >]/g) || []).length;
  assert.equal(h1Count, 1, `expected exactly one <h1>, found ${h1Count}`);
  const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] - levels[i - 1] <= 1, `heading level skipped: ...${levels[i - 1]} -> ${levels[i]}...`);
  }
});

test('vision.html carries the canonical link, JSON-LD, and a title/description within the site\'s length caps', () => {
  assert.ok(html.includes(`<link rel="canonical" href="${site.absoluteUrl('vision.html')}">`));
  assert.ok(html.includes('application/ld+json'));
  const titleMatch = /<title>([^<]*)<\/title>/.exec(html);
  const descMatch = /<meta name="description" content="([^"]*)">/.exec(html);
  assert.ok(titleMatch && titleMatch[1].length <= 60, 'title missing or over 60 chars');
  assert.ok(descMatch && descMatch[1].length <= 160, 'description missing or over 160 chars');
});

test('vision.html links to tracker.html, downloads.html, and the focus menu', () => {
  assert.ok(html.includes(site.url('tracker.html')));
  assert.ok(html.includes(site.url('downloads.html')));
  assert.ok(html.includes(site.url('focus-menu.html')));
});

test('vision.html links to a real drill anchor and real focus-menu anchors, not made-up ids', () => {
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

test('vision.html carries no manual ad-slot placeholder', () => {
  assert.equal((html.match(/class="ad-slot"/g) || []).length, 0);
});

test('vision.html links bidirectionally with climbing-support.html and climbing-jungle.html', () => {
  const { renderSupportGuide, renderJungleGuide } = require('../src/web/roleGuides.js');
  assert.ok(html.includes(site.url('climbing-support.html')), 'vision.html should link to climbing-support.html');
  assert.ok(html.includes(site.url('climbing-jungle.html')), 'vision.html should link to climbing-jungle.html');
  assert.ok(renderSupportGuide().includes(site.url('vision.html')), 'climbing-support.html should link back to vision.html');
  assert.ok(renderJungleGuide().includes(site.url('vision.html')), 'climbing-jungle.html should link back to vision.html');
});

test('program.html and focus-menu.html both link to vision.html', () => {
  const { CONTENT_PAGES } = require('../src/web/contentPages.js');
  const rendered = new Map(CONTENT_PAGES.map(([name, render]) => [name, render()]));
  assert.ok(rendered.get('program.html').includes(site.url('vision.html')), 'program.html should link to vision.html');
  assert.ok(rendered.get('focus-menu.html').includes(site.url('vision.html')), 'focus-menu.html should link to vision.html');
});

test('vision.html keeps the not-X-but-Y antithesis construction rare (design-standards.md Distinctiveness Gate item 3)', () => {
  const text = html.replace(/<[^>]+>/g, ' ');
  const literalTell = /[Ii]t'?s not (just )?.{0,60}(it'?s|it is|but)/g;
  const broadShape = /\bnot\b[^.]{0,60}(,|-)\s*(it'?s|it is|just|but)\b/gi;
  const literalHits = text.match(literalTell) || [];
  const broadHits = text.match(broadShape) || [];
  assert.equal(literalHits.length, 0, `literal antithesis tell found: ${literalHits.join(' | ')}`);
  assert.ok(broadHits.length <= 3, `antithesis construction used ${broadHits.length} times, over the 3-use budget: ${broadHits.join(' | ')}`);
});

test('vision.html shares no identical prose sentence with any sibling content-gap page', () => {
  const { renderEarlyGame } = require('../src/web/earlyGame.js');
  const { renderMacroPlay } = require('../src/web/macroPlay.js');
  const { renderWaveManagement } = require('../src/web/waveManagement.js');
  const { renderTopGuide, renderJungleGuide, renderMidGuide, renderAdcGuide, renderSupportGuide } = require('../src/web/roleGuides.js');

  const siblings = [
    ['early-game.html', renderEarlyGame()],
    ['macro-play.html', renderMacroPlay()],
    ['wave-management.html', renderWaveManagement()],
    ['climbing-top.html', renderTopGuide()],
    ['climbing-jungle.html', renderJungleGuide()],
    ['climbing-mid.html', renderMidGuide()],
    ['climbing-adc.html', renderAdcGuide()],
    ['climbing-support.html', renderSupportGuide()]
  ];

  function sentenceSet(pageHtml) {
    const zoneStart = pageHtml.indexOf('class="zone-measure"');
    const footerStart = pageHtml.indexOf('<footer');
    const bodyOnly = zoneStart === -1 ? pageHtml : pageHtml.slice(zoneStart, footerStart === -1 ? undefined : footerStart);
    const noScripts = bodyOnly.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
    const text = noScripts.replace(/<[^>]+>/g, ' ');
    const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 40);
    return new Set(sentences);
  }

  const visionSentences = sentenceSet(html);
  for (const [slug, siblingHtml] of siblings) {
    const shared = [...visionSentences].filter(s => sentenceSet(siblingHtml).has(s));
    assert.equal(shared.length, 0, `vision.html and ${slug} share identical sentence(s): ${shared.join(' | ')}`);
  }
});
